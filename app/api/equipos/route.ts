// ========================================
// API Routes - Equipos
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  createdResponse,
  handleApiError,
  requireAuthAsHR,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import {
  equipoInclude,
  type EquipoWithRelations,
  formatEquipoResponse,
} from '@/lib/equipos/helpers';
import { prisma } from '@/lib/prisma';
import {
  buildPaginationMeta,
  parsePaginationParams,
} from '@/lib/utils/pagination';
import { createEquipoSchema } from '@/lib/validaciones/equipos-schemas';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    const [equiposRaw, total] = await Promise.all([
      prisma.equipos.findMany({
        where: {
          empresaId: session.user.empresaId,
        },
        include: equipoInclude,
        orderBy: {
          nombre: 'asc',
        },
        skip,
        take: limit,
      }),
      prisma.equipos.count({
        where: {
          empresaId: session.user.empresaId,
        },
      }),
    ]);

    const equipos = equiposRaw.map((team) =>
      formatEquipoResponse(team as EquipoWithRelations)
    ).filter((equipo): equipo is NonNullable<typeof equipo> => equipo !== null);

    return successResponse({
      data: equipos,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/equipos');
  }
}

// POST /api/equipos - Create team
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body con Zod
    const validationResult = await validateRequest(request, createEquipoSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Verificar que el nombre no esté duplicado en la empresa
    const existingTeam = await prisma.equipos.findFirst({
      where: {
        empresaId: session.user.empresaId,
        nombre: validatedData.nombre,
      },
      select: { id: true },
    });

    if (existingTeam) {
      return badRequestResponse('Ya existe un equipo con ese nombre');
    }

    // Verificar que la sede existe si se proporciona
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

    // Crear equipo
    const equipoRaw = await prisma.equipos.create({
      data: {
        empresaId: session.user.empresaId,
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion || null,
        sedeId: validatedData.sedeId || null,
      },
      include: equipoInclude,
    });

    const equipo = formatEquipoResponse(equipoRaw as EquipoWithRelations);

    return createdResponse(equipo);
  } catch (error) {
    return handleApiError(error, 'API POST /api/equipos');
  }
}
