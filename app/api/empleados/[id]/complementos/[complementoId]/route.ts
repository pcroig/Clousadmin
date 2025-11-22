// ========================================
// API: Complemento de Empleado Individual
// ========================================
// Editar/eliminar un complemento específico de un empleado

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const UpdateComplementoSchema = z.object({
  importePersonalizado: z.number().optional(),
  contratoId: z.string().uuid().optional(),
  activo: z.boolean().optional(),
});

// ========================================
// PATCH /api/empleados/[id]/complementos/[complementoId]
// ========================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; complementoId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id, complementoId } = await params;

    const body = await req.json();
    const data = UpdateComplementoSchema.parse(body);

    // Verificar que el complemento pertenece al empleado y a la empresa
    const complemento = await prisma.empleadoComplemento.findFirst({
      where: {
        id: complementoId,
        empleadoId: id,
      },
      include: {
        empleado: {
          select: { empresaId: true },
        },
      },
    });

    if (!complemento) {
      return NextResponse.json(
        { error: 'Complemento no encontrado' },
        { status: 404 }
      );
    }

    if (complemento.empleado.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Validar importe personalizado si se especificó
    if (data.importePersonalizado !== undefined && data.importePersonalizado !== null) {
      if (data.importePersonalizado <= 0) {
        return NextResponse.json(
          { error: 'El importe personalizado debe ser mayor a 0' },
          { status: 400 }
        );
      }
    }

    // Verificar contrato si se especificó
    if (data.contratoId) {
      const contrato = await prisma.contrato.findFirst({
        where: {
          id: data.contratoId,
          empleadoId: id,
        },
      });

      if (!contrato) {
        return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 });
      }
    }

    const updated = await prisma.empleadoComplemento.update({
      where: { id: complementoId },
      data,
      include: {
        tipoComplemento: true,
        contrato: {
          select: {
            id: true,
            fechaInicio: true,
            fechaFin: true,
          },
        },
      },
    });

    return NextResponse.json({ complemento: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[PATCH /api/empleados/[id]/complementos/[complementoId]] Error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar complemento' },
      { status: 500 }
    );
  }
}

// ========================================
// DELETE /api/empleados/[id]/complementos/[complementoId]
// ========================================
// Desactiva un complemento (no lo elimina físicamente si tiene asignaciones)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; complementoId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id, complementoId } = await params;

    // Verificar que el complemento pertenece al empleado y a la empresa
    const complemento = await prisma.empleadoComplemento.findFirst({
      where: {
        id: complementoId,
        empleadoId: id,
      },
      include: {
        empleado: {
          select: { empresaId: true },
        },
        _count: {
          select: { asignaciones: true },
        },
      },
    });

    if (!complemento) {
      return NextResponse.json(
        { error: 'Complemento no encontrado' },
        { status: 404 }
      );
    }

    if (complemento.empleado.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Si tiene asignaciones en nóminas, solo desactivar
    if (complemento._count.asignaciones > 0) {
      await prisma.empleadoComplemento.update({
        where: { id: complementoId },
        data: { activo: false },
      });

      return NextResponse.json({
        message: 'Complemento desactivado (tiene asignaciones en nóminas)',
        desactivado: true,
      });
    }

    // Si no tiene asignaciones, eliminar físicamente
    await prisma.empleadoComplemento.delete({
      where: { id: complementoId },
    });

    return NextResponse.json({
      message: 'Complemento eliminado',
      eliminado: true,
    });
  } catch (error) {
    console.error('[DELETE /api/empleados/[id]/complementos/[complementoId]] Error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar complemento' },
      { status: 500 }
    );
  }
}
