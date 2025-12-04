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
        documento_carpetas: {
          include: {
            documento: true,
          },
          orderBy: {
            documento: {
              createdAt: 'desc',
            },
          },
        },
        subcarpetas: {
          include: {
            documento_carpetas: {
              include: {
                documento: {
                  select: {
                    id: true,
                  },
                },
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
        documento_carpetas: true,
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
    if (carpeta.documento_carpetas.length > 0 || carpeta.subcarpetas.length > 0) {
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

    // Carpetas del sistema solo permiten editar asignadoA si son compartidas
    if (carpeta.esSistema) {
      // Si es del sistema, solo permitir editar asignadoA y solo si es compartida
      if (compartida !== undefined) {
        return NextResponse.json(
          { error: 'No se puede cambiar el estado compartido de carpetas del sistema' },
          { status: 400 }
        );
      }

      if (!carpeta.compartida) {
        return NextResponse.json(
          { error: 'No se pueden editar carpetas del sistema que no son compartidas' },
          { status: 400 }
        );
      }

      // Solo permitir editar asignadoA para carpetas del sistema compartidas
      if (asignadoA === undefined) {
        return NextResponse.json(
          { error: 'Debes proporcionar asignadoA para editar' },
          { status: 400 }
        );
      }
    }

    // Validar asignadoA si se proporciona
    if (asignadoA !== undefined && asignadoA !== null) {
      if (typeof asignadoA !== 'string') {
        return NextResponse.json(
          { error: 'El campo asignadoA debe ser un string' },
          { status: 400 }
        );
      }

      // Validar formato
      if (asignadoA !== 'todos' && !asignadoA.startsWith('equipo:') && !asignadoA.includes('empleado:')) {
        return NextResponse.json(
          { error: 'Formato de asignadoA inválido. Usa "todos", "equipo:id" o "empleado:id1,empleado:id2"' },
          { status: 400 }
        );
      }

      // Si es un equipo, verificar que existe
      if (asignadoA.startsWith('equipo:')) {
        const equipoId = asignadoA.replace('equipo:', '');
        const equipo = await prisma.equipos.findUnique({
          where: { id: equipoId },
          select: { empresaId: true },
        });

        if (!equipo || equipo.empresaId !== session.user.empresaId) {
          return NextResponse.json(
            { error: 'Equipo no encontrado o no pertenece a tu empresa' },
            { status: 404 }
          );
        }
      }

      // Si son empleados específicos, verificar que existen
      if (asignadoA.includes('empleado:')) {
        const empleadoIds = asignadoA
          .split(',')
          .filter((item) => item.trim().startsWith('empleado:'))
          .map((item) => item.trim().replace('empleado:', ''));

        if (empleadoIds.length > 0) {
          const empleadosExistentes = await prisma.empleados.count({
            where: {
              id: { in: empleadoIds },
              empresaId: session.user.empresaId,
              activo: true,
            },
          });

          if (empleadosExistentes !== empleadoIds.length) {
            return NextResponse.json(
              { error: 'Algunos empleados no existen, no están activos o no pertenecen a tu empresa' },
              { status: 400 }
            );
          }
        }
      }
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
      message: 'Carpeta actualizada correctamente',
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
