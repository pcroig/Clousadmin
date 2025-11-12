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
    const limit = searchParams.get('limit');

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

    // Obtener notificaciones
    const notificaciones = await prisma.notificacion.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit ? parseInt(limit) : undefined,
    });

    // Contar no leídas
    const noLeidas = await prisma.notificacion.count({
      where: {
        usuarioId: session.user.id,
        empresaId: session.user.empresaId,
        leida: false,
      },
    });

    return successResponse({
      notificaciones,
      total: notificaciones.length,
      noLeidas,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/notificaciones');
  }
}
