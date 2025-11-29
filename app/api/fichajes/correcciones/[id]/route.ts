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
import { EstadoSolicitudCorreccionFichaje, UsuarioRol } from '@/lib/constants/enums';
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

  const empleado = await prisma.empleado.findFirst({
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

    const solicitud = await prisma.solicitudCorreccionFichaje.findUnique({
      where: { id: params.id },
      include: {
        empleado: {
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
      const actualizada = await prisma.solicitudCorreccionFichaje.update({
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

    const actualizada = await prisma.solicitudCorreccionFichaje.update({
      where: { id: solicitud.id },
      data: {
        estado: EstadoSolicitudCorreccionFichaje.aprobada,
        respuesta: motivoRespuesta ?? null,
        revisadaPor: session.user.empleadoId,
        revisadaEn: new Date(),
      },
    });

    await crearNotificacionFichajeResuelto(
      prisma,
      {
        fichajeId: solicitud.fichajeId,
        empresaId: solicitud.empresaId,
        empleadoId: solicitud.empleadoId,
        empleadoNombre: `${solicitud.empleado.nombre} ${solicitud.empleado.apellidos}`,
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
