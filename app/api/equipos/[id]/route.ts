// ========================================
// API Routes - Equipo by ID
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { UsuarioRol } from '@/lib/constants/enums';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// PATCH /api/equipos/[id] - Update team
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, sedeId } = body;

    // Verify team belongs to user's company
    const existingTeam = await prisma.equipo.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!existingTeam) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    // If updating name, check it doesn't conflict with another team
    if (nombre && nombre.trim() !== existingTeam.nombre) {
      const nameConflict = await prisma.equipo.findFirst({
        where: {
          empresaId: session.user.empresaId,
          nombre: nombre.trim(),
          id: {
            not: id,
          },
        },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Ya existe un equipo con ese nombre' },
          { status: 400 }
        );
      }
    }

    const updatedTeam = await prisma.equipo.update({
      where: { id },
      data: {
        ...(nombre && { nombre: nombre.trim() }),
        ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
        ...(sedeId !== undefined && { sedeId: sedeId || null }),
      },
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
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Error al actualizar equipo' }, { status: 500 });
  }
}

// DELETE /api/equipos/[id] - Delete team
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verify team belongs to user's company
    const existingTeam = await prisma.equipo.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!existingTeam) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    await prisma.equipo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Error al eliminar equipo' }, { status: 500 });
  }
}
