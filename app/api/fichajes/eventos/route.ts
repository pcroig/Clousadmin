// ========================================
// API FichajeEventos - Crear evento
// ========================================
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const { fichajeId, tipo, hora, motivoEdicion } = body as {
      fichajeId: string; tipo: 'entrada'|'pausa_inicio'|'pausa_fin'|'salida'; hora: string; motivoEdicion?: string;
    };

    const fichaje = await prisma.fichaje.findFirst({ where: { id: fichajeId, empresaId: session.user.empresaId } });
    if (!fichaje) return NextResponse.json({ error: 'Fichaje no encontrado' }, { status: 404 });

    const evento = await prisma.fichajeEvento.create({
      data: {
        fichajeId,
        tipo,
        hora: new Date(hora),
        editado: Boolean(motivoEdicion),
        motivoEdicion: motivoEdicion || null,
      },
    });

    // Recalcular
    const { calcularHorasTrabajadas, calcularTiempoEnPausa } = await import('@/lib/calculos/fichajes');
    const actualizado = await prisma.fichaje.findUnique({ where: { id: fichajeId }, include: { eventos: true } });
    if (actualizado) {
      const horasTrabajadas = calcularHorasTrabajadas(actualizado.eventos);
      const horasEnPausa = calcularTiempoEnPausa(actualizado.eventos);
      await prisma.fichaje.update({ where: { id: fichajeId }, data: { horasTrabajadas, horasEnPausa } });
    }

    return NextResponse.json({ success: true, eventoId: evento.id });
  } catch (error) {
    console.error('[API POST FichajeEvento]', error);
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 });
  }
}


