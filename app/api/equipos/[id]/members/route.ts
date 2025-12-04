// ========================================
// API Routes - Team Members
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
  validateEmployeeIsTeamMember,
  validateTeamBelongsToCompany,
} from '@/lib/equipos/helpers';
import { prisma } from '@/lib/prisma';
import { addMemberSchema } from '@/lib/validaciones/equipos-schemas';


type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// POST /api/equipos/[id]/members - Add member to team
export async function POST(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: equipoId } = params;

    // Validar que el equipo pertenece a la empresa
    const belongsToCompany = await validateTeamBelongsToCompany(equipoId, session.user.empresaId);
    if (!belongsToCompany) {
      return notFoundResponse('Equipo no encontrado');
    }

    // Validar request body
    const validationResult = await validateRequest(request, addMemberSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Verificar que el empleado existe y pertenece a la empresa
    const employee = await prisma.empleados.findFirst({
      where: {
        id: validatedData.empleadoId,
        empresaId: session.user.empresaId,
        activo: true,
      },
      select: { id: true },
    });

    if (!employee) {
      return notFoundResponse('Empleado no encontrado');
    }

    // Verificar que no sea ya miembro
    const isMember = await validateEmployeeIsTeamMember(validatedData.empleadoId, equipoId);
    if (isMember) {
      return badRequestResponse('El empleado ya es miembro del equipo');
    }

    // Agregar miembro
    await prisma.empleado_equipos.create({
      data: {
        empleadoId: validatedData.empleadoId,
        equipoId,
      },
    });

    // Retornar equipo actualizado
    const updatedTeamRaw = await prisma.equipos.findUnique({
      where: { id: equipoId },
      include: equipoInclude,
    });

    const updatedTeam = formatEquipoResponse(updatedTeamRaw as EquipoWithRelations);

    return successResponse(updatedTeam);
  } catch (error) {
    return handleApiError(error, 'API POST /api/equipos/[id]/members');
  }
}

// DELETE /api/equipos/[id]/members - Remove member from team
export async function DELETE(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: equipoId } = params;
    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get('empleadoId');

    if (!empleadoId) {
      return badRequestResponse('empleadoId es requerido en query params');
    }

    // Validar que el equipo pertenece a la empresa
    const team = await prisma.equipos.findFirst({
      where: {
        id: equipoId,
        empresaId: session.user.empresaId,
      },
      select: { id: true, managerId: true },
    });

    if (!team) {
      return notFoundResponse('Equipo no encontrado');
    }

    // Verificar que el empleado es miembro del equipo
    const isMember = await validateEmployeeIsTeamMember(empleadoId, equipoId);
    if (!isMember) {
      return badRequestResponse('El empleado no es miembro del equipo');
    }

    // Si es el manager, quitarlo como manager primero
    if (team.managerId === empleadoId) {
      await prisma.equipos.update({
        where: { id: equipoId },
        data: { managerId: null },
      });
    }

    // Eliminar miembro
    await prisma.empleado_equipos.delete({
      where: {
        empleadoId_equipoId: {
          empleadoId,
          equipoId,
        },
      },
    });

    // Retornar equipo actualizado
    const updatedTeamRaw = await prisma.equipos.findUnique({
      where: { id: equipoId },
      include: equipoInclude,
    });

    const updatedTeam = formatEquipoResponse(updatedTeamRaw as EquipoWithRelations);

    return successResponse(updatedTeam);
  } catch (error) {
    return handleApiError(error, 'API DELETE /api/equipos/[id]/members');
  }
}
