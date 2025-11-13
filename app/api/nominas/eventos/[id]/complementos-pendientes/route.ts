// ========================================
// API: Listar Complementos Pendientes de un Evento
// ========================================
// Devuelve todos los complementos del evento con su estado de validación

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: eventoId } = await params;

    // Verificar que el evento existe y pertenece a la empresa
    const evento = await prisma.eventoNomina.findFirst({
      where: {
        id: eventoId,
        empresaId: session.user.empresaId,
      },
      include: {
        nominas: {
          select: {
            empleadoId: true,
          },
        },
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    const empleadoIds = evento.nominas.map((n) => n.empleadoId);

    // Obtener complementos de los empleados del evento
    const complementos = await prisma.empleadoComplemento.findMany({
      where: {
        empleadoId: { in: empleadoIds },
        activo: true,
      },
      include: {
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
        tipoComplemento: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            importeFijo: true,
            periodicidad: true,
          },
        },
      },
      orderBy: [
        { empleado: { apellidos: 'asc' } },
        { empleado: { nombre: 'asc' } },
      ],
    });

    // Filtrar si es manager (solo ver complementos de su equipo)
    let complementosFiltrados = complementos;
    if (session.user.rol === 'manager') {
      complementosFiltrados = complementos.filter((comp) =>
        comp.empleado.equipos.some((eq) => eq.equipo.managerId === session.user.id)
      );
    }

    // Calcular estadísticas
    const stats = {
      total: complementosFiltrados.length,
      validados: complementosFiltrados.filter((c) => c.validado).length,
      pendientes: complementosFiltrados.filter((c) => !c.validado && !c.rechazado).length,
      rechazados: complementosFiltrados.filter((c) => c.rechazado).length,
      variables: complementosFiltrados.filter(
        (c) => !c.importePersonalizado && !c.tipoComplemento.importeFijo
      ).length,
    };

    return NextResponse.json({
      complementos: complementosFiltrados,
      stats,
    });
  } catch (error) {
    console.error('[GET /api/nominas/eventos/[id]/complementos-pendientes] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener complementos' },
      { status: 500 }
    );
  }
}

