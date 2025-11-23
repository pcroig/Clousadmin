// ========================================
// API Puestos - Individual Puesto Operations
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const puestoUpdateSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  descripcion: z.string().optional(),
});

// GET /api/puestos/[id] - Obtener detalles de un puesto
export async function GET(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    const puesto = await prisma.puesto.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        empleados: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            fotoUrl: true,
          },
        },
        documentos: {
          select: {
            id: true,
            nombre: true,
            tipoDocumento: true,
            mimeType: true,
            tamano: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            empleados: true,
            documentos: true,
          },
        },
      },
    });

    if (!puesto) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(puesto);
  } catch (error) {
    console.error('Error loading puesto:', error);
    return NextResponse.json(
      { error: 'Error al cargar puesto' },
      { status: 500 }
    );
  }
}

// PATCH /api/puestos/[id] - Actualizar un puesto
export async function PATCH(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const validatedData = puestoUpdateSchema.parse(body);

    // Verificar que el puesto existe y pertenece a la empresa
    const puesto = await prisma.puesto.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!puesto) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    // Si se está cambiando el nombre, verificar que no exista otro con ese nombre
    if (validatedData.nombre && validatedData.nombre !== puesto.nombre) {
      const existingPuesto = await prisma.puesto.findFirst({
        where: {
          empresaId: session.user.empresaId,
          nombre: validatedData.nombre,
          activo: true,
          id: { not: id },
        },
      });

      if (existingPuesto) {
        return NextResponse.json(
          { error: 'Ya existe otro puesto con ese nombre' },
          { status: 400 }
        );
      }
    }

    // Actualizar puesto
    const updatedPuesto = await prisma.puesto.update({
      where: { id },
      data: {
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
      },
    });

    return NextResponse.json(updatedPuesto);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating puesto:', error);
    return NextResponse.json(
      { error: 'Error al actualizar puesto' },
      { status: 500 }
    );
  }
}

// DELETE /api/puestos/[id] - Eliminar un puesto (soft delete)
export async function DELETE(request: NextRequest, context: RouteParams) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = params;

    // Verificar que el puesto existe y pertenece a la empresa
    const puesto = await prisma.puesto.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        _count: {
          select: { empleados: true },
        },
      },
    });

    if (!puesto) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si hay empleados con este puesto
    if (puesto._count.empleados > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar el puesto porque ${puesto._count.empleados} empleado(s) lo tienen asignado`,
        },
        { status: 400 }
      );
    }

    // Soft delete: marcar como inactivo
    await prisma.puesto.update({
      where: { id },
      data: { activo: false },
    });

    return NextResponse.json({ message: 'Puesto eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting puesto:', error);
    return NextResponse.json(
      { error: 'Error al eliminar puesto' },
      { status: 500 }
    );
  }
}
