// ========================================
// API Marcar Todas las Notificaciones como Leídas
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST: Marcar todas las notificaciones del usuario como leídas
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const tipo = body.tipo; // Opcional: filtrar por tipo

    const where: any = {
      usuarioId: session.user.id,
      leida: false,
    };

    if (tipo) {
      where.tipo = tipo;
    }

    const resultado = await prisma.notificacion.updateMany({
      where,
      data: { leida: true },
    });

    return NextResponse.json({
      success: true,
      marcadas: resultado.count,
    });
  } catch (error) {
    console.error('[API POST Marcar Todas Leídas]', error);
    return NextResponse.json({ error: 'Error al marcar notificaciones' }, { status: 500 });
  }
}

