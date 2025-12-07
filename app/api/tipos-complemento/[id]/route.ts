// ========================================
// API: Tipo de Complemento Individual
// ========================================
// Editar/eliminar un tipo de complemento específico

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getJsonBody } from '@/lib/utils/json';

const UpdateSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  descripcion: z.string().optional(),
  activo: z.boolean().optional(),
});

// ========================================
// PATCH /api/tipos-complemento/[id]
// ========================================
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const payload = await getJsonBody<Record<string, unknown>>(req);
    const data = UpdateSchema.parse(payload);

    // Verificar que el tipo pertenece a la empresa
    const tipo = await prisma.tipos_complemento.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de complemento no encontrado' }, { status: 404 });
    }

    const updated = await prisma.tipos_complemento.update({
      where: { id },
      data,
    });

    return NextResponse.json({ tipoComplemento: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }

    console.error('[PATCH /api/tipos-complemento/[id]] Error:', error);
    return NextResponse.json({ error: 'Error al actualizar tipo' }, { status: 500 });
  }
}

// ========================================
// DELETE /api/tipos-complemento/[id]
// ========================================
// Desactiva un tipo (no lo elimina físicamente por integridad)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que el tipo pertenece a la empresa
    const tipo = await prisma.tipos_complemento.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        _count: { select: { empleado_complementos: true } },
      },
    });

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de complemento no encontrado' }, { status: 404 });
    }

    // Si tiene empleados asignados, solo desactivar
    if (tipo._count.empleado_complementos > 0) {
      await prisma.tipos_complemento.update({
        where: { id },
        data: { activo: false },
      });

      return NextResponse.json({
        message: 'Tipo desactivado (tiene empleados asignados)',
        desactivado: true
      });
    }

    // Si no tiene asignaciones, eliminar físicamente
    await prisma.tipos_complemento.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Tipo eliminado', eliminado: true });
  } catch (error) {
    console.error('[DELETE /api/tipos-complemento/[id]] Error:', error);
    return NextResponse.json({ error: 'Error al eliminar tipo' }, { status: 500 });
  }
}
