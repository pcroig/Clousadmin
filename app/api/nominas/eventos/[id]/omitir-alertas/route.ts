// ========================================
// API: Omitir Alertas Globalmente
// ========================================
// Marca todas las alertas de un evento como resueltas/omitidas

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const session = await getSession();

  if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id: eventoId } = params;

  try {
    // Verificar que el evento existe y pertenece a la empresa
    const evento = await prisma.eventos_nomina.findFirst({
      where: {
        id: eventoId,
        empresaId: session.user.empresaId,
      },
      include: {
        nominas: {
          select: { id: true },
        },
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    const nominaIds = evento.nominas.map(n => n.id);

    // Marcar todas las alertas de las nóminas del evento como resueltas
    const result = await prisma.alertas_nomina.updateMany({
      where: {
        nominaId: { in: nominaIds },
        resuelta: false, // Solo actualizar las que no están resueltas
      },
      data: {
        resuelta: true,
        fechaResolucion: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      alertasOmitidas: result.count,
      message: `${result.count} alertas omitidas correctamente`,
    });
  } catch (error) {
    console.error('[POST /api/nominas/eventos/[id]/omitir-alertas] Error:', error);
    return NextResponse.json(
      { error: 'Error al omitir alertas' },
      { status: 500 }
    );
  }
}
