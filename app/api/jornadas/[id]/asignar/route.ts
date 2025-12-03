// ========================================
// API Jornadas Asignar - POST
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  handleApiError,
  notFoundResponse,
  requireAuthAsHR,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { idSchema } from '@/lib/validaciones/schemas';

const asignarSchema = z.object({
  empleadoIds: z.array(idSchema).optional(),
  equipoId: idSchema.optional(),
  aplicarATodos: z.boolean().optional(),
});

interface Params {
  id: string;
}

// POST /api/jornadas/[id]/asignar - Asignar jornada a empleados (solo HR Admin)
export async function POST(
  req: NextRequest,
  context: { params: Promise<Params> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: jornadaId } = await params;

    // Validar request body
    const validationResult = await validateRequest(req, asignarSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const { empleadoIds, equipoId, aplicarATodos } = validatedData;

    // Verificar que la jornada existe y pertenece a la empresa
    const jornada = await prisma.jornadas.findUnique({
      where: {
        id: jornadaId,
        empresaId: session.user.empresaId,
      },
    });

    if (!jornada) {
      return notFoundResponse('Jornada no encontrada');
    }

    let empleadosActualizados = 0;

    if (aplicarATodos) {
      // Aplicar a todos los empleados de la empresa
      const result = await prisma.empleados.updateMany({
        where: {
          empresaId: session.user.empresaId,
          activo: true,
        },
        data: {
          jornadaId: jornadaId,
        },
      });
      empleadosActualizados = result.count;
    } else if (equipoId) {
      // Aplicar a todos los empleados de un equipo
      const result = await prisma.empleados.updateMany({
        where: {
          empresaId: session.user.empresaId,
          equipos: {
            some: {
              equipoId: equipoId,
            },
          },
          activo: true,
        },
        data: {
          jornadaId: jornadaId,
        },
      });
      empleadosActualizados = result.count;
    } else if (empleadoIds && empleadoIds.length > 0) {
      // Aplicar a empleados específicos
      const result = await prisma.empleados.updateMany({
        where: {
          id: {
            in: empleadoIds,
          },
          empresaId: session.user.empresaId,
        },
        data: {
          jornadaId: jornadaId,
        },
      });
      empleadosActualizados = result.count;
    } else {
      return badRequestResponse('Debe especificar empleados, equipo o aplicar a todos');
    }

    return successResponse({
      success: true,
      empleadosActualizados,
      mensaje: `Jornada asignada a ${empleadosActualizados} empleado(s)`,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/jornadas/[id]/asignar');
  }
}

