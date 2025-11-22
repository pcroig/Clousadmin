// ========================================
// API Route: /api/empresa/calendario-laboral
// PATCH - Actualizar configuración de días laborables
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma, Prisma } from '@/lib/prisma';
import { calendarioLaboralUpdateSchema } from '@/lib/validaciones/schemas';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// PATCH /api/empresa/calendario-laboral - Actualizar días laborables
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR Admin puede actualizar el calendario laboral
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return badRequestResponse('No tienes permisos para modificar el calendario laboral');
    }

    const body = await req.json();
    const validationResult = calendarioLaboralUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(
        validationResult.error.issues[0]?.message || 'Datos inválidos'
      );
    }

    const diasLaborables = validationResult.data;

    // Obtener empresa actual
    const empresa = await prisma.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: { config: true },
    });

    if (!empresa) {
      return badRequestResponse('Empresa no encontrada');
    }

    // Actualizar config con días laborables
    const configActual = empresa.config as Prisma.JsonValue;
    const nuevaConfig: Prisma.JsonValue = {
      ...(typeof configActual === 'object' && configActual !== null ? configActual : {}),
      diasLaborables,
    };

    // Actualizar empresa
    await prisma.empresa.update({
      where: { id: session.user.empresaId },
      data: {
        config: nuevaConfig as Prisma.InputJsonValue,
      },
    });

    console.info(`[Calendario Laboral] Días laborables actualizados para empresa ${session.user.empresaId}:`, diasLaborables);

    return successResponse({
      message: 'Calendario laboral actualizado exitosamente',
      diasLaborables,
    });
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/empresa/calendario-laboral');
  }
}

// GET /api/empresa/calendario-laboral - Obtener configuración actual
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const empresa = await prisma.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: { config: true },
    });

    if (!empresa) {
      return badRequestResponse('Empresa no encontrada');
    }

    const config = empresa.config as Prisma.JsonValue;
    const diasLaborables = (
      typeof config === 'object' && config !== null && 'diasLaborables' in config
        ? config.diasLaborables
        : null
    ) || {
      lunes: true,
      martes: true,
      miercoles: true,
      jueves: true,
      viernes: true,
      sabado: false,
      domingo: false,
    };

    return successResponse({ diasLaborables });
  } catch (error) {
    return handleApiError(error, 'API GET /api/empresa/calendario-laboral');
  }
}

