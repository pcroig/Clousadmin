// ========================================
// Utilidades para Dirección
// ========================================

/**
 * Construir dirección completa desde campos estructurados
 */
export function construirDireccionCompleta(empleado: {
  direccionCalle?: string | null;
  direccionNumero?: string | null;
  direccionPiso?: string | null;
  codigoPostal?: string | null;
  ciudad?: string | null;
  direccionProvincia?: string | null;
}): string {
  const partes: string[] = [];

  // Calle y número
  if (empleado.direccionCalle) {
    let linea1 = empleado.direccionCalle;
    if (empleado.direccionNumero) {
      linea1 += ` ${empleado.direccionNumero}`;
    }
    if (empleado.direccionPiso) {
      linea1 += `, ${empleado.direccionPiso}`;
    }
    partes.push(linea1);
  }

  // CP y ciudad
  if (empleado.codigoPostal && empleado.ciudad) {
    partes.push(`${empleado.codigoPostal} ${empleado.ciudad}`);
  } else if (empleado.ciudad) {
    partes.push(empleado.ciudad);
  }

  // Provincia
  if (empleado.direccionProvincia) {
    partes.push(empleado.direccionProvincia);
  }

  return partes.length > 0 ? partes.join(', ') : 'No especificado';
}

/**
 * Construir dirección corta (solo calle y número)
 */
export function construirDireccionCorta(empleado: {
  direccionCalle?: string | null;
  direccionNumero?: string | null;
  direccionPiso?: string | null;
}): string {
  const partes: string[] = [];

  if (empleado.direccionCalle) {
    partes.push(empleado.direccionCalle);
  }
  if (empleado.direccionNumero) {
    partes.push(empleado.direccionNumero);
  }
  if (empleado.direccionPiso) {
    partes.push(empleado.direccionPiso);
  }

  return partes.length > 0 ? partes.join(' ') : 'No especificado';
}











