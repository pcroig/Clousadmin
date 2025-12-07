// ========================================
// ARCHIVO DEPRECADO - NO USAR
// ========================================
//
// Este modal ha sido reemplazado por la página completa en:
// /hr/horario/jornadas
//
// Los botones que antes abrían este modal ahora redirigen a:
// router.push('/hr/horario/jornadas')
//
// Razón de la deprecación:
// - El modal antiguo no tenía la nueva UI de tabla expandible
// - No tenía el sistema de validación de asignaciones
// - Causaba confusión porque había dos lugares para gestionar jornadas
//
// Si necesitas gestionar jornadas, usa:
// - Ruta: /hr/horario/jornadas
// - Componente: app/(dashboard)/hr/horario/jornadas/jornadas-client.tsx
//
// Fecha de deprecación: 7 Diciembre 2025
// ========================================

'use client';

// Este archivo se mantiene vacío para evitar errores de importación
// pero NO debe usarse nunca más.

export function JornadasModal() {
  console.error(
    '⚠️ JornadasModal está DEPRECADO. Usa router.push("/hr/horario/jornadas") en su lugar.'
  );
  return null;
}
