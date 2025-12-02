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
import { empleadoFestivoCreateSchema } from '@/lib/validaciones/schemas';

// GET /api/empleados/[id]/festivos - Listar festivos personalizados del empleado
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: empleadoId } = params;

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

    // Obtener festivos personalizados del empleado
    const festivos = await prisma.empleado_festivos.findMany({
      where: {
        empleadoId,
      },
      orderBy: {
        fecha: 'asc',
      },
    });

    return successResponse(festivos);
  } catch (error) {
    return handleApiError(error, 'API GET /api/empleados/[id]/festivos');
  }
}

// POST /api/empleados/[id]/festivos - Crear festivo personalizado para empleado
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: empleadoId } = params;

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
    const validationResult = await validateRequest(request, empleadoFestivoCreateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Asegurar que el empleadoId del path coincide con el del body
    if (validatedData.empleadoId && validatedData.empleadoId !== empleadoId) {
      return badRequestResponse('El ID del empleado no coincide con el de la URL');
    }

    // Parsear fecha
    const fecha = new Date(validatedData.fecha);
    if (isNaN(fecha.getTime())) {
      return badRequestResponse('Fecha inválida');
    }

    // Verificar que no exista ya un festivo para esta fecha y empleado
    const festivoExistente = await prisma.empleado_festivos.findFirst({
      where: {
        empleadoId,
        fecha,
      },
    });

    if (festivoExistente) {
      return badRequestResponse('Ya existe un festivo personalizado para esta fecha');
    }

    // Crear festivo personalizado
    const festivo = await prisma.empleado_festivos.create({
      data: {
        empleadoId,
        fecha,
        nombre: validatedData.nombre,
        activo: validatedData.activo ?? true,
      },
    });

    return successResponse(festivo, 201);
  } catch (error) {
    return handleApiError(error, 'API POST /api/empleados/[id]/festivos');
  }
}

