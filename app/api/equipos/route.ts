// ========================================
// API Routes - Equipos
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';


// GET /api/equipos - List teams
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const equipos = await prisma.equipo.findMany({
      where: {
        empresaId: session.user.empresaId,
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
      orderBy: {
        nombre: 'asc',
      },
    });

    return NextResponse.json(equipos);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Error al obtener equipos' }, { status: 500 });
  }
}

// POST /api/equipos - Create team
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, descripcion, sedeId } = body;

    if (!nombre || nombre.trim() === '') {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    // Check if team name already exists in the company
    const existingTeam = await prisma.equipo.findFirst({
      where: {
        empresaId: session.user.empresaId,
        nombre: nombre.trim(),
      },
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: 'Ya existe un equipo con ese nombre' },
        { status: 400 }
      );
    }

    const equipo = await prisma.equipo.create({
      data: {
        empresaId: session.user.empresaId,
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        sedeId: sedeId || null,
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

    return NextResponse.json(equipo, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Error al crear equipo' }, { status: 500 });
  }
}
