// ========================================
// Shared Utilities
// ========================================

/**
 * Extrae las iniciales de un nombre completo
 * @param nombre - Nombre completo (ej: "Juan Pérez")
 * @returns Iniciales en mayúsculas (ej: "JP")
 */
export function getInitials(nombre: string): string {
  const parts = nombre.trim().split(' ');
  return parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : nombre.substring(0, 2).toUpperCase();
}


