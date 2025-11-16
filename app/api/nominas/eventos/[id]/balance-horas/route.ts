'use server';

// ========================================
// API: Balance de horas por evento
// ========================================
// Devuelve los empleados del evento con su balance mensual de horas

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { calcularBalanceMensual } from '@/lib/calculos/balance-horas';

async function balanceHorasHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: eventoId } = await params;

    const evento = await prisma.eventoNomina.findFirst({
      where: {
        id: eventoId,
        empresaId: session.user.empresaId,
      },
      include: {
        nominas: {
          select: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
                equipos: {
                  include: {
                    equipo: {
                      select: {
                        id: true,
                        nombre: true,
                        managerId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (!['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const balances = [];

    for (const nomina of evento.nominas) {
      const balance = await calcularBalanceMensual(
        nomina.empleado.id,
        evento.mes,
        evento.anio
      );

      balances.push({
        empleado: nomina.empleado,
        balance,
      });
    }

    return NextResponse.json({
      mes: evento.mes,
      anio: evento.anio,
      balances,
    });
  } catch (error) {
    console.error('[GET /api/nominas/eventos/[id]/balance-horas] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener balance de horas' },
      { status: 500 }
    );
  }
}

export { balanceHorasHandler as GET };
