// ========================================
// API: Generar Pre-nóminas manualmente
// ========================================
// Permite recalcular o completar pre-nóminas de un evento existente

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generarPrenominasEvento } from '@/lib/calculos/generar-prenominas';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const evento = await prisma.eventoNomina.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (evento.estado === 'cerrado' || evento.fechaPublicacion) {
      return NextResponse.json(
        { error: 'El evento ya está cerrado o publicado. No se pueden regenerar las pre-nóminas.' },
        { status: 400 }
      );
    }

    const resultado = await generarPrenominasEvento({
      eventoId: evento.id,
      empresaId: session.user.empresaId,
      mes: evento.mes,
      anio: evento.anio,
    });

    const eventoActualizado = await prisma.eventoNomina.findUnique({
      where: { id: evento.id },
    });

    return NextResponse.json({
      evento: eventoActualizado,
      resultado,
    });
  } catch (error) {
    console.error('[POST /api/nominas/eventos/[id]/generar-prenominas] Error:', error);
    return NextResponse.json(
      { error: 'Error al generar pre-nóminas' },
      { status: 500 }
    );
  }
}





