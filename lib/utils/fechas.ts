/**
 * Utilidades para manejo de fechas
 * Centraliza operaciones comunes de fechas para evitar duplicación
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Nombres de los días de la semana en español
 * Index: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
 */
export const DIAS_SEMANA = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
] as const;

export type DiaSemana = typeof DIAS_SEMANA[number];

/**
 * Nombres de los meses en español
 * Index: 0 = Enero, 1 = Febrero, ..., 11 = Diciembre
 */
export const MESES_NOMBRES = [
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

export type NombreMes = typeof MESES_NOMBRES[number];

// ============================================================================
// OBTENCIÓN DE INFORMACIÓN
// ============================================================================

/**
 * Obtiene el nombre del día de la semana para una fecha dada
 * @param fecha - Fecha a evaluar
 * @returns Nombre del día en español (domingo, lunes, etc.)
 * @example
 * obtenerNombreDia(new Date('2025-01-20')) // 'lunes'
 */
export function obtenerNombreDia(fecha: Date): DiaSemana {
  return DIAS_SEMANA[fecha.getDay()];
}

/**
 * Obtiene el nombre del mes para un número de mes
 * @param mes - Número del mes (1-12)
 * @returns Nombre del mes en español
 * @example
 * obtenerNombreMes(1) // 'Enero'
 * obtenerNombreMes(12) // 'Diciembre'
 */
export function obtenerNombreMes(mes: number): NombreMes {
  if (mes < 1 || mes > 12) {
    throw new Error(`Mes inválido: ${mes}. Debe estar entre 1 y 12.`);
  }
  return MESES_NOMBRES[mes - 1];
}

// ============================================================================
// NORMALIZACIÓN DE FECHAS
// ============================================================================

/**
 * Normaliza una fecha a medianoche (00:00:00.000)
 * Crea una nueva instancia sin modificar la original
 * @param fecha - Fecha a normalizar
 * @returns Nueva fecha con horas, minutos, segundos y milisegundos en 0
 * @example
 * const fecha = new Date('2025-01-20T15:30:00');
 * const normalizada = normalizarFecha(fecha);
 * // normalizada = 2025-01-20T00:00:00.000
 */
export function normalizarFecha(fecha: Date): Date {
  const nueva = new Date(fecha);
  nueva.setHours(0, 0, 0, 0);
  return nueva;
}

/**
 * Obtiene una fecha base (solo año, mes, día) sin información de hora
 * Crea una nueva instancia de fecha con hora 00:00:00
 * @param fecha - Fecha a convertir
 * @returns Nueva fecha con solo la parte de año/mes/día
 * @example
 * const fecha = new Date('2025-01-20T15:30:00');
 * const base = obtenerFechaBase(fecha);
 * // base = 2025-01-20T00:00:00.000
 */
export function obtenerFechaBase(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

// ============================================================================
// CÁLCULOS DE DIFERENCIAS
// ============================================================================

/**
 * Calcula la diferencia en horas entre dos fechas
 * @param inicio - Fecha de inicio
 * @param fin - Fecha de fin
 * @returns Diferencia en horas (puede ser negativo si fin < inicio)
 * @example
 * const inicio = new Date('2025-01-20T08:00');
 * const fin = new Date('2025-01-20T17:00');
 * calcularHorasEntre(inicio, fin) // 9
 */
export function calcularHorasEntre(inicio: Date, fin: Date): number {
  return (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);
}

/**
 * Calcula la diferencia en minutos entre dos fechas
 * @param inicio - Fecha de inicio
 * @param fin - Fecha de fin
 * @returns Diferencia en minutos (puede ser negativo si fin < inicio)
 * @example
 * const inicio = new Date('2025-01-20T08:00');
 * const fin = new Date('2025-01-20T08:30');
 * calcularMinutosEntre(inicio, fin) // 30
 */
export function calcularMinutosEntre(inicio: Date, fin: Date): number {
  return (fin.getTime() - inicio.getTime()) / (1000 * 60);
}

/**
 * Calcula la diferencia en días entre dos fechas
 * IMPORTANTE: Normaliza las fechas a medianoche para contar días naturales correctamente
 * @param inicio - Fecha de inicio
 * @param fin - Fecha de fin
 * @param incluirAmbos - Si true, incluye tanto el día de inicio como el de fin en el conteo
 * @returns Diferencia en días (siempre positivo)
 * @example
 * const inicio = new Date('2025-01-20');
 * const fin = new Date('2025-01-25');
 * calcularDiasEntre(inicio, fin, false) // 5
 * calcularDiasEntre(inicio, fin, true)  // 6 (incluye ambos días)
 *
 * // Con horas (se normalizan automáticamente):
 * const inicio2 = new Date('2025-01-20T08:00');
 * const fin2 = new Date('2025-01-20T17:00');
 * calcularDiasEntre(inicio2, fin2, true) // 1 (mismo día)
 */
export function calcularDiasEntre(
  inicio: Date,
  fin: Date,
  incluirAmbos: boolean = true
): number {
  // Normalizar a medianoche para contar días naturales correctamente
  const inicioNormalizado = obtenerFechaBase(inicio);
  const finNormalizado = obtenerFechaBase(fin);

  const ms = Math.abs(finNormalizado.getTime() - inicioNormalizado.getTime());
  const dias = Math.floor(ms / (1000 * 60 * 60 * 24));

  return incluirAmbos ? dias + 1 : dias;
}

// ============================================================================
// FORMATEO DE FECHAS
// ============================================================================

const LOCALE_ES = { locale: es };

/**
 * Formatea una fecha en formato corto español (dd/MM/yyyy)
 * @param fecha - Fecha a formatear (Date o string ISO)
 * @returns Fecha formateada como "20/01/2025"
 * @example
 * formatearFechaCorta(new Date('2025-01-20')) // '20/01/2025'
 */
export function formatearFechaCorta(fecha: Date | string): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return format(date, 'dd/MM/yyyy', LOCALE_ES);
}

/**
 * Formatea una fecha en formato largo español
 * @param fecha - Fecha a formatear
 * @returns Fecha formateada como "20 de enero de 2025"
 * @example
 * formatearFechaLarga(new Date('2025-01-20')) // '20 de enero de 2025'
 */
export function formatearFechaLarga(fecha: Date | string): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return format(date, "d 'de' MMMM 'de' yyyy", LOCALE_ES);
}

/**
 * Formatea una fecha en formato completo con día de la semana
 * @param fecha - Fecha a formatear
 * @returns Fecha formateada como "lunes, 20 de enero de 2025"
 * @example
 * formatearFechaCompleta(new Date('2025-01-20')) // 'lunes, 20 de enero de 2025'
 */
export function formatearFechaCompleta(fecha: Date | string): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return format(date, "EEEE, d 'de' MMMM 'de' yyyy", LOCALE_ES);
}

/**
 * Formatea una fecha con hora
 * @param fecha - Fecha a formatear
 * @returns Fecha y hora formateadas como "20/01/2025 a las 15:30"
 * @example
 * formatearFechaHora(new Date('2025-01-20T15:30')) // '20/01/2025 a las 15:30'
 */
export function formatearFechaHora(fecha: Date | string): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return format(date, "dd/MM/yyyy 'a las' HH:mm", LOCALE_ES);
}

/**
 * Formatea solo la hora de una fecha
 * @param fecha - Fecha a formatear
 * @returns Hora formateada como "15:30"
 * @example
 * formatearHora(new Date('2025-01-20T15:30')) // '15:30'
 */
export function formatearHora(fecha: Date | string): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return format(date, 'HH:mm', LOCALE_ES);
}

/**
 * Formatea una fecha de forma relativa (hace X tiempo)
 * @param fecha - Fecha a formatear
 * @returns Texto relativo como "Hoy", "Ayer", "Hace 3 días", etc.
 * @example
 * formatearFechaRelativa(new Date()) // 'Hoy'
 * formatearFechaRelativa(fechaDeAyer) // 'Ayer'
 * formatearFechaRelativa(fechaHace5Dias) // 'Hace 5 días'
 */
export function formatearFechaRelativa(fecha: Date | string): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const ahora = new Date();
  const diffMs = ahora.getTime() - date.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Ayer';
  if (diffDias < 7) return `Hace ${diffDias} días`;
  if (diffDias < 30) {
    const semanas = Math.floor(diffDias / 7);
    return `Hace ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
  }
  if (diffDias < 365) {
    const meses = Math.floor(diffDias / 30);
    return `Hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  }

  return formatearFechaCorta(date);
}

/**
 * Formatea un período de mes y año
 * @param mes - Número del mes (1-12)
 * @param anio - Año
 * @returns Texto formateado como "Enero 2025"
 * @example
 * formatearMesAnio(1, 2025) // 'Enero 2025'
 */
export function formatearMesAnio(mes: number, anio: number): string {
  return `${obtenerNombreMes(mes)} ${anio}`;
}

// ============================================================================
// VALIDACIONES
// ============================================================================

/**
 * Verifica si una fecha es válida
 * @param fecha - Fecha a validar
 * @returns true si la fecha es válida
 * @example
 * esFechaValida(new Date()) // true
 * esFechaValida(new Date('invalid')) // false
 */
export function esFechaValida(fecha: Date): boolean {
  return fecha instanceof Date && !isNaN(fecha.getTime());
}

/**
 * Verifica si una fecha está en el pasado
 * @param fecha - Fecha a verificar
 * @returns true si la fecha es anterior a ahora, false si es inválida o futura
 * @example
 * esFechaPasada(new Date('2024-01-01')) // true
 * esFechaPasada(new Date('2026-01-01')) // false
 */
export function esFechaPasada(fecha: Date | null | undefined): boolean {
  if (!fecha || !esFechaValida(fecha)) return false;
  return fecha < new Date();
}

/**
 * Verifica si una fecha está en el futuro
 * @param fecha - Fecha a verificar
 * @returns true si la fecha es posterior a ahora, false si es inválida o pasada
 * @example
 * esFechaFutura(new Date('2026-01-01')) // true
 * esFechaFutura(new Date('2024-01-01')) // false
 */
export function esFechaFutura(fecha: Date | null | undefined): boolean {
  if (!fecha || !esFechaValida(fecha)) return false;
  return fecha > new Date();
}

/**
 * Verifica si dos fechas son el mismo día (ignorando hora)
 * @param fecha1 - Primera fecha
 * @param fecha2 - Segunda fecha
 * @returns true si son el mismo día, false si alguna es inválida
 * @example
 * esMismoDia(new Date('2025-01-20T08:00'), new Date('2025-01-20T17:00')) // true
 * esMismoDia(new Date('2025-01-20'), new Date('2025-01-21')) // false
 */
export function esMismoDia(
  fecha1: Date | null | undefined,
  fecha2: Date | null | undefined
): boolean {
  if (!fecha1 || !fecha2 || !esFechaValida(fecha1) || !esFechaValida(fecha2)) {
    return false;
  }

  return (
    fecha1.getFullYear() === fecha2.getFullYear() &&
    fecha1.getMonth() === fecha2.getMonth() &&
    fecha1.getDate() === fecha2.getDate()
  );
}

// ============================================================================
// MANIPULACIÓN DE FECHAS
// ============================================================================

/**
 * Agrega días a una fecha
 * @param fecha - Fecha base
 * @param dias - Número de días a agregar (puede ser negativo)
 * @returns Nueva fecha con los días agregados
 * @example
 * agregarDias(new Date('2025-01-20'), 5) // 2025-01-25
 * agregarDias(new Date('2025-01-20'), -5) // 2025-01-15
 */
export function agregarDias(fecha: Date, dias: number): Date {
  const nueva = new Date(fecha);
  nueva.setDate(nueva.getDate() + dias);
  return nueva;
}

/**
 * Agrega meses a una fecha
 * @param fecha - Fecha base
 * @param meses - Número de meses a agregar (puede ser negativo)
 * @returns Nueva fecha con los meses agregados
 * @example
 * agregarMeses(new Date('2025-01-20'), 2) // 2025-03-20
 * agregarMeses(new Date('2025-01-20'), -1) // 2024-12-20
 */
export function agregarMeses(fecha: Date, meses: number): Date {
  const nueva = new Date(fecha);
  nueva.setMonth(nueva.getMonth() + meses);
  return nueva;
}

/**
 * Obtiene el primer día del mes de una fecha
 * @param fecha - Fecha base
 * @returns Primer día del mes
 * @example
 * obtenerPrimerDiaMes(new Date('2025-01-20')) // 2025-01-01
 */
export function obtenerPrimerDiaMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

/**
 * Obtiene el último día del mes de una fecha
 * @param fecha - Fecha base
 * @returns Último día del mes
 * @example
 * obtenerUltimoDiaMes(new Date('2025-01-20')) // 2025-01-31
 */
export function obtenerUltimoDiaMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
}
