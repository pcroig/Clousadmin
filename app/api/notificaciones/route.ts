// ========================================
// API Notificaciones
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Listar notificaciones del usuario
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const leidas = searchParams.get('leidas'); // 'true', 'false', o null (todas)
    const tipo = searchParams.get('tipo');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      usuarioId: session.user.id,
    };

    if (leidas === 'true') {
      where.leida = true;
    } else if (leidas === 'false') {
      where.leida = false;
    }

    if (tipo) {
      where.tipo = tipo;
    }

    const notificaciones = await prisma.notificacion.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({
      notificaciones,
      total: notificaciones.length,
      noLeidas: await prisma.notificacion.count({
        where: {
          usuarioId: session.user.id,
          leida: false,
        },
      }),
    });
  } catch (error) {
    console.error('[API GET Notificaciones]', error);
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
  }
}

