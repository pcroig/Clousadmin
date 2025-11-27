// ========================================
// Utilidades de Fechas
// ========================================

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

export function obtenerNombreDia(fecha: Date): DiaSemana {
  return DIAS_SEMANA[normalizarFecha(fecha).getDay()];
}

export function normalizarFecha(fecha: Date): Date {
  const normalizada = new Date(fecha);
  normalizada.setHours(0, 0, 0, 0);
  return normalizada;
}

export function obtenerFechaBase(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

export function calcularHorasEntre(inicio: Date, fin: Date): number {
  return (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);
}

export function calcularMinutosEntre(inicio: Date, fin: Date): number {
  return (fin.getTime() - inicio.getTime()) / (1000 * 60);
}

export function calcularDiasEntre(
  inicio: Date,
  fin: Date,
  incluirAmbos: boolean = true
): number {
  const diffMs = Math.abs(fin.getTime() - inicio.getTime());
  const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return incluirAmbos ? dias + 1 : dias;
}

type FechaInput = Date | string | number | null | undefined;

/**
 * Normaliza cualquier valor compatible a Date.
 * Se utiliza antes de operaciones que requieren objetos Date (sort, diff, etc.)
 * para evitar errores cuando Next.js serializa los resultados cacheados.
 */
export function ensureDate(value: FechaInput, fallback?: Date): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (fallback) {
    return fallback;
  }

  throw new TypeError(`[ensureDate] Valor de fecha inválido: ${value}`);
}

/**
 * Formatea una fecha usando la zona horaria de Madrid (Europe/Madrid)
 */
export function formatFechaMadrid(fecha: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    ...options,
  }).format(date);
}

/**
 * Convierte una fecha a la fecha correspondiente en Madrid (para evitar desfases de día)
 * Devuelve un Date normalizado a las 00:00 del día en Madrid
 */
export function toMadridDate(fecha: Date | string): Date {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  if (!year || !month || !day) return new Date(date);

  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Calcula el rango de inicio y fin para un periodo dado (día, semana, mes)
 * basado en una fecha de referencia.
 */
export function calcularRangoFechas(
  fecha: Date,
  rango: 'dia' | 'semana' | 'mes'
): { inicio: Date; fin: Date } {
  const referencia = toMadridDate(fecha);
  const inicio = new Date(referencia);
  const fin = new Date(referencia);

  switch (rango) {
    case 'dia':
      inicio.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);
      break;
    case 'semana':
      const diaSemana = referencia.getDay();
      // Semana empieza en lunes (1)
      // Si es domingo (0), diff es -6. Si es lunes (1), diff es 0.
      const diffInicio = diaSemana === 0 ? -6 : 1 - diaSemana;
      inicio.setDate(referencia.getDate() + diffInicio);
      inicio.setHours(0, 0, 0, 0);
      fin.setDate(inicio.getDate() + 6);
      fin.setHours(23, 59, 59, 999);
      break;
    case 'mes':
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
      fin.setMonth(referencia.getMonth() + 1, 0);
      fin.setHours(23, 59, 59, 999);
      break;
  }

  return { inicio, fin };
}
