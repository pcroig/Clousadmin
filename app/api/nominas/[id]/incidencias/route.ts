'use server';

// ========================================
// API: Incidencias de una Nómina
// ========================================
// Devuelve ausencias, cambios de contrato y resumen de fichajes del mes

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EstadoAusencia } from '@/lib/constants/enums';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const nomina = await prisma.nomina.findUnique({
      where: { id },
      include: {
        empleado: {
          select: {
            id: true,
            empresaId: true,
            equipos: {
              include: {
                equipo: {
                  select: {
                    id: true,
                    managerId: true,
                  },
                },
              },
            },
          },
        },
        eventoNomina: {
          select: {
            empresaId: true,
          },
        },
      },
    });

    if (!nomina) {
      return NextResponse.json({ error: 'Nómina no encontrada' }, { status: 404 });
    }

    const empresaId = nomina.eventoNomina?.empresaId || nomina.empleado?.empresaId;
    if (!empresaId || empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const esPropia = nomina.empleadoId === session.user.id;
    const esManager = nomina.empleado.equipos.some(
      (eq) => eq.equipo.managerId === session.user.id
    );
    const esAdmin = ['hr_admin', 'platform_admin'].includes(session.user.rol);

    if (!esPropia && !esManager && !esAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const fechaInicio = new Date(nomina.anio, nomina.mes - 1, 1);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(nomina.anio, nomina.mes, 0);
    fechaFin.setHours(23, 59, 59, 999);

    const ausencias = await prisma.ausencia.findMany({
      where: {
        empleadoId: nomina.empleadoId,
        estado: {
          in: [EstadoAusencia.confirmada, EstadoAusencia.completada],
        },
        OR: [
          {
            fechaInicio: {
              gte: fechaInicio,
              lte: fechaFin,
            },
          },
          {
            fechaFin: {
              gte: fechaInicio,
              lte: fechaFin,
            },
          },
          {
            AND: [
              { fechaInicio: { lte: fechaInicio } },
              { fechaFin: { gte: fechaFin } },
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

    const contratos = await prisma.contrato.findMany({
      where: {
        empleadoId: nomina.empleadoId,
        OR: [
          {
            fechaInicio: {
              gte: fechaInicio,
              lte: fechaFin,
            },
          },
          {
            fechaFin: {
              gte: fechaInicio,
              lte: fechaFin,
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
        fechaInicio: 'asc',
      },
    });

    const fichajes = await prisma.fichaje.findMany({
      where: {
        empleadoId: nomina.empleadoId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      select: {
        fecha: true,
        estado: true,
        horasTrabajadas: true,
      },
    });

    const resumenFichajes = {
      diasRegistrados: fichajes.length,
      diasPendientes: fichajes.filter((f) => f.estado !== 'finalizado').length,
      horasTrabajadas: fichajes.reduce(
        (sum, f) => sum + Number(f.horasTrabajadas || 0),
        0
      ),
    };

    return NextResponse.json({
      nominaId: nomina.id,
      mes: nomina.mes,
      anio: nomina.anio,
      incidencias: {
        ausencias,
        contratos,
        fichajes: resumenFichajes,
      },
    });
  } catch (error) {
    console.error('[GET /api/nominas/[id]/incidencias] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener incidencias de la nómina' },
      { status: 500 }
    );
  }
}


