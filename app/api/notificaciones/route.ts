// ========================================
// API: Notificaciones
// ========================================
// GET: Obtener notificaciones del usuario autenticado

import { NextRequest } from 'next/server';
import { prisma, Prisma } from '@/lib/prisma';
import {
  requireAuth,
  handleApiError,
  successResponse,
} from '@/lib/api-handler';
import {
  parsePaginationParams,
  buildPaginationMeta,
} from '@/lib/utils/pagination';

// GET /api/notificaciones - Obtener notificaciones del usuario autenticado
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const leida = searchParams.get('leida'); // 'true', 'false', o null (todas)
    const tipo = searchParams.get('tipo');
    const countOnly = searchParams.get('count') === 'true';

    // Construir filtros
    const where: Prisma.NotificacionWhereInput = {
      usuarioId: session.user.id,
      empresaId: session.user.empresaId,
    };

    // Filtro por estado leída
    if (leida === 'true') {
      where.leida = true;
    } else if (leida === 'false') {
      where.leida = false;
    }
    // Si leida es null o 'all', no se filtra

    // Filtro por tipo
    if (tipo) {
      where.tipo = tipo;
    }

    const noLeidasWhere: Prisma.NotificacionWhereInput = {
      usuarioId: session.user.id,
      empresaId: session.user.empresaId,
      leida: false,
    };

    if (countOnly) {
      const count = await prisma.notificacion.count({
        where: noLeidasWhere,
      });
      return successResponse({ count });
    }

    const { page, limit, skip } = parsePaginationParams(searchParams);

    const [notificaciones, total, noLeidas] = await Promise.all([
      prisma.notificacion.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.notificacion.count({ where }),
      prisma.notificacion.count({
        where: noLeidasWhere,
      }),
    ]);

    return successResponse({
      data: notificaciones,
      pagination: buildPaginationMeta(page, limit, total),
      metrics: {
        noLeidas,
      },
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/notificaciones');
  }
}
