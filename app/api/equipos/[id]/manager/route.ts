// ========================================
// API Routes - Team Manager
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

// PATCH /api/equipos/[id]/manager - Change team manager
export async function PATCH(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: equipoId } = params;
    const body = await request.json() as Record<string, unknown>;
    const { managerId } = body;

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

    // If managerId is provided, verify they are a member of the team
    const managerIdStr = typeof managerId === 'string' ? managerId : null;
    if (managerIdStr) {
      const isMember = await prisma.empleadoEquipo.findUnique({
        where: {
          empleadoId_equipoId: {
            empleadoId: managerIdStr,
            equipoId,
          },
        },
      });

      if (!isMember) {
        return NextResponse.json(
          { error: 'El responsable debe ser miembro del equipo' },
          { status: 400 }
        );
      }
    }

    // Update manager
    const updatedTeam = await prisma.equipo.update({
      where: { id: equipoId },
      data: {
        managerId: managerId || null,
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
    console.error('Error updating team manager:', error);
    return NextResponse.json({ error: 'Error al cambiar responsable' }, { status: 500 });
  }
}
