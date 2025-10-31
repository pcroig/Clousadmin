// ========================================
// API Calendario - Marcar/Desmarcar fecha no laborable (empresa)
// ========================================
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const fechaStr = body?.fecha as string;
    const nombre = (body?.nombre as string) || 'No laborable';
    if (!fechaStr) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });

    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });

    await prisma.festivo.upsert({
      where: {
        empresaId_fecha: {
          empresaId: session.user.empresaId,
          fecha,
        },
      },
      update: {
        nombre,
        tipo: 'empresa',
        origen: 'manual',
        activo: true,
      },
      create: {
        empresaId: session.user.empresaId,
        fecha,
        nombre,
        tipo: 'empresa',
        origen: 'manual',
        activo: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API POST Calendario Fecha]', error);
    return NextResponse.json({ error: 'Error al marcar fecha' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fechaStr = searchParams.get('fecha');
    if (!fechaStr) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });

    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });

    await prisma.festivo.deleteMany({
      where: {
        empresaId: session.user.empresaId,
        fecha,
        tipo: 'empresa',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API DELETE Calendario Fecha]', error);
    return NextResponse.json({ error: 'Error al desmarcar fecha' }, { status: 500 });
  }
}
