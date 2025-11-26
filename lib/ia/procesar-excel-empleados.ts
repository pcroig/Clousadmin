// ========================================
// IA - Procesar Excel de Empleados
// ========================================
// 
// LÍMITES Y UMBRALES:
// -------------------
// - Máximo tamaño archivo: 5MB (configurable vía IMPORT_EXCEL_MAX_BYTES)
// - Umbral para estrategia de muestra: 50 registros
// - Tamaño de muestra para IA: 30 registros
// - Límite seguro de caracteres en prompt: 350K (~87K tokens)
// - Batch size para procesamiento: 50 empleados
// - Concurrencia en creación: 8 empleados paralelos
// - Timeout de transacción: 15 segundos
//
// ESCALABILIDAD:
// --------------
// - Archivos <50 registros: Todos procesados por IA
// - Archivos ≥50 registros: Muestra de 30 a IA, resto con mapeo detectado
// - Archivos con datos muy grandes: Fallback a mapeo básico automático
//
// ESTRATEGIA DE FALLBACK:
// -----------------------
// 1. Intento con IA (OpenAI → Anthropic → Google)
// 2. Si falla o datos muy grandes: Mapeo básico de columnas
// 3. Siempre retorna resultados (nunca falla completamente)

import * as XLSX from 'xlsx';
import { z } from 'zod';

import { isAnyProviderAvailable } from './core/client';
import { callAIWithConfig } from './models';

/**
 * Estructura de un empleado detectado por la IA
 */
export interface EmpleadoDetectado {
  // Datos personales
  nombre: string | null;
  apellidos: string | null;
  email: string | null;
  nif: string | null;
  nss: string | null;
  iban: string | null;
  telefono: string | null;
  fechaNacimiento: string | null; // ISO date string

  // Datos laborales
  puesto: string | null;
  equipo: string | null;
  manager: string | null; // Nombre o email del manager
  fechaAlta: string | null; // ISO date string
  tipoContrato: string | null;

  // Compensación
  salarioBrutoAnual: number | null;
  salarioBrutoMensual: number | null;

  // Contacto - Campos separados para coincidir con Prisma schema
  direccion: string | null; // Dirección completa (legacy, se puede dividir en los campos siguientes)
  direccionCalle: string | null;
  direccionNumero: string | null;
  direccionPiso: string | null;
  direccionProvincia: string | null;
  ciudad: string | null;
  codigoPostal: string | null;
}

const EMPLEADO_CAMPOS: Array<keyof EmpleadoDetectado> = [
  'nombre',
  'apellidos',
  'email',
  'nif',
  'nss',
  'iban',
  'telefono',
  'fechaNacimiento',
  'puesto',
  'equipo',
  'manager',
  'fechaAlta',
  'tipoContrato',
  'salarioBrutoAnual',
  'salarioBrutoMensual',
  'direccion',
  'direccionCalle',
  'direccionNumero',
  'direccionPiso',
  'direccionProvincia',
  'ciudad',
  'codigoPostal',
];

const EMPLEADO_CAMPOS_SET = new Set<keyof EmpleadoDetectado>(EMPLEADO_CAMPOS);

function isEmpleadoCampo(campo: string): campo is keyof EmpleadoDetectado {
  return EMPLEADO_CAMPOS_SET.has(campo as keyof EmpleadoDetectado);
}

const EMPLEADO_CAMPO_DESCRIPCIONES: Record<keyof EmpleadoDetectado, string> = {
  nombre: 'Nombre (solo nombre de pila, sin apellidos)',
  apellidos: 'Apellidos completos',
  email: 'Email corporativo o de contacto del empleado',
  nif: 'Documento identificativo (DNI/NIE/NIF) en mayúsculas y sin espacios',
  nss: 'Número de la Seguridad Social sin espacios ni guiones',
  iban: 'Cuenta bancaria IBAN completa y sin espacios',
  telefono: 'Número de teléfono con prefijo si está disponible',
  fechaNacimiento: 'Fecha de nacimiento en formato YYYY-MM-DD',
  puesto: 'Puesto o rol principal',
  equipo: 'Equipo o departamento asignado',
  manager: 'Manager directo (nombre completo o email)',
  fechaAlta: 'Fecha de alta/incorporación en formato YYYY-MM-DD',
  tipoContrato: 'Tipo de contrato (indefinido, temporal, prácticas, etc.)',
  salarioBrutoAnual: 'Salario bruto anual en euros como número',
  salarioBrutoMensual: 'Salario bruto mensual en euros como número',
  direccion: 'Dirección completa cuando solo existe una columna',
  direccionCalle: 'Calle o vía (sin número)',
  direccionNumero: 'Número o portal de la dirección',
  direccionPiso: 'Piso, planta, puerta o apartamento',
  direccionProvincia: 'Provincia / estado / región',
  ciudad: 'Ciudad o municipio',
  codigoPostal: 'Código postal / ZIP',
};

const CAMPOS_DESCRIPCION_TEXTO = EMPLEADO_CAMPOS.map(
  (campo) => `- "${campo}": ${EMPLEADO_CAMPO_DESCRIPCIONES[campo]}`
).join('\n');

const EMPLEADO_JSON_TEMPLATE = `{
  "empleados": [
    {
      "nombre": string | null,
      "apellidos": string | null,
      "email": string | null,
      "nif": string | null,
      "nss": string | null,
      "iban": string | null,
      "telefono": string | null,
      "fechaNacimiento": string | null,
      "puesto": string | null,
      "equipo": string | null,
      "manager": string | null,
      "fechaAlta": string | null,
      "tipoContrato": string | null,
      "salarioBrutoAnual": number | null,
      "salarioBrutoMensual": number | null,
      "direccion": string | null,
      "direccionCalle": string | null,
      "direccionNumero": string | null,
      "direccionPiso": string | null,
      "direccionProvincia": string | null,
      "ciudad": string | null,
      "codigoPostal": string | null
    }
  ],
  "equiposDetectados": string[],
  "managersDetectados": string[],
  "columnasDetectadas": {
    "columna_original": "campo_mapeado"
  }
}`;

/**
 * Respuesta de la IA al procesar el Excel
 */
export interface RespuestaProcesamientoExcel {
  empleados: EmpleadoDetectado[];
  equiposDetectados: string[]; // Lista única de equipos encontrados
  managersDetectados: string[]; // Lista única de managers encontrados
  columnasDetectadas: Record<string, string>; // Mapeo de columnas originales a campos
}

// ========================================
// SCHEMAS ZOD PARA VALIDACIÓN
// ========================================

/**
 * Schema Zod para EmpleadoDetectado - validación estructurada
 */
export const EmpleadoDetectadoSchema = z.object({
  nombre: z.string().nullable(),
  apellidos: z.string().nullable(),
  email: z.string().nullable(),
  nif: z.string().nullable(),
  nss: z.string().nullable(),
  iban: z.string().nullable(),
  telefono: z.string().nullable(),
  fechaNacimiento: z.string().nullable(),
  puesto: z.string().nullable(),
  equipo: z.string().nullable(),
  manager: z.string().nullable(),
  fechaAlta: z.string().nullable(),
  tipoContrato: z.string().nullable(),
  salarioBrutoAnual: z.number().nullable(),
  salarioBrutoMensual: z.number().nullable(),
  direccion: z.string().nullable(),
  direccionCalle: z.string().nullable(),
  direccionNumero: z.string().nullable(),
  direccionPiso: z.string().nullable(),
  direccionProvincia: z.string().nullable(),
  ciudad: z.string().nullable(),
  codigoPostal: z.string().nullable(),
});

/**
 * Schema Zod para RespuestaProcesamientoExcel - validación estructurada
 */
export const RespuestaProcesamientoExcelSchema = z.object({
  empleados: z.array(EmpleadoDetectadoSchema),
  equiposDetectados: z.array(z.string()).default([]),
  managersDetectados: z.array(z.string()).default([]),
  columnasDetectadas: z.record(z.string(), z.string().nullable()).default({}),
});

/**
 * Convertir fecha de Excel (número serial o string) a formato ISO (YYYY-MM-DD)
 */
function convertirFechaExcelAISO(valor: unknown): string | null {
  if (!valor) return null;

  // Si es un número, es una fecha serial de Excel
  if (typeof valor === 'number') {
    try {
      // Excel cuenta desde el 1 de enero de 1900
      // Pero hay un bug: Excel trata 1900 como año bisiesto, así que hay que ajustar
      const fecha = XLSX.SSF.parse_date_code(valor);
      if (fecha) {
        return `${fecha.y}-${String(fecha.m).padStart(2, '0')}-${String(fecha.d).padStart(2, '0')}`;
      }
    } catch {
      // Si falla el parseo, intentar como timestamp
      try {
        const fecha = new Date((valor - 25569) * 86400 * 1000);
        if (!isNaN(fecha.getTime())) {
          return fecha.toISOString().split('T')[0];
        }
      } catch {
        // Ignorar error
      }
    }
  }

  // Si es un string, intentar parsear formatos comunes
  if (typeof valor === 'string') {
    const valorTrim = valor.trim();
    
    // Formato DD/MM/YYYY o DD-MM-YYYY
    const formatoFecha = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match = valorTrim.match(formatoFecha);
    if (match) {
      const [, dia, mes, anio] = match;
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    // Formato YYYY-MM-DD (ya está en formato ISO)
    const formatoISO = /^\d{4}-\d{2}-\d{2}$/;
    if (formatoISO.test(valorTrim)) {
      return valorTrim;
    }

    // Intentar parsear como fecha estándar
    const fecha = new Date(valorTrim);
    if (!isNaN(fecha.getTime())) {
      return fecha.toISOString().split('T')[0];
    }
  }

  return null;
}

/**
 * Dividir nombre completo en nombre y apellidos
 */
function dividirNombreCompleto(nombreCompleto: string): { nombre: string; apellidos: string } {
  const partes = nombreCompleto.trim().split(/\s+/).filter(p => p.length > 0);
  
  if (partes.length === 0) {
    return { nombre: '', apellidos: '' };
  }
  
  if (partes.length === 1) {
    return { nombre: partes[0], apellidos: '' };
  }
  
  // El primer elemento es el nombre, el resto son apellidos
  return {
    nombre: partes[0],
    apellidos: partes.slice(1).join(' '),
  };
}

/**
 * Convertir valor a número (maneja strings con símbolos de moneda, comas, etc.)
 */
function convertirANumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  if (typeof valor === 'number') {
    return isNaN(valor) ? null : valor;
  }

  if (typeof valor === 'string') {
    // Remover símbolos de moneda, espacios, y convertir comas a puntos
    const limpio = valor.replace(/[^\d.,-]/g, '').replace(',', '.');
    const num = parseFloat(limpio);
    return isNaN(num) ? null : num;
  }

  return null;
}

// ========================================
// PROCESAMIENTO DE DATOS (UNIFICADO)
// ========================================

/**
 * Obtener mapeo básico de columnas comunes (reutilizable)
 */
function obtenerMapeoBasicoColumnas(): Record<string, keyof EmpleadoDetectado> {
  return {
    // Nombre completo
    'nombre completo': 'nombre',
    'nombrecompleto': 'nombre',
    'full name': 'nombre',
    // Nombre y apellidos
    'nombre': 'nombre',
    'name': 'nombre',
    'first name': 'nombre',
    'apellidos': 'apellidos',
    'apellido': 'apellidos',
    'last name': 'apellidos',
    'surname': 'apellidos',
    // Correos
    'correo electrónico': 'email',
    'correoelectronico': 'email',
    'email': 'email',
    'correo': 'email',
    'email personal': 'email',
    'work email': 'email',
    // Documentos
    'nif': 'nif',
    'dni': 'nif',
    'nie': 'nif',
    'documento': 'nif',
    // Seguridad Social
    'nss': 'nss',
    'numero ss': 'nss',
    'número ss': 'nss',
    'numero seguridad social': 'nss',
    'número seguridad social': 'nss',
    'seguridad social': 'nss',
    // IBAN / cuentas
    'iban': 'iban',
    'cuenta bancaria': 'iban',
    'numero de cuenta': 'iban',
    'número de cuenta': 'iban',
    'ccc': 'iban',
    'bank account': 'iban',
    // Teléfono
    'teléfono móvil': 'telefono',
    'telefonomovil': 'telefono',
    'teléfono': 'telefono',
    'telefono': 'telefono',
    'movil': 'telefono',
    'celular': 'telefono',
    'mobile': 'telefono',
    'phone': 'telefono',
    'teléfono corporativo': 'telefono',
    // Puesto
    'puesto': 'puesto',
    'cargo': 'puesto',
    'position': 'puesto',
    'role': 'puesto',
    // Equipo (compatibilidad con columna "departamento")
    'departamento': 'equipo',
    'department': 'equipo',
    'equipo': 'equipo',
    'team': 'equipo',
    'area': 'equipo',
    // Manager
    'manager': 'manager',
    'jefe': 'manager',
    'responsable': 'manager',
    'manager email': 'manager',
    'line manager': 'manager',
    // Fechas
    'fecha de nacimiento': 'fechaNacimiento',
    'fechanacimiento': 'fechaNacimiento',
    'fecha de alta': 'fechaAlta',
    'fechaalta': 'fechaAlta',
    'fecha incorporación': 'fechaAlta',
    'fecha incorporacion': 'fechaAlta',
    'hire date': 'fechaAlta',
    'start date': 'fechaAlta',
    'fecha contrato': 'fechaAlta',
    'tipo de contrato': 'tipoContrato',
    'tipocontrato': 'tipoContrato',
    'contract type': 'tipoContrato',
    'contrato': 'tipoContrato',
    // Salario
    'salario bruto anual': 'salarioBrutoAnual',
    'salariobrutoanual': 'salarioBrutoAnual',
    'salario bruto anual (€)': 'salarioBrutoAnual',
    'salary': 'salarioBrutoAnual',
    'annual salary': 'salarioBrutoAnual',
    'compensacion anual': 'salarioBrutoAnual',
    'salario bruto mensual': 'salarioBrutoMensual',
    'salario mensual': 'salarioBrutoMensual',
    'monthly salary': 'salarioBrutoMensual',
    // Ubicación
    'direccion': 'direccion',
    'dirección': 'direccion',
    'address': 'direccion',
    'address line 1': 'direccionCalle',
    'address line 2': 'direccionPiso',
    'calle': 'direccionCalle',
    'street': 'direccionCalle',
    'ubicación de oficina': 'ciudad',
    'ubicaciondeoficina': 'ciudad',
    'ciudad': 'ciudad',
    'city': 'ciudad',
    'municipio': 'ciudad',
    'localidad': 'ciudad',
    'numero': 'direccionNumero',
    'número': 'direccionNumero',
    'portal': 'direccionNumero',
    'piso': 'direccionPiso',
    'planta': 'direccionPiso',
    'apartamento': 'direccionPiso',
    'provincia': 'direccionProvincia',
    'province': 'direccionProvincia',
    'state': 'direccionProvincia',
    'codigo postal': 'codigoPostal',
    'código postal': 'codigoPostal',
    'cp': 'codigoPostal',
    'postal code': 'codigoPostal',
    'zip': 'codigoPostal',
  };
}

/**
 * Procesa empleados desde datos de Excel usando un mapeo de columnas
 * Función unificada que elimina duplicación entre diferentes flujos
 * 
 * @param excelData - Datos del Excel
 * @param mapeoColumnas - Mapeo de columnas (de IA o básico)
 * @returns Array de empleados procesados con equipos y managers detectados
 */
function procesarEmpleadosConMapeo(
  excelData: Array<Record<string, unknown>>,
  mapeoColumnas: Record<string, string>
): {
  empleados: EmpleadoDetectado[];
  equiposDetectados: string[];
  managersDetectados: string[];
} {
  if (excelData.length === 0) {
    return { empleados: [], equiposDetectados: [], managersDetectados: [] };
  }

  // Crear índice de columnas (case-insensitive) para búsqueda O(1)
  const primeraFila = excelData[0];
  const indiceColumnas = new Map<string, string>();
  Object.keys(primeraFila).forEach((columna) => {
    const columnaLower = columna.toLowerCase().trim();
    indiceColumnas.set(columnaLower, columna);
  });

  const equiposSet = new Set<string>();
  const managersSet = new Set<string>();

  const empleados: EmpleadoDetectado[] = excelData.map((fila) => {
    const empleado: EmpleadoDetectado = {
      nombre: null,
      apellidos: null,
      email: null,
      nif: null,
      nss: null,
      iban: null,
      telefono: null,
      fechaNacimiento: null,
      puesto: null,
      equipo: null,
      manager: null,
      fechaAlta: null,
      tipoContrato: null,
      salarioBrutoAnual: null,
      salarioBrutoMensual: null,
      direccion: null,
      direccionCalle: null,
      direccionNumero: null,
      direccionPiso: null,
      direccionProvincia: null,
      ciudad: null,
      codigoPostal: null,
    };

    // Buscar y procesar "Nombre Completo" primero
    let nombreCompletoEncontrado = false;
    const columnasNombreCompleto = ['nombre completo', 'nombrecompleto'];
    for (const columnaNombre of columnasNombreCompleto) {
      const columnaReal = indiceColumnas.get(columnaNombre);
      if (columnaReal && fila[columnaReal] && typeof fila[columnaReal] === 'string') {
        const { nombre, apellidos } = dividirNombreCompleto(fila[columnaReal]);
        empleado.nombre = nombre || null;
        empleado.apellidos = apellidos || null;
        nombreCompletoEncontrado = true;
        break;
      }
    }

    // Mapear campos usando el diccionario de columnas
    Object.entries(mapeoColumnas).forEach(([columnaOriginal, campoMapeado]) => {
      if (!isEmpleadoCampo(campoMapeado)) {
        return;
      }
      
      // Si ya procesamos nombre completo, saltar columnas individuales de nombre
      if (nombreCompletoEncontrado && (campoMapeado === 'nombre' || campoMapeado === 'apellidos')) {
        return;
      }

      // Buscar columna usando índice (case-insensitive)
      const columnaLower = columnaOriginal.toLowerCase().trim();
      const columnaEncontrada = indiceColumnas.get(columnaLower);
      if (!columnaEncontrada) return;

      const valor = fila[columnaEncontrada];
      if (valor === undefined || valor === null || valor === '') return;

      // Procesar según tipo de campo
      if (campoMapeado === 'fechaNacimiento' || campoMapeado === 'fechaAlta') {
        const fechaISO = convertirFechaExcelAISO(valor);
        empleado[campoMapeado] = fechaISO;
      } else if (campoMapeado === 'salarioBrutoAnual' || campoMapeado === 'salarioBrutoMensual') {
        const num = convertirANumero(valor);
        empleado[campoMapeado] = num;
      } else if (campoMapeado === 'nombre' && typeof valor === 'string' && valor.includes(' ')) {
        // Dividir nombre completo si tiene espacios
        const { nombre, apellidos } = dividirNombreCompleto(valor);
        empleado.nombre = nombre || null;
        empleado.apellidos = apellidos || null;
      } else {
        // Campos de texto normales
        empleado[campoMapeado] = String(valor).trim() || null;
      }
    });

    // Post-procesamiento: calcular salario mensual, normalizar equipo, etc.
    if (empleado.salarioBrutoAnual && !empleado.salarioBrutoMensual) {
      empleado.salarioBrutoMensual = empleado.salarioBrutoAnual / 12;
    }

    // Detectar equipos y managers únicos
    if (empleado.equipo) equiposSet.add(empleado.equipo);
    if (empleado.manager) managersSet.add(empleado.manager);

    return empleado;
  });

  return {
    empleados,
    equiposDetectados: Array.from(equiposSet),
    managersDetectados: Array.from(managersSet),
  };
}

// ========================================
// FUNCIÓN PRINCIPAL
// ========================================

/**
 * Analizar estructura del Excel y mapear columnas a campos de empleado
 * 
 * Estrategia escalable:
 * - Si hay pocos registros (<50): enviar todos a la IA
 * - Si hay muchos registros (>=50): enviar muestra más grande (30) para que la IA aprenda el mapeo,
 *   luego procesar todos manualmente usando el mapeo detectado
 * - Fallback automático a mapeo básico si la IA falla
 * 
 * @param excelData - Datos crudos del Excel (array de objetos)
 * @returns Respuesta con empleados mapeados y metadatos
 */
export async function mapearEmpleadosConIA(
  excelData: Array<Record<string, unknown>>
): Promise<RespuestaProcesamientoExcel> {
  // Si no hay IA disponible, usar mapeo básico directamente
  if (!isAnyProviderAvailable()) {
    console.warn('[mapearEmpleadosConIA] No hay proveedores de IA configurados, usando mapeo básico');
    const mapeoBasico = obtenerMapeoBasicoColumnas();
    const resultado = procesarEmpleadosConMapeo(excelData, mapeoBasico);
    return {
      ...resultado,
      columnasDetectadas: {},
    };
  }

  // Estrategia escalable según cantidad de datos
  const totalRegistros = excelData.length;
  const UMBRAL_REGISTROS_PARA_MUESTRA = 50;
  const TAMAÑO_MUESTRA = 30;

  const usarMuestra = totalRegistros >= UMBRAL_REGISTROS_PARA_MUESTRA;
  const registrosParaIA = usarMuestra
    ? excelData.slice(0, TAMAÑO_MUESTRA)
    : excelData;

  try {
    console.log(
      `[mapearEmpleadosConIA] Procesando ${totalRegistros} registros ` +
      `(${usarMuestra ? `muestra de ${registrosParaIA.length} para IA` : 'todos a la IA'})`
    );
    
    // Log columnas del primer registro para debugging
    if (registrosParaIA.length > 0) {
      const columnasEnviadas = Object.keys(registrosParaIA[0] || {});
      console.info(
        `[mapearEmpleadosConIA] Columnas enviadas a IA (${columnasEnviadas.length}): ${columnasEnviadas.join(', ')}`
      );
    }
    
    // Validar tamaño de datos antes de construir prompt
    // Estimación: 1 token ≈ 4 caracteres, límite seguro: 100K tokens = 400K caracteres
    const datosString = JSON.stringify(registrosParaIA);
    const MAX_SAFE_CHARS = 350000; // 350K chars = ~87K tokens (margen de seguridad)
    
    if (datosString.length > MAX_SAFE_CHARS) {
      console.warn(
        `[mapearEmpleadosConIA] Datos muy grandes (${datosString.length} chars). ` +
        `Reduciendo muestra a 20 registros para evitar límite de tokens.`
      );
      // Reducir muestra si es demasiado grande
      const registrosReducidos = excelData.slice(0, 20);
      const mapeoBasico = obtenerMapeoBasicoColumnas();
      const resultado = procesarEmpleadosConMapeo(excelData, mapeoBasico);
      return {
        ...resultado,
        columnasDetectadas: {},
      };
    }
    
    // Construir el prompt para la IA
    const prompt = `
Analiza los siguientes datos de empleados desde un archivo Excel y mapea cada columna a los campos del modelo interno.

**Campos soportados (extrae TODOS los que puedas):**
${CAMPOS_DESCRIPCION_TEXTO}

**Reglas clave:**
- Usa null si un campo no existe o está vacío.
- Detecta todas las variaciones posibles de nombres de columna (correo/email, departamento/equipo, etc.).
- Normaliza NIF/NIE, NSS e IBAN eliminando espacios, guiones y usando mayúsculas.
- Divide cualquier columna de "Nombre Completo" en "nombre" y "apellidos".
- Convierte TODAS las fechas al formato ISO (YYYY-MM-DD).
- Convierte salarios a números (sin símbolos). Si solo existe el salario anual, calcula salarioBrutoMensual = salarioBrutoAnual / 12.
- Cuando haya columnas separadas de dirección, completa direccionCalle, direccionNumero, direccionPiso, direccionProvincia, ciudad y codigoPostal. Si solo hay una columna de dirección completa, úsala en "direccion".
- Identifica equipos (department/área) y managers únicos (emails o nombres completos).

**Datos del Excel (${registrosParaIA.length} de ${totalRegistros} registros):**
${JSON.stringify(registrosParaIA, null, 2)}

**Responde con un JSON con esta estructura EXACTA (sin texto adicional ni markdown):**
${EMPLEADO_JSON_TEMPLATE}

${usarMuestra 
  ? `Procesa SOLO los ${registrosParaIA.length} registros proporcionados. El sistema procesará el resto usando el mapeo de columnas que detectes.`
  : `Procesa TODOS los ${totalRegistros} registros proporcionados.`
}
`;

    // Llamar a la IA con la configuración específica (usa cliente unificado con fallback)
    const completion = await callAIWithConfig('procesar-excel-empleados', [
      {
        role: 'user',
        content: prompt,
      },
    ]);

    let content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('La IA no devolvió respuesta');
    }

    // Detectar si la respuesta fue truncada por límite de tokens
    const finishReason = completion.choices[0].finishReason;
    if (finishReason === 'length') {
      console.warn('[mapearEmpleadosConIA] ⚠️ Respuesta truncada por límite de tokens. Usando fallback.');
      throw new Error('Respuesta de IA truncada por límite de tokens');
    }

    // Sanitizar respuesta: extraer JSON si viene envuelto en markdown
    content = content.trim();
    
    // Si viene con ```json ... ```, extraer el contenido
    const jsonBlockMatch = content.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    if (jsonBlockMatch) {
      content = jsonBlockMatch[1].trim();
    }
    
    // Parsear y validar con Zod (validación estructurada robusta)
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      // Si falla el parse inicial, intentar reparar JSON común
      console.error('[mapearEmpleadosConIA] Error parseando JSON inicial:', parseError);
      console.error('[mapearEmpleadosConIA] Total chars:', content.length);
      console.error('[mapearEmpleadosConIA] Primeros 1000 chars:', content.substring(0, 1000));
      console.error('[mapearEmpleadosConIA] Últimos 1000 chars:', content.substring(Math.max(0, content.length - 1000)));
      
      // Encontrar la posición del error
      const errorMatch = parseError instanceof SyntaxError 
        ? parseError.message.match(/position (\d+)/)
        : null;
      
      if (errorMatch) {
        const errorPos = parseInt(errorMatch[1], 10);
        const contextStart = Math.max(0, errorPos - 200);
        const contextEnd = Math.min(content.length, errorPos + 200);
        console.error('[mapearEmpleadosConIA] Contexto del error (pos ' + errorPos + '):');
        console.error(content.substring(contextStart, contextEnd));
      }
      
      // Detectar JSON truncado (termina abruptamente sin cerrar estructuras)
      const contentTrimmed = content.trim();
      const lastChar = contentTrimmed[contentTrimmed.length - 1];
      if (lastChar !== '}' && lastChar !== ']') {
        console.warn('[mapearEmpleadosConIA] ⚠️ JSON truncado detectado (no termina con } o ]). Usando fallback.');
        throw new Error('JSON truncado por límite de tokens');
      }
      
      // Intentar reparar problemas comunes:
      let repairedContent = content;
      
      // 1. Trailing commas antes de ] o }
      repairedContent = repairedContent.replace(/,(\s*[\]}])/g, '$1');
      
      // 2. Control characters no escapados (excepto \n, \r, \t que son válidos escapados)
      repairedContent = repairedContent.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
      
      // 3. Saltos de línea sin escapar dentro de strings (heurística)
      // Esto es complicado, pero podemos intentar escapar \n, \r, \t dentro de strings
      // Patrón: encontrar strings con saltos de línea literales
      repairedContent = repairedContent.replace(/"([^"]*?)(\r?\n)([^"]*?)"/g, (match, before, newline, after) => {
        // Solo reemplazar si parece ser un string con salto de línea accidental
        return `"${before}\\n${after}"`;
      });
      
      // 4. Backslashes sin escapar (excepto los que ya están escapados)
      // Esto es muy peligroso, solo hacerlo si encontramos el patrón específico
      
      try {
        parsed = JSON.parse(repairedContent);
        console.warn('[mapearEmpleadosConIA] ✅ JSON reparado exitosamente');
      } catch (repairError) {
        console.error('[mapearEmpleadosConIA] ❌ No se pudo reparar el JSON:', repairError);
        console.error('[mapearEmpleadosConIA] Contenido reparado (primeros 1000):', repairedContent.substring(0, 1000));
        throw parseError; // Lanzar error original
      }
    }
    
    const validado = RespuestaProcesamientoExcelSchema.parse(parsed);

    // Log del mapeo de columnas detectado por la IA
    console.info(
      `[mapearEmpleadosConIA] Mapeo de columnas detectado por IA:`,
      JSON.stringify(validado.columnasDetectadas, null, 2)
    );

    // Limpiar mapeo de columnas: remover valores null y normalizar campos con "/"
    const mapeoLimpio: Record<string, string> = {};
    const camposValidos = new Set<string>(EMPLEADO_CAMPOS);

    Object.entries(validado.columnasDetectadas).forEach(([columna, campo]) => {
      if (!campo || typeof campo !== 'string') return;
      
      // Si contiene "/", tomar el primero (ej: "nombre/apellidos" -> "nombre")
      const campoNormalizado = campo.includes('/') ? campo.split('/')[0].trim() : campo.trim();
      const campoFinal = campoNormalizado === 'departamento' ? 'equipo' : campoNormalizado;
      if (campoFinal && camposValidos.has(campoFinal)) {
        mapeoLimpio[columna] = campoFinal;
      }
    });

    // Si usamos muestra O no hay mapeo útil, procesar todos con el mapeo detectado
    const necesitaProcesamientoManual =
      usarMuestra ||
      validado.empleados.length < totalRegistros ||
      Object.keys(mapeoLimpio).length === 0;

    if (necesitaProcesamientoManual) {
      console.log(
        `[mapearEmpleadosConIA] Procesando todos los ${totalRegistros} registros ` +
        `usando mapeo detectado (${Object.keys(mapeoLimpio).length} columnas)`
      );

      // Si no hay mapeo de la IA, usar mapeo básico
      const mapeoFinal = Object.keys(mapeoLimpio).length > 0 
        ? mapeoLimpio 
        : obtenerMapeoBasicoColumnas();

      // Procesar todos los registros con función unificada
      const resultado = procesarEmpleadosConMapeo(excelData, mapeoFinal);

      return {
        empleados: resultado.empleados,
        equiposDetectados: resultado.equiposDetectados,
        managersDetectados: resultado.managersDetectados,
        columnasDetectadas: mapeoLimpio,
      };
    }

    // Si la IA procesó todos exitosamente, retornar su respuesta
    console.log(
      `[mapearEmpleadosConIA] ✅ IA procesó ${validado.empleados.length} empleados ` +
      `(${validado.empleados.filter(e => e.nombre && e.email).length} con datos completos)`
    );

    return {
      empleados: validado.empleados,
      equiposDetectados: validado.equiposDetectados,
      managersDetectados: validado.managersDetectados,
      columnasDetectadas: mapeoLimpio,
    };
  } catch (error) {
    console.error('[mapearEmpleadosConIA] Error procesando Excel con IA:', {
      totalRegistros: excelData.length,
      error,
    });
    
    // Fallback robusto: si la IA falla, usar mapeo básico
    console.warn(
      '[mapearEmpleadosConIA] Usando fallback a mapeo básico debido a error en IA'
    );
    
    const mapeoBasico = obtenerMapeoBasicoColumnas();
    const resultado = procesarEmpleadosConMapeo(excelData, mapeoBasico);
    
    return {
      ...resultado,
      columnasDetectadas: {},
    };
  }
}

// ========================================
// VALIDACIÓN
// ========================================

/**
 * Validar que un empleado tiene los campos mínimos requeridos
 */
export function validarEmpleado(empleado: EmpleadoDetectado): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];

  if (!empleado.nombre) {
    errores.push('Falta el nombre');
  }

  if (!empleado.apellidos) {
    errores.push('Faltan los apellidos');
  }

  if (!empleado.email) {
    errores.push('Falta el email');
  } else {
    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(empleado.email)) {
      errores.push('Email inválido');
    }
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}
