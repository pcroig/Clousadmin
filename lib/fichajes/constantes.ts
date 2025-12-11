// ========================================
// Constantes para Fichajes Optimistas
// ========================================

export const ORIGENES_OPTIMISTAS = [
  'añadir_manual',
  'completar_descanso',
  'corregir_finalizado',
  'edicion_empleado'
] as const;

export type OrigenOptimista = typeof ORIGENES_OPTIMISTAS[number];

export function esOrigenOptimista(origen?: string): origen is OrigenOptimista {
  return origen !== undefined && ORIGENES_OPTIMISTAS.includes(origen as OrigenOptimista);
}
