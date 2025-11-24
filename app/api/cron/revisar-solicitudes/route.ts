// ========================================
// CRON: Revisar Solicitudes con IA tras 48h
// ========================================
//
// Funcionalidad:
// 1. Buscar solicitudes en estado 'pendiente' que tengan más de 48h (configurable)
// 2. Para cada solicitud, ejecutar clasificador IA
// 3. Si IA determina que puede auto-aprobarse:
//    - Aprobar automáticamente la solicitud
//    - Aplicar cambios al empleado
//    - Crear notificación al empleado
// 4. Si IA determina que requiere revisión manual:
//    - Marcar como 'requiere_revision'
//    - Crear notificación a HR/Manager con prioridad crítica
//
// Se ejecuta diariamente (frecuencia configurable)

import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

import { registrarAutoCompletadoSolicitud } from '@/lib/auto-completado';
import { EstadoSolicitud } from '@/lib/constants/enums';
import { initCronLogger } from '@/lib/cron/logger';
import { clasificarSolicitud } from '@/lib/ia';
import { crearNotificacionSolicitudRequiereRevision } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { aplicarCambiosSolicitud } from '@/lib/solicitudes/aplicar-cambios';

// Configuración: periodo en horas para considerar solicitudes elegibles
const PERIODO_REVISION_HORAS = parseInt(process.env.SOLICITUDES_PERIODO_REVISION_HORAS || '48');

export async function POST(request: NextRequest) {
  let cronLogger: ReturnType<typeof initCronLogger> | null = null;
  try {
    // Verificar CRON_SECRET
    const cronSecret = request.headers.get('authorization');
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    cronLogger = initCronLogger('Revisar Solicitudes');

    const ahora = new Date();
    const limiteTiempo = new Date(ahora.getTime() - PERIODO_REVISION_HORAS * 60 * 60 * 1000);

    console.log(
      `[CRON Revisar Solicitudes] Buscando solicitudes pendientes con más de ${PERIODO_REVISION_HORAS}h (antes de ${limiteTiempo.toISOString()})`
    );

    // Obtener solicitudes pendientes elegibles
    const solicitudesPendientes = await prisma.solicitudCambio.findMany({
      where: {
        estado: EstadoSolicitud.pendiente,
        revisadaPorIA: false,
        createdAt: {
          lte: limiteTiempo,
        },
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            usuario: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`[CRON Revisar Solicitudes] ${solicitudesPendientes.length} solicitudes a revisar`);

    let aprobadas = 0;
    let requierenRevision = 0;
    const errores: string[] = [];

    for (const solicitud of solicitudesPendientes) {
      try {
        console.log(
          `[CRON Revisar Solicitudes] Procesando solicitud ${solicitud.id} de ${solicitud.empleado.nombre} ${solicitud.empleado.apellidos}`
        );

        // Clasificar solicitud con IA
        const camposCambiados =
          solicitud.camposCambiados &&
          typeof solicitud.camposCambiados === 'object' &&
          !Array.isArray(solicitud.camposCambiados)
            ? (solicitud.camposCambiados as Record<string, unknown>)
            : {};

        const clasificacion = await clasificarSolicitud({
          id: solicitud.id,
          tipo: solicitud.tipo,
          camposCambiados,
          motivo: solicitud.motivo || undefined,
          empleado: {
            nombre: solicitud.empleado.nombre,
            apellidos: solicitud.empleado.apellidos,
          },
        });

        console.log(
          `[CRON Revisar Solicitudes] Clasificación: ${clasificacion.requiereRevisionManual ? 'MANUAL' : 'AUTO'} (confianza: ${clasificacion.confianza}%)`
        );
        console.log(`[CRON Revisar Solicitudes] Razonamiento: ${clasificacion.razonamiento}`);

        // Actualizar solicitud con resultado de IA
        await prisma.solicitudCambio.update({
          where: { id: solicitud.id },
          data: {
            revisadaPorIA: true,
            revisionIA: {
              confianza: clasificacion.confianza,
              razonamiento: clasificacion.razonamiento,
              requiereRevisionManual: clasificacion.requiereRevisionManual,
              fechaRevision: ahora.toISOString(),
            },
            requiereAprobacionManual: clasificacion.requiereRevisionManual,
          },
        });

        if (clasificacion.requiereRevisionManual) {
          // Marcar como requiere revisión y notificar a HR/Manager
          await prisma.solicitudCambio.update({
            where: { id: solicitud.id },
            data: {
              estado: EstadoSolicitud.requiere_revision,
            },
          });

          await crearNotificacionSolicitudRequiereRevision(prisma, {
            solicitudId: solicitud.id,
            empresaId: solicitud.empresaId,
            empleadoId: solicitud.empleadoId,
            empleadoNombre: `${solicitud.empleado.nombre} ${solicitud.empleado.apellidos}`,
            tipo: solicitud.tipo,
          });

          console.log(`[CRON Revisar Solicitudes] Solicitud ${solicitud.id} marcada para revisión manual`);
          requierenRevision++;
        } else {
          // Auto-aprobar solicitud en transacción
          await prisma.$transaction(async (tx) => {
            // Actualizar solicitud
            await tx.solicitudCambio.update({
              where: { id: solicitud.id },
              data: {
                estado: EstadoSolicitud.auto_aprobada,
                fechaRespuesta: ahora,
              },
            });

            // Aplicar cambios al empleado con validación y cifrado
            if (Object.keys(camposCambiados).length > 0) {
              await aplicarCambiosSolicitud(tx, solicitud.id, solicitud.empleadoId, camposCambiados);
            }
          });

          await registrarAutoCompletadoSolicitud(prisma, {
            empresaId: solicitud.empresaId,
            solicitudId: solicitud.id,
            empleadoId: solicitud.empleadoId,
            tipoSolicitud: solicitud.tipo,
            camposCambiados: solicitud.camposCambiados as Prisma.JsonValue,
            aprobadoPor: 'cron_revisar_solicitudes',
            origen: 'cron_revisar_solicitudes',
          });

          console.log(`[CRON Revisar Solicitudes] Solicitud ${solicitud.id} auto-aprobada`);
          aprobadas++;
        }
      } catch (error) {
        const mensaje = `Error procesando solicitud ${solicitud.id}: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`;
        errores.push(mensaje);
        console.error(`[CRON Revisar Solicitudes] ${mensaje}`);

        // En caso de error, marcar como revisada para no volver a procesarla
        // pero dejar en estado pendiente para revisión manual
        try {
          await prisma.solicitudCambio.update({
            where: { id: solicitud.id },
            data: {
              revisadaPorIA: true,
              revisionIA: {
                error: mensaje,
                fechaRevision: ahora.toISOString(),
              },
            },
          });
        } catch (updateError) {
          console.error(`[CRON Revisar Solicitudes] Error actualizando solicitud fallida:`, updateError);
        }
      }
    }

    const resultado = {
      success: true,
      timestamp: ahora.toISOString(),
      solicitudesRevisadas: solicitudesPendientes.length,
      autoAprobadas: aprobadas,
      requierenRevision,
      errores,
    };

    console.log('[CRON Revisar Solicitudes] Proceso completado:', resultado);
    await cronLogger.finish({
      success: true,
      metadata: {
        solicitudesRevisadas: resultado.solicitudesRevisadas,
        autoAprobadas: resultado.autoAprobadas,
        requierenRevision: resultado.requierenRevision,
        errores: resultado.errores.length,
      },
    });

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[CRON Revisar Solicitudes] Error fatal:', error);
    if (cronLogger) {
      await cronLogger.finish({
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
      });
    }
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

