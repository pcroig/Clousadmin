// ========================================
// API Routes - Team Members
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';


type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// POST /api/equipos/[id]/members - Add member to team
export async function POST(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: equipoId } = params;
    const body = await request.json() as Record<string, unknown>;
    const { empleadoId } = body;

    if (!empleadoId) {
      return NextResponse.json({ error: 'empleadoId es requerido' }, { status: 400 });
    }

    // Verify team belongs to user's company
    const team = await prisma.equipos.findFirst({
      where: {
        id: equipoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    // Verify employee belongs to user's company
    const employee = await prisma.empleados.findFirst({
      where: {
        id: empleadoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    // Check if already a member
    const empleadoIdStr = typeof empleadoId === 'string' ? empleadoId : '';
    const existingMember = await prisma.empleado_equipos.findUnique({
      where: {
        empleadoId_equipoId: {
          empleadoId: empleadoIdStr,
          equipoId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'El empleado ya es miembro del equipo' },
        { status: 400 }
      );
    }

    // Add member
    await prisma.empleado_equipos.create({
      data: {
        empleadoId: empleadoIdStr,
        equipoId,
      },
    });

    // Return updated team
    const updatedTeamRaw = await prisma.equipos.findUnique({
      where: { id: equipoId },
      include: {
        empleados: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
        empleado_equipos: {
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                fotoUrl: true,
              },
            },
          },
        },
        sede: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    const updatedTeam = formatEquipo(updatedTeamRaw);

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json({ error: 'Error al añadir miembro' }, { status: 500 });
  }
}

// DELETE /api/equipos/[id]/members - Remove member from team
export async function DELETE(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: equipoId } = params;
    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get('empleadoId');

    if (!empleadoId) {
      return NextResponse.json({ error: 'empleadoId es requerido' }, { status: 400 });
    }

    // Verify team belongs to user's company
    const team = await prisma.equipos.findFirst({
      where: {
        id: equipoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    // If removing the manager, update the team's managerId to null
    if (team.managerId === empleadoId) {
      await prisma.equipos.update({
        where: { id: equipoId },
        data: { managerId: null },
      });
    }

    // Remove member
    await prisma.empleado_equipos.delete({
      where: {
        empleadoId_equipoId: {
          empleadoId,
          equipoId,
        },
      },
    });

    // Return updated team
    const updatedTeamRaw = await prisma.equipos.findUnique({
      where: { id: equipoId },
      include: {
        empleados: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
        empleado_equipos: {
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                fotoUrl: true,
              },
            },
          },
        },
        sede: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    const updatedTeam = formatEquipo(updatedTeamRaw);

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Error al eliminar miembro' }, { status: 500 });
  }
}

type EquipoWithRelations = NonNullable<
  Awaited<ReturnType<(typeof prisma.equipos)['findUnique']>>
> & {
  empleados: {
    id: string;
    nombre: string;
    apellidos: string;
  } | null;
  empleado_equipos: Array<{
    empleado: {
      id: string;
      nombre: string;
      apellidos: string;
      fotoUrl: string | null;
    };
  }>;
};

function formatEquipo(
  team: Awaited<ReturnType<(typeof prisma.equipos)['findUnique']>>
) {
  if (!team) return team;
  const teamWithRelations = team as EquipoWithRelations;
  return {
    ...team,
    manager: teamWithRelations.empleados
      ? {
          id: teamWithRelations.empleados.id,
          nombre: teamWithRelations.empleados.nombre,
          apellidos: teamWithRelations.empleados.apellidos,
        }
      : null,
    miembros: teamWithRelations.empleado_equipos.map((miembro) => ({
      empleado: miembro.empleado,
    })),
  };
}
