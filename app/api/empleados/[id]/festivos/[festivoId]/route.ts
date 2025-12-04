// ========================================
// API Festivo Personalizado Individual
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  handleApiError,
  notFoundResponse,
  requireAuth,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const festivoUpdateSchema = z.object({
  estado: z.enum(['aprobado', 'rechazado']).optional(),
});

// PATCH /api/empleados/[id]/festivos/[festivoId] - Aprobar/rechazar (solo HR)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; festivoId: string }> }
) {
  const params = await context.params;
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: empleadoId, festivoId } = params;

    // Solo HR puede aprobar/rechazar
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return badRequestResponse('No tienes permisos');
    }

    const validationResult = await validateRequest(req, festivoUpdateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data } = validationResult;

    const festivo = await prisma.empleado_festivos.findFirst({
      where: {
        id: festivoId,
        empleadoId,
      },
      include: {
        empleado: {
          select: { empresaId: true },
        },
      },
    });

    if (!festivo) {
      return notFoundResponse('Festivo no encontrado');
    }

    if (festivo.empleado.empresaId !== session.user.empresaId) {
      return badRequestResponse('No pertenece a tu empresa');
    }

    const actualizado = await prisma.empleado_festivos.update({
      where: { id: festivoId },
      data: {
        estado: data.estado,
        aprobadoPor: data.estado === 'aprobado' ? session.user.id : null,
      },
    });

    console.info(
      `[Festivos Empleado] ${data.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}: ${actualizado.nombre}`
    );

    return successResponse({
      id: actualizado.id,
      estado: actualizado.estado,
    });
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/empleados/[id]/festivos/[festivoId]');
  }
}

// DELETE /api/empleados/[id]/festivos/[festivoId]
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; festivoId: string }> }
) {
  const params = await context.params;
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: empleadoId, festivoId } = params;

    const festivo = await prisma.empleado_festivos.findFirst({
      where: {
        id: festivoId,
        empleadoId,
      },
      include: {
        empleado: {
          select: { empresaId: true },
        },
      },
    });

    if (!festivo) {
      return notFoundResponse('Festivo no encontrado');
    }

    if (festivo.empleado.empresaId !== session.user.empresaId) {
      return badRequestResponse('No pertenece a tu empresa');
    }

    // HR puede eliminar cualquiera
    // Empleado solo puede eliminar sus propias solicitudes pendientes
    const isHR = session.user.rol === UsuarioRol.hr_admin;
    const isOwn = festivo.solicitadoPor === session.user.id;

    if (!isHR && (!isOwn || festivo.estado !== 'pendiente')) {
      return badRequestResponse('No puedes eliminar este festivo');
    }

    await prisma.empleado_festivos.delete({
      where: { id: festivoId },
    });

    console.info(
      `[Festivos Empleado] Eliminado: ${festivo.nombre}`
    );

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error, 'API DELETE /api/empleados/[id]/festivos/[festivoId]');
  }
}
