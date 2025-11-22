/**
 * Resolución inteligente de variables con IA
 * Arquitectura híbrida: Quick mappings → Memory cache → Redis → IA
 */

import { get } from 'lodash';
import { cache as redisCache } from '@/lib/redis';
import { QUICK_MAPPINGS, CAMPOS_ENCRIPTADOS } from './constantes';
import { DatosEmpleado, VariableMapping } from './tipos';
import {
  formatearFecha,
  formatearMoneda,
  formatearNumero,
  construirDireccionCompleta,
  calcularEdad,
  calcularDuracionMeses,
  formatearTipoContrato,
  formatearTipoAusencia,
  numeroAPalabras,
} from './sanitizar';
import { decrypt } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';
import { callAIWithConfig } from '@/lib/ia';
import type OpenAI from 'openai';

// Cache en memoria (rápido, se resetea con el servidor)
const memoryCache = new Map<string, VariableMapping>();

/**
 * Obtener estructura del schema para IA (simplificado)
 */
function getSchemaStructure(empleadoData: DatosEmpleado): Record<string, string | Record<string, string | string[]>> {
  return {
    nombre: 'string',
    apellidos: 'string',
    email: 'string',
    nif: 'string (encriptado)',
    nss: 'string (encriptado)',
    telefono: 'string',
    fechaNacimiento: 'Date',
    direccionCalle: 'string',
    direccionNumero: 'string',
    direccionPiso: 'string',
    codigoPostal: 'string',
    ciudad: 'string',
    direccionProvincia: 'string',
    estadoCivil: 'string',
    numeroHijos: 'number',
    iban: 'string (encriptado)',
    titularCuenta: 'string',
    puesto: 'string',
    fechaAlta: 'Date',
    salarioBrutoAnual: 'Decimal',
    salarioBrutoMensual: 'Decimal',
    diasVacaciones: 'number',
    empresa: {
      nombre: 'string',
      cif: 'string',
      email: 'string',
      telefono: 'string',
      direccion: 'string',
      web: 'string',
    },
    jornada: {
      nombre: 'string',
      horasSemanales: 'number',
    },
    manager: {
      nombre: 'string',
      apellidos: 'string',
      email: 'string',
    },
    puestoRelacion: {
      nombre: 'string',
      descripcion: 'string',
    },
    contratos: [
      {
        tipoContrato: 'string',
        fechaInicio: 'Date',
        fechaFin: 'Date',
        salarioBrutoAnual: 'Decimal',
      },
    ],
    ausencias: [
      {
        tipo: 'string',
        fechaInicio: 'Date',
        fechaFin: 'Date',
        diasSolicitados: 'number',
        estado: 'string',
      },
    ],
  };
}

/**
 * Resolver variable usando IA cuando no está en caché
 */
async function resolverVariableConIA(
  variableName: string,
  empleadoData: DatosEmpleado
): Promise<VariableMapping> {
  console.log(`[IA] Resolviendo variable nueva: ${variableName}`);

  const prompt = `Eres un experto en mapeo de datos estructurados para plantillas de documentos.

Dada esta variable de plantilla: "${variableName}"
Y estos datos disponibles (estructura del schema):
${JSON.stringify(getSchemaStructure(empleadoData), null, 2)}

Determina:
1. El JSON path exacto para acceder al valor (usar notación lodash: "empresa.nombre", "contratos[0].fechaInicio")
2. Si requiere desencriptación (solo si el campo es: nif, nss, iban)
3. Si requiere formateo especial y el tipo

Reglas:
- Si la variable termina en "_fecha", "_fecha_inicio", "_fecha_fin", usar formatType: "date"
- Si la variable contiene "salario", "importe", "precio", usar formatType: "currency"
- Si la variable contiene "horas", "dias", "numero", usar formatType: "number"
- Si es un array, usar índice [0] para el primero
- Si no existe el campo, usa null en jsonPath

Responde SOLO en JSON:
{
  "jsonPath": "string o null",
  "requiresDecryption": boolean,
  "requiresFormatting": boolean,
  "formatType": "date" | "currency" | "number" | null,
  "formatPattern": "dd/MM/yyyy" | "EUR" | null
}`;

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const completion = await callAIWithConfig('plantillas-resolver-variable', messages);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No se recibió respuesta de la IA');
    }

    const mapping = JSON.parse(content);

    // Validar respuesta
    if (!mapping.jsonPath && mapping.jsonPath !== null) {
      throw new Error('Respuesta de IA inválida: falta jsonPath');
    }

    // Crear el mapping completo
    const fullMapping: VariableMapping = {
      variableName,
      jsonPath: mapping.jsonPath || '',
      requiresDecryption: mapping.requiresDecryption || false,
      requiresFormatting: mapping.requiresFormatting || false,
      formatType: mapping.formatType || null,
      formatPattern: mapping.formatPattern || null,
      confianza: 0.9, // Alta confianza en GPT-4o-mini para tareas estructuradas
    };

    // Guardar en BD para persistencia
    await prisma.variableMapping.create({
      data: {
        variableName,
        jsonPath: fullMapping.jsonPath,
        requiresDecryption: fullMapping.requiresDecryption,
        requiresFormatting: fullMapping.requiresFormatting,
        formatType: fullMapping.formatType,
        formatPattern: fullMapping.formatPattern,
        generadoPorIA: true,
        confianza: fullMapping.confianza,
        vecesUsado: 1,
      },
    });

    return fullMapping;
  } catch (error) {
    console.error(`[IA] Error al resolver variable ${variableName}:`, error);

    // Fallback: mapeo vacío
    return {
      variableName,
      jsonPath: '',
      requiresDecryption: false,
      requiresFormatting: false,
      formatType: null,
      confianza: 0,
    };
  }
}

/**
 * Resolver un mapping a su valor final
 */
function resolveWithMapping(empleadoData: DatosEmpleado, mapping: VariableMapping): string {
  if (!mapping.jsonPath) return '';

  // Acceder al valor usando lodash
  let valor = get(empleadoData, mapping.jsonPath);

  // Desencriptar si es necesario
  if (mapping.requiresDecryption && valor && typeof valor === 'string') {
    try {
      valor = decrypt(valor);
    } catch (error) {
      console.error(`[Resolver] Error al desencriptar ${mapping.variableName}:`, error);
      return '';
    }
  }

  // Formatear según tipo
  if (mapping.requiresFormatting && valor !== null && valor !== undefined) {
    switch (mapping.formatType) {
      case 'date':
        return formatearFecha(valor);
      case 'currency':
        return formatearMoneda(valor);
      case 'number':
        return formatearNumero(valor);
    }
  }

  // Convertir a string
  return valor !== null && valor !== undefined ? String(valor) : '';
}

/**
 * Resolver variables computadas (no directas del schema)
 */
function resolverVariableComputada(variableName: string, empleadoData: DatosEmpleado): string | null {
  switch (variableName) {
    case 'empleado_nombre_completo':
      return `${empleadoData.nombre} ${empleadoData.apellidos}`.trim();

    case 'empleado_direccion_completa':
      return construirDireccionCompleta(empleadoData);

    case 'empleado_edad':
      return String(calcularEdad(empleadoData.fechaNacimiento));

    case 'fecha_hoy':
      return formatearFecha(new Date());

    case 'ano_actual':
      return String(new Date().getFullYear());

    case 'mes_actual': {
      const meses = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];
      return meses[new Date().getMonth()];
    }

    case 'contrato_duracion_meses': {
      const contrato = empleadoData.contratos?.[0];
      if (!contrato || !contrato.fechaFin) return '';
      return String(calcularDuracionMeses(contrato.fechaInicio, contrato.fechaFin));
    }

    case 'contrato_salario_bruto_mensual_palabras': {
      const salario = empleadoData.contratos?.[0]?.salarioBrutoAnual;
      if (!salario) return '';
      const mensual = Number(salario) / 12;
      return numeroAPalabras(Math.round(mensual)) + ' euros';
    }

    case 'jornada_horas_diarias': {
      const horas = empleadoData.jornada?.horasSemanales;
      if (!horas) return '';
      return String(Math.round(horas / 5)); // Dividir por 5 días
    }

    case 'manager_nombre': {
      if (!empleadoData.manager) return '';
      return `${empleadoData.manager.nombre} ${empleadoData.manager.apellidos}`.trim();
    }

    case 'contrato_tipo': {
      const tipo = empleadoData.contratos?.[0]?.tipoContrato;
      return formatearTipoContrato(tipo);
    }

    case 'ausencia_tipo': {
      const tipo = empleadoData.ausencias?.[0]?.tipo;
      return formatearTipoAusencia(tipo);
    }

    default:
      return null; // No es variable computada
  }
}

/**
 * Obtener mapping de variable (con sistema de caché multi-nivel)
 * Nivel 1: Quick mappings (0ms)
 * Nivel 2: Memory cache (<1ms)
 * Nivel 3: Redis cache (<10ms)
 * Nivel 4: Base de datos (<50ms)
 * Nivel 5: IA (100-500ms) - Solo primera vez
 */
export async function getVariableMapping(
  variableName: string,
  empleadoData: DatosEmpleado
): Promise<string> {
  // Nivel 0: Variables computadas (calculadas dinámicamente)
  const valorComputado = resolverVariableComputada(variableName, empleadoData);
  if (valorComputado !== null) {
    return valorComputado;
  }

  // Nivel 1: Quick mappings (resolución instantánea <1ms)
  const quickMapping = QUICK_MAPPINGS[variableName];
  if (quickMapping) {
    let valor = quickMapping.path ? get(empleadoData, quickMapping.path) : null;

    // Desencriptar si es necesario
    if (quickMapping.encrypted && valor && typeof valor === 'string') {
      try {
        valor = decrypt(valor);
      } catch (error) {
        console.error(`[Quick] Error al desencriptar ${variableName}:`, error);
        return '';
      }
    }

    // Formatear si es necesario
    if (quickMapping.format === 'date') {
      return formatearFecha(valor);
    }

    return valor !== null && valor !== undefined ? String(valor) : '';
  }

  // Nivel 2: Memory cache (<1ms)
  if (memoryCache.has(variableName)) {
    const mapping = memoryCache.get(variableName)!;
    return resolveWithMapping(empleadoData, mapping);
  }

  // Nivel 3: Redis cache (<10ms)
  const cachedMapping = await redisCache.get<VariableMapping>(`variable:${variableName}`);
  if (cachedMapping) {
    memoryCache.set(variableName, cachedMapping); // Promote to memory
    return resolveWithMapping(empleadoData, cachedMapping);
  }

  // Nivel 4: Base de datos (<50ms)
  try {
    const dbMapping = await prisma.variableMapping.findUnique({
      where: { variableName },
    });

    if (dbMapping) {
      // Validar y convertir formatType de forma segura
      const formatTypeValue = dbMapping.formatType;
      const validFormatTypes = ['date', 'currency', 'number'] as const;
      const formatType: 'date' | 'currency' | 'number' | null = 
        typeof formatTypeValue === 'string' && validFormatTypes.includes(formatTypeValue as typeof validFormatTypes[number])
          ? (formatTypeValue as 'date' | 'currency' | 'number')
          : null;

      const mapping: VariableMapping = {
        variableName: dbMapping.variableName,
        jsonPath: dbMapping.jsonPath,
        requiresDecryption: dbMapping.requiresDecryption,
        requiresFormatting: dbMapping.requiresFormatting,
        formatType,
        formatPattern: dbMapping.formatPattern || undefined,
        confianza: dbMapping.confianza ? Number(dbMapping.confianza) : undefined,
      };

      // Actualizar contador de uso
      await prisma.variableMapping.update({
        where: { variableName },
        data: {
          vecesUsado: { increment: 1 },
          ultimoUso: new Date(),
        },
      });

      // Cachear en Redis y memoria
      await redisCache.set(`variable:${variableName}`, mapping, 86400 * 30); // 30 días
      memoryCache.set(variableName, mapping);

      return resolveWithMapping(empleadoData, mapping);
    }
  } catch (error) {
    console.error(`[DB] Error al buscar mapping de ${variableName}:`, error);
  }

  // Nivel 5: IA (100-500ms) - Solo primera vez
  const iaMapping = await resolverVariableConIA(variableName, empleadoData);

  // Cachear resultado
  await redisCache.set(`variable:${variableName}`, iaMapping, 86400 * 30); // 30 días
  memoryCache.set(variableName, iaMapping);

  return resolveWithMapping(empleadoData, iaMapping);
}

/**
 * Resolver múltiples variables en paralelo
 */
export async function resolverVariables(
  variables: string[],
  empleadoData: DatosEmpleado
): Promise<Record<string, string>> {
  const resultado: Record<string, string> = {};

  // Resolver todas las variables en paralelo
  await Promise.all(
    variables.map(async (variable) => {
      try {
        resultado[variable] = await getVariableMapping(variable, empleadoData);
      } catch (error) {
        console.error(`[Resolver] Error al resolver ${variable}:`, error);
        resultado[variable] = '';
      }
    })
  );

  return resultado;
}

/**
 * Limpiar cache de variables (útil para testing o cuando se actualiza el schema)
 * Nota: El cache de Redis se limpia automáticamente según TTL configurado
 */
export async function limpiarCacheVariables(): Promise<void> {
  const cacheSize = memoryCache.size;
  memoryCache.clear();
  console.log(`[Cache] Cache de variables limpiado (${cacheSize} entradas eliminadas)`);
}
