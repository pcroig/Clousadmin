// ========================================
// Servicio: Procesar compensación de horas extra
// ========================================

import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { determinarEstadoTrasAprobacion } from '@/lib/calculos/ausencias';
import { calcularBalanceMensual } from '@/lib/calculos/balance-horas';
import { prisma } from '@/lib/prisma';
import { redondearHoras } from '@/lib/utils/numeros';

export const empleadoCompensacionSelect = Prisma.validator<Prisma.empleadosSelect>()({
  id: true,
  empresaId: true,
  nombre: true,
  apellidos: true,
  email: true,
  saldosAusencias: {
    select: {
      id: true,
      anio: true,
      diasTotales: true,
    },
  },
});

export type EmpleadoCompensacion = Prisma.empleadosGetPayload<{
  select: typeof empleadoCompensacionSelect;
}>;

export interface ProcesarCompensacionHorasOptions {
  empresaId: string;
  usuarioId: string;
  empleadoIds: string[];
  tipoCompensacion: 'ausencia' | 'nomina' | 'combinado';
  mes: number | 'all';
  anio: number;
  usarTodasLasHoras: boolean;
  horasPorEmpleado?: Record<string, number>;
  origen: 'nominas' | 'fichajes';
  empleadosPreCargados?: EmpleadoCompensacion[];
  porcentajeAusencia?: number;
  porcentajeNomina?: number;
  maxHorasPorEmpleado?: number;
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
    maxHorasPorEmpleado,
    porcentajeAusencia,
    porcentajeNomina,
  } = options;

  const empleados: EmpleadoCompensacion[] =
    options.empleadosPreCargados ??
    (await prisma.empleados.findMany({
      where: {
        empresaId,
        id: { in: options.empleadoIds },
      },
      select: {
        ...empleadoCompensacionSelect,
        saldosAusencias: {
          where: { anio },
          select: {
            id: true,
            anio: true,
            diasTotales: true,
          },
        },
      },
    }));

  const compensaciones: string[] = [];
  const errores: Array<{ empleadoId: string; error: string }> = [];

  const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);

  for (const empleado of empleados) {
    try {
      let balanceDisponible: number;

      if (mes === 'all') {
        const { calcularBalancePeriodo } = await import('@/lib/calculos/balance-horas');
        const fechaInicio = new Date(anio, 0, 1);
        const fechaFin = new Date(anio, 11, 31, 23, 59, 59, 999);
        const balancePeriodo = await calcularBalancePeriodo(empleado.id, fechaInicio, fechaFin);
        balanceDisponible = redondearHoras(balancePeriodo.balanceTotal);
      } else {
        const balanceMensual = await calcularBalanceMensual(empleado.id, mes, anio);
        balanceDisponible = redondearHoras(balanceMensual.balanceTotal);
      }

      if (balanceDisponible <= 0) {
        errores.push({
          empleadoId: empleado.id,
          error: 'No hay horas positivas para compensar',
        });
        continue;
      }

      const horasSolicitadas = usarTodasLasHoras
        ? balanceDisponible
        : Number(horasPorEmpleado?.[empleado.id] ?? 0);

      if (horasSolicitadas <= 0) {
        errores.push({
          empleadoId: empleado.id,
          error: 'Horas a compensar inválidas',
        });
        continue;
      }

      if (horasSolicitadas > balanceDisponible) {
        errores.push({
          empleadoId: empleado.id,
          error: 'Las horas exceden el balance disponible',
        });
        continue;
      }

      const limite = maxHorasPorEmpleado
        ? Math.min(maxHorasPorEmpleado, balanceDisponible)
        : balanceDisponible;
      const horasValidadas = Math.min(horasSolicitadas, limite);

      if (horasValidadas <= 0) {
        errores.push({
          empleadoId: empleado.id,
          error: 'El máximo permitido deja las horas en 0',
        });
        continue;
      }

      const horasDecimal = new Decimal(horasValidadas);

      const aplicarAusencia = async (horas: Decimal) => {
        if (horas.lte(0)) return;
        const diasAusencia = horas.div(8).toDP(2);
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() + 1);
        const fechaFin = new Date(fechaInicio);

        const ausencia = await prisma.ausencias.create({
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
            motivo: `Compensación de ${horas.toFixed(2)} horas extra (${mes === 'all' ? 'total' : `${mes}/${anio}`})`,
            aprobadaPor: usuarioId,
            aprobadaEn: new Date(),
          },
        });

        await prisma.empleadoSaldoAusencias.upsert({
          where: {
            empleadoId_anio: {
              empleadoId: empleado.id,
              anio,
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
            anio,
            diasTotales: diasAusencia.toNumber(),
            diasUsados: 0,
            diasPendientes: 0,
            origen: 'manual_hr',
          },
        });

        await prisma.compensaciones_horas_extra.create({
          data: {
            empresaId,
            empleadoId: empleado.id,
            horasBalance: horas,
            tipoCompensacion: 'ausencia',
            estado: 'aprobada',
            diasAusencia,
            ausenciaId: ausencia.id,
            aprobadoPor: usuarioId,
            aprobadoEn: new Date(),
          },
        });
      };

      const aplicarNomina = async (horas: Decimal) => {
        if (horas.lte(0)) return;
        await prisma.compensaciones_horas_extra.create({
          data: {
            empresaId,
            empleadoId: empleado.id,
            horasBalance: horas,
            tipoCompensacion: 'nomina',
            estado: 'aprobada',
            aprobadoPor: usuarioId,
            aprobadoEn: new Date(),
          },
        });
      };

      if (tipoCompensacion === 'combinado') {
        const porcentajeAusenciaNormalizado = clamp(porcentajeAusencia ?? 50, 0, 100);
        const porcentajeNominaNormalizado = clamp(
          porcentajeNomina ?? 100 - porcentajeAusenciaNormalizado,
          0,
          100
        );
        const totalPorcentaje =
          porcentajeAusenciaNormalizado + porcentajeNominaNormalizado || 100;

        const factorAusencia = porcentajeAusenciaNormalizado / totalPorcentaje;
        const factorNomina = porcentajeNominaNormalizado / totalPorcentaje;

        await aplicarAusencia(horasDecimal.mul(factorAusencia));
        await aplicarNomina(horasDecimal.mul(factorNomina));
      } else if (tipoCompensacion === 'ausencia') {
        await aplicarAusencia(horasDecimal);
      } else {
        await aplicarNomina(horasDecimal);
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

