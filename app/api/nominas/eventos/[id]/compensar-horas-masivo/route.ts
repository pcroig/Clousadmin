// ========================================
// API: Compensar Horas Extra Masivamente
// ========================================
// Permite compensar horas extra de múltiples empleados de un evento

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  empleadoCompensacionSelect,
  procesarCompensacionHorasExtra,
} from '@/lib/services/compensacion-horas';

const CompensarHorasMasivoSchema = z.object({
  empleadoIds: z.array(z.string()),
  tipoCompensacion: z.enum(['ausencia', 'nomina']),
  horasPorEmpleado: z.record(z.string(), z.number()).optional(), // { empleadoId: horas }
  usarTodasLasHoras: z.boolean().default(true),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: eventoId } = await params;

    // Verificar que el evento existe y pertenece a la empresa
    const evento = await prisma.eventoNomina.findFirst({
      where: {
        id: eventoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const data = CompensarHorasMasivoSchema.parse(body);

    // Verificar que los empleados pertenecen a la empresa
    const empleados = await prisma.empleado.findMany({
      where: {
        id: { in: data.empleadoIds },
        empresaId: session.user.empresaId,
      },
      select: {
        ...empleadoCompensacionSelect,
        saldosAusencias: {
          where: {
            anio: evento.anio,
          },
          select: {
            id: true,
            año: true,
            diasTotales: true,
          },
        },
      },
    });

    if (empleados.length !== data.empleadoIds.length) {
      return NextResponse.json(
        { error: 'Algunos empleados no fueron encontrados' },
        { status: 404 }
      );
    }

    const resultado = await procesarCompensacionHorasExtra({
      empresaId: session.user.empresaId,
      usuarioId: session.user.id,
      empleadoIds: data.empleadoIds,
      tipoCompensacion: data.tipoCompensacion,
      mes: evento.mes,
      anio: evento.anio,
      usarTodasLasHoras: data.usarTodasLasHoras,
      horasPorEmpleado: data.horasPorEmpleado,
      origen: 'nominas',
      empleadosPreCargados: empleados,
    });

    return NextResponse.json({
      success: true,
      compensacionesCreadas: resultado.compensaciones.length,
      errores: resultado.errores.length,
      detalles: resultado,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[POST /api/nominas/eventos/[id]/compensar-horas-masivo] Error:', error);
    return NextResponse.json(
      { error: 'Error al compensar horas' },
      { status: 500 }
    );
  }
}

