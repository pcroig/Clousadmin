// ========================================
// API: Asignación de Complemento Individual
// ========================================
// Actualizar/eliminar una asignación específica

import { Decimal } from '@prisma/client/runtime/library';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { NOMINA_ESTADOS } from '@/lib/constants/nomina-estados';
import { prisma } from '@/lib/prisma';

const UpdateAsignacionSchema = z.object({
  importe: z.number().positive().optional(),
  notas: z.string().optional(),
});

// ========================================
// PATCH /api/nominas/[id]/complementos/[asignacionId]
// ========================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; asignacionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin', 'manager'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id, asignacionId } = await params;
    const body = await req.json();
    const data = UpdateAsignacionSchema.parse(body);

    // Verificar que la asignación existe y pertenece a la nómina
    const asignacion = await prisma.asignacionComplemento.findFirst({
      where: {
        id: asignacionId,
        nominaId: id,
      },
      include: {
        nomina: {
          include: {
            empleado: {
              select: { empresaId: true },
            },
          },
        },
        empleadoComplemento: {
          include: {
            tipoComplemento: true,
          },
        },
      },
    });

    if (!asignacion) {
      return NextResponse.json(
        { error: 'Asignación no encontrada' },
        { status: 404 }
      );
    }

    if (asignacion.nomina.empleado.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Verificar estado de la nómina
    if (asignacion.nomina.estado === NOMINA_ESTADOS.PUBLICADA) {
      return NextResponse.json(
        {
          error: 'No se puede modificar complementos en una nómina publicada',
        },
        { status: 400 }
      );
    }

    const importeAnterior = asignacion.importe;
    const nuevoImporte = data.importe ? new Decimal(data.importe) : importeAnterior;

    // Actualizar asignación
    const updated = await prisma.asignacionComplemento.update({
      where: { id: asignacionId },
      data: {
        ...(data.importe && { importe: nuevoImporte }),
        ...(data.notas !== undefined && { notas: data.notas || null }),
        asignadoPor: session.user.id,
        fechaAsignacion: new Date(),
      },
      include: {
        empleadoComplemento: {
          include: {
            tipoComplemento: true,
          },
        },
      },
    });

    // Recalcular totales de la nómina si cambió el importe
    if (data.importe) {
      const diferencia = nuevoImporte.sub(importeAnterior);
      const nuevoTotalComplementos = asignacion.nomina.totalComplementos.add(diferencia);
      const nuevoTotalBruto = asignacion.nomina.salarioBase
        .add(nuevoTotalComplementos)
        .sub(asignacion.nomina.totalDeducciones);

      await prisma.nomina.update({
        where: { id },
        data: {
          totalComplementos: nuevoTotalComplementos,
          totalBruto: nuevoTotalBruto,
          totalNeto: nuevoTotalBruto, // Simplificado
        },
      });
    }

    return NextResponse.json({ asignacion: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[PATCH /api/nominas/[id]/complementos/[asignacionId]] Error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar asignación' },
      { status: 500 }
    );
  }
}

// ========================================
// DELETE /api/nominas/[id]/complementos/[asignacionId]
// ========================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; asignacionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin', 'manager'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id, asignacionId } = await params;

    // Verificar que la asignación existe
    const asignacion = await prisma.asignacionComplemento.findFirst({
      where: {
        id: asignacionId,
        nominaId: id,
      },
      include: {
        nomina: {
          include: {
            empleado: {
              select: { empresaId: true },
            },
          },
        },
      },
    });

    if (!asignacion) {
      return NextResponse.json(
        { error: 'Asignación no encontrada' },
        { status: 404 }
      );
    }

    if (asignacion.nomina.empleado.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Verificar estado
    if (asignacion.nomina.estado === NOMINA_ESTADOS.PUBLICADA) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar complementos de una nómina publicada',
        },
        { status: 400 }
      );
    }

    // Eliminar asignación
    await prisma.asignacionComplemento.delete({
      where: { id: asignacionId },
    });

    // Recalcular totales
    const nuevoTotalComplementos = asignacion.nomina.totalComplementos.sub(asignacion.importe);
    const nuevoTotalBruto = asignacion.nomina.salarioBase
      .add(nuevoTotalComplementos)
      .sub(asignacion.nomina.totalDeducciones);

    // Marcar como complementos pendientes si se eliminó una asignación
    await prisma.nomina.update({
      where: { id },
      data: {
        totalComplementos: nuevoTotalComplementos,
        totalBruto: nuevoTotalBruto,
        totalNeto: nuevoTotalBruto,
        complementosPendientes: true,
        estado: NOMINA_ESTADOS.PENDIENTE,
      },
    });

    return NextResponse.json({ message: 'Asignación eliminada' });
  } catch (error) {
    console.error('[DELETE /api/nominas/[id]/complementos/[asignacionId]] Error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar asignación' },
      { status: 500 }
    );
  }
}
