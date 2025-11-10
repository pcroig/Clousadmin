// ========================================
// API Route: Preferencia de Vacaciones del Empleado
// ========================================

import { NextRequest } from 'next/server';
import { prisma, Prisma } from '@/lib/prisma';
import {
  requireAuth,
  handleApiError,
  successResponse,
  badRequestResponse,
} from '@/lib/api-handler';

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

    // Validar datos
    if (!body.diasIdeales && !body.diasPrioritarios && !body.diasAlternativos) {
      return badRequestResponse('Debe seleccionar al menos una fecha');
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
        diasIdeales: (body.diasIdeales || []) as unknown as Prisma.InputJsonValue,
        diasPrioritarios: (body.diasPrioritarios || []) as unknown as Prisma.InputJsonValue,
        diasAlternativos: (body.diasAlternativos || []) as unknown as Prisma.InputJsonValue,
        completada: body.completada !== undefined ? body.completada : preferenciaExistente.completada,
      },
    });

    // Si se marcó como completada, actualizar contador de la campaña
    if (body.completada === true && !preferenciaExistente.completada) {
      await prisma.campanaVacaciones.update({
        where: { id: campanaId },
        data: {
          empleadosCompletados: {
            increment: 1,
          },
        },
      });
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




