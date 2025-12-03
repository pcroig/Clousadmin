// ========================================
// Utilidades de Fechas
// ========================================

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  // FIX CRÍTICO: Usar normalizarFechaSinHora que respeta zona horaria de Madrid
  return DIAS_SEMANA[normalizarFechaSinHora(fecha).getDay()];
}

/**
 * @deprecated Usar normalizarFechaSinHora() en su lugar para garantizar consistencia con zona horaria Madrid
 * Esta función se mantiene solo para compatibilidad hacia atrás
 */
export function normalizarFecha(fecha: Date): Date {
  // FIX CRÍTICO: Ahora usa normalizarFechaSinHora para consistencia
  return normalizarFechaSinHora(fecha);
}

/**
 * @deprecated Usar normalizarFechaSinHora() en su lugar
 */
export function obtenerFechaBase(fecha: Date): Date {
  // FIX CRÍTICO: Usar normalizarFechaSinHora en lugar de constructor directo
  return normalizarFechaSinHora(fecha);
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
 * Devuelve un Date normalizado a las 00:00 del día en Madrid, guardado en UTC
 * 
 * FIX CRÍTICO VERIFICADO: Usa Date.UTC() con componentes extraídos de Madrid
 * para garantizar que se guarde correctamente en base de datos
 * 
 * Ejemplo: 2025-12-03T23:30Z (00:30 Madrid del día 4) → 2025-12-04T00:00Z
 */
export function toMadridDate(fecha: Date | string): Date {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  // Extraer componentes de fecha en zona horaria Madrid
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1; // 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  
  // Crear fecha en UTC que representa 00:00 del día en Madrid
  // Usa Date.UTC para que los componentes de Madrid se guarden correctamente
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Calcula el rango de inicio y fin para un periodo dado (día, semana, mes)
 * basado en una fecha de referencia.
 */
export type RangoFecha = 'dia' | 'semana' | 'mes';

export function calcularRangoFechas(
  fecha: Date,
  rango: RangoFecha
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

/**
 * Devuelve la etiqueta utilizada en los controles de rango de fechas
 * (Día / Semana / Mes) para mantener consistencia visual en todas las tablas.
 */
export function obtenerEtiquetaPeriodo(fecha: Date, rango: RangoFecha): string {
  const referencia = toMadridDate(fecha);

  switch (rango) {
    case 'dia':
      return format(referencia, 'dd MMM', { locale: es });
    case 'semana': {
      const { inicio, fin } = calcularRangoFechas(referencia, 'semana');
      const mesInicio = format(inicio, 'MMM', { locale: es });
      const mesFin = format(fin, 'MMM', { locale: es });
      const anioInicio = format(inicio, 'yyyy', { locale: es });
      const anioFin = format(fin, 'yyyy', { locale: es });

      if (anioInicio !== anioFin) {
        return `${mesInicio} ${anioInicio} - ${mesFin} ${anioFin}`;
      }

      if (mesInicio === mesFin) {
        return `${mesInicio} ${anioFin}`;
      }

      return `${mesInicio} - ${mesFin} ${anioFin}`;
    }
    case 'mes':
    default:
      return format(referencia, 'MMM yyyy', { locale: es });
  }
}

/**
 * Normaliza una fecha a las 00:00:00.000 del mismo día
 * Usa toMadridDate internamente para evitar desfases de zona horaria
 * Esta función debe usarse SIEMPRE para crear/buscar fichajes por fecha
 */
export function normalizarFechaSinHora(fecha: Date | string): Date {
  const fechaMadrid = toMadridDate(fecha);
  // Ya está normalizada a 00:00:00.000 por toMadridDate
  return fechaMadrid;
}

/**
 * Crea una fecha con una hora específica del día
 * Garantiza que la fecha base esté normalizada antes de añadir la hora
 * 
 * @param fechaBase - La fecha del día (se normalizará automáticamente)
 * @param horas - Hora del día (0-23)
 * @param minutos - Minutos (0-59)
 * @returns Date con la hora especificada en zona horaria local
 * @throws {RangeError} Si horas o minutos están fuera de rango
 */
export function crearFechaConHora(fechaBase: Date | string, horas: number, minutos: number): Date {
  // FIX: Validar rangos
  if (!Number.isInteger(horas) || horas < 0 || horas > 23) {
    throw new RangeError(`Horas inválidas: ${horas}. Debe ser un entero entre 0 y 23`);
  }
  if (!Number.isInteger(minutos) || minutos < 0 || minutos > 59) {
    throw new RangeError(`Minutos inválidos: ${minutos}. Debe ser un entero entre 0 y 59`);
  }
  
  // Primero normalizar la fecha a 00:00 en Madrid
  const fechaNormalizada = normalizarFechaSinHora(fechaBase);
  // Luego setear la hora en local (que será Madrid en producción)
  fechaNormalizada.setHours(horas, minutos, 0, 0);
  return fechaNormalizada;
}

/**
 * Parsea una hora en formato HH:mm y la convierte a minutos desde medianoche
 * Útil para comparaciones y cálculos de diferencias horarias
 */
export function parseHoraAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ========================================
// Helpers para rangos mensuales
// ========================================

/**
 * Obtiene el primer día del mes actual en UTC (00:00:00.000)
 * Útil para rangos de consultas de analíticas
 */
export function obtenerInicioMesActual(): Date {
  const hoy = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(hoy);
  
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}

/**
 * Obtiene el último día del mes actual en UTC (23:59:59.999)
 * Útil para rangos de consultas de analíticas
 */
export function obtenerFinMesActual(): Date {
  const hoy = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(hoy);
  
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  
  // Último día = primer día del mes siguiente menos 1 día
  const primerDiaMesSiguiente = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  return new Date(primerDiaMesSiguiente.getTime() - 1);
}

/**
 * Obtiene el rango de fechas para un mes específico (N meses atrás desde hoy)
 * @param mesesAtras - Número de meses hacia atrás (0 = mes actual, 1 = mes anterior, etc.)
 * @returns { inicio: Date, fin: Date } - Rango del mes en UTC
 */
export function obtenerRangoMes(mesesAtras: number): { inicio: Date; fin: Date } {
  const hoy = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(hoy);
  
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  
  // Calcular el mes objetivo
  const targetDate = new Date(Date.UTC(year, month - mesesAtras, 1, 0, 0, 0, 0));
  const targetYear = targetDate.getUTCFullYear();
  const targetMonth = targetDate.getUTCMonth();
  
  const inicio = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0));
  const primerDiaMesSiguiente = new Date(Date.UTC(targetYear, targetMonth + 1, 1, 0, 0, 0, 0));
  const fin = new Date(primerDiaMesSiguiente.getTime() - 1);
  
  return { inicio, fin };
}

/**
 * Calcula el número de días laborables en un mes específico
 * @param year - Año
 * @param month - Mes (0-11, formato JavaScript)
 * @returns Número de días laborables (L-V)
 */
export function calcularDiasLaborablesMes(year: number, month: number): number {
  let count = 0;
  const fecha = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  
  while (fecha.getUTCMonth() === month) {
    const dayOfWeek = fecha.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    fecha.setUTCDate(fecha.getUTCDate() + 1);
  }
  
  return count;
}
