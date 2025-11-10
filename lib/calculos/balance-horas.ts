// ========================================
// Cálculo de Balance de Horas
// ========================================

import { prisma } from '@/lib/prisma';
import { calcularHorasTrabajadas, obtenerHorasEsperadas, agruparFichajesPorDia } from './fichajes';
import { Fichaje } from '@prisma/client';

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
  const fichajes = await prisma.fichaje.findMany({
    where: {
      empleadoId,
      fecha: fechaInicio,
    },
  });

  // En el nuevo schema, horasTrabajadas ya está calculado en el Fichaje
  const horasTrabajadas = fichajes.reduce((sum, f) => {
    return sum + (f.horasTrabajadas != null ? Number(f.horasTrabajadas) : 0);
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
  const fichajes = await prisma.fichaje.findMany({
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
  });

  // Agrupar por día
  const fichajesPorDia = agruparFichajesPorDia(fichajes as any);

  // Obtener festivos del período
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    select: { empresaId: true },
  });

  const festivos = await prisma.festivo.findMany({
    where: {
      empresaId: empleado?.empresaId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
      activo: true,
    },
  });

  const fechasFestivas = new Set(
    festivos.map(f => f.fecha.toISOString().split('T')[0])
  );

  // ✅ OPTIMIZACIÓN: Pre-cargar calendario laboral de la empresa (evita N+1)
  const { esDiaLaborable } = await import('@/lib/calculos/dias-laborables');
  const calendarioLaboralMap = new Map<string, boolean>();
  
  // Pre-calcular todos los días del rango
  const fechaTemp = new Date(fechaInicio);
  while (fechaTemp <= fechaFin) {
    const fechaKey = fechaTemp.toISOString().split('T')[0];
    const esLaborable = await esDiaLaborable(fechaTemp, empleado.empresaId);
    calendarioLaboralMap.set(fechaKey, esLaborable);
    fechaTemp.setDate(fechaTemp.getDate() + 1);
  }

  // Calcular balance por día
  const dias: BalanceDia[] = [];
  let totalHorasTrabajadas = 0;
  let totalHorasEsperadas = 0;

  const fechaActual = new Date(fechaInicio);
  while (fechaActual <= fechaFin) {
    const fechaKey = fechaActual.toISOString().split('T')[0];
    const fichajeDia = fichajesPorDia[fechaKey];
    const eventosDia = fichajeDia?.eventos || [];

    const horasTrabajadas = calcularHorasTrabajadas(eventosDia as any);
    const horasEsperadas = await obtenerHorasEsperadas(empleadoId, fechaActual);
    const balance = horasTrabajadas - horasEsperadas;

    const esFestivo = fechasFestivas.has(fechaKey);
    const esLaborable = calendarioLaboralMap.get(fechaKey) ?? true;

    dias.push({
      fecha: new Date(fechaActual),
      horasTrabajadas,
      horasEsperadas,
      balance,
      esFestivo,
      esNoLaborable: !esLaborable, // ✅ Calculado del calendario laboral (no hardcoded)
    });

    totalHorasTrabajadas += horasTrabajadas;
    totalHorasEsperadas += horasEsperadas;

    fechaActual.setDate(fechaActual.getDate() + 1);
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

