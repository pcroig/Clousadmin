// ========================================
// API Routes - Sedes (Offices)
// ========================================

import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/sedes - List company offices
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sedes = await prisma.sedes.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        ciudad: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return NextResponse.json(sedes);
  } catch (error) {
    console.error('Error fetching offices:', error);
    return NextResponse.json({ error: 'Error al obtener sedes' }, { status: 500 });
  }
}
