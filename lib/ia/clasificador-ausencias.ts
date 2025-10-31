// ========================================
// Clasificador IA - Auto-aprobación de Ausencias
// ========================================
// Evalúa ausencias cortas (<2 días) para auto-aprobación inteligente

import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ResultadoClasificacion {
  autoAprobar: boolean;
  motivo: string;
  score: number; // 0-100, menor = más seguro aprobar
}

/**
 * Clasifica ausencias pendientes de aprobación < 2 días
 * que fueron solicitadas hace > 2 días
 */
export async function clasificarAusenciasAutoAprobables(empresaId: string) {
  const doseDiasAtras = new Date();
  doseDiasAtras.setDate(doseDiasAtras.getDate() - 2);

  // Buscar ausencias elegibles
  const ausencias = await prisma.ausencia.findMany({
    where: {
      empresaId,
      estado: 'pendiente_aprobacion',
      tipo: { in: ['vacaciones', 'otro'] }, // Solo estos tipos requieren revisión
      diasSolicitados: { lt: 2 },
      createdAt: { lt: doseDiasAtras },
    },
    include: {
      empleado: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          equipos: {
            include: {
              equipo: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const resultados = [];

  for (const ausencia of ausencias) {
    try {
      const resultado = await evaluarAusencia(ausencia);
      resultados.push({
        ausenciaId: ausencia.id,
        empleadoId: ausencia.empleadoId,
        resultado,
      });

      // Si score < 70: auto-aprobar
      if (resultado.score < 70 && resultado.autoAprobar) {
        await prisma.$transaction(async (tx) => {
          // Actualizar ausencia
          await tx.ausencia.update({
            where: { id: ausencia.id },
            data: {
              estado: 'auto_aprobada',
              aprobadaEn: new Date(),
            },
          });

          // Crear registro AutoCompletado
          await tx.autoCompletado.create({
            data: {
              empresaId,
              tipo: 'ausencia',
              ausenciaId: ausencia.id,
              estado: 'aprobado',
              confianza: 100 - resultado.score,
              prompt: `Auto-aprobación ausencia ${ausencia.tipo}: ${resultado.motivo}`,
              respuesta: JSON.stringify(resultado),
              aprobadoEn: new Date(),
            },
          });

          // Notificar al empleado
          const usuario = await tx.usuario.findUnique({
            where: { empleadoId: ausencia.empleadoId },
          });

          if (usuario) {
            await tx.notificacion.create({
              data: {
                usuarioId: usuario.id,
                tipo: 'ausencia_auto_aprobada',
                titulo: 'Ausencia auto-aprobada',
                mensaje: `Tu solicitud de ${ausencia.tipo} del ${ausencia.fechaInicio.toLocaleDateString('es-ES')} ha sido aprobada automáticamente`,
                metadata: {
                  ausenciaId: ausencia.id,
                  motivo: resultado.motivo,
                } as any,
              },
            });
          }
        });
      } else {
        // Marcar para revisión manual
        await prisma.autoCompletado.create({
          data: {
            empresaId,
            tipo: 'ausencia',
            ausenciaId: ausencia.id,
            estado: 'requiere_revision',
            confianza: 100 - resultado.score,
            prompt: `Requiere revisión: ${resultado.motivo}`,
            respuesta: JSON.stringify(resultado),
          },
        });
      }
    } catch (error) {
      console.error(`[Clasificador] Error evaluando ausencia ${ausencia.id}:`, error);
    }
  }

  return resultados;
}

/**
 * Evalúa una ausencia específica con OpenAI
 */
async function evaluarAusencia(ausencia: any): Promise<ResultadoClasificacion> {
  try {
    // Obtener histórico del empleado (últimos 6 meses)
    const seiseMesesAtras = new Date();
    seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);

    const historicoAusencias = await prisma.ausencia.count({
      where: {
        empleadoId: ausencia.empleadoId,
        createdAt: { gte: seiseMesesAtras },
        estado: { in: ['en_curso', 'completada', 'auto_aprobada'] },
      },
    });

    // Calcular solapamiento en equipo (si tiene equipo)
    let solapamientoEquipo = 0;
    const equipoId = ausencia.empleado.equipos[0]?.equipo.id;
    if (equipoId) {
      const totalEquipo = await prisma.empleadoEquipo.count({
        where: { equipoId },
      });

      const ausentesEquipo = await prisma.ausencia.count({
        where: {
          equipoId,
          estado: { in: ['en_curso', 'auto_aprobada'] },
          fechaInicio: { lte: ausencia.fechaFin },
          fechaFin: { gte: ausencia.fechaInicio },
        },
      });

      solapamientoEquipo = totalEquipo > 0 ? (ausentesEquipo / totalEquipo) * 100 : 0;
    }

    // Días de antelación
    const hoy = new Date();
    const diasAntelacion = Math.floor(
      (ausencia.fechaInicio.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Prompt para OpenAI
    const prompt = `Evalúa si es seguro auto-aprobar esta solicitud de ausencia:

Empleado: ${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}
Tipo: ${ausencia.tipo}
Días solicitados: ${ausencia.diasSolicitados}
Fecha inicio: ${ausencia.fechaInicio.toISOString().split('T')[0]}
Fecha fin: ${ausencia.fechaFin.toISOString().split('T')[0]}
Días de antelación: ${diasAntelacion}

Contexto:
- Ausencias en últimos 6 meses: ${historicoAusencias}
- Solapamiento en equipo: ${solapamientoEquipo.toFixed(1)}%
- Días desde solicitud: ${Math.floor((new Date().getTime() - ausencia.createdAt.getTime()) / (1000 * 60 * 60 * 24))}

Criterios de aprobación:
- Ausencia < 2 días: OK
- Antelación suficiente (>= 0 días): ${diasAntelacion >= 0 ? 'OK' : 'NO'}
- Solapamiento equipo < 50%: ${solapamientoEquipo < 50 ? 'OK' : 'NO'}
- Histórico razonable (< 10 ausencias en 6 meses): ${historicoAusencias < 10 ? 'OK' : 'NO'}

Responde SOLO en formato JSON:
{
  "autoAprobar": boolean,
  "motivo": "Explicación breve (1 línea)",
  "score": number (0-100, menor = más seguro)
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente de RR.HH. que evalúa solicitudes de ausencia. Responde siempre en formato JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0].message.content || '{}';
    const resultado = JSON.parse(content);

    return {
      autoAprobar: resultado.autoAprobar ?? false,
      motivo: resultado.motivo ?? 'Sin motivo especificado',
      score: resultado.score ?? 100,
    };
  } catch (error) {
    console.error('[Evaluador IA]', error);
    // En caso de error, mejor no auto-aprobar
    return {
      autoAprobar: false,
      motivo: 'Error en evaluación IA',
      score: 100,
    };
  }
}
