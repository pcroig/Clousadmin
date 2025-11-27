// ========================================
// API: Compensar horas extra desde Fichajes
// ========================================
// Permite a HR compensar bolsa de horas sin depender de un evento de nómina

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  handleApiError,
  requireAuthAsHR,
} from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import {
  empleadoCompensacionSelect,
  procesarCompensacionHorasExtra,
} from '@/lib/services/compensacion-horas';

const CompensarHorasSchema = z.object({
  mes: z.number().int().min(1).max(12),
  anio: z.number().int().min(2020).max(2100),
  empleadoIds: z.array(z.string()).min(1),
  tipoCompensacion: z.enum(['ausencia', 'nomina']),
  usarTodasLasHoras: z.boolean().default(true),
  horasPorEmpleado: z.record(z.string(), z.number()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const body = await request.json() as Record<string, unknown>;
    const data = CompensarHorasSchema.parse(body);

    const empleados = await prisma.empleado.findMany({
      where: {
        empresaId: session.user.empresaId,
        id: { in: data.empleadoIds },
      },
      select: {
        ...empleadoCompensacionSelect,
        saldosAusencias: {
          where: { año: data.anio },
          select: {
            id: true,
            año: true,
            diasTotales: true,
          },
        },
      },
    });

    if (empleados.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron empleados para compensar' },
        { status: 404 }
      );
    }

    const resultado = await procesarCompensacionHorasExtra({
      empresaId: session.user.empresaId,
      usuarioId: session.user.id,
      empleadoIds: data.empleadoIds,
      tipoCompensacion: data.tipoCompensacion,
      mes: data.mes,
      anio: data.anio,
      usarTodasLasHoras: data.usarTodasLasHoras,
      horasPorEmpleado: data.horasPorEmpleado,
      origen: 'fichajes',
      empleadosPreCargados: empleados,
    });

    return NextResponse.json({
      success: true,
      compensacionesCreadas: resultado.compensaciones.length,
      errores: resultado.errores.length,
      detalles: resultado,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes/compensar-horas');
  }
}

