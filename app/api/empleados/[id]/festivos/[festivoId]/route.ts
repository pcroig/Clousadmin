import { NextRequest, NextResponse as Response } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  notFoundResponse,
  requireAuthAsHR,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { empleadoFestivoUpdateSchema } from '@/lib/validaciones/schemas';

// PATCH /api/empleados/[id]/festivos/[festivoId] - Editar festivo personalizado
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; festivoId: string }> }
) {
  const params = await context.params;
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: empleadoId, festivoId } = params;

    // Verificar que el empleado existe y pertenece a la empresa
    const empleado = await prisma.empleados.findUnique({
      where: {
        id: empleadoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    // Validar request body
    const validationResult = await validateRequest(request, empleadoFestivoUpdateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Verificar que el festivo existe y pertenece al empleado
    const festivoExistente = await prisma.empleado_festivos.findUnique({
      where: {
        id: festivoId,
        empleadoId,
      },
    });

    if (!festivoExistente) {
      return notFoundResponse('Festivo personalizado no encontrado');
    }

    // Preparar datos para actualizar
    const dataToUpdate: {
      nombre?: string;
      fecha?: Date;
      activo?: boolean;
    } = {};

    if (validatedData.nombre !== undefined) {
      dataToUpdate.nombre = validatedData.nombre;
    }

    if (validatedData.fecha !== undefined) {
      const fecha = new Date(validatedData.fecha);
      if (isNaN(fecha.getTime())) {
        return badRequestResponse('Fecha inválida');
      }

      // Verificar que no exista otro festivo para esta nueva fecha
      if (fecha.getTime() !== festivoExistente.fecha.getTime()) {
    const otroFestivo = await prisma.empleado_festivos.findFirst({
          where: {
            empleadoId,
            fecha,
            id: { not: festivoId },
          },
        });

        if (otroFestivo) {
          return badRequestResponse('Ya existe un festivo personalizado para esta fecha');
        }
      }

      dataToUpdate.fecha = fecha;
    }

    if (validatedData.activo !== undefined) {
      dataToUpdate.activo = validatedData.activo;
    }

    // Actualizar festivo
    const festivo = await prisma.empleado_festivos.update({
      where: {
        id: festivoId,
      },
      data: dataToUpdate,
    });

    return successResponse(festivo);
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/empleados/[id]/festivos/[festivoId]');
  }
}

// DELETE /api/empleados/[id]/festivos/[festivoId] - Eliminar festivo personalizado
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; festivoId: string }> }
) {
  const params = await context.params;
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: empleadoId, festivoId } = params;

    // Verificar que el empleado existe y pertenece a la empresa
    const empleado = await prisma.empleados.findUnique({
      where: {
        id: empleadoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    // Verificar que el festivo existe y pertenece al empleado
    const festivoExistente = await prisma.empleado_festivos.findUnique({
      where: {
        id: festivoId,
        empleadoId,
      },
    });

    if (!festivoExistente) {
      return notFoundResponse('Festivo personalizado no encontrado');
    }

    // Eliminar festivo
    await prisma.empleado_festivos.delete({
      where: {
        id: festivoId,
      },
    });

    return successResponse({ message: 'Festivo eliminado correctamente' });
  } catch (error) {
    return handleApiError(error, 'API DELETE /api/empleados/[id]/festivos/[festivoId]');
  }
}

