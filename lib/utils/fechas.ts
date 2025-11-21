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

