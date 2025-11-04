// ========================================
// NIF/NIE Validation (Spanish ID)
// ========================================
// Validates Spanish NIF (DNI) and NIE format and checksum

/**
 * Valida un NIF español (DNI)
 * Formato: 8 dígitos + letra de control
 * Ejemplo: 12345678Z
 */
export function validarNIF(nif: string): boolean {
  if (!nif) return false;

  // Limpiar espacios y convertir a mayúsculas
  const nifLimpio = nif.trim().toUpperCase();

  // Regex para DNI: 8 dígitos + letra
  const regexDNI = /^\d{8}[A-Z]$/;

  if (!regexDNI.test(nifLimpio)) {
    return false;
  }

  // Extraer número y letra
  const numero = parseInt(nifLimpio.substring(0, 8), 10);
  const letraProporcionada = nifLimpio.charAt(8);

  // Letras de control para DNI
  const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const letraEsperada = letras[numero % 23];

  return letraProporcionada === letraEsperada;
}

/**
 * Valida un NIE español (extranjeros)
 * Formato: X/Y/Z + 7 dígitos + letra de control
 * Ejemplo: X1234567L
 */
export function validarNIE(nie: string): boolean {
  if (!nie) return false;

  // Limpiar espacios y convertir a mayúsculas
  const nieLimpio = nie.trim().toUpperCase();

  // Regex para NIE: (X|Y|Z) + 7 dígitos + letra
  const regexNIE = /^[XYZ]\d{7}[A-Z]$/;

  if (!regexNIE.test(nieLimpio)) {
    return false;
  }

  // Reemplazar letra inicial por número
  let nieModificado = nieLimpio.replace('X', '0').replace('Y', '1').replace('Z', '2');

  // Extraer número y letra
  const numero = parseInt(nieModificado.substring(0, 8), 10);
  const letraProporcionada = nieLimpio.charAt(8);

  // Letras de control
  const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const letraEsperada = letras[numero % 23];

  return letraProporcionada === letraEsperada;
}

/**
 * Valida NIF o NIE (ambos formatos)
 */
export function validarNIFoNIE(identificacion: string): boolean {
  if (!identificacion) return false;

  const idLimpio = identificacion.trim().toUpperCase();

  // Detectar si es NIE (empieza por X, Y, Z)
  if (/^[XYZ]/.test(idLimpio)) {
    return validarNIE(idLimpio);
  }

  // Si no, validar como NIF
  return validarNIF(idLimpio);
}

/**
 * Obtiene información detallada sobre la validación de un NIF/NIE
 * Útil para mostrar mensajes de error más descriptivos
 */
export function obtenerInfoValidacionNIF(identificacion: string): {
  valido: boolean;
  tipo: 'NIF' | 'NIE' | 'INVALIDO';
  mensaje?: string;
  letraCorrecta?: string;
} {
  if (!identificacion) {
    return {
      valido: false,
      tipo: 'INVALIDO',
      mensaje: 'El NIF/NIE es obligatorio',
    };
  }

  const idLimpio = identificacion.trim().toUpperCase();
  const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';

  // Detectar si es NIE
  if (/^[XYZ]/.test(idLimpio)) {
    const regexNIE = /^[XYZ]\d{7}[A-Z]$/;
    if (!regexNIE.test(idLimpio)) {
      return {
        valido: false,
        tipo: 'NIE',
        mensaje: 'Formato de NIE inválido (debe ser X/Y/Z + 7 dígitos + letra)',
      };
    }

    let nieModificado = idLimpio.replace('X', '0').replace('Y', '1').replace('Z', '2');
    const numero = parseInt(nieModificado.substring(0, 8), 10);
    const letraProporcionada = idLimpio.charAt(8);
    const letraEsperada = letras[numero % 23];

    if (letraProporcionada === letraEsperada) {
      return { valido: true, tipo: 'NIE' };
    }

    return {
      valido: false,
      tipo: 'NIE',
      mensaje: `La letra del NIE es incorrecta. La letra correcta es: ${letraEsperada}`,
      letraCorrecta: letraEsperada,
    };
  }

  // Validar como NIF
  const regexDNI = /^\d{8}[A-Z]$/;
  if (!regexDNI.test(idLimpio)) {
    return {
      valido: false,
      tipo: 'NIF',
      mensaje: 'Formato de NIF inválido (debe ser 8 dígitos + letra)',
    };
  }

  const numero = parseInt(idLimpio.substring(0, 8), 10);
  const letraProporcionada = idLimpio.charAt(8);
  const letraEsperada = letras[numero % 23];

  if (letraProporcionada === letraEsperada) {
    return { valido: true, tipo: 'NIF' };
  }

  return {
    valido: false,
    tipo: 'NIF',
    mensaje: `La letra del NIF es incorrecta. La letra correcta es: ${letraEsperada}`,
    letraCorrecta: letraEsperada,
  };
}

/**
 * Formatea un NIF/NIE añadiendo espacios para legibilidad
 * Ejemplo: 12345678Z → 12.345.678-Z
 */
export function formatearNIF(nif: string): string {
  if (!nif) return '';

  const nifLimpio = nif.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (nifLimpio.length === 9) {
    return `${nifLimpio.substring(0, 8)}-${nifLimpio.charAt(8)}`;
  }

  return nifLimpio;
}

