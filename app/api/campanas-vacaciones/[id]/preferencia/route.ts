// ========================================
// API Route: Preferencia de Vacaciones del Empleado
// ========================================

import { NextRequest } from 'next/server';

import { badRequestResponse, handleApiError, requireAuth, successResponse } from '@/lib/api-handler';
import { crearNotificacionCampanaCompletada } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';
import { getJsonBody } from '@/lib/utils/json';

interface PreferenciaPayload {
  diasIdeales?: unknown;
  diasPrioritarios?: unknown;
  diasAlternativos?: unknown;
  completada?: unknown;
}

export const dynamic = 'force-dynamic';

// GET /api/campanas-vacaciones/[id]/preferencia - Obtener preferencia del empleado
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
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
    let preferencia = await prisma.preferenciaVacaciones.findFirst({
      where: {
        campanaId,
        empleadoId: empleado.id,
        empresaId: session.user.empresaId,
      },
    });

    if (!preferencia) {
      const campana = await prisma.campanaVacaciones.findFirst({
        where: {
          id: campanaId,
          empresaId: session.user.empresaId,
        },
        select: { id: true },
      });

      if (!campana) {
        return badRequestResponse('Campaña no encontrada');
      }

      preferencia = await prisma.preferenciaVacaciones.create({
        data: {
          campanaId,
          empleadoId: empleado.id,
          empresaId: session.user.empresaId,
          diasIdeales: asJsonValue([]),
          diasPrioritarios: asJsonValue([]),
          diasAlternativos: asJsonValue([]),
          completada: false,
          aceptada: false,
        },
      });
    }

    return successResponse(preferencia);
  } catch (error) {
    return handleApiError(error, 'API GET /api/campanas-vacaciones/[id]/preferencia');
  }
}

// PATCH /api/campanas-vacaciones/[id]/preferencia - Actualizar preferencia
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: campanaId } = await params;
    const body = await getJsonBody<PreferenciaPayload>(req);

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

    const toStringArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.map((entry) => String(entry)) : [];

    const diasIdeales = toStringArray(body.diasIdeales);
    const diasPrioritarios = toStringArray(body.diasPrioritarios);
    const diasAlternativos = toStringArray(body.diasAlternativos);

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
        diasIdeales: asJsonValue(diasIdeales),
        diasPrioritarios: asJsonValue(diasPrioritarios),
        diasAlternativos: asJsonValue(diasAlternativos),
        completada:
          typeof body.completada === 'boolean'
            ? body.completada
            : preferenciaExistente.completada,
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




