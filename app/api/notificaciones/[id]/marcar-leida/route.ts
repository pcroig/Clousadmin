// ========================================
// API Marcar Notificación como Leída
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH: Marcar notificación como leída
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: notificacionId } = await params;

    // Verificar que la notificación pertenece al usuario
    const notificacion = await prisma.notificacion.findFirst({
      where: {
        id: notificacionId,
        usuarioId: session.user.id,
      },
    });

    if (!notificacion) {
      return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });
    }

    // Marcar como leída
    await prisma.notificacion.update({
      where: { id: notificacionId },
      data: { leida: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API PATCH Marcar Leída]', error);
    return NextResponse.json({ error: 'Error al marcar notificación' }, { status: 500 });
  }
}

