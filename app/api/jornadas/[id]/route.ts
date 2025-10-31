// ========================================
// API Jornadas [ID] - GET, PATCH, DELETE
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jornadaUpdateSchema } from '@/lib/validaciones/schemas';
import { z } from 'zod';

interface Params {
  id: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;

    const jornada = await prisma.jornada.findUnique({
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
          },
        },
      },
    });

    if (!jornada) {
      return NextResponse.json({ error: 'Jornada no encontrada' }, { status: 404 });
    }

    return NextResponse.json(jornada);
  } catch (error) {
    console.error('[API GET Jornada]', error);
    return NextResponse.json({ error: 'Error al obtener jornada' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = jornadaUpdateSchema.parse(body);

    // Verificar que la jornada pertenece a la empresa
    const jornadaExistente = await prisma.jornada.findUnique({
      where: { id, empresaId: session.user.empresaId },
    });

    if (!jornadaExistente) {
      return NextResponse.json({ error: 'Jornada no encontrada' }, { status: 404 });
    }

    // No permitir editar jornadas predefinidas
    if (jornadaExistente.esPredefinida) {
      return NextResponse.json(
        { error: 'No se pueden editar jornadas predefinidas' },
        { status: 400 }
      );
    }

    // Actualizar jornada
    const jornadaActualizada = await prisma.jornada.update({
      where: { id },
      data: {
        nombre: validatedData.nombre,
        horasSemanales: validatedData.horasSemanales,
        config: validatedData.config as any,
      },
    });

    return NextResponse.json(jornadaActualizada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[API PATCH Jornada]', error);
    return NextResponse.json({ error: 'Error al actualizar jornada' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar que la jornada pertenece a la empresa
    const jornada = await prisma.jornada.findUnique({
      where: { id, empresaId: session.user.empresaId },
      include: {
        empleados: true,
      },
    });

    if (!jornada) {
      return NextResponse.json({ error: 'Jornada no encontrada' }, { status: 404 });
    }

    // No permitir eliminar jornadas predefinidas
    if (jornada.esPredefinida) {
      return NextResponse.json(
        { error: 'No se pueden eliminar jornadas predefinidas' },
        { status: 400 }
      );
    }

    // No permitir eliminar si hay empleados asignados
    if (jornada.empleados.length > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar. ${jornada.empleados.length} empleados tienen esta jornada asignada` },
        { status: 400 }
      );
    }

    // Marcar como inactiva en lugar de eliminar
    await prisma.jornada.update({
      where: { id },
      data: { activa: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API DELETE Jornada]', error);
    return NextResponse.json({ error: 'Error al eliminar jornada' }, { status: 500 });
  }
}

