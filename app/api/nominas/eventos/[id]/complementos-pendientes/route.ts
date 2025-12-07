// ========================================
// API: Listar Complementos Pendientes de un Evento
// ========================================
// Devuelve todos los complementos del evento con su estado de validación

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

    const { id: eventoId } = await params;

    // Verificar que el evento existe y pertenece a la empresa
    const evento = await prisma.eventos_nomina.findFirst({
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
    const complementosRaw = await prisma.empleado_complementos.findMany({
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
        tipos_complemento: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
          },
        },
      },
      orderBy: [
        { empleado: { apellidos: 'asc' } },
        { empleado: { nombre: 'asc' } },
      ],
    });

    const complementos = complementosRaw.map(({ tipos_complemento, ...rest }) => ({
      ...rest,
      tipoComplemento: tipos_complemento,
    }));

    // Filtrar si es manager (solo ver complementos de su equipo)
    let complementosFiltrados = complementos;
    if (session.user.rol === 'manager') {
      complementosFiltrados = complementos.filter((comp) =>
        comp.empleado.equipos.some(
          (eq: { equipo: { managerId: string | null } }) => eq.equipo.managerId === session.user.id
        )
      );
    }

    // Calcular estadísticas
    const stats = {
      total: complementosFiltrados.length,
      validados: complementosFiltrados.filter((c) => c.validado).length,
      pendientes: complementosFiltrados.filter((c) => !c.validado && !c.rechazado).length,
      rechazados: complementosFiltrados.filter((c) => c.rechazado).length,
      variables: complementosFiltrados.filter(
        (c) => !c.esImporteFijo && Number(c.importePersonalizado) === 0
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

