// ========================================
// Optimizador IA - Planificación de Vacaciones
// ========================================
// Optimiza vacaciones de equipo usando IA con restricciones y preferencias

import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AsignacionVacaciones {
  empleadoId: string;
  fechas: string[]; // Array de fechas ISO
  diasAsignados: number;
  preferenciasRespetadas: 'ideal' | 'prioritario' | 'alternativo' | 'ninguna';
}

interface ResultadoOptimizacion {
  asignaciones: AsignacionVacaciones[];
  conflictos: string[];
  disponibilidadPorDia: Record<string, number>; // fecha -> % equipo disponible
}

/**
 * Optimiza vacaciones de un equipo usando IA
 */
export async function optimizarVacacionesEquipo(
  campaniaId: string
): Promise<ResultadoOptimizacion> {
  // Cargar campaña con todas las relaciones
  const campania = await prisma.campaniaVacaciones.findUnique({
    where: { id: campaniaId },
    include: {
      equipo: {
        include: {
          politicaAusencias: true,
          miembros: {
            include: {
              empleado: {
                select: {
                  id: true,
                  nombre: true,
                  apellidos: true,
                },
              },
            },
          },
        },
      },
      respuestas: {
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
            },
          },
        },
      },
    },
  });

  if (!campania) {
    throw new Error('Campaña no encontrada');
  }

  const politica = campania.equipo.politicaAusencias || {
    maxSolapamientoPct: 50,
    requiereAntelacionDias: 3,
    permitirSolapamientoCompleto: false,
  };

  // Preparar datos para IA
  const empleados = campania.equipo.miembros.map((m) => {
    const respuesta = campania.respuestas.find((r) => r.empleadoId === m.empleadoId);
    return {
      id: m.empleadoId,
      nombre: `${m.empleado.nombre} ${m.empleado.apellidos}`,
      respondio: respuesta?.respondido || false,
      diasIdeales: respuesta?.diasIdeales || [],
      diasPrioritarios: respuesta?.diasPrioritarios || [],
      diasAlternativos: respuesta?.diasAlternativos || [],
    };
  });

  const fechaInicio = campania.fechaInicio.toISOString().split('T')[0];
  const fechaFin = campania.fechaFin.toISOString().split('T')[0];

  // Calcular saldo promedio de vacaciones (asumiendo 22 días/año)
  const diasPromedioEmpleado = 22;

  // Prompt para OpenAI
  const prompt = `Optimiza la planificación de vacaciones para un equipo de ${empleados.length} personas.

PERIODO: ${fechaInicio} a ${fechaFin}

RESTRICCIONES OBLIGATORIAS:
- Máximo ${politica.maxSolapamientoPct}% del equipo ausente simultáneamente (${Math.ceil((empleados.length * politica.maxSolapamientoPct) / 100)} personas)
${politica.permitirSolapamientoCompleto ? '- Permitido 100% ausente si es necesario' : ''}
- Mínimo ${politica.requiereAntelacionDias} días de antelación desde hoy
- Asignar aproximadamente ${Math.floor(diasPromedioEmpleado / 2)} días por empleado (flexible)

PREFERENCIAS EMPLEADOS:
${empleados
  .map(
    (emp) => `
${emp.nombre} (${emp.respondio ? 'RESPONDIÓ' : 'NO RESPONDIÓ'}):
  - Días ideales: ${emp.respondio && Array.isArray(emp.diasIdeales) ? (emp.diasIdeales as string[]).join(', ') : 'Ninguno'}
  - Días prioritarios: ${emp.respondio && Array.isArray(emp.diasPrioritarios) ? (emp.diasPrioritarios as string[]).join(', ') : 'Ninguno'}
  - Días alternativos: ${emp.respondio && Array.isArray(emp.diasAlternativos) ? (emp.diasAlternativos as string[]).join(', ') : 'Ninguno'}
`
  )
  .join('\n')}

PRIORIDADES:
1. Respetar días PRIORITARIOS (críticos para empleados)
2. Maximizar días IDEALES
3. Usar días ALTERNATIVOS si es necesario
4. Para empleados sin respuesta: asignar días equitativamente

OBJETIVO: Crear plan óptimo que maximice satisfacción y respete restricciones.

Responde SOLO en formato JSON (sin markdown):
{
  "asignaciones": [
    {
      "empleadoId": "uuid",
      "fechas": ["2025-08-10", "2025-08-11", ...],
      "diasAsignados": number,
      "preferenciasRespetadas": "ideal" | "prioritario" | "alternativo" | "ninguna"
    }
  ],
  "conflictos": ["descripción de conflictos si los hay"],
  "disponibilidadPorDia": {
    "2025-08-10": 80,
    "2025-08-11": 60,
    ...
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content:
            'Eres un experto en optimización de recursos humanos. Creas planes de vacaciones óptimos respetando restricciones y preferencias. Responde SIEMPRE en formato JSON válido.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content || '{}';
    
    // Limpiar markdown si existe
    const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const resultado = JSON.parse(jsonContent) as ResultadoOptimizacion;

    // Validar resultado
    if (!resultado.asignaciones || !Array.isArray(resultado.asignaciones)) {
      throw new Error('Respuesta IA inválida: falta campo asignaciones');
    }

    // Validar que todos los empleados tienen asignación
    const empleadosAsignados = new Set(resultado.asignaciones.map((a) => a.empleadoId));
    const empleadosSinAsignar = empleados
      .filter((e) => !empleadosAsignados.has(e.id))
      .map((e) => e.nombre);

    if (empleadosSinAsignar.length > 0) {
      resultado.conflictos = resultado.conflictos || [];
      resultado.conflictos.push(
        `Empleados sin asignación: ${empleadosSinAsignar.join(', ')}`
      );
    }

    return resultado;
  } catch (error) {
    console.error('[Optimizador IA] Error:', error);
    
    // Fallback: asignación básica equitativa
    return generarPlanFallback(empleados, fechaInicio, fechaFin, politica);
  }
}

/**
 * Plan fallback si IA falla: asignación equitativa básica
 */
function generarPlanFallback(
  empleados: any[],
  fechaInicio: string,
  fechaFin: string,
  politica: any
): ResultadoOptimizacion {
  const diasPorEmpleado = 10; // Default
  const asignaciones: AsignacionVacaciones[] = [];
  const disponibilidadPorDia: Record<string, number> = {};

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  // Asignar días equitativamente
  empleados.forEach((emp, index) => {
    const fechasAsignadas: string[] = [];
    const offset = index * 7; // Escalonar 1 semana entre empleados

    let fecha = new Date(inicio);
    fecha.setDate(fecha.getDate() + offset);

    let diasAsignados = 0;
    while (diasAsignados < diasPorEmpleado && fecha <= fin) {
      // Solo días laborables (L-V)
      if (fecha.getDay() >= 1 && fecha.getDay() <= 5) {
        fechasAsignadas.push(fecha.toISOString().split('T')[0]);
        diasAsignados++;
      }
      fecha.setDate(fecha.getDate() + 1);
    }

    asignaciones.push({
      empleadoId: emp.id,
      fechas: fechasAsignadas,
      diasAsignados: fechasAsignadas.length,
      preferenciasRespetadas: 'ninguna',
    });
  });

  // Calcular disponibilidad
  let fecha = new Date(inicio);
  while (fecha <= fin) {
    const fechaStr = fecha.toISOString().split('T')[0];
    const ausentes = asignaciones.filter((a) => a.fechas.includes(fechaStr)).length;
    const disponibles = empleados.length - ausentes;
    disponibilidadPorDia[fechaStr] = (disponibles / empleados.length) * 100;
    fecha.setDate(fecha.getDate() + 1);
  }

  return {
    asignaciones,
    conflictos: ['Plan generado automáticamente (fallback): IA no disponible'],
    disponibilidadPorDia,
  };
}
