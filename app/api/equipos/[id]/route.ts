// ========================================
// API Routes - Equipo by ID
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
import {
  equipoInclude,
  type EquipoWithRelations,
  formatEquipoResponse,
  validateTeamBelongsToCompany,
} from '@/lib/equipos/helpers';
import { prisma } from '@/lib/prisma';
import { updateEquipoSchema } from '@/lib/validaciones/equipos-schemas';


type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// PATCH /api/equipos/[id] - Update team
export async function PATCH(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = params;

    // Validar que el equipo pertenece a la empresa
    const belongsToCompany = await validateTeamBelongsToCompany(id, session.user.empresaId);
    if (!belongsToCompany) {
      return notFoundResponse('Equipo no encontrado');
    }

    // Validar request body con Zod
    const validationResult = await validateRequest(request, updateEquipoSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Si se actualiza el nombre, verificar que no esté duplicado
    if (validatedData.nombre) {
      const nameConflict = await prisma.equipos.findFirst({
        where: {
          empresaId: session.user.empresaId,
          nombre: validatedData.nombre,
          id: { not: id },
        },
        select: { id: true },
      });

      if (nameConflict) {
        return badRequestResponse('Ya existe un equipo con ese nombre');
      }
    }

    // Si se actualiza la sede, verificar que existe
    if (validatedData.sedeId) {
      const sede = await prisma.sedes.findFirst({
        where: {
          id: validatedData.sedeId,
          empresaId: session.user.empresaId,
        },
        select: { id: true },
      });

      if (!sede) {
        return badRequestResponse('La sede especificada no existe');
      }
    }

    // Construir datos de actualización solo con campos proporcionados
    const updateData: Record<string, unknown> = {};
    if (validatedData.nombre !== undefined) updateData.nombre = validatedData.nombre;
    if (validatedData.descripcion !== undefined) updateData.descripcion = validatedData.descripcion;
    if (validatedData.sedeId !== undefined) updateData.sedeId = validatedData.sedeId;

    const updatedTeamRaw = await prisma.equipos.update({
      where: { id },
      data: updateData,
      include: equipoInclude,
    });

    const updatedTeam = formatEquipoResponse(updatedTeamRaw as EquipoWithRelations);

    return successResponse(updatedTeam);
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/equipos/[id]');
  }
}

// DELETE /api/equipos/[id] - Delete team
export async function DELETE(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = params;

    // Validar que el equipo pertenece a la empresa
    const belongsToCompany = await validateTeamBelongsToCompany(id, session.user.empresaId);
    if (!belongsToCompany) {
      return notFoundResponse('Equipo no encontrado');
    }

    // Eliminar equipo (cascade eliminará empleado_equipos automáticamente)
    await prisma.equipos.delete({
      where: { id },
    });

    return successResponse({ success: true, message: 'Equipo eliminado correctamente' });
  } catch (error) {
    return handleApiError(error, 'API DELETE /api/equipos/[id]');
  }
}
