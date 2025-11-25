// ========================================
// Shared Utilities
// ========================================

/**
 * Extrae las iniciales de un nombre completo
 * @param nombre - Nombre completo (ej: "Juan Pérez")
 * @returns Iniciales en mayúsculas (ej: "JP")
 */
export function getInitials(nombre: string): string {
  const safeName = (nombre ?? '').trim();
  if (!safeName) {
    return '??';
  }

  const parts = safeName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  const first = parts[0] ?? '';
  if (!first) {
    return '??';
  }

  if (first.length === 1) {
    return `${first[0]}?`.toUpperCase();
  }

  return first.substring(0, 2).toUpperCase();
}


