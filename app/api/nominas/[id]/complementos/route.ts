// ========================================
// API: Asignación de Complementos a Nómina
// ========================================
// Permite asignar/actualizar complementos en una pre-nómina

import { Decimal } from '@prisma/client/runtime/library';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { NOMINA_ESTADOS } from '@/lib/constants/nomina-estados';
import { prisma } from '@/lib/prisma';

const AsignarComplementoSchema = z.object({
  empleadoComplementoId: z.string().uuid(),
  importe: z.number().positive(),
  notas: z.string().optional(),
});

const AsignarMultiplesSchema = z.object({
  complementos: z.array(AsignarComplementoSchema),
});

// ========================================
// GET /api/nominas/[id]/complementos
// ========================================
// Lista los complementos asignados/pendientes de una nómina
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que la nómina pertenece a la empresa
    const nomina = await prisma.nomina.findFirst({
      where: {
        id,
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            empresaId: true,
          },
        },
        complementosAsignados: {
          include: {
            empleadoComplemento: {
              include: {
                tipoComplemento: true,
              },
            },
          },
        },
      },
    });

    if (!nomina) {
      return NextResponse.json({ error: 'Nómina no encontrada' }, { status: 404 });
    }

    if (nomina.empleado.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener complementos disponibles del empleado que aún no están asignados
    const complementosEmpleado = await prisma.empleadoComplemento.findMany({
      where: {
        empleadoId: nomina.empleadoId,
        activo: true,
      },
      include: {
        tipoComplemento: true,
      },
    });

    const complementosAsignadosIds = nomina.complementosAsignados.map(
      (a) => a.empleadoComplementoId
    );

    const complementosPendientes = complementosEmpleado.filter(
      (comp) => !complementosAsignadosIds.includes(comp.id)
    );

    return NextResponse.json({
      complementosAsignados: nomina.complementosAsignados,
      complementosPendientes,
    });
  } catch (error) {
    console.error('[GET /api/nominas/[id]/complementos] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener complementos de nómina' },
      { status: 500 }
    );
  }
}

// ========================================
// POST /api/nominas/[id]/complementos
// ========================================
// Asigna uno o múltiples complementos a una nómina
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // HR y managers pueden asignar complementos
    if (!['hr_admin', 'platform_admin', 'manager'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await req.json();

    // Soportar asignación única o múltiple
    let complementos: z.infer<typeof AsignarComplementoSchema>[];
    if (Array.isArray(body.complementos)) {
      const data = AsignarMultiplesSchema.parse(body);
      complementos = data.complementos;
    } else {
      const data = AsignarComplementoSchema.parse(body);
      complementos = [data];
    }

    // Verificar que la nómina existe y pertenece a la empresa
    const nomina = await prisma.nomina.findFirst({
      where: {
        id,
      },
      include: {
        empleado: {
          select: {
            id: true,
            empresaId: true,
          },
        },
      },
    });

    if (!nomina) {
      return NextResponse.json({ error: 'Nómina no encontrada' }, { status: 404 });
    }

    if (nomina.empleado.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Verificar que la nómina está en estado válido para asignar complementos
    if (nomina.estado === NOMINA_ESTADOS.PUBLICADA) {
      return NextResponse.json(
        {
          error: 'No se pueden asignar complementos a una nómina publicada',
        },
        { status: 400 }
      );
    }

    // Verificar que todos los complementos pertenecen al empleado
    const empleadoComplementosIds = complementos.map((c) => c.empleadoComplementoId);
    const empleadoComplementos = await prisma.empleadoComplemento.findMany({
      where: {
        id: { in: empleadoComplementosIds },
        empleadoId: nomina.empleadoId,
        activo: true,
      },
      include: {
        tipoComplemento: true,
      },
    });

    if (empleadoComplementos.length !== complementos.length) {
      return NextResponse.json(
        { error: 'Uno o más complementos no son válidos para este empleado' },
        { status: 400 }
      );
    }

    // Crear asignaciones
    const asignaciones = await Promise.all(
      complementos.map(async (comp) => {
        const empleadoComp = empleadoComplementos.find(
          (ec) => ec.id === comp.empleadoComplementoId
        )!;

        // Verificar que no existe ya una asignación
        const existente = await prisma.asignacionComplemento.findUnique({
          where: {
            nominaId_empleadoComplementoId: {
              nominaId: id,
              empleadoComplementoId: comp.empleadoComplementoId,
            },
          },
        });

        if (existente) {
          throw new Error(
            `El complemento '${empleadoComp.tipoComplemento.nombre}' ya está asignado a esta nómina`
          );
        }

        return prisma.asignacionComplemento.create({
          data: {
            nominaId: id,
            empleadoComplementoId: comp.empleadoComplementoId,
            importe: new Decimal(comp.importe),
            asignadoPor: session.user.id,
            notas: comp.notas || null,
          },
          include: {
            empleadoComplemento: {
              include: {
                tipoComplemento: true,
              },
            },
          },
        });
      })
    );

    // Actualizar totales de la nómina
    const totalComplementos = asignaciones.reduce(
      (sum, a) => sum.add(a.importe),
      nomina.totalComplementos || new Decimal(0)
    );

    const totalBruto = (nomina.salarioBase || new Decimal(0))
      .add(totalComplementos)
      .sub(nomina.totalDeducciones || new Decimal(0));

    // Calcular totalNeto (simplificado - en producción aplicar deducciones IRPF, SS, etc.)
    const totalNeto = totalBruto;

    // Verificar si quedan complementos pendientes
    const todosLosComplementos = await prisma.empleadoComplemento.count({
      where: {
        empleadoId: nomina.empleadoId,
        activo: true,
      },
    });

    const complementosAsignadosTotal = await prisma.asignacionComplemento.count({
      where: {
        nominaId: id,
      },
    });

    const complementosPendientes = todosLosComplementos > complementosAsignadosTotal;

    await prisma.nomina.update({
      where: { id },
      data: {
        totalComplementos,
        totalBruto,
        totalNeto,
        complementosPendientes,
        estado: complementosPendientes
          ? NOMINA_ESTADOS.PENDIENTE
          : NOMINA_ESTADOS.COMPLETADA,
      },
    });

    return NextResponse.json(
      {
        asignaciones,
        totalComplementos: totalComplementos.toNumber(),
        totalBruto: totalBruto.toNumber(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('[POST /api/nominas/[id]/complementos] Error:', error);
    return NextResponse.json(
      { error: 'Error al asignar complementos' },
      { status: 500 }
    );
  }
}
