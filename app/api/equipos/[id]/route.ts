// ========================================
// API Routes - Equipo by ID
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

// PATCH /api/equipos/[id] - Update team
export async function PATCH(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json() as Record<string, unknown>;
    const { nombre, descripcion, sedeId } = body;

    // Verify team belongs to user's company
    const existingTeam = await prisma.equipos.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!existingTeam) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    // If updating name, check it doesn't conflict with another team
    if (nombre && typeof nombre === 'string' && nombre.trim() !== existingTeam.nombre) {
      const nameConflict = await prisma.equipos.findFirst({
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

    const nombreStr = typeof nombre === 'string' ? nombre : undefined;
    const descripcionStr = typeof descripcion === 'string' ? descripcion : undefined;
    const sedeIdStr = typeof sedeId === 'string' ? sedeId : undefined;

    const updatedTeamRaw = await prisma.equipos.update({
      where: { id },
      data: {
        ...(nombreStr && { nombre: nombreStr.trim() }),
        ...(descripcionStr !== undefined && { descripcion: descripcionStr.trim() || null }),
        ...(sedeIdStr !== undefined && { sedeId: sedeIdStr || null }),
      },
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

    const updatedTeam = formatEquipoResponse(updatedTeamRaw);

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Error al actualizar equipo' }, { status: 500 });
  }
}

type EquipoResponse = NonNullable<
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

function formatEquipoResponse(team: Awaited<ReturnType<(typeof prisma.equipos)['findUnique']>>) {
  if (!team) return team;
  const teamFormatted = team as EquipoResponse;
  return {
    ...teamFormatted,
    manager: teamFormatted.empleados
      ? {
          id: teamFormatted.empleados.id,
          nombre: teamFormatted.empleados.nombre,
          apellidos: teamFormatted.empleados.apellidos,
        }
      : null,
    miembros: teamFormatted.empleado_equipos.map((miembro) => ({
      empleado: miembro.empleado,
    })),
  };
}

// DELETE /api/equipos/[id] - Delete team
export async function DELETE(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    // Verify team belongs to user's company
    const existingTeam = await prisma.equipos.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!existingTeam) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    await prisma.equipos.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Error al eliminar equipo' }, { status: 500 });
  }
}
