// ========================================
// Servicio: Procesar compensación de horas extra
// ========================================

import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { determinarEstadoTrasAprobacion } from '@/lib/calculos/ausencias';
import { calcularBalanceMensual } from '@/lib/calculos/balance-horas';
import { prisma } from '@/lib/prisma';
import { redondearHoras } from '@/lib/utils/numeros';

export const empleadoCompensacionSelect = Prisma.validator<Prisma.EmpleadoSelect>()({
  id: true,
  empresaId: true,
  nombre: true,
  apellidos: true,
  email: true,
  saldosAusencias: {
    select: {
      id: true,
      año: true,
      diasTotales: true,
    },
  },
});

export type EmpleadoCompensacion = Prisma.EmpleadoGetPayload<{
  select: typeof empleadoCompensacionSelect;
}>;

export interface ProcesarCompensacionHorasOptions {
  empresaId: string;
  usuarioId: string;
  empleadoIds: string[];
  tipoCompensacion: 'ausencia' | 'nomina';
  mes: number;
  anio: number;
  usarTodasLasHoras: boolean;
  horasPorEmpleado?: Record<string, number>;
  origen: 'nominas' | 'fichajes';
  empleadosPreCargados?: EmpleadoCompensacion[];
}

export interface ProcesarCompensacionHorasResultado {
  compensaciones: string[];
  errores: Array<{ empleadoId: string; error: string }>;
}

export async function procesarCompensacionHorasExtra(
  options: ProcesarCompensacionHorasOptions
): Promise<ProcesarCompensacionHorasResultado> {
  const {
    empresaId,
    usuarioId,
    tipoCompensacion,
    mes,
    anio,
    usarTodasLasHoras,
    horasPorEmpleado,
    origen,
  } = options;

  const empleados: EmpleadoCompensacion[] =
    options.empleadosPreCargados ??
    (await prisma.empleado.findMany({
      where: {
        empresaId,
        id: { in: options.empleadoIds },
      },
      select: {
        ...empleadoCompensacionSelect,
        saldosAusencias: {
          where: { año: anio },
          select: {
            id: true,
            año: true,
            diasTotales: true,
          },
        },
      },
    }));

  const compensaciones: string[] = [];
  const errores: Array<{ empleadoId: string; error: string }> = [];

  for (const empleado of empleados) {
    try {
      const balanceMensual = await calcularBalanceMensual(empleado.id, mes, anio);
      const balanceDisponible = redondearHoras(balanceMensual.balanceTotal);

      if (balanceDisponible <= 0) {
        errores.push({
          empleadoId: empleado.id,
          error: 'No hay horas positivas para compensar',
        });
        continue;
      }

      const horasACompensar = usarTodasLasHoras
        ? balanceDisponible
        : Number(horasPorEmpleado?.[empleado.id] ?? 0);

      if (horasACompensar <= 0) {
        errores.push({
          empleadoId: empleado.id,
          error: 'Horas a compensar inválidas',
        });
        continue;
      }

      if (horasACompensar > balanceDisponible) {
        errores.push({
          empleadoId: empleado.id,
          error: 'Las horas exceden el balance disponible',
        });
        continue;
      }

      const horasDecimal = new Decimal(horasACompensar);

      if (tipoCompensacion === 'ausencia') {
        const diasAusencia = horasDecimal.div(8).toDP(2);
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() + 1);
        const fechaFin = new Date(fechaInicio);

        const ausencia = await prisma.ausencia.create({
          data: {
            empresaId,
            empleadoId: empleado.id,
            tipo: 'otro',
            fechaInicio,
            fechaFin,
            medioDia: false,
            diasNaturales: 0,
            diasLaborables: 0,
            diasSolicitados: diasAusencia.toNumber(),
            descuentaSaldo: false,
            estado: determinarEstadoTrasAprobacion(fechaFin),
            motivo: `Compensación de ${horasDecimal.toFixed(2)} horas extra (${mes}/${anio})`,
            aprobadaPor: usuarioId,
            aprobadaEn: new Date(),
          },
        });

        await prisma.empleadoSaldoAusencias.upsert({
          where: {
            empleadoId_año: {
              empleadoId: empleado.id,
              año: anio,
            },
          },
          update: {
            diasTotales: {
              increment: diasAusencia.toNumber(),
            },
          },
          create: {
            empresaId,
            empleadoId: empleado.id,
            año: anio,
            diasTotales: diasAusencia.toNumber(),
            diasUsados: 0,
            diasPendientes: 0,
            origen: 'manual_hr',
          },
        });

        await prisma.compensacionHoraExtra.create({
          data: {
            empresaId,
            empleadoId: empleado.id,
            horasBalance: horasDecimal,
            tipoCompensacion,
            estado: 'aprobada',
            diasAusencia,
            ausenciaId: ausencia.id,
            aprobadoPor: usuarioId,
            aprobadoEn: new Date(),
          },
        });
      } else {
        await prisma.compensacionHoraExtra.create({
          data: {
            empresaId,
            empleadoId: empleado.id,
            horasBalance: horasDecimal,
            tipoCompensacion,
            estado: 'aprobada',
            aprobadoPor: usuarioId,
            aprobadoEn: new Date(),
          },
        });
      }

      compensaciones.push(empleado.id);
    } catch (error) {
      console.error(
        `[CompensacionHoras][${origen}] Error para empleado ${empleado.id}:`,
        error
      );
      errores.push({
        empleadoId: empleado.id,
        error: 'Error al procesar compensación',
      });
    }
  }

  return { compensaciones, errores };
}

