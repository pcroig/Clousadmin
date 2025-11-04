// ========================================
// API Route: Marcar Todas las Notificaciones como Leídas
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, successResponse } from '@/lib/api-handler';

// POST /api/notificaciones/marcar-todas-leidas
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Marcar todas las notificaciones del usuario como leídas
    const resultado = await prisma.notificacion.updateMany({
      where: {
        usuarioId: session.user.id,
        leida: false,
      },
      data: {
        leida: true,
      },
    });

    return successResponse({
      success: true,
      count: resultado.count,
      message: `${resultado.count} notificaciones marcadas como leídas`,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/notificaciones/marcar-todas-leidas');
  }
}
