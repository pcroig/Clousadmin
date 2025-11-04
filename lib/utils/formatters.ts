// ========================================
// Formatters - Funciones de formateo reutilizables
// ========================================
// Funciones para formatear estados, fechas, badges, etc.

/**
 * Obtiene la variante de badge según el estado de una ausencia
 */
export function getAusenciaBadgeVariant(estado: string): 'warning' | 'success' | 'destructive' | 'secondary' {
  switch (estado) {
    case 'pendiente':
    case 'pendiente_aprobacion':
      return 'warning';
    case 'aprobada':
    case 'en_curso':
    case 'auto_aprobada':
      return 'success';
    case 'rechazada':
    case 'cancelada':
      return 'destructive';
    case 'completada':
      return 'secondary';
    default:
      return 'secondary';
  }
}

/**
 * Obtiene la etiqueta legible para un estado de ausencia
 */
export function getAusenciaEstadoLabel(estado: string): string {
  switch (estado) {
    case 'pendiente':
    case 'pendiente_aprobacion':
      return 'Pendiente';
    case 'aprobada':
      return 'Aprobada';
    case 'en_curso':
      return 'En curso';
    case 'completada':
      return 'Completada';
    case 'auto_aprobada':
      return 'Auto-aprobada';
    case 'rechazada':
      return 'Rechazada';
    case 'cancelada':
      return 'Cancelada';
    default:
      return estado;
  }
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



