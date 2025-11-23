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
    const body = await request.json();
    const { empleadoId } = body;

    if (!empleadoId) {
      return NextResponse.json({ error: 'empleadoId es requerido' }, { status: 400 });
    }

    // Verify team belongs to user's company
    const team = await prisma.equipo.findFirst({
      where: {
        id: equipoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    // Verify employee belongs to user's company
    const employee = await prisma.empleado.findFirst({
      where: {
        id: empleadoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    // Check if already a member
    const existingMember = await prisma.empleadoEquipo.findUnique({
      where: {
        empleadoId_equipoId: {
          empleadoId,
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
    await prisma.empleadoEquipo.create({
      data: {
        empleadoId,
        equipoId,
      },
    });

    // Return updated team
    const updatedTeam = await prisma.equipo.findUnique({
      where: { id: equipoId },
      include: {
        manager: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
        miembros: {
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
    const team = await prisma.equipo.findFirst({
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
      await prisma.equipo.update({
        where: { id: equipoId },
        data: { managerId: null },
      });
    }

    // Remove member
    await prisma.empleadoEquipo.delete({
      where: {
        empleadoId_equipoId: {
          empleadoId,
          equipoId,
        },
      },
    });

    // Return updated team
    const updatedTeam = await prisma.equipo.findUnique({
      where: { id: equipoId },
      include: {
        manager: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
        miembros: {
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

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Error al eliminar miembro' }, { status: 500 });
  }
}
