// ========================================
// API Routes - Available Members for Team
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

// GET /api/equipos/[id]/available-members - Get employees not in this team
export async function GET(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: equipoId } = params;

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

    // Get all employees from the company
    const allEmployees = await prisma.empleado.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        fotoUrl: true,
        puesto: true,
      },
      orderBy: [
        { apellidos: 'asc' },
        { nombre: 'asc' },
      ],
    });

    // Get current team members
    const teamMembers = await prisma.empleadoEquipo.findMany({
      where: {
        equipoId,
      },
      select: {
        empleadoId: true,
      },
    });

    const teamMemberIds = new Set(teamMembers.map((m) => m.empleadoId));

    // Filter out employees who are already members
    const availableEmployees = allEmployees.filter(
      (emp) => !teamMemberIds.has(emp.id)
    );

    return NextResponse.json(availableEmployees);
  } catch (error) {
    console.error('Error fetching available members:', error);
    return NextResponse.json(
      { error: 'Error al obtener empleados disponibles' },
      { status: 500 }
    );
  }
}
