// ========================================
// API Organización - Listar Equipos
// ========================================
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const equipos = await prisma.equipo.findMany({
      where: { empresaId: session.user.empresaId },
      include: {
        _count: { select: { miembros: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json(
      equipos.map((e) => ({ id: e.id, nombre: e.nombre, _count: { miembros: e._count.miembros } }))
    );
  } catch (error) {
    console.error('[API GET Equipos]', error);
    return NextResponse.json({ error: 'Error al obtener equipos' }, { status: 500 });
  }
}


