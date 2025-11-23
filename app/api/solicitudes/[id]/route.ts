// ========================================
// API Route: Solicitudes [ID]
// ========================================
// PATCH: Aprobar o rechazar solicitud de cambio

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  handleApiError,
  notFoundResponse,
  requireAuthAsHROrManager,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { EstadoSolicitud } from '@/lib/constants/enums';
import {
  crearNotificacionSolicitudAprobada,
  crearNotificacionSolicitudRechazada,
} from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { aplicarCambiosSolicitud } from '@/lib/solicitudes/aplicar-cambios';
import { resolveAprobadorEmpleadoId } from '@/lib/solicitudes/aprobador';

const solicitudAccionSchema = z.object({
  accion: z.enum(['aprobar', 'rechazar']),
  motivoRechazo: z.string().optional(),
});

// PATCH /api/solicitudes/[id] - Aprobar o Rechazar solicitud (HR Admin o Manager)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación y rol HR Admin o Manager
    const authResult = await requireAuthAsHROrManager(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Validar request body
    const validationResult = await validateRequest(req, solicitudAccionSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const { accion, motivoRechazo } = validatedData;

    // Verificar que la solicitud existe y es de la misma empresa
    const solicitud = await prisma.solicitudCambio.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
            usuario: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!solicitud) {
      return notFoundResponse('Solicitud no encontrada');
    }

    // Verificar que la solicitud está pendiente o requiere revisión
    if (solicitud.estado !== EstadoSolicitud.pendiente && solicitud.estado !== EstadoSolicitud.requiere_revision) {
      return NextResponse.json(
        { error: `La solicitud ya está ${solicitud.estado}` },
        { status: 400 }
      );
    }

    const ahora = new Date();
    const aprobadorEmpleadoId = await resolveAprobadorEmpleadoId(
      prisma,
      session,
      'API PATCH /api/solicitudes/[id]'
    );

    // Usar transacción para asegurar consistencia de datos
    const result = await prisma.$transaction(async (tx) => {
      if (accion === 'aprobar') {
        // Aprobar solicitud
        const solicitudActualizada = await tx.solicitudCambio.update({
          where: { id },
          data: {
            estado: EstadoSolicitud.aprobada_manual,
              aprobadorId: aprobadorEmpleadoId,
            fechaRespuesta: ahora,
          },
          include: {
            empleado: {
              select: {
                nombre: true,
                apellidos: true,
                email: true,
              },
            },
          },
        });

        // Aplicar los cambios al empleado con validación y cifrado
        if (solicitud.camposCambiados && typeof solicitud.camposCambiados === 'object') {
          await aplicarCambiosSolicitud(
            tx,
            solicitud.id,
            solicitud.empleadoId,
            solicitud.camposCambiados as Record<string, unknown>
          );
        }

        return {
          solicitud: solicitudActualizada,
          message: 'Solicitud aprobada correctamente',
        };
      } else {
        // Rechazar solicitud
        const solicitudActualizada = await tx.solicitudCambio.update({
          where: { id },
          data: {
            estado: EstadoSolicitud.rechazada,
              aprobadorId: aprobadorEmpleadoId,
            fechaRespuesta: ahora,
            motivoRechazo: motivoRechazo,
          },
          include: {
            empleado: {
              select: {
                nombre: true,
                apellidos: true,
                email: true,
              },
            },
          },
        });

        return {
          solicitud: solicitudActualizada,
          message: 'Solicitud rechazada correctamente',
        };
      }
    });

    // Crear notificación fuera de la transacción
    if (accion === 'aprobar') {
      await crearNotificacionSolicitudAprobada(prisma, {
        solicitudId: solicitud.id,
        empresaId: session.user.empresaId,
        empleadoId: solicitud.empleadoId,
        tipo: solicitud.tipo,
        aprobadoPor: 'manual',
      });
    } else {
      await crearNotificacionSolicitudRechazada(prisma, {
        solicitudId: solicitud.id,
        empresaId: session.user.empresaId,
        empleadoId: solicitud.empleadoId,
        tipo: solicitud.tipo,
        motivoRechazo,
      });
    }

    return successResponse(result);
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/solicitudes/[id]');
  }
}
