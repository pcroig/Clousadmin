// ========================================
// API Organizacion - Política de Ausencias de Equipo
// ========================================

import { NextRequest } from 'next/server';

import {
  handleApiError,
  notFoundResponse,
  requireAuthAsHR,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { validateTeamBelongsToCompany } from '@/lib/equipos/helpers';
import { prisma } from '@/lib/prisma';
import { politicaAusenciasSchema } from '@/lib/validaciones/equipos-schemas';

// GET /api/organizacion/equipos/[id]/politica - Obtener política del equipo
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = params;

    // Validar que el equipo pertenece a la empresa
    const belongsToCompany = await validateTeamBelongsToCompany(id, session.user.empresaId);
    if (!belongsToCompany) {
      return notFoundResponse('Equipo no encontrado');
    }

    // Obtener política o devolver valores por defecto
    const politica = await prisma.equipo_politica_ausencias.findUnique({
      where: { equipoId: id },
      select: {
        equipoId: true,
        maxSolapamientoPct: true,
        requiereAntelacionDias: true,
      },
    });

    if (!politica) {
      // Devolver valores por defecto
      return successResponse({
        equipoId: id,
        maxSolapamientoPct: 50,
        requiereAntelacionDias: 5,
        isDefault: true,
      });
    }

    return successResponse({
      ...politica,
      isDefault: false,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/organizacion/equipos/[id]/politica');
  }
}

// PUT /api/organizacion/equipos/[id]/politica - Crear o actualizar política
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = params;

    // Validar que el equipo pertenece a la empresa
    const belongsToCompany = await validateTeamBelongsToCompany(id, session.user.empresaId);
    if (!belongsToCompany) {
      return notFoundResponse('Equipo no encontrado');
    }

    // Validar request body
    const validationResult = await validateRequest(req, politicaAusenciasSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data } = validationResult;

    // Crear o actualizar política
    const politica = await prisma.equipo_politica_ausencias.upsert({
      where: { equipoId: id },
      create: {
        equipoId: id,
        empresaId: session.user.empresaId,
        maxSolapamientoPct: data.maxSolapamientoPct,
        requiereAntelacionDias: data.requiereAntelacionDias,
      },
      update: {
        maxSolapamientoPct: data.maxSolapamientoPct,
        requiereAntelacionDias: data.requiereAntelacionDias,
      },
      select: {
        equipoId: true,
        maxSolapamientoPct: true,
        requiereAntelacionDias: true,
        empresaId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(politica);
  } catch (error) {
    return handleApiError(error, 'API PUT /api/organizacion/equipos/[id]/politica');
  }
}





























