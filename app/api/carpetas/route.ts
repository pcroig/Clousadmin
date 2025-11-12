// ========================================
// API: Carpetas - Crear y Listar
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma, Prisma } from '@/lib/prisma';

import { UsuarioRol } from '@/lib/constants/enums';

// GET /api/carpetas - Listar carpetas del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get('empleadoId');
    const incluirCompartidas = searchParams.get('incluirCompartidas') !== 'false';

    // Construir where clause
    const whereClause: Prisma.CarpetaWhereInput = {
      empresaId: session.user.empresaId,
    };

    if (session.user.rol === UsuarioRol.hr_admin) {
      // HR Admin: puede ver todas las carpetas o filtrar por empleado
      if (empleadoId) {
        whereClause.OR = [
          { empleadoId },
          { compartida: true },
        ];
      }
      // Si no hay filtro, devuelve todas las carpetas de la empresa
    } else {
      // Empleados/Managers: solo sus carpetas + compartidas
      const empleado = await prisma.empleado.findUnique({
        where: { usuarioId: session.user.id },
        include: {
          equipos: {
            include: {
              equipo: true,
            },
          },
        },
      });

      if (!empleado) {
        return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
      }

      whereClause.OR = [
        // Carpetas personales
        { empleadoId: empleado.id },
      ];

      if (incluirCompartidas) {
        // Carpetas compartidas con "todos"
        whereClause.OR.push({ compartida: true, asignadoA: 'todos' });

        // Carpetas compartidas específicamente con este empleado
        whereClause.OR.push({
          compartida: true,
          asignadoA: { contains: `empleado:${empleado.id}` },
        });

        // Carpetas compartidas con equipos a los que pertenece el empleado
        const equiposIds = empleado.equipos.map(eq => eq.equipoId);
        for (const equipoId of equiposIds) {
          whereClause.OR.push({
            compartida: true,
            asignadoA: { contains: `equipo:${equipoId}` },
          });
        }
      }
    }

    const carpetas = await prisma.carpeta.findMany({
      where: whereClause,
      include: {
        documentos: {
          orderBy: { createdAt: 'desc' },
        },
        subcarpetas: {
          include: {
            documentos: true,
          },
        },
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
      },
      orderBy: [
        { esSistema: 'desc' }, // Carpetas del sistema primero
        { nombre: 'asc' },
      ],
    });

    return NextResponse.json({ carpetas });
  } catch (error) {
    console.error('Error listando carpetas:', error);
    return NextResponse.json(
      { error: 'Error al obtener carpetas' },
      { status: 500 }
    );
  }
}

// POST /api/carpetas - Crear carpeta (solo HR para carpetas compartidas)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, parentId, compartida, asignadoA, empleadoId } = body;

    // Validaciones
    if (!nombre) {
      return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 });
    }

    // Solo HR Admin puede crear carpetas compartidas
    if (compartida && session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'Solo HR Admin puede crear carpetas compartidas' },
        { status: 403 }
      );
    }

    // Si es carpeta compartida, requiere asignadoA
    if (compartida && !asignadoA) {
      return NextResponse.json(
        { error: 'Las carpetas compartidas requieren asignadoA' },
        { status: 400 }
      );
    }

    // Validar parent si existe
    if (parentId) {
      const parent = await prisma.carpeta.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        return NextResponse.json(
          { error: 'Carpeta padre no encontrada' },
          { status: 404 }
        );
      }

      // Las subcarpetas heredan el empleadoId del padre
      if (!compartida && parent.empleadoId && !empleadoId) {
        // Heredar del padre
      }
    }

    // Crear carpeta
    const carpeta = await prisma.carpeta.create({
      data: {
        empresaId: session.user.empresaId,
        nombre,
        parentId: parentId || null,
        empleadoId: empleadoId || null,
        esSistema: false,
        compartida: compartida || false,
        asignadoA: compartida ? asignadoA : null,
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      carpeta,
    });
  } catch (error) {
    console.error('Error creando carpeta:', error);
    return NextResponse.json(
      { error: 'Error al crear carpeta' },
      { status: 500 }
    );
  }
}
