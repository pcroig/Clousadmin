// ========================================
// Analytics Helpers
// ========================================
// Utilidades reutilizables para endpoints de analytics

import type { Prisma } from '@prisma/client';

/**
 * Meses del año en español
 */
export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

/**
 * Convierte un Prisma Decimal a número
 * Maneja valores null/undefined retornando 0
 * @param value - Valor a convertir
 * @returns Número convertido
 */
export function toNumber(
  value: Prisma.Decimal | number | null | undefined
): number {
  return Number(value ?? 0);
}

/**
 * Calcula la variación porcentual entre dos valores
 * @param actual - Valor actual
 * @param anterior - Valor anterior
 * @returns Porcentaje de variación con 1 decimal
 */
export function calcularVariacion(actual: number, anterior: number): number {
  if (anterior <= 0) {
    return 0;
  }
  return Number((((actual - anterior) / anterior) * 100).toFixed(1));
}

/**
 * Formatea un número como moneda en euros
 * @param value - Valor a formatear
 * @returns String formateado como moneda
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.round(value ?? 0));
}

/**
 * Formatea un porcentaje con signo
 * @param value - Valor del porcentaje
 * @returns String formateado con signo
 */
export function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * Obtiene el nombre del mes en español
 * @param mesNumero - Número del mes (1-12)
 * @returns Nombre del mes o vacío si es inválido
 */
export function obtenerNombreMes(mesNumero: number): string {
  if (mesNumero < 1 || mesNumero > 12) return '';
  return MESES[mesNumero - 1];
}

