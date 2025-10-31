// ========================================
// IBAN Validation (Spanish bank accounts)
// ========================================
// Validates Spanish IBAN format and checksum

/**
 * Valida un IBAN español
 * Formato: ES + 2 dígitos control + 20 dígitos (24 caracteres total)
 * Ejemplo: ES9121000418450200051332
 */
export function validarIBAN(iban: string): boolean {
  if (!iban) return false;

  // Limpiar espacios y convertir a mayúsculas
  const ibanLimpio = iban.trim().toUpperCase().replace(/\s/g, '');

  // Validar formato español: ES + 22 dígitos
  const regexIBAN = /^ES\d{22}$/;

  if (!regexIBAN.test(ibanLimpio)) {
    return false;
  }

  // Validar checksum (algoritmo IBAN mod-97)
  return validarChecksumIBAN(ibanLimpio);
}

/**
 * Valida el checksum del IBAN usando el algoritmo mod-97
 */
function validarChecksumIBAN(iban: string): boolean {
  // Mover los 4 primeros caracteres al final
  const reordenado = iban.substring(4) + iban.substring(0, 4);

  // Convertir letras a números (A=10, B=11, ..., Z=35)
  const numerico = reordenado
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      // Si es letra (A-Z), convertir a número
      if (code >= 65 && code <= 90) {
        return (code - 55).toString();
      }
      return char;
    })
    .join('');

  // Calcular mod 97
  return mod97(numerico) === 1;
}

/**
 * Calcula mod 97 para números muy grandes (IBAN puede tener 30+ dígitos)
 */
function mod97(numerico: string): number {
  let resto = 0;

  for (let i = 0; i < numerico.length; i++) {
    resto = (resto * 10 + parseInt(numerico.charAt(i), 10)) % 97;
  }

  return resto;
}

/**
 * Formatea un IBAN para legibilidad (grupos de 4 caracteres)
 * Ejemplo: ES9121000418450200051332 → ES91 2100 0418 4502 0005 1332
 */
export function formatearIBAN(iban: string): string {
  if (!iban) return '';

  const ibanLimpio = iban.trim().toUpperCase().replace(/\s/g, '');

  // Dividir en grupos de 4
  return ibanLimpio.match(/.{1,4}/g)?.join(' ') || ibanLimpio;
}

/**
 * Extrae el código del banco del IBAN español
 * Los 4 dígitos después del código de país y checksum
 */
export function extraerCodigoBanco(iban: string): string | null {
  if (!validarIBAN(iban)) return null;

  const ibanLimpio = iban.trim().toUpperCase().replace(/\s/g, '');

  // ES + 2 dígitos checksum + 4 dígitos código banco
  return ibanLimpio.substring(4, 8);
}

