// ========================================
// Cálculo de Balance de Horas
// ========================================

import { prisma } from '@/lib/prisma';
import { obtenerNombreDia } from '@/lib/utils/fechas';

import {
  crearSetFestivos,
  type DiasLaborables,
  esDiaLaborable,
  type FestivosSet,
  formatearClaveFecha,
  getDiasLaborablesEmpresa,
  getFestivosActivosEnRango,
} from './dias-laborables';
import {
  agruparFichajesPorDia,
  calcularHorasTrabajadas,
  type FichajeConEventos,
  obtenerHorasEsperadas,
  obtenerHorasEsperadasBatch,
} from './fichajes';

import type { fichaje_eventos as FichajeEvento, PrismaClient } from '@prisma/client';

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

function calcularCalendarioLaboralMensual(
  diasDelPeriodo: DiaCalculo[],
  diasLaborablesConfig: DiasLaborables,
  festivosSet: FestivosSet
): Map<string, boolean> {
  const calendario = new Map<string, boolean>();

  for (const dia of diasDelPeriodo) {
    const nombreDia = obtenerNombreDia(dia.fecha);
    const esDiaSemanaLaborable = diasLaborablesConfig[nombreDia] ?? true;
    const esFestivo = festivosSet.has(dia.key);
    calendario.set(dia.key, esDiaSemanaLaborable && !esFestivo);
  }

  return calendario;
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

  return calcularHorasTrabajadas(fichaje.eventos) ?? 0;
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
  const fichajes = await prismaClient.fichajes.findMany({
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

export async function calcularBalanceMensualBatch(
  empresaId: string,
  empleadoIds: string[],
  mes: number,
  año: number
): Promise<Map<string, BalancePeriodo>> {
  const uniqueEmpleadoIds = Array.from(new Set(empleadoIds));

  if (uniqueEmpleadoIds.length === 0) {
    return new Map();
  }

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error(`[BalanceHorasBatch] Mes inválido: ${mes}`);
  }

  if (!Number.isInteger(año) || año < 2000 || año > 2100) {
    throw new Error(`[BalanceHorasBatch] Año inválido: ${año}`);
  }

  const fechaInicio = new Date(año, mes - 1, 1);
  fechaInicio.setHours(0, 0, 0, 0);
  const fechaFin = new Date(año, mes, 0);
  fechaFin.setHours(23, 59, 59, 999);

  const diasDelPeriodo = generarDiasDelPeriodo(fechaInicio, fechaFin);

  const [fichajes, festivos, diasLaborablesConfig] = await Promise.all([
    prismaClient.fichajes.findMany({
      where: {
        empleadoId: { in: uniqueEmpleadoIds },
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
    }),
    getFestivosActivosEnRango(empresaId, fechaInicio, fechaFin),
    getDiasLaborablesEmpresa(empresaId),
  ]);

  const festivosSet = crearSetFestivos(festivos);
  const calendarioLaboralMap = calcularCalendarioLaboralMensual(
    diasDelPeriodo,
    diasLaborablesConfig,
    festivosSet
  );

  const fichajesPorEmpleado = new Map<string, FichajeConEventos[]>();
  for (const fichaje of fichajes) {
    const lista = fichajesPorEmpleado.get(fichaje.empleadoId) ?? [];
    lista.push({
      ...fichaje,
      eventos: [...fichaje.eventos],
    });
    fichajesPorEmpleado.set(fichaje.empleadoId, lista);
  }

  const horasEsperadasEntradas = diasDelPeriodo.flatMap((dia) =>
    uniqueEmpleadoIds.map((empleadoId) => ({
      empleadoId,
      fecha: dia.fecha,
    }))
  );

  const horasEsperadasMap = await obtenerHorasEsperadasBatch(horasEsperadasEntradas);
  const resultados = new Map<string, BalancePeriodo>();

  for (const empleadoId of uniqueEmpleadoIds) {
    const fichajesEmpleado = fichajesPorEmpleado.get(empleadoId) ?? [];
    const fichajesAgrupados = agruparFichajesPorDia(fichajesEmpleado);

    const dias: BalanceDia[] = [];
    let totalHorasTrabajadas = 0;
    let totalHorasEsperadas = 0;

    for (const dia of diasDelPeriodo) {
      const fichajeDia = fichajesAgrupados[dia.key] as FichajeConEventos | undefined;
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
        esNoLaborable: !esLaborable,
      });

      totalHorasTrabajadas += horasTrabajadas;
      totalHorasEsperadas += horasEsperadas;
    }

    resultados.set(empleadoId, {
      totalHorasTrabajadas: Math.round(totalHorasTrabajadas * 100) / 100,
      totalHorasEsperadas: Math.round(totalHorasEsperadas * 100) / 100,
      balanceTotal: Math.round((totalHorasTrabajadas - totalHorasEsperadas) * 100) / 100,
      dias,
    });
  }

  return resultados;
}

/**
 * Calcula el balance de un período personalizado
 */
export async function calcularBalancePeriodo(
  empleadoId: string,
  fechaInicio: Date,
  fechaFin: Date
): Promise<BalancePeriodo> {
  const fechaInicioNormalizada = normalizarInicioDeDia(fechaInicio);
  const fechaFinNormalizada = normalizarFinDeDia(fechaFin);

  const empleado = await prismaClient.empleados.findUnique({
    where: { id: empleadoId },
    select: {
      empresaId: true,
      saldoRenovadoDesde: true,
    },
  });

  if (!empleado) {
    throw new Error(`[BalanceHoras] Empleado ${empleadoId} no encontrado`);
  }

  const saldoRenovadoDesde =
    empleado.saldoRenovadoDesde != null
      ? normalizarInicioDeDia(empleado.saldoRenovadoDesde)
      : null;

  const fechaInicioEfectiva =
    saldoRenovadoDesde && saldoRenovadoDesde > fechaInicioNormalizada
      ? saldoRenovadoDesde
      : fechaInicioNormalizada;

  if (fechaInicioEfectiva > fechaFinNormalizada) {
    return {
      totalHorasTrabajadas: 0,
      totalHorasEsperadas: 0,
      balanceTotal: 0,
      dias: [],
    };
  }

  // Obtener todos los fichajes del período efectivo
  const fichajes = await prismaClient.fichajes.findMany({
    where: {
      empleadoId,
      fecha: {
        gte: fechaInicioEfectiva,
        lte: fechaFinNormalizada,
      },
    },
    orderBy: [{ fecha: 'asc' }],
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

  const diasDelPeriodo = generarDiasDelPeriodo(fechaInicioEfectiva, fechaFinNormalizada);

  const [festivos, diasLaborablesConfig] = await Promise.all([
    getFestivosActivosEnRango(empleado.empresaId, fechaInicioEfectiva, fechaFinNormalizada),
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

function normalizarInicioDeDia(fecha: Date): Date {
  const normalizada = new Date(fecha);
  normalizada.setHours(0, 0, 0, 0);
  return normalizada;
}

function normalizarFinDeDia(fecha: Date): Date {
  const normalizada = new Date(fecha);
  normalizada.setHours(23, 59, 59, 999);
  return normalizada;
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

/**
 * Calcula las horas pendientes de compensar de un empleado
 * Las horas pendientes son el balance acumulado positivo menos las horas ya compensadas
 */
export async function calcularHorasPendientesCompensar(
  empleadoId: string,
  año?: number
): Promise<{
  horasPendientes: number;
  horasCompensadas: number;
  balanceTotal: number;
  diasEquivalentes: number;
}> {
  const añoActual = año ?? new Date().getFullYear();
  const inicioAño = new Date(añoActual, 0, 1);
  const finAño = new Date(añoActual, 11, 31, 23, 59, 59, 999);

  // Calcular balance acumulado del año
  const balanceAño = await calcularBalancePeriodo(empleadoId, inicioAño, finAño);

  // Obtener horas ya compensadas (aprobadas) en el año
  const compensacionesAprobadas = await prismaClient.compensaciones_horas_extra.findMany({
    where: {
      empleadoId,
      estado: 'aprobada',
      createdAt: {
        gte: inicioAño,
        lte: finAño,
      },
    },
    select: {
      horasBalance: true,
    },
  });

  const horasCompensadas = compensacionesAprobadas.reduce(
    (total, comp) => total + Number(comp.horasBalance),
    0
  );

  // Solo contamos las horas positivas (extras trabajadas)
  const balancePositivo = Math.max(0, balanceAño.balanceTotal);
  const horasPendientes = Math.max(0, balancePositivo - horasCompensadas);

  // Convertir a días (8 horas = 1 día)
  const diasEquivalentes = Math.round((horasPendientes / 8) * 10) / 10;

  return {
    horasPendientes: Math.round(horasPendientes * 100) / 100,
    horasCompensadas: Math.round(horasCompensadas * 100) / 100,
    balanceTotal: Math.round(balanceAño.balanceTotal * 100) / 100,
    diasEquivalentes,
  };
}

