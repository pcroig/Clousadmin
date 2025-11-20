// ========================================
// Cuadrador Inteligente de Vacaciones
// ========================================
// Usa OpenAI para optimizar distribución de vacaciones en campañas

// Importar desde punto de entrada centralizado (base común)
import { callAIWithConfig } from './models';
import { prisma } from '@/lib/prisma';
import type { PreferenciaVacaciones, Empleado, Ausencia } from '@prisma/client';

/**
 * Propuesta de vacaciones para un empleado
 */
export interface PropuestaVacacionEmpleado {
  empleadoId: string;
  empleadoNombre: string;
  fechaInicio: string; // ISO date
  fechaFin: string; // ISO date
  dias: number;
  tipo: 'ideal' | 'alternativo' | 'ajustado';
  motivo: string;
  prioridad: number; // 1-10
}

/**
 * Resultado del cuadrado inteligente
 */
export interface ResultadoCuadrado {
  propuestas: PropuestaVacacionEmpleado[];
  resumen: {
    totalEmpleados: number;
    empleadosConIdeal: number;
    empleadosAjustados: number;
    solapamientoMaximo: number;
    solapamientoPorDia: {
      [fecha: string]: number;
    };
  };
  warnings: string[];
  metadata: {
    timestamp: string;
    model: string;
    tokensUsed?: number;
  };
}

/**
 * Input para el cuadrador
 */
interface CuadrarVacacionesInput {
  empresaId: string;
  campanaId: string;
  solapamientoMaximoPct?: number | null;
  preferencias: (PreferenciaVacaciones & {
    empleado: Pick<Empleado, 'id' | 'nombre' | 'apellidos' | 'diasVacaciones'> & {
      equipos: Array<{
        equipoId: string;
        equipo: {
          id: string;
          nombre: string | null;
        } | null;
      }>;
    };
  })[];
  ausenciasAprobadas: Ausencia[];
  fechaInicioObjetivo: Date;
  fechaFinObjetivo: Date;
}

/**
 * Cuadrar vacaciones usando OpenAI
 */
export async function cuadrarVacacionesIA(
  input: CuadrarVacacionesInput
): Promise<ResultadoCuadrado> {
  const { empresaId, campanaId, solapamientoMaximoPct, preferencias, ausenciasAprobadas, fechaInicioObjetivo, fechaFinObjetivo } = input;

  console.info(`[Cuadrar Vacaciones] Iniciando para campaña ${campanaId} con ${preferencias.length} empleados`);

  // 1. Preparar datos para la IA
  const preferenciasFormateadas = preferencias.map(pref => ({
    empleadoId: pref.empleado.id,
    empleadoNombre: `${pref.empleado.nombre} ${pref.empleado.apellidos}`,
    diasDisponibles: pref.empleado.diasVacaciones,
    diasIdeales: pref.diasIdeales as string[],
    diasPrioritarios: (pref.diasPrioritarios as string[] | null) || [],
    diasAlternativos: (pref.diasAlternativos as string[] | null) || [],
    equipos: pref.empleado.equipos.map((e) => ({
      id: e.equipo?.id || e.equipoId,
      nombre: e.equipo?.nombre || 'Equipo sin nombre',
    })),
  }));

  const equiposResumen = preferenciasFormateadas.reduce<
    Array<{ id: string; nombre: string; miembros: string[] }>
  >((acc, pref) => {
    if (!pref.equipos.length) {
      return acc;
    }

    for (const equipo of pref.equipos) {
      if (!equipo.id) continue;
      const existente = acc.find((item) => item.id === equipo.id);
      if (existente) {
        if (!existente.miembros.includes(pref.empleadoNombre)) {
          existente.miembros.push(pref.empleadoNombre);
        }
      } else {
        acc.push({
          id: equipo.id,
          nombre: equipo.nombre,
          miembros: [pref.empleadoNombre],
        });
      }
    }

    return acc;
  }, []);

  const ausenciasFormateadas = ausenciasAprobadas.map(ausencia => ({
    empleadoId: ausencia.empleadoId,
    fechaInicio: ausencia.fechaInicio.toISOString().split('T')[0],
    fechaFin: ausencia.fechaFin.toISOString().split('T')[0],
    dias: Number(ausencia.diasSolicitados),
  }));

  // 2. Construir prompt para OpenAI
  const prompt = construirPrompt({
    preferencias: preferenciasFormateadas,
    ausenciasAprobadas: ausenciasFormateadas,
    solapamientoMaximoPct: solapamientoMaximoPct ?? undefined,
    equipos: equiposResumen,
    totalEmpleados: preferencias.length,
    fechaInicioObjetivo: fechaInicioObjetivo.toISOString().split('T')[0],
    fechaFinObjetivo: fechaFinObjetivo.toISOString().split('T')[0],
  });

  try {
    // 3. Llamar a IA usando el cliente unificado (con fallback automático)
    const completion = await callAIWithConfig('cuadrar-vacaciones', [
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('La IA no devolvió respuesta');
    }

    // 4. Parsear respuesta
    const resultado = JSON.parse(responseText);
    
    // 5. Validar formato de respuesta
    const resultadoValidado = validarYNormalizarResultado(resultado, preferencias);

    console.info(`[Cuadrar Vacaciones] Completado - ${resultadoValidado.propuestas.length} propuestas generadas`);
    console.info(`[Cuadrar Vacaciones] Tokens usados: ${completion.usage?.totalTokens || 0}`);

    return {
      ...resultadoValidado,
      metadata: {
        timestamp: new Date().toISOString(),
        model: completion.model,
        tokensUsed: completion.usage?.totalTokens,
      },
    };
  } catch (error) {
    console.error('[Cuadrar Vacaciones] Error llamando a IA:', error);
    
    // Si falla la IA, retornar propuestas básicas
    return generarPropuestasFallback(preferencias, solapamientoMaximoPct);
  }
}

/**
 * Construir prompt para OpenAI
 */
function construirPrompt(data: {
  preferencias: any[];
  ausenciasAprobadas: any[];
  solapamientoMaximoPct?: number;
  equipos?: Array<{ id: string; nombre: string; miembros: string[] }>;
  totalEmpleados: number;
  fechaInicioObjetivo: string;
  fechaFinObjetivo: string;
}): string {
  const {
    preferencias,
    ausenciasAprobadas,
    solapamientoMaximoPct,
    equipos = [],
    totalEmpleados,
    fechaInicioObjetivo,
    fechaFinObjetivo,
  } = data;

  const solapamientoTexto = solapamientoMaximoPct
    ? `- Máximo solapamiento permitido: ${solapamientoMaximoPct}% de un mismo equipo simultáneamente.\n- Equipos y miembros:\n${JSON.stringify(equipos, null, 2)}`
    : '- No hay límite estricto de solapamiento. Prioriza que cada equipo conserve personal suficiente.';

  return `
Necesito que optimices la distribución de vacaciones para una empresa española.

**CONTEXTO:**
- Total de empleados con preferencias válidas: ${totalEmpleados}
- ${solapamientoTexto}
- Período objetivo de vacaciones: ${fechaInicioObjetivo} a ${fechaFinObjetivo}
- Los empleados han indicado sus preferencias de fechas

**RESTRICCIONES OBLIGATORIAS:**
1. Las vacaciones deben estar dentro del período objetivo (${fechaInicioObjetivo} - ${fechaFinObjetivo})
2. Respetar ausencias ya aprobadas (no se pueden modificar)
3. No superar el solapamiento máximo en ningún día
4. Priorizar los días marcados como "prioritarios"
5. Intentar asignar los días "ideales" cuando sea posible
6. Usar días "alternativos" si no hay otra opción
7. Distribuir equitativamente entre empleados

**PREFERENCIAS DE EMPLEADOS:**
${JSON.stringify(preferencias, null, 2)}

**AUSENCIAS YA APROBADAS (NO MODIFICAR):**
${JSON.stringify(ausenciasAprobadas, null, 2)}

**INSTRUCCIONES:**
1. Analiza las preferencias y ausencias aprobadas
2. Calcula el solapamiento por día
3. Genera propuestas optimizadas respetando restricciones
4. Para cada empleado, propón un período de vacaciones con:
   - fechaInicio (formato YYYY-MM-DD)
   - fechaFin (formato YYYY-MM-DD)
   - días (número de días laborables)
   - tipo: "ideal" | "alternativo" | "ajustado"
   - motivo: explicación breve de por qué esta asignación
   - prioridad: 1-10 (10 = máxima prioridad)

**FORMATO DE RESPUESTA (JSON):**
{
  "propuestas": [
    {
      "empleadoId": "uuid",
      "empleadoNombre": "Nombre Apellidos",
      "fechaInicio": "2025-08-01",
      "fechaFin": "2025-08-07",
      "dias": 5,
      "tipo": "ideal",
      "motivo": "Fechas ideales disponibles sin solapamiento",
      "prioridad": 9
    }
  ],
  "resumen": {
    "totalEmpleados": ${totalEmpleados},
    "empleadosConIdeal": 0,
    "empleadosAjustados": 0,
    "solapamientoMaximo": 0,
    "solapamientoPorDia": {
      "2025-08-01": 2,
      "2025-08-02": 3
    }
  },
  "warnings": []
}

Genera SOLO el JSON sin texto adicional.
`.trim();
}

/**
 * Validar y normalizar resultado de OpenAI
 */
function validarYNormalizarResultado(
  resultado: any,
  preferencias: any[]
): ResultadoCuadrado {
  const warnings: string[] = [];

  // Validar estructura básica
  if (!resultado.propuestas || !Array.isArray(resultado.propuestas)) {
    console.warn('[Cuadrar Vacaciones] Respuesta sin propuestas válidas');
    return generarPropuestasFallback(preferencias, 30);
  }

  // Validar que todas las propuestas son válidas
  const propuestasValidas: PropuestaVacacionEmpleado[] = [];
  
  for (const propuesta of resultado.propuestas) {
    if (
      propuesta.empleadoId &&
      propuesta.empleadoNombre &&
      propuesta.fechaInicio &&
      propuesta.fechaFin &&
      typeof propuesta.dias === 'number'
    ) {
      propuestasValidas.push({
        empleadoId: propuesta.empleadoId,
        empleadoNombre: propuesta.empleadoNombre,
        fechaInicio: propuesta.fechaInicio,
        fechaFin: propuesta.fechaFin,
        dias: propuesta.dias,
        tipo: propuesta.tipo || 'ajustado',
        motivo: propuesta.motivo || 'Propuesta generada por IA',
        prioridad: propuesta.prioridad || 5,
      });
    } else {
      warnings.push(`Propuesta inválida ignorada para empleado ${propuesta.empleadoNombre || 'desconocido'}`);
    }
  }

  // Calcular resumen
  const empleadosConIdeal = propuestasValidas.filter(p => p.tipo === 'ideal').length;
  const empleadosAjustados = propuestasValidas.filter(p => p.tipo === 'ajustado').length;

  return {
    propuestas: propuestasValidas,
    resumen: {
      totalEmpleados: preferencias.length,
      empleadosConIdeal,
      empleadosAjustados,
      solapamientoMaximo: resultado.resumen?.solapamientoMaximo || 0,
      solapamientoPorDia: resultado.resumen?.solapamientoPorDia || {},
    },
    warnings,
    metadata: {
      timestamp: new Date().toISOString(),
      model: 'gpt-5.1',
    },
  };
}

/**
 * Generar propuestas fallback si la IA falla
 */
function generarPropuestasFallback(
  preferencias: any[],
  solapamientoMaximoPct: number
): ResultadoCuadrado {
  console.warn('[Cuadrar Vacaciones] Generando propuestas fallback:', {
    totalEmpleados: preferencias.length,
    solapamientoMaximo: solapamientoMaximoPct,
  });

  const propuestas: PropuestaVacacionEmpleado[] = [];
  
  for (const pref of preferencias) {
    const diasIdeales = pref.diasIdeales as string[];
    
    if (diasIdeales && diasIdeales.length > 0) {
      // Usar primera fecha ideal como inicio
      const fechaInicio = diasIdeales[0];
      const fechaFin = diasIdeales[Math.min(4, diasIdeales.length - 1)]; // 5 días
      
      propuestas.push({
        empleadoId: pref.empleado.id,
        empleadoNombre: `${pref.empleado.nombre} ${pref.empleado.apellidos}`,
        fechaInicio,
        fechaFin,
        dias: 5,
        tipo: 'ajustado',
        motivo: 'Propuesta generada automáticamente (IA no disponible)',
        prioridad: 5,
      });
    }
  }

  return {
    propuestas,
    resumen: {
      totalEmpleados: preferencias.length,
      empleadosConIdeal: 0,
      empleadosAjustados: propuestas.length,
      solapamientoMaximo: 0,
      solapamientoPorDia: {},
    },
    warnings: ['IA no disponible - propuestas generadas automáticamente'],
    metadata: {
      timestamp: new Date().toISOString(),
      model: 'fallback',
    },
  };
}

