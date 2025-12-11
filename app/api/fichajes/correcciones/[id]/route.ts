// ========================================
// API Fichajes - Procesar correcciones
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  forbiddenResponse,
  handleApiError,
  isNextResponse,
  methodNotAllowedResponse,
  notFoundResponse,
  requireAuthAsHROrManager,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { EstadoFichaje, EstadoSolicitudCorreccionFichaje, UsuarioRol } from '@/lib/constants/enums';
import {
  actualizarCalculosFichaje,
} from '@/lib/calculos/fichajes';
import { esOrigenOptimista } from '@/lib/fichajes/constantes';
import {
  aplicarCorreccionFichaje,
  type CorreccionFichajePayload,
} from '@/lib/fichajes/correcciones';
import {
  crearNotificacionFichajeResuelto,
  crearNotificacionSolicitudRechazada,
} from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';

const accionSchema = z.object({
  accion: z.enum(['aprobar', 'rechazar']),
  motivoRespuesta: z.string().optional(),
});

async function ensureManagerAccess(
  usuarioRol: UsuarioRol,
  usuarioEmpleadoId: string | null,
  empleadoObjetivoId: string
) {
  if (usuarioRol !== UsuarioRol.manager) {
    return;
  }

  if (!usuarioEmpleadoId) {
    throw forbiddenResponse('No tienes permiso para revisar esta corrección');
  }

  const empleado = await prisma.empleados.findFirst({
    where: {
      id: empleadoObjetivoId,
      managerId: usuarioEmpleadoId,
    },
    select: { id: true },
  });

  if (!empleado) {
    throw forbiddenResponse('Solo puedes revisar correcciones de tu equipo');
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const authResult = await requireAuthAsHROrManager(req);
    if (isNextResponse(authResult)) return authResult;
    const { session } = authResult;

    const validation = await validateRequest(req, accionSchema);
    if (isNextResponse(validation)) return validation;

    const { accion, motivoRespuesta } = validation.data;

    const solicitud = await prisma.solicitudes_correccion_fichaje.findUnique({
      where: { id: params.id },
      include: {
        empleados_solicitudes_correccion_fichaje_empleadoIdToempleados: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
        fichaje: {
          select: {
            id: true,
            empleadoId: true,
            fecha: true,
          },
        },
      },
    });

    if (!solicitud || solicitud.empresaId !== session.user.empresaId) {
      return notFoundResponse('Solicitud no encontrada');
    }

    if (solicitud.estado !== EstadoSolicitudCorreccionFichaje.pendiente) {
      return forbiddenResponse('La solicitud ya fue revisada');
    }

    await ensureManagerAccess(
      session.user.rol as UsuarioRol,
      session.user.empleadoId ?? null,
      solicitud.empleadoId
    );

    if (accion === 'rechazar') {
      // Verificar si es edición de empleado u otra corrección optimista
      const detalles = solicitud.detalles as {
        eventos?: Array<{id?: string, tipo: string, hora: string, editado: boolean}>;
        eventoSalidaId?: string;
        origen?: string;
      };

      // Verificar si es edición de empleado (CONGELAR, no revertir)
      const esEdicionEmpleado =
        detalles.origen === 'edicion_empleado' ||
        detalles.origen === 'completar_descanso';

      if (esEdicionEmpleado) {
        // EMPLEADO → HR rechaza: CONGELAR (no revertir)
        await prisma.$transaction(async (tx) => {
          // 1. Marcar fichaje como rechazado (congelado)
          await tx.fichajes.update({
            where: { id: solicitud.fichajeId },
            data: { estado: 'rechazado' }
          });

          // 2. Marcar solicitud como rechazada (OPTIMISTIC LOCKING)
          const updated = await tx.solicitudes_correccion_fichaje.updateMany({
            where: {
              id: solicitud.id,
              estado: EstadoSolicitudCorreccionFichaje.pendiente // Solo si aún está pendiente
            },
            data: {
              estado: EstadoSolicitudCorreccionFichaje.rechazada,
              respuesta: motivoRespuesta ?? 'Edición rechazada por HR Admin',
              revisadaPor: session.user.empleadoId,
              revisadaEn: new Date(),
            }
          });

          // Verificar que se actualizó (no fue modificada por CRON)
          if (updated.count === 0) {
            throw new Error('La solicitud ya fue procesada por otro proceso');
          }

          // 3. Actualizar auto_completado si existe
          await tx.auto_completados.updateMany({
            where: {
              datosOriginales: {
                path: ['solicitudId'],
                equals: solicitud.id
              }
            },
            data: {
              estado: 'rechazado',
              aprobadoEn: new Date(),
              aprobadoPor: session.user.empleadoId
            }
          });
        });

        // 4. Notificar empleado del rechazo y congelación
        await crearNotificacionSolicitudRechazada(
          prisma,
          {
            solicitudId: solicitud.id,
            empresaId: solicitud.empresaId,
            empleadoId: solicitud.empleadoId,
            tipo: 'fichaje_correccion',
            motivoRechazo: `${motivoRespuesta || 'Edición rechazada'}. El fichaje queda marcado como rechazado y no se puede modificar.`,
          },
          { actorUsuarioId: session.user.id }
        );

        return successResponse({
          mensaje: 'Solicitud rechazada. Fichaje marcado como rechazado.'
        });
      }

      // Flujo normal: Otros orígenes optimistas (REVERTIR cambios)
      if (esOrigenOptimista(detalles.origen)) {
        // Revocación optimista: eliminar eventos editados en una transacción
        await prisma.$transaction(async (tx) => {
          // 1. Obtener IDs de eventos a eliminar
          const eventosIds = (detalles.eventos || [])
            .map(e => e.id)
            .filter((id): id is string => !!id);

          // 2. Eliminar eventos editados optimistamente
          if (eventosIds.length > 0) {
            const deleted = await tx.fichaje_eventos.deleteMany({
              where: {
                id: { in: eventosIds },
                editado: true // Solo eliminar eventos editados
              }
            });

            if (deleted.count !== eventosIds.length) {
              console.error(`[Revocación] Esperado eliminar ${eventosIds.length} eventos, se eliminaron ${deleted.count}`);
            }
          }

          // 3. Eliminar evento de salida si fue creado optimistamente
          if (detalles.eventoSalidaId) {
            await tx.fichaje_eventos.deleteMany({
              where: {
                id: detalles.eventoSalidaId,
                fichajeId: solicitud.fichajeId,
                tipo: 'salida'
              }
            });
          }

          // 4. Marcar fichaje como pendiente (requiere cuadrar)
          await tx.fichajes.update({
            where: { id: solicitud.fichajeId },
            data: { estado: EstadoFichaje.pendiente }
          });

          // 5. Recalcular horas sin los eventos eliminados
          await actualizarCalculosFichaje(solicitud.fichajeId, tx);

          // 6. Actualizar auto_completado a rechazado
          await tx.auto_completados.updateMany({
            where: {
              datosOriginales: {
                path: ['solicitudId'],
                equals: solicitud.id
              }
            },
            data: {
              estado: 'rechazado',
              aprobadoEn: new Date(),
              aprobadoPor: session.user.empleadoId
            }
          });

          // 7. Rechazar solicitud (OPTIMISTIC LOCKING)
          const updated = await tx.solicitudes_correccion_fichaje.updateMany({
            where: {
              id: solicitud.id,
              estado: EstadoSolicitudCorreccionFichaje.pendiente // Solo si aún está pendiente
            },
            data: {
              estado: EstadoSolicitudCorreccionFichaje.rechazada,
              respuesta: motivoRespuesta ?? null,
              revisadaPor: session.user.empleadoId,
              revisadaEn: new Date(),
            }
          });

          // Verificar que se actualizó (no fue modificada por CRON)
          if (updated.count === 0) {
            throw new Error('La solicitud ya fue procesada por otro proceso');
          }
        });

        // 8. Notificar al empleado del rechazo y revocación
        await crearNotificacionSolicitudRechazada(
          prisma,
          {
            solicitudId: solicitud.id,
            empresaId: solicitud.empresaId,
            empleadoId: solicitud.empleadoId,
            tipo: 'fichaje_correccion',
            motivoRechazo: motivoRespuesta
              ? `${motivoRespuesta} (Los eventos editados han sido eliminados)`
              : 'Corrección rechazada. Los eventos editados han sido eliminados.',
          },
          { actorUsuarioId: session.user.id }
        );

        return successResponse({ mensaje: 'Corrección rechazada y eventos optimistas eliminados' });
      }

      // Flujo normal (no optimista)
      const actualizada = await prisma.solicitudes_correccion_fichaje.update({
        where: { id: solicitud.id },
        data: {
          estado: EstadoSolicitudCorreccionFichaje.rechazada,
          respuesta: motivoRespuesta ?? null,
          revisadaPor: session.user.empleadoId,
          revisadaEn: new Date(),
        },
      });

      // Notificar al empleado del rechazo (se convierte en DISCREPANCIA)
      await crearNotificacionSolicitudRechazada(
        prisma,
        {
          solicitudId: solicitud.id,
          empresaId: solicitud.empresaId,
          empleadoId: solicitud.empleadoId,
          tipo: 'fichaje_correccion',
          motivoRechazo: motivoRespuesta,
        },
        { actorUsuarioId: session.user.id }
      );

      return successResponse(actualizada);
    }

    await aplicarCorreccionFichaje({
      fichajeId: solicitud.fichajeId,
      payload: solicitud.detalles as CorreccionFichajePayload,
      motivoEdicion: `Corrección aprobada: ${solicitud.motivo}`,
      usuarioId: session.user.id,
    });

    // OPTIMISTIC LOCKING: Solo actualizar si aún está pendiente
    const updateResult = await prisma.solicitudes_correccion_fichaje.updateMany({
      where: {
        id: solicitud.id,
        estado: EstadoSolicitudCorreccionFichaje.pendiente // Solo si aún está pendiente
      },
      data: {
        estado: EstadoSolicitudCorreccionFichaje.aprobada,
        respuesta: motivoRespuesta ?? null,
        revisadaPor: session.user.empleadoId,
        revisadaEn: new Date(),
      },
    });

    if (updateResult.count === 0) {
      return forbiddenResponse('La solicitud ya fue procesada por otro proceso');
    }

    // Obtener solicitud actualizada para notificación
    const actualizada = await prisma.solicitudes_correccion_fichaje.findUnique({
      where: { id: solicitud.id },
      include: {
        empleados_solicitudes_correccion_fichaje_empleadoIdToempleados: {
          select: { nombre: true, apellidos: true }
        },
        fichaje: { select: { fecha: true } }
      }
    });

    if (!actualizada) {
      return notFoundResponse('Error al obtener solicitud actualizada');
    }

    const empleadoSolicitud =
      solicitud.empleados_solicitudes_correccion_fichaje_empleadoIdToempleados;

    await crearNotificacionFichajeResuelto(
      prisma,
      {
        fichajeId: solicitud.fichajeId,
        empresaId: solicitud.empresaId,
        empleadoId: solicitud.empleadoId,
        empleadoNombre: empleadoSolicitud
          ? `${empleadoSolicitud.nombre} ${empleadoSolicitud.apellidos}`
          : '',
        fecha: solicitud.fichaje.fecha,
      },
      { actorUsuarioId: session.user.id }
    );

    return successResponse(actualizada);
  } catch (error) {
    if (isNextResponse(error)) {
      return error;
    }
    return handleApiError(error, 'API PATCH /api/fichajes/correcciones/[id]');
  }
}

// DELETE /api/fichajes/correcciones/[id] - Bloqueado por auditoría
export async function DELETE() {
  return methodNotAllowedResponse(
    'No se pueden eliminar las solicitudes de corrección. Quedan registradas como discrepancias si son rechazadas, por motivos de auditoría.'
  );
}
