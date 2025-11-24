// ========================================
// API Organizacion - Política de Ausencias de Equipo
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  handleApiError,
  notFoundResponse,
  requireAuthAsHR,
  successResponse,
} from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { getJsonBody } from '@/lib/utils/json';

// Schema de validación
const politicaSchema = z.object({
  maxSolapamientoPct: z.number().int().min(0).max(100),
  requiereAntelacionDias: z.number().int().min(0).max(365),
});

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

    const { id } = await params;

    // Verificar que el equipo existe y pertenece a la empresa
    const equipo = await prisma.equipo.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!equipo) {
      return notFoundResponse('Equipo no encontrado');
    }

    // Obtener política o devolver valores por defecto
    const politica = await prisma.equipoPoliticaAusencias.findUnique({
      where: { equipoId: id },
    });

    if (!politica) {
      // Devolver valores por defecto
      return successResponse({
        equipoId: id,
        maxSolapamientoPct: 50,
        requiereAntelacionDias: 5,
      });
    }

    return successResponse({
      equipoId: politica.equipoId,
      maxSolapamientoPct: politica.maxSolapamientoPct,
      requiereAntelacionDias: politica.requiereAntelacionDias,
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

    const { id } = await params;

    // Verificar que el equipo existe y pertenece a la empresa
    const equipo = await prisma.equipo.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!equipo) {
      return notFoundResponse('Equipo no encontrado');
    }

    const payload = await getJsonBody<Record<string, unknown>>(req);
    const validationResult = politicaSchema.safeParse(payload);

    if (!validationResult.success) {
      return badRequestResponse(
        validationResult.error.issues[0]?.message || 'Datos inválidos'
      );
    }

    const { data } = validationResult;

    // Crear o actualizar política
    const politica = await prisma.equipoPoliticaAusencias.upsert({
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
    });

    return successResponse(politica);
  } catch (error) {
    return handleApiError(error, 'API PUT /api/organizacion/equipos/[id]/politica');
  }
}





























