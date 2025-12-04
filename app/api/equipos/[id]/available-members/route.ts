// ========================================
// API Routes - Available Members for Team
// ========================================

import { NextRequest } from 'next/server';

import {
  handleApiError,
  notFoundResponse,
  requireAuthAsHR,
  successResponse,
} from '@/lib/api-handler';
import { getTeamMemberIds, validateTeamBelongsToCompany } from '@/lib/equipos/helpers';
import { prisma } from '@/lib/prisma';


type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// GET /api/equipos/[id]/available-members - Get employees not in this team
export async function GET(request: NextRequest, context: RouteParams) {
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

    // Obtener todos los empleados activos de la empresa
    const allEmployees = await prisma.empleados.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        fotoUrl: true,
        puesto: true,
      },
      orderBy: [
        { apellidos: 'asc' },
        { nombre: 'asc' },
      ],
    });

    // Obtener miembros actuales del equipo
    const teamMemberIds = await getTeamMemberIds(equipoId);
    const teamMemberIdsSet = new Set(teamMemberIds);

    // Filtrar empleados que ya son miembros
    const availableEmployees = allEmployees.filter(
      (emp) => !teamMemberIdsSet.has(emp.id)
    );

    return successResponse(availableEmployees);
  } catch (error) {
    return handleApiError(error, 'API GET /api/equipos/[id]/available-members');
  }
}
