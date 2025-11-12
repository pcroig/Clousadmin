// ========================================
// API Jornadas [ID] - GET, PATCH, DELETE
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jornadaUpdateSchema } from '@/lib/validaciones/schemas';
import {
  requireAuthAsHR,
  validateRequest,
  handleApiError,
  successResponse,
  notFoundResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import type { JornadaConfig } from '@/lib/calculos/fichajes-helpers';

interface Params {
  id: string;
}

// GET /api/jornadas/[id] - Obtener jornada por ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    const jornada = await prisma.jornada.findUnique({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        empleados: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
      },
    });

    if (!jornada) {
      return notFoundResponse('Jornada no encontrada');
    }

    return successResponse(jornada);
  } catch (error) {
    return handleApiError(error, 'API GET /api/jornadas/[id]');
  }
}

// PATCH /api/jornadas/[id] - Actualizar jornada
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Validar request body
    const validationResult = await validateRequest(req, jornadaUpdateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Verificar que la jornada pertenece a la empresa
    const jornadaExistente = await prisma.jornada.findUnique({
      where: { id, empresaId: session.user.empresaId },
    });

    if (!jornadaExistente) {
      return notFoundResponse('Jornada no encontrada');
    }

    // No permitir editar jornadas predefinidas
    if (jornadaExistente.esPredefinida) {
      return badRequestResponse('No se pueden editar jornadas predefinidas');
    }

    const dataToUpdate: {
      nombre?: string;
      horasSemanales?: number;
      config?: JornadaConfig;
    } = {
      nombre: validatedData.nombre,
      horasSemanales: validatedData.horasSemanales,
    };

    if (validatedData.config) {
      dataToUpdate.config = validatedData.config as JornadaConfig;
    }

    // Actualizar jornada
    const jornadaActualizada = await prisma.jornada.update({
      where: { id },
      data: dataToUpdate,
    });

    return successResponse(jornadaActualizada);
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/jornadas/[id]');
  }
}

// DELETE /api/jornadas/[id] - Eliminar jornada (marcar como inactiva)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Verificar que la jornada pertenece a la empresa
    const jornada = await prisma.jornada.findUnique({
      where: { id, empresaId: session.user.empresaId },
      include: {
        empleados: true,
      },
    });

    if (!jornada) {
      return notFoundResponse('Jornada no encontrada');
    }

    // No permitir eliminar jornadas predefinidas
    if (jornada.esPredefinida) {
      return badRequestResponse('No se pueden eliminar jornadas predefinidas');
    }

    // No permitir eliminar si hay empleados asignados
    if (jornada.empleados.length > 0) {
      return badRequestResponse(
        `No se puede eliminar. ${jornada.empleados.length} empleados tienen esta jornada asignada`
      );
    }

    // Marcar como inactiva en lugar de eliminar
    await prisma.jornada.update({
      where: { id },
      data: { activa: false },
    });

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error, 'API DELETE /api/jornadas/[id]');
  }
}

