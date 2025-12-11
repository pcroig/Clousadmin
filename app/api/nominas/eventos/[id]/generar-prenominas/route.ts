// ========================================
// API: Generar Pre-nóminas Manualmente
// ========================================
// Genera pre-nóminas para un evento en estado "pendiente"
// Transiciona de "pendiente" a "completada"

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { generarPrenominasEvento } from '@/lib/calculos/generar-prenominas';
import { prisma } from '@/lib/prisma';
import { normalizarFechaSinHora } from '@/lib/utils/fechas';

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
    const evento = await prisma.eventos_nomina.findFirst({
      where: { id: eventoId, empresaId: session.user.empresaId },
      include: {
        nominas: {
          select: {
            complementosPendientes: true,
            alertas: {
              where: { resuelta: false },
              select: { tipo: true },
            },
          },
        },
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    // ✅ VALIDACIÓN: Solo si estado es "pendiente"
    if (evento.estado !== 'pendiente') {
      return NextResponse.json(
        {
          error: `No se pueden generar pre-nóminas. Estado actual: ${evento.estado}`,
        },
        { status: 400 }
      );
    }

    // ⚠️ Contar pendientes (NO BLOQUEA, solo para warning)
    const complementosPendientes = evento.nominas.filter(
      n => n.complementosPendientes
    ).length;

    const alertasCriticas = evento.nominas
      .flatMap(n => n.alertas)
      .filter(a => a.tipo === 'critico')
      .length;

    // Contar compensaciones de horas pendientes si el evento tiene compensarHoras=true
    let compensacionesPendientes = 0;
    if (evento.compensarHoras) {
      // ✅ Normalizar fechas para consistencia con timezone UTC
      const inicioMes = normalizarFechaSinHora(new Date(evento.anio, evento.mes - 1, 1));
      const finMes = normalizarFechaSinHora(new Date(evento.anio, evento.mes, 0));
      finMes.setHours(23, 59, 59, 999);

      compensacionesPendientes = await prisma.compensaciones_horas_extra.count({
        where: {
          empresaId: session.user.empresaId,
          tipoCompensacion: 'nomina',
          estado: 'pendiente',
          createdAt: {
            gte: inicioMes,
            lte: finMes,
          },
        },
      });
    }

    // ✅ GENERAR PRE-NÓMINAS
    const resultado = await generarPrenominasEvento({
      eventoId: evento.id,
      empresaId: session.user.empresaId,
      mes: evento.mes,
      anio: evento.anio,
    });

    // ✅ ACTUALIZAR ESTADO A "COMPLETADA"
    const eventoActualizado = await prisma.eventos_nomina.update({
      where: { id: evento.id },
      data: {
        estado: 'completada',
        prenominasGeneradas: resultado.nominasActualizadas,
      },
    });

    return NextResponse.json({
      evento: eventoActualizado,
      resultado,
      warnings: {
        complementosPendientes,
        alertasCriticas,
        compensacionesPendientes,
      },
    });
  } catch (error) {
    console.error('[POST /api/nominas/eventos/[id]/generar-prenominas] Error:', error);
    return NextResponse.json(
      { error: 'Error al generar pre-nóminas' },
      { status: 500 }
    );
  }
}
