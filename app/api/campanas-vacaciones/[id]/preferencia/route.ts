// ========================================
// API Route: Preferencia de Vacaciones del Empleado
// ========================================

import { NextRequest } from 'next/server';
import { prisma, Prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, successResponse, badRequestResponse } from '@/lib/api-handler';
import { crearNotificacionCampanaCompletada } from '@/lib/notificaciones';

export const dynamic = 'force-dynamic';

// GET /api/campanas-vacaciones/[id]/preferencia - Obtener preferencia del empleado
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: campanaId } = await params;

    // Obtener empleado del usuario
    const empleado = await prisma.empleado.findFirst({
      where: {
        usuarioId: session.user.id,
        empresaId: session.user.empresaId,
      },
    });

    if (!empleado) {
      return badRequestResponse('Empleado no encontrado');
    }

    // Buscar preferencia
    const preferencia = await prisma.preferenciaVacaciones.findFirst({
      where: {
        campanaId,
        empleadoId: empleado.id,
        empresaId: session.user.empresaId,
      },
    });

    if (!preferencia) {
      return badRequestResponse('Preferencia no encontrada');
    }

    return successResponse(preferencia);
  } catch (error) {
    return handleApiError(error, 'API GET /api/campanas-vacaciones/[id]/preferencia');
  }
}

// PATCH /api/campanas-vacaciones/[id]/preferencia - Actualizar preferencia
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: campanaId } = await params;
    const body = await req.json();

    // Obtener empleado del usuario
    const empleado = await prisma.empleado.findFirst({
      where: {
        usuarioId: session.user.id,
        empresaId: session.user.empresaId,
      },
    });

    if (!empleado) {
      return badRequestResponse('Empleado no encontrado');
    }

    const diasIdeales = Array.isArray(body.diasIdeales) ? body.diasIdeales : [];
    const diasPrioritarios = Array.isArray(body.diasPrioritarios) ? body.diasPrioritarios : [];
    const diasAlternativos = Array.isArray(body.diasAlternativos) ? body.diasAlternativos : [];

    // Validar datos
    if (diasIdeales.length === 0 && diasPrioritarios.length === 0 && diasAlternativos.length === 0) {
      return badRequestResponse('Debe seleccionar al menos una fecha');
    }

    if (diasIdeales.length > 0) {
      const minimoAlternativos = Math.ceil(diasIdeales.length * 0.5);
      if (diasAlternativos.length < minimoAlternativos) {
        return badRequestResponse(`Debes añadir al menos ${minimoAlternativos} días alternativos (50% de los días ideales)`);
      }
    }

    // Buscar preferencia existente
    const preferenciaExistente = await prisma.preferenciaVacaciones.findFirst({
      where: {
        campanaId,
        empleadoId: empleado.id,
        empresaId: session.user.empresaId,
      },
    });

    if (!preferenciaExistente) {
      return badRequestResponse('Preferencia no encontrada');
    }

    // Actualizar preferencia
    const preferenciaActualizada = await prisma.preferenciaVacaciones.update({
      where: { id: preferenciaExistente.id },
      data: {
        diasIdeales: diasIdeales as unknown as Prisma.InputJsonValue,
        diasPrioritarios: diasPrioritarios as unknown as Prisma.InputJsonValue,
        diasAlternativos: diasAlternativos as unknown as Prisma.InputJsonValue,
        completada: body.completada !== undefined ? body.completada : preferenciaExistente.completada,
      },
    });

    // Si se marcó como completada, actualizar contador de la campaña
    if (body.completada === true && !preferenciaExistente.completada) {
      const campanaActualizada = await prisma.campanaVacaciones.update({
        where: { id: campanaId },
        data: {
          empleadosCompletados: {
            increment: 1,
          },
        },
        select: {
          empleadosCompletados: true,
          totalEmpleadosAsignados: true,
          titulo: true,
        },
      });

      if (
        campanaActualizada.totalEmpleadosAsignados > 0 &&
        campanaActualizada.empleadosCompletados >= campanaActualizada.totalEmpleadosAsignados
      ) {
        await crearNotificacionCampanaCompletada(prisma, {
          campanaId,
          empresaId: session.user.empresaId,
          titulo: campanaActualizada.titulo,
          totalEmpleados: campanaActualizada.totalEmpleadosAsignados,
        });
      }
    } else if (body.completada === false && preferenciaExistente.completada) {
      await prisma.campanaVacaciones.update({
        where: { id: campanaId },
        data: {
          empleadosCompletados: {
            decrement: 1,
          },
        },
      });
    }

    return successResponse(preferenciaActualizada);
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/campanas-vacaciones/[id]/preferencia');
  }
}




