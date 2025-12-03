// ========================================
// API Routes - Equipos
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';


// GET /api/equipos - List teams
const equipoInclude = {
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
} as const;

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const equiposRaw = await prisma.equipos.findMany({
      where: {
        empresaId: session.user.empresaId,
      },
      include: equipoInclude,
      orderBy: {
        nombre: 'asc',
      },
    });

    const equipos = equiposRaw.map((team) =>
      formatEquipoResponse(team as EquipoWithRelations)
    );

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

    const body = await request.json() as Record<string, unknown>;
    const { nombre, descripcion, sedeId } = body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    // Check if team name already exists in the company
    const existingTeam = await prisma.equipos.findFirst({
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

    const descripcionStr = typeof descripcion === 'string' ? descripcion : undefined;
    const sedeIdStr = typeof sedeId === 'string' ? sedeId : null;

    const equipoRaw = await prisma.equipos.create({
      data: {
        empresaId: session.user.empresaId,
        nombre: nombre.trim(),
        descripcion: descripcionStr?.trim() || null,
        sedeId: sedeIdStr,
      },
      include: equipoInclude,
    });

    const equipo = formatEquipoResponse(equipoRaw as EquipoWithRelations);

    return NextResponse.json(equipo, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Error al crear equipo' }, { status: 500 });
  }
}

type EquipoWithRelations = NonNullable<
  Awaited<ReturnType<(typeof prisma.equipos)['findMany']>>[number]
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

function formatEquipoResponse(team: EquipoWithRelations) {
  return {
    ...team,
    manager: team.empleados
      ? {
          id: team.empleados.id,
          nombre: team.empleados.nombre,
          apellidos: team.empleados.apellidos,
        }
      : null,
    miembros: team.empleado_equipos.map((miembro) => ({
      empleado: miembro.empleado,
    })),
  };
}
