// ========================================
// API Jornadas [ID] - GET, PATCH, DELETE
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  notFoundResponse,
  requireAuthAsHR,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { prisma, Prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';
import { jornadaUpdateSchema } from '@/lib/validaciones/schemas';

import type { JornadaConfig } from '@/lib/calculos/fichajes-helpers';

interface Params {
  id: string;
}

// GET /api/jornadas/[id] - Obtener jornada por ID
export async function GET(
  req: NextRequest,
  context: { params: Promise<Params> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    const jornada = await prisma.jornadas.findUnique({
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
          where: {
            activo: true,
          },
        },
        asignacion: true, // ✅ Incluir metadata de asignación
      },
    });

    if (!jornada) {
      return notFoundResponse('Jornada no encontrada');
    }

    return successResponse({ data: jornada });
  } catch (error) {
    return handleApiError(error, 'API GET /api/jornadas/[id]');
  }
}

// PATCH /api/jornadas/[id] - Actualizar jornada
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<Params> }
) {
    const params = await context.params;
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
    const jornadaExistente = await prisma.jornadas.findUnique({
      where: { id, empresaId: session.user.empresaId },
    });

    if (!jornadaExistente) {
      return notFoundResponse('Jornada no encontrada');
    }

    // No permitir editar jornadas predefinidas
    if (jornadaExistente.esPredefinida) {
      return badRequestResponse('No se pueden editar jornadas predefinidas');
    }

    const dataToUpdate: Prisma.jornadasUpdateInput = {
      // NOTE: 'nombre' field has been removed from Jornada model
      horasSemanales: validatedData.horasSemanales,
    };

    // NOTE: 'tipo' se guarda dentro de config.tipo, no como campo separado
    if (validatedData.config) {
      dataToUpdate.config = asJsonValue(validatedData.config as JornadaConfig);
    }

    // Actualizar jornada
    const jornadaActualizada = await prisma.jornadas.update({
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
  context: { params: Promise<Params> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Verificar que la jornada pertenece a la empresa
    const jornada = await prisma.jornadas.findUnique({
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

    // Si hay empleados asignados, desasignarlos automáticamente
    if (jornada.empleados.length > 0) {
      await prisma.$transaction(async (tx) => {
        // 1. Desasignar todos los empleados (setear jornadaId a null)
        await tx.empleados.updateMany({
          where: { jornadaId: id },
          data: { jornadaId: null },
        });

        // 2. Eliminar registro de asignación si existe
        await tx.jornada_asignaciones.deleteMany({
          where: { jornadaId: id },
        });

        // 3. Marcar jornada como inactiva
        await tx.jornadas.update({
          where: { id },
          data: { activa: false },
        });
      });

      return successResponse({
        success: true,
        empleadosDesasignados: jornada.empleados.length,
      });
    }

    // Si no hay empleados, simplemente marcar como inactiva
    await prisma.jornadas.update({
      where: { id },
      data: { activa: false },
    });

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error, 'API DELETE /api/jornadas/[id]');
  }
}

