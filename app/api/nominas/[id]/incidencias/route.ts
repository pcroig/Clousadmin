// ========================================
// API: Obtener Incidencias de Nómina
// ========================================
// Devuelve ausencias, cambios de contrato y resumen de fichajes del mes de la nómina

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma, Prisma } from '@/lib/prisma';

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

    const { id } = await params;

    // Obtener la nómina
    const empleadoWhere: Prisma.EmpleadoWhereInput = {
      empresaId: session.user.empresaId,
    };

    if (session.user.rol === 'empleado') {
      if (!session.user.empleadoId) {
        return NextResponse.json({ error: 'Empleado no asignado' }, { status: 403 });
      }
      empleadoWhere.id = session.user.empleadoId;
    }

    const nomina = await prisma.nomina.findFirst({
      where: {
        id,
        empleado: empleadoWhere,
      },
      select: {
        id: true,
        empleadoId: true,
        mes: true,
        anio: true,
      },
    });

    if (!nomina) {
      return NextResponse.json({ error: 'Nómina no encontrada' }, { status: 404 });
    }

    // Calcular rango del mes
    const inicioMes = new Date(nomina.anio, nomina.mes - 1, 1);
    const finMes = new Date(nomina.anio, nomina.mes, 0, 23, 59, 59);

    // Obtener ausencias del mes (confirmadas o completadas)
    const ausencias = await prisma.ausencia.findMany({
      where: {
        empleadoId: nomina.empleadoId,
        estado: {
          in: ['confirmada', 'completada'],
        },
        // Ausencias que se solapan con el mes
        OR: [
          {
            fechaInicio: {
              gte: inicioMes,
              lte: finMes,
            },
          },
          {
            fechaFin: {
              gte: inicioMes,
              lte: finMes,
            },
          },
          {
            AND: [
              { fechaInicio: { lte: inicioMes } },
              { fechaFin: { gte: finMes } },
            ],
          },
        ],
      },
      select: {
        id: true,
        tipo: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        diasSolicitados: true,
      },
      orderBy: {
        fechaInicio: 'asc',
      },
    });

    // Obtener contratos cuya fecha de inicio o fin cae dentro del mes
    const contratos = await prisma.contrato.findMany({
      where: {
        empleadoId: nomina.empleadoId,
        OR: [
          {
            // Altas (inicio dentro del mes)
            fechaInicio: {
              gte: inicioMes,
              lte: finMes,
            },
          },
          {
            // Bajas (fin dentro del mes)
            fechaFin: {
              gte: inicioMes,
              lte: finMes,
            },
          },
        ],
      },
      select: {
        id: true,
        fechaInicio: true,
        fechaFin: true,
        tipoContrato: true,
      },
      orderBy: {
        fechaInicio: 'desc',
      },
    });

    // Obtener resumen de fichajes del mes
    const fichajes = await prisma.fichaje.findMany({
      where: {
        empleadoId: nomina.empleadoId,
        fecha: {
          gte: inicioMes,
          lte: finMes,
        },
      },
      select: {
        estado: true,
        horasTrabajadas: true,
      },
    });

    const diasRegistrados = fichajes.filter((f) => f.estado === 'finalizado').length;
    const diasPendientes = fichajes.filter((f) => f.estado === 'pendiente').length;
    const horasTrabajadas = fichajes.reduce(
      (sum, f) => sum + (f.estado === 'finalizado' ? Number(f.horasTrabajadas || 0) : 0),
      0
    );

    return NextResponse.json({
      nominaId: nomina.id,
      periodo: {
        mes: nomina.mes,
        anio: nomina.anio,
        fechaInicio: inicioMes.toISOString(),
        fechaFin: finMes.toISOString(),
      },
      incidencias: {
        ausencias,
        contratos,
        fichajes: {
          diasRegistrados,
          diasPendientes,
          horasTrabajadas: Math.round(horasTrabajadas * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/nominas/[id]/incidencias] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener incidencias' },
      { status: 500 }
    );
  }
}

