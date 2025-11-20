// ========================================
// Cálculo de Balance de Horas
// ========================================

import { prisma } from '@/lib/prisma';
import {
  calcularHorasTrabajadas,
  obtenerHorasEsperadas,
  obtenerHorasEsperadasBatch,
  agruparFichajesPorDia,
  type FichajeConEventos,
} from './fichajes';
import type { FichajeEvento, PrismaClient } from '@prisma/client';
import {
  crearSetFestivos,
  esDiaLaborable,
  formatearClaveFecha,
  getDiasLaborablesEmpresa,
  getFestivosActivosEnRango,
} from './dias-laborables';

const prismaClient = prisma as PrismaClient;

export interface DiaCalculo {
  fecha: Date;
  key: string;
}

export interface BalanceDia {
  fecha: Date;
  horasTrabajadas: number;
  horasEsperadas: number;
  balance: number; // + o -
  esFestivo: boolean;
  esNoLaborable: boolean; // Calculado del calendario laboral de la empresa (no hardcoded)
}

export interface BalancePeriodo {
  totalHorasTrabajadas: number;
  totalHorasEsperadas: number;
  balanceTotal: number;
  dias: BalanceDia[];
}

export function generarDiasDelPeriodo(fechaInicio: Date, fechaFin: Date): DiaCalculo[] {
  const dias: DiaCalculo[] = [];
  const cursor = new Date(Date.UTC(
    fechaInicio.getUTCFullYear(),
    fechaInicio.getUTCMonth(),
    fechaInicio.getUTCDate()
  ));
  const finNormalizado = new Date(Date.UTC(
    fechaFin.getUTCFullYear(),
    fechaFin.getUTCMonth(),
    fechaFin.getUTCDate()
  ));

  while (cursor.getTime() <= finNormalizado.getTime()) {
    const fecha = new Date(cursor);
    fecha.setUTCHours(0, 0, 0, 0);
    dias.push({
      fecha,
      key: formatearClaveFecha(fecha),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dias;
}

export function calcularHorasTrabajadasDelDia(fichaje?: FichajeConEventos): number {
  if (!fichaje) {
    return 0;
  }

  if (fichaje.horasTrabajadas !== null && fichaje.horasTrabajadas !== undefined) {
    return Number(fichaje.horasTrabajadas);
  }

  return calcularHorasTrabajadas(fichaje.eventos);
}

/**
 * Calcula el balance de horas de un día específico
 */
export async function calcularBalanceDiario(
  empleadoId: string,
  fecha: Date
): Promise<number> {
  // Resetear hora para comparación de fechas
  const fechaInicio = new Date(fecha);
  fechaInicio.setHours(0, 0, 0, 0);

  // Obtener fichajes del día
  const fichajes = await prismaClient.fichaje.findMany({
    where: {
      empleadoId,
      fecha: fechaInicio,
    },
  });

  // En el nuevo schema, horasTrabajadas ya está calculado en el Fichaje
  const horasTrabajadas = fichajes.reduce<number>((sum, fichaje) => {
    return sum + (fichaje.horasTrabajadas != null ? Number(fichaje.horasTrabajadas) : 0);
  }, 0);

  const horasEsperadas = await obtenerHorasEsperadas(empleadoId, fecha);

  return horasTrabajadas - horasEsperadas;
}

/**
 * Calcula el balance de horas de una semana
 */
export async function calcularBalanceSemanal(
  empleadoId: string,
  fecha: Date
): Promise<BalancePeriodo> {
  // Obtener lunes de la semana
  const lunes = new Date(fecha);
  const dia = lunes.getDay();
  const diff = dia === 0 ? -6 : 1 - dia; // Si es domingo, retroceder 6 días
  lunes.setDate(lunes.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);

  // Obtener domingo de la semana
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  domingo.setHours(23, 59, 59, 999);

  return calcularBalancePeriodo(empleadoId, lunes, domingo);
}

/**
 * Calcula el balance de horas de un mes
 */
export async function calcularBalanceMensual(
  empleadoId: string,
  mes: number,
  año: number
): Promise<BalancePeriodo> {
  // Primer día del mes
  const fechaInicio = new Date(año, mes - 1, 1);
  fechaInicio.setHours(0, 0, 0, 0);

  // Último día del mes
  const fechaFin = new Date(año, mes, 0);
  fechaFin.setHours(23, 59, 59, 999);

  return calcularBalancePeriodo(empleadoId, fechaInicio, fechaFin);
}

/**
 * Calcula el balance de un período personalizado
 */
export async function calcularBalancePeriodo(
  empleadoId: string,
  fechaInicio: Date,
  fechaFin: Date
): Promise<BalancePeriodo> {
  // Obtener todos los fichajes del período
  const fichajes = await prismaClient.fichaje.findMany({
    where: {
      empleadoId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
    orderBy: [
      { fecha: 'asc' },
    ],
    include: {
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
  });

  // Agrupar por día
  const fichajesConEventos: FichajeConEventos[] = fichajes.map((fichaje) => ({
    ...fichaje,
    eventos: [...fichaje.eventos],
  }));
  const fichajesPorDia = agruparFichajesPorDia(fichajesConEventos);

  // Obtener festivos del período
  const empleado = await prismaClient.empleado.findUnique({
    where: { id: empleadoId },
    select: { empresaId: true },
  });

  if (!empleado) {
    throw new Error(`[BalanceHoras] Empleado ${empleadoId} no encontrado`);
  }

  const diasDelPeriodo = generarDiasDelPeriodo(fechaInicio, fechaFin);

  const [festivos, diasLaborablesConfig] = await Promise.all([
    getFestivosActivosEnRango(empleado.empresaId, fechaInicio, fechaFin),
    getDiasLaborablesEmpresa(empleado.empresaId),
  ]);
  const festivosSet = crearSetFestivos(festivos);
  const calendarioLaboralMap = new Map<string, boolean>();

  for (const dia of diasDelPeriodo) {
    const esLaborable = await esDiaLaborable(
      dia.fecha,
      empleado.empresaId,
      diasLaborablesConfig,
      festivosSet
    );
    calendarioLaboralMap.set(dia.key, esLaborable);
  }

  const horasEsperadasEntradas = diasDelPeriodo.map((dia) => ({
    empleadoId,
    fecha: dia.fecha,
  }));
  const horasEsperadasMap = await obtenerHorasEsperadasBatch(horasEsperadasEntradas);

  // Calcular balance por día
  const dias: BalanceDia[] = [];
  let totalHorasTrabajadas = 0;
  let totalHorasEsperadas = 0;

  for (const dia of diasDelPeriodo) {
    const fichajeDia = fichajesPorDia[dia.key] as FichajeConEventos | undefined;
    const eventosDia: FichajeEvento[] = fichajeDia?.eventos ?? [];

    const horasTrabajadas = calcularHorasTrabajadasDelDia(
      fichajeDia ? { ...fichajeDia, eventos: eventosDia } : undefined
    );
    const horasEsperadas = horasEsperadasMap[`${empleadoId}_${dia.key}`] ?? 0;
    const balance = horasTrabajadas - horasEsperadas;

    const esFestivo = festivosSet.has(dia.key);
    const esLaborable = calendarioLaboralMap.get(dia.key) ?? true;

    dias.push({
      fecha: new Date(dia.fecha),
      horasTrabajadas,
      horasEsperadas,
      balance,
      esFestivo,
      esNoLaborable: !esLaborable, // ✅ Calculado del calendario laboral (no hardcoded)
    });

    totalHorasTrabajadas += horasTrabajadas;
    totalHorasEsperadas += horasEsperadas;

  }

  return {
    totalHorasTrabajadas: Math.round(totalHorasTrabajadas * 100) / 100,
    totalHorasEsperadas: Math.round(totalHorasEsperadas * 100) / 100,
    balanceTotal: Math.round((totalHorasTrabajadas - totalHorasEsperadas) * 100) / 100,
    dias,
  };
}

/**
 * Calcula el balance acumulado desde el inicio del año
 */
export async function calcularBalanceAcumulado(
  empleadoId: string,
  hastaFecha: Date
): Promise<number> {
  const añoActual = hastaFecha.getFullYear();
  const inicioAño = new Date(añoActual, 0, 1);

  const balance = await calcularBalancePeriodo(empleadoId, inicioAño, hastaFecha);
  return balance.balanceTotal;
}

/**
 * Obtiene resumen de balance para dashboard
 */
export async function obtenerResumenBalance(empleadoId: string) {
  const hoy = new Date();

  const [balanceDiario, balanceSemanal, balanceMensual, balanceAcumulado] =
    await Promise.all([
      calcularBalanceDiario(empleadoId, hoy),
      calcularBalanceSemanal(empleadoId, hoy),
      calcularBalanceMensual(empleadoId, hoy.getMonth() + 1, hoy.getFullYear()),
      calcularBalanceAcumulado(empleadoId, hoy),
    ]);

  return {
    diario: Math.round(balanceDiario * 100) / 100,
    semanal: Math.round(balanceSemanal.balanceTotal * 100) / 100,
    mensual: Math.round(balanceMensual.balanceTotal * 100) / 100,
    acumulado: Math.round(balanceAcumulado * 100) / 100,
  };
}

