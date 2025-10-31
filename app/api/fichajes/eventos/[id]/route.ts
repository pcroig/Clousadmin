// ========================================
// API FichajeEventos - Editar / Eliminar evento
// ========================================
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { tipo, hora, motivoEdicion } = body as { tipo?: string; hora?: string; motivoEdicion?: string };

    // Verificar pertenencia
    const evento = await prisma.fichajeEvento.findUnique({
      where: { id },
      include: { fichaje: true },
    });
    if (!evento || evento.fichaje.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    await prisma.fichajeEvento.update({
      where: { id },
      data: {
        tipo: (tipo as any) || evento.tipo,
        hora: hora ? new Date(hora) : evento.hora,
        editado: true,
        motivoEdicion: motivoEdicion ?? evento.motivoEdicion,
        horaOriginal: evento.horaOriginal ?? evento.hora,
      },
    });

    // Recalcular
    const { calcularHorasTrabajadas, calcularTiempoEnPausa } = await import('@/lib/calculos/fichajes');
    const actualizado = await prisma.fichaje.findUnique({ where: { id: evento.fichajeId }, include: { eventos: true } });
    if (actualizado) {
      const horasTrabajadas = calcularHorasTrabajadas(actualizado.eventos);
      const horasEnPausa = calcularTiempoEnPausa(actualizado.eventos);
      await prisma.fichaje.update({ where: { id: evento.fichajeId }, data: { horasTrabajadas, horasEnPausa } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API PATCH FichajeEvento]', error);
    return NextResponse.json({ error: 'Error al actualizar evento' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await params;
    // Verificar pertenencia
    const evento = await prisma.fichajeEvento.findUnique({ where: { id }, include: { fichaje: true } });
    if (!evento || evento.fichaje.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    await prisma.fichajeEvento.delete({ where: { id } });

    // Recalcular
    const { calcularHorasTrabajadas, calcularTiempoEnPausa } = await import('@/lib/calculos/fichajes');
    const actualizado = await prisma.fichaje.findUnique({ where: { id: evento.fichajeId }, include: { eventos: true } });
    if (actualizado) {
      const horasTrabajadas = calcularHorasTrabajadas(actualizado.eventos);
      const horasEnPausa = calcularTiempoEnPausa(actualizado.eventos);
      await prisma.fichaje.update({ where: { id: evento.fichajeId }, data: { horasTrabajadas, horasEnPausa } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API DELETE FichajeEvento]', error);
    return NextResponse.json({ error: 'Error al eliminar evento' }, { status: 500 });
  }
}


