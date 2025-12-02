// ========================================
// Formatters - Funciones de formateo reutilizables
// ========================================
// Funciones para formatear estados, fechas, badges, etc.

import { ESTADO_AUSENCIA_LABELS, EstadoAusencia } from '@/lib/constants/enums';

/**
 * Obtiene la variante de badge según el estado de una ausencia
 */
export function getAusenciaBadgeVariant(estado: string): 'warning' | 'success' | 'destructive' | 'secondary' {
  switch (estado) {
    case EstadoAusencia.pendiente:
      return 'warning';
    case EstadoAusencia.confirmada:
      return 'success';
    case EstadoAusencia.rechazada:
      return 'destructive';
    case EstadoAusencia.completada:
      return 'secondary';
    default:
      return 'secondary';
  }
}

/**
 * Obtiene la etiqueta legible para un estado de ausencia
 */
export function getAusenciaEstadoLabel(estado: string): string {
  // Verificar si el estado existe directamente en el enum
  if (Object.prototype.hasOwnProperty.call(ESTADO_AUSENCIA_LABELS, estado)) {
    return ESTADO_AUSENCIA_LABELS[estado as EstadoAusencia];
  }

  // Fallback: capitalizar el texto
  return estado.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Obtiene el color de fondo según el tipo de ausencia
 */
export function getAusenciaTipoColor(tipo: string): string {
  const tipoLower = tipo.toLowerCase();
  if (tipoLower.includes('mudanza')) return 'bg-warning';
  if (tipoLower.includes('remoto')) return 'bg-warning';
  if (tipoLower.includes('vacacion')) return 'bg-info';
  return 'bg-text-secondary';
}

/**
 * Formatea una fecha para mostrar en componentes
 * Retorna objeto con día y mes formateados
 */
export function formatFechaParaDisplay(
  fecha: Date,
  fechaFin?: Date
): {
  inicio: { day: number; month: string };
  fin: { day: number; month: string } | null;
} {
  const day = fecha.getDate();
  const month = fecha.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();

  if (fechaFin) {
    const dayFin = fechaFin.getDate();
    const monthFin = fechaFin.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
    return { inicio: { day, month }, fin: { day: dayFin, month: monthFin } };
  }

  return { inicio: { day, month }, fin: null };
}

/**
 * Formatea un tiempo en milisegundos a formato HH:MM
 */
export function formatTiempoTrabajado(diffMs: number): string {
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

/**
 * Convierte horas decimales a formato "Xh Ym" (sin segundos)
 * Ejemplo: 8.5 → "8h 30m"
 */
export function formatearHorasMinutos(horas: number | string | null | undefined): string {
  if (horas === null || horas === undefined) return '0h 0m';
  
  const horasNum = typeof horas === 'string' ? parseFloat(horas) : horas;
  
  if (isNaN(horasNum)) return '0h 0m';
  
  const horasEnteras = Math.floor(horasNum);
  const minutos = Math.round((horasNum - horasEnteras) * 60);
  
  return `${horasEnteras}h ${minutos}m`;
}

/**
 * Formatea una fecha a string en español (es-ES)
 * Centraliza el formato para evitar duplicación
 */
export function formatFechaEs(fecha: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return date.toLocaleDateString('es-ES', options);
}

/**
 * Formatea una hora a string en español (es-ES)
 */
export function formatHoraEs(fecha: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return date.toLocaleTimeString('es-ES', options || { hour: '2-digit', minute: '2-digit' });
}

/**
 * Obtiene la variante de badge según el estado de una solicitud
 */
export function getSolicitudBadgeVariant(estado: string): 'warning' | 'success' | 'destructive' | 'secondary' {
  switch (estado) {
    case 'pendiente':
      return 'warning';
    case 'aprobada':
      return 'success';
    case 'rechazada':
      return 'destructive';
    default:
      return 'secondary';
  }
}

/**
 * Obtiene la etiqueta legible para un estado de solicitud
 */
export function getSolicitudEstadoLabel(estado: string): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente';
    case 'aprobada':
      return 'Aprobada';
    case 'rechazada':
      return 'Rechazada';
    default:
      return estado;
  }
}

/**
 * Extrae la hora (HH:mm) de un ISO string de forma segura
 * Evita problemas de zona horaria al extraer directamente del string
 * @param isoString - String en formato ISO 8601 (ej: "2024-12-02T09:30:00.000Z")
 * @returns String en formato HH:mm (ej: "09:30") o null si el formato es inválido
 */
export function extraerHoraDeISO(isoString: string | null | undefined): string | null {
  if (!isoString || typeof isoString !== 'string' || isoString.length < 16) {
    return null;
  }
  
  // Verificar que tiene el formato básico de ISO string (contiene 'T')
  if (!isoString.includes('T')) {
    return null;
  }
  
  // Extraer la parte de hora (caracteres 11-16: "HH:mm")
  return isoString.substring(11, 16);
}





