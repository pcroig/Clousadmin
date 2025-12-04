// ========================================
// API Routes - Team Manager
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
import { changeManagerSchema } from '@/lib/validaciones/equipos-schemas';


type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// PATCH /api/equipos/[id]/manager - Change team manager
export async function PATCH(request: NextRequest, context: RouteParams) {
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
    const validationResult = await validateRequest(request, changeManagerSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Si se proporciona un managerId, verificar que sea miembro del equipo
    if (validatedData.managerId) {
      const isMember = await validateEmployeeIsTeamMember(validatedData.managerId, equipoId);
      if (!isMember) {
        return badRequestResponse('El responsable debe ser miembro del equipo');
      }
    }

    // Actualizar manager
    const updatedTeamRaw = await prisma.equipos.update({
      where: { id: equipoId },
      data: {
        managerId: validatedData.managerId,
      },
      include: equipoInclude,
    });

    const updatedTeam = formatEquipoResponse(updatedTeamRaw as EquipoWithRelations);

    return successResponse(updatedTeam);
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/equipos/[id]/manager');
  }
}
