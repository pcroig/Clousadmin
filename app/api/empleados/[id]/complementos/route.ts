// ========================================
// API: Complementos de Empleado
// ========================================
// Gestionar asignación de complementos a empleados

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const AsignarComplementoSchema = z.object({
  tipoComplementoId: z.string().uuid(),
  contratoId: z.string().uuid().optional(),
  importePersonalizado: z.number().optional(),
});

// ========================================
// GET /api/empleados/[id]/complementos
// ========================================
// Lista todos los complementos asignados a un empleado
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Solo HR puede gestionar complementos
    if (!['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Verificar que el empleado pertenece a la empresa
    const empleado = await prisma.empleado.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!empleado) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const incluirInactivos = searchParams.get('incluirInactivos') === 'true';

    const complementos = await prisma.empleadoComplemento.findMany({
      where: {
        empleadoId: id,
        ...(incluirInactivos ? {} : { activo: true }),
      },
      include: {
        tipoComplemento: true,
        contrato: {
          select: {
            id: true,
            fechaInicio: true,
            fechaFin: true,
          },
        },
        _count: {
          select: { asignaciones: true },
        },
      },
      orderBy: {
        fechaAsignacion: 'desc',
      },
    });

    return NextResponse.json({ complementos });
  } catch (error) {
    console.error('[GET /api/empleados/[id]/complementos] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener complementos del empleado' },
      { status: 500 }
    );
  }
}

// ========================================
// POST /api/empleados/[id]/complementos
// ========================================
// Asigna un tipo de complemento a un empleado
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Solo HR puede asignar complementos
    if (!['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await req.json();
    const data = AsignarComplementoSchema.parse(body);

    // Verificar que el empleado pertenece a la empresa
    const empleado = await prisma.empleado.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!empleado) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    // Verificar que el tipo de complemento existe y pertenece a la empresa
    const tipoComplemento = await prisma.tipoComplemento.findFirst({
      where: {
        id: data.tipoComplementoId,
        empresaId: session.user.empresaId,
        activo: true,
      },
    });

    if (!tipoComplemento) {
      return NextResponse.json(
        { error: 'Tipo de complemento no encontrado o inactivo' },
        { status: 404 }
      );
    }

    // Verificar que el contrato existe si se especificó
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

    // Verificar que no existe ya este complemento activo para el empleado
    const existente = await prisma.empleadoComplemento.findFirst({
      where: {
        empleadoId: id,
        tipoComplementoId: data.tipoComplementoId,
        activo: true,
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Este complemento ya está asignado al empleado' },
        { status: 400 }
      );
    }

    // Validar importe personalizado si se especificó
    if (data.importePersonalizado !== undefined) {
      if (data.importePersonalizado <= 0) {
        return NextResponse.json(
          { error: 'El importe personalizado debe ser mayor a 0' },
          { status: 400 }
        );
      }
    }

    const complemento = await prisma.empleadoComplemento.create({
      data: {
        empleadoId: id,
        tipoComplementoId: data.tipoComplementoId,
        contratoId: data.contratoId || null,
        importePersonalizado: data.importePersonalizado || null,
      },
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

    return NextResponse.json({ complemento }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[POST /api/empleados/[id]/complementos] Error:', error);
    return NextResponse.json(
      { error: 'Error al asignar complemento' },
      { status: 500 }
    );
  }
}
