// ========================================
// API: Carpetas - Ver Contenido
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { puedeAccederACarpeta } from '@/lib/documentos';
import { prisma, Prisma } from '@/lib/prisma';


// GET /api/carpetas/[id] - Ver contenido de carpeta
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Validar permisos de acceso
    const puedeAcceder = await puedeAccederACarpeta(
      id,
      session.user.id,
      session.user.rol
    );

    if (!puedeAcceder) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a esta carpeta' },
        { status: 403 }
      );
    }

    const carpeta = await prisma.carpetas.findUnique({
      where: { id },
      include: {
        documentos: {
          orderBy: { createdAt: 'desc' },
        },
        subcarpetas: {
          include: {
            documentos: {
              select: {
                id: true,
              },
            },
          },
        },
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
        parent: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (!carpeta) {
      return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ carpeta });
  } catch (error) {
    console.error('Error obteniendo carpeta:', error);
    return NextResponse.json(
      { error: 'Error al obtener carpeta' },
      { status: 500 }
    );
  }
}

// DELETE /api/carpetas/[id] - Eliminar carpeta (solo HR, no permitido para carpetas del sistema)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'Solo HR Admin puede eliminar carpetas' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const carpeta = await prisma.carpetas.findUnique({
      where: { id },
      include: {
        documentos: true,
        subcarpetas: true,
      },
    });

    if (!carpeta) {
      return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
    }

    // No permitir eliminar carpetas del sistema
    if (carpeta.esSistema) {
      return NextResponse.json(
        { error: 'No se pueden eliminar carpetas del sistema' },
        { status: 400 }
      );
    }

    // Verificar que esté vacía
    if (carpeta.documentos.length > 0 || carpeta.subcarpetas.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una carpeta que contiene documentos o subcarpetas' },
        { status: 400 }
      );
    }

    await prisma.carpetas.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Carpeta eliminada correctamente',
    });
  } catch (error) {
    console.error('Error eliminando carpeta:', error);
    return NextResponse.json(
      { error: 'Error al eliminar carpeta' },
      { status: 500 }
    );
  }
}

// PATCH /api/carpetas/[id] - Editar carpeta (solo HR Admin, para carpetas compartidas)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'Solo HR Admin puede editar carpetas' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const { compartida, asignadoA } = body;

    // Buscar carpeta
    const carpeta = await prisma.carpetas.findUnique({
      where: { id },
    });

    if (!carpeta) {
      return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
    }

    // Verificar que pertenece a la empresa
    if (carpeta.empresaId !== session.user.empresaId) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar esta carpeta' },
        { status: 403 }
      );
    }

    // No permitir editar carpetas del sistema
    if (carpeta.esSistema) {
      return NextResponse.json(
        { error: 'No se pueden editar carpetas del sistema' },
        { status: 400 }
      );
    }

    // Construir datos de actualización
    const dataToUpdate: Prisma.carpetasUpdateInput = {};

    if (compartida !== undefined) {
      dataToUpdate.compartida = compartida as boolean;
    }

    if (asignadoA !== undefined) {
      // Si se marca como compartida pero no tiene asignadoA, usar 'todos' por defecto
      if (compartida !== false && !asignadoA) {
        dataToUpdate.asignadoA = 'todos';
      } else {
        dataToUpdate.asignadoA = asignadoA || null;
      }
    }

    // Actualizar carpeta
    const carpetaActualizada = await prisma.carpetas.update({
      where: { id },
      data: dataToUpdate,
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
      carpeta: carpetaActualizada,
    });
  } catch (error) {
    console.error('Error editando carpeta:', error);
    return NextResponse.json(
      { error: 'Error al editar carpeta' },
      { status: 500 }
    );
  }
}
