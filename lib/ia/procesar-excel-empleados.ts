// ========================================
// IA - Procesar Excel de Empleados
// ========================================

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
  telefono: string | null;
  fechaNacimiento: string | null; // ISO date string

  // Datos laborales
  puesto: string | null;
  departamento: string | null;
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

/**
 * Respuesta de la IA al procesar el Excel
 */
export interface RespuestaProcesamientoExcel {
  empleados: EmpleadoDetectado[];
  equiposDetectados: string[]; // Lista única de equipos encontrados
  managersDetectados: string[]; // Lista única de managers encontrados
  columnasDetectadas: Record<string, string>; // Mapeo de columnas originales a campos
}

/**
 * Analizar estructura del Excel y mapear columnas a campos de empleado
 * 
 * @param excelData - Datos crudos del Excel (array de objetos)
 * @returns Respuesta con empleados mapeados y metadatos
 */
export async function mapearEmpleadosConIA(
  excelData: Record<string, any>[]
): Promise<RespuestaProcesamientoExcel> {
  // Verificar que hay algún proveedor de IA disponible
  if (!isAnyProviderAvailable()) {
    // Si no hay IA configurada, usar mapeo básico por columnas comunes
    console.warn('[mapearEmpleadosConIA] No hay proveedores de IA configurados, usando mapeo básico');
    return mapeoBasicoSinIA(excelData);
  }

  try {
    // Tomar una muestra de los primeros 5 registros para análisis
    const muestra = excelData.slice(0, Math.min(5, excelData.length));
    
    // Construir el prompt para la IA
    const prompt = `
Analiza los siguientes datos de empleados desde un archivo Excel y mapea cada columna a los campos correspondientes del modelo de empleado.

**IMPORTANTE:**
- Si un campo no existe o está vacío, usa null
- Detecta todas las variaciones posibles de nombres de columnas (ej: "email", "correo", "e-mail", etc.)
- Identifica equipos/departamentos únicos
- Identifica managers (pueden estar en columna "Manager", "Jefe", "Responsable", etc.)
- Normaliza fechas al formato ISO (YYYY-MM-DD)
- Los salarios deben ser números sin símbolos

**Datos de muestra del Excel:**
${JSON.stringify(muestra, null, 2)}

**Total de registros:** ${excelData.length}

**Responde con un JSON con esta estructura:**
{
  "empleados": [
    {
      "nombre": string | null,
      "apellidos": string | null,
      "email": string | null,
      "nif": string | null,
      "telefono": string | null,
      "fechaNacimiento": string | null,
      "puesto": string | null,
      "departamento": string | null,
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
}

Procesa TODOS los ${excelData.length} registros, no solo la muestra.
`;

    // Llamar a la IA con la configuración específica (usa cliente unificado con fallback)
    const completion = await callAIWithConfig('procesar-excel-empleados', [
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('La IA no devolvió respuesta');
    }

    // Parsear la respuesta JSON
    const respuesta: RespuestaProcesamientoExcel = JSON.parse(content);

    // Validar que la respuesta tiene la estructura esperada
    if (!respuesta.empleados || !Array.isArray(respuesta.empleados)) {
      throw new Error('Respuesta de la IA inválida: falta el array de empleados');
    }

    // Si la IA procesó solo la muestra, procesar todos los datos manualmente
    // usando el mapeo de columnas detectado
    if (respuesta.empleados.length < excelData.length) {
      respuesta.empleados = await mapearTodosLosEmpleados(
        excelData,
        respuesta.columnasDetectadas
      );
    }

    return respuesta;
  } catch (error) {
    console.error('[mapearEmpleadosConIA] Error procesando Excel con IA:', {
      totalRegistros: excelData.length,
      muestra: excelData.slice(0, 5).length,
      error,
    });
    throw new Error('Error al procesar el Excel con IA: ' + (error as Error).message);
  }
}

/**
 * Mapeo básico sin IA - usa nombres de columnas comunes
 */
function mapeoBasicoSinIA(
  excelData: Record<string, any>[]
): RespuestaProcesamientoExcel {
  // Mapeo común de nombres de columnas
  const mapeoColumnas: Record<string, keyof EmpleadoDetectado> = {
    // Nombres comunes en español e inglés
    nombre: 'nombre',
    name: 'nombre',
    nombres: 'nombre',
    apellidos: 'apellidos',
    apellido: 'apellidos',
    surname: 'apellidos',
    lastname: 'apellidos',
    email: 'email',
    correo: 'email',
    'e-mail': 'email',
    nif: 'nif',
    dni: 'nif',
    telefono: 'telefono',
    teléfono: 'telefono',
    phone: 'telefono',
    puesto: 'puesto',
    cargo: 'puesto',
    position: 'puesto',
    departamento: 'departamento',
    department: 'departamento',
    equipo: 'equipo',
    team: 'equipo',
    manager: 'manager',
    jefe: 'manager',
    responsable: 'manager',
    direccion: 'direccion',
    address: 'direccion',
    calle: 'direccionCalle',
    street: 'direccionCalle',
    direccionCalle: 'direccionCalle',
    'dirección calle': 'direccionCalle',
    numero: 'direccionNumero',
    number: 'direccionNumero',
    direccionNumero: 'direccionNumero',
    'dirección número': 'direccionNumero',
    piso: 'direccionPiso',
    floor: 'direccionPiso',
    direccionPiso: 'direccionPiso',
    'dirección piso': 'direccionPiso',
    provincia: 'direccionProvincia',
    province: 'direccionProvincia',
    direccionProvincia: 'direccionProvincia',
    'dirección provincia': 'direccionProvincia',
    ciudad: 'ciudad',
    city: 'ciudad',
    codigoPostal: 'codigoPostal',
    'código postal': 'codigoPostal',
    'codigo postal': 'codigoPostal',
    'código_postal': 'codigoPostal',
    codigo_postal: 'codigoPostal',
    'códigoPostal': 'codigoPostal',
    postal: 'codigoPostal',
    zip: 'codigoPostal',
  };

  // Detectar equipos y managers únicos
  const equiposSet = new Set<string>();
  const managersSet = new Set<string>();

  const empleados: EmpleadoDetectado[] = excelData.map((fila) => {
    const empleado: EmpleadoDetectado = {
      nombre: null,
      apellidos: null,
      email: null,
      nif: null,
      telefono: null,
      fechaNacimiento: null,
      puesto: null,
      departamento: null,
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

    // Mapear columnas buscando coincidencias (case-insensitive)
    Object.keys(fila).forEach((columna) => {
      const columnaLower = columna.toLowerCase().trim();
      const campo = mapeoColumnas[columnaLower];
      
      if (campo && fila[columna] !== undefined && fila[columna] !== null && fila[columna] !== '') {
        const valor = fila[columna];
        
        // Convertir a string si es necesario (excepto números)
        if (campo === 'salarioBrutoAnual' || campo === 'salarioBrutoMensual') {
          const num = typeof valor === 'string' ? parseFloat(valor.replace(/[^\d.,]/g, '').replace(',', '.')) : Number(valor);
          empleado[campo] = isNaN(num) ? null : num;
        } else {
          empleado[campo] = String(valor).trim() || null;
        }

        // Detectar equipos y managers
        if (campo === 'equipo' && empleado.equipo) {
          equiposSet.add(empleado.equipo);
        }
        if (campo === 'manager' && empleado.manager) {
          managersSet.add(empleado.manager);
        }
      }
    });

    return empleado;
  });

  return {
    empleados,
    equiposDetectados: Array.from(equiposSet),
    managersDetectados: Array.from(managersSet),
    columnasDetectadas: {},
  };
}

/**
 * Mapear todos los empleados usando el mapeo de columnas detectado
 * (fallback si la IA no procesó todos los registros)
 */
async function mapearTodosLosEmpleados(
  excelData: Record<string, any>[],
  columnasDetectadas: Record<string, string>
): Promise<EmpleadoDetectado[]> {
  return excelData.map((fila) => {
    const empleado: EmpleadoDetectado = {
      nombre: null,
      apellidos: null,
      email: null,
      nif: null,
      telefono: null,
      fechaNacimiento: null,
      puesto: null,
      departamento: null,
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

    // Mapear cada campo usando el diccionario de columnas
    Object.entries(columnasDetectadas).forEach(([columnaOriginal, campoMapeado]) => {
      const valor = fila[columnaOriginal];
      if (valor !== undefined && valor !== null && valor !== '') {
        // @ts-ignore - Asignación dinámica
        empleado[campoMapeado] = valor;
      }
    });

    return empleado;
  });
}

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

