// ========================================
// API: Balance de Horas Mensual del Empleado
// ========================================
// Calcula el balance de horas extra de un empleado en un mes específico

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { calcularBalanceMensual } from '@/lib/calculos/balance-horas';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: empleadoId } = await params;
    const { searchParams } = new URL(req.url);
    const mes = parseInt(searchParams.get('mes') || '0');
    const anio = parseInt(searchParams.get('anio') || new Date().getFullYear().toString());

    if (!mes || mes < 1 || mes > 12) {
      return NextResponse.json({ error: 'Mes inválido' }, { status: 400 });
    }

    // Verificar permisos
    const empleado = await prisma.empleados.findFirst({
      where: {
        id: empleadoId,
        empresaId: session.user.empresaId,
      },
      include: {
        equipos: {
          include: {
            equipo: {
              select: {
                managerId: true,
              },
            },
          },
        },
      },
    });

    if (!empleado) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    // Control de acceso
    const esPropio = empleadoId === session.user.id;
    const esManager = empleado.equipos.some((eq) => eq.equipo.managerId === session.user.id);
    const esAdmin = ['hr_admin', 'platform_admin'].includes(session.user.rol);

    if (!esPropio && !esManager && !esAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Calcular balance del mes
    const balanceMensual = await calcularBalanceMensual(empleadoId, mes, anio);

    return NextResponse.json({
      empleadoId,
      mes,
      anio,
      balanceMensual,
    });
  } catch (error) {
    console.error('[GET /api/empleados/[id]/balance-horas-mes] Error:', error);
    return NextResponse.json(
      { error: 'Error al calcular balance de horas' },
      { status: 500 }
    );
  }
}

