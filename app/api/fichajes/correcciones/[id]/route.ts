// ========================================
// API Fichajes - Procesar correcciones
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  forbiddenResponse,
  handleApiError,
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
import { crearNotificacionFichajeResuelto } from '@/lib/notificaciones';
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
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuthAsHROrManager(req);
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const validation = await validateRequest(req, accionSchema);
    if (validation instanceof NextResponse) return validation;

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
      session.user.rol,
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

    await crearNotificacionFichajeResuelto(prisma, {
      fichajeId: solicitud.fichajeId,
      empresaId: solicitud.empresaId,
      empleadoId: solicitud.empleadoId,
      empleadoNombre: `${solicitud.empleado.nombre} ${solicitud.empleado.apellidos}`,
      fecha: solicitud.fichaje.fecha,
    });

    return successResponse(actualizada);
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    return handleApiError(error, 'API PATCH /api/fichajes/correcciones/[id]');
  }
}

