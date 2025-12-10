// ========================================
// Date Utilities - Timezone-safe helpers
// ========================================

/**
 * Normaliza una fecha a medianoche UTC (00:00:00.000Z).
 *
 * Convierte cualquier fecha (local o ISO string) a un Date anclado a medianoche UTC
 * del mismo día calendario. Esto previene desplazamientos de fecha causados por
 * diferencias de zona horaria.
 *
 * @param dateInput - Fecha en cualquier timezone o string ISO
 * @returns Date anclada a medianoche UTC del mismo día calendario
 *
 * @example
 * // Input: Date local 2025-01-17 23:00 en Madrid (UTC+1)
 * // Output: 2025-01-17T00:00:00.000Z (UTC)
 * normalizeToUTCDate(new Date('2025-01-17T23:00:00+01:00'))
 *
 * @example
 * // Input: ISO string "2025-01-17T12:30:00-05:00" (New York)
 * // Output: 2025-01-17T00:00:00.000Z (UTC)
 * normalizeToUTCDate('2025-01-17T12:30:00-05:00')
 */
export function normalizeToUTCDate(dateInput: Date | string): Date {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
}

/**
 * Normaliza un rango de fechas a medianoche UTC.
 *
 * Útil para validaciones y queries de rango que requieren consistencia de timezone.
 *
 * @param fechaInicio - Fecha de inicio del rango
 * @param fechaFin - Fecha de fin del rango
 * @returns Objeto con ambas fechas normalizadas a UTC
 *
 * @example
 * const { inicio, fin } = normalizeRangeToUTC(
 *   new Date('2025-01-17'),
 *   new Date('2025-01-22')
 * );
 */
export function normalizeRangeToUTC(
  fechaInicio: Date | string,
  fechaFin: Date | string
): { inicio: Date; fin: Date } {
  return {
    inicio: normalizeToUTCDate(fechaInicio),
    fin: normalizeToUTCDate(fechaFin),
  };
}

/**
 * Compara dos fechas normalizadas a nivel de día (ignora hora/minuto/segundo).
 *
 * IMPORTANTE: Normaliza ambas fechas a medianoche UTC antes de comparar.
 * Si las fechas de entrada ya están en diferentes días calendario, retorna false.
 *
 * @param fecha1 - Primera fecha a comparar
 * @param fecha2 - Segunda fecha a comparar
 * @returns true si ambas fechas representan el mismo día calendario (normalizado a UTC)
 *
 * @example
 * isSameDayUTC('2025-01-17T23:59:59Z', '2025-01-17T00:00:00Z') // true (mismo día)
 * isSameDayUTC('2025-01-17T23:59:59Z', '2025-01-18T00:00:01Z') // false (días diferentes)
 */
export function isSameDayUTC(fecha1: Date | string, fecha2: Date | string): boolean {
  const d1 = fecha1 instanceof Date ? fecha1 : new Date(fecha1);
  const d2 = fecha2 instanceof Date ? fecha2 : new Date(fecha2);

  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

/**
 * Formatea una fecha para display al usuario.
 * Usa el formato español estándar.
 *
 * @param date - Fecha a formatear
 * @param options - Opciones adicionales de formato
 * @returns String formateado según locale español
 *
 * @example
 * formatDateForDisplay(new Date('2025-01-17')) // "17/01/2025"
 */
export function formatDateForDisplay(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  });
}

/**
 * Convierte una fecha Date a string YYYY-MM-DD en UTC.
 * Útil para inputs HTML de tipo date.
 *
 * @param date - Fecha a convertir
 * @returns String en formato YYYY-MM-DD basado en UTC
 *
 * @example
 * toDateInputValue(new Date('2025-01-17T12:00:00Z')) // "2025-01-17"
 */
export function toDateInputValue(date: Date | string): string {
  const d = normalizeToUTCDate(date);
  return d.toISOString().split('T')[0];
}

/**
 * Calcula la diferencia en días entre dos fechas (ambas normalizadas a UTC).
 *
 * @param fechaInicio - Fecha de inicio
 * @param fechaFin - Fecha de fin
 * @returns Número de días entre las fechas (inclusivo)
 *
 * @example
 * getDaysBetween('2025-01-17', '2025-01-22') // 6 (17,18,19,20,21,22)
 */
export function getDaysBetween(fechaInicio: Date | string, fechaFin: Date | string): number {
  const inicio = normalizeToUTCDate(fechaInicio);
  const fin = normalizeToUTCDate(fechaFin);
  const diffTime = Math.abs(fin.getTime() - inicio.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir día inicio
}
