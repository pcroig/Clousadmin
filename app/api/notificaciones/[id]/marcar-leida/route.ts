// ========================================
// API Route: Marcar Notificación como Leída
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  handleApiError,
  successResponse,
  notFoundResponse,
  forbiddenResponse,
} from '@/lib/api-handler';

// PATCH /api/notificaciones/[id]/marcar-leida
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Verificar que la notificación pertenece al usuario
    const notificacion = await prisma.notificacion.findUnique({
      where: { id },
    });

    if (!notificacion) {
      return notFoundResponse('Notificación no encontrada');
    }

    if (notificacion.usuarioId !== session.user.id) {
      return forbiddenResponse('No tienes permiso para marcar esta notificación');
    }

    // Marcar como leída
    const notificacionActualizada = await prisma.notificacion.update({
      where: { id },
      data: { leida: true },
    });

    return successResponse(notificacionActualizada);
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/notificaciones/[id]/marcar-leida');
  }
}
