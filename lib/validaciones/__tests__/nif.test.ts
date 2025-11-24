/**
 * Tests unitarios para validación de NIF/NIE
 * Cobertura: 100% de funciones y casos edge
 */

import { describe, it, expect } from 'vitest';
import {
  normalizarIdentificacion,
  validarNIF,
  validarNIE,
  validarNIFoNIE,
  obtenerInfoValidacionNIF,
  formatearNIF,
} from '../nif';

// ========================================
// CASOS REALES DE NIFs VÁLIDOS
// ========================================
// Fuente: Ejemplos de NIFs reales con letra correcta calculada
// https://www.ordenacionjuego.es/es/img-07-calc-letra-nif

const NIFs_VALIDOS = [
  '12345678Z', // Número bajo
  '87654321X', // Número alto
  '00000000T', // Ceros
  '99999999R', // Nueves
  '45678901G', // Caso medio
];

const NIEs_VALIDOS = [
  'X1234567L', // NIE con X
  'Y7654321G', // NIE con Y
  'Z2000000V', // NIE con Z
  'X0000000T', // NIE con X y ceros
];

const NIFs_INVALIDOS = [
  '12345678A', // Letra incorrecta (debería ser Z)
  '12345678', // Sin letra
  '1234567Z', // Solo 7 dígitos
  '123456789Z', // 9 dígitos
  'A12345678Z', // Empieza con letra no permitida
  '12345678ZZ', // Doble letra
  '', // Vacío
  '        ', // Solo espacios
];

// ========================================
// normalizarIdentificacion
// ========================================

describe('normalizarIdentificacion', () => {
  it('should remove spaces, dots, and hyphens', () => {
    expect(normalizarIdentificacion('12.345.678-Z')).toBe('12345678Z');
    expect(normalizarIdentificacion('12 345 678 Z')).toBe('12345678Z');
    expect(normalizarIdentificacion('12-345-678-Z')).toBe('12345678Z');
    expect(normalizarIdentificacion('12.345.678 - Z')).toBe('12345678Z');
  });

  it('should convert to uppercase', () => {
    expect(normalizarIdentificacion('12345678z')).toBe('12345678Z');
    expect(normalizarIdentificacion('x1234567l')).toBe('X1234567L');
  });

  it('should trim whitespace', () => {
    expect(normalizarIdentificacion('  12345678Z  ')).toBe('12345678Z');
    expect(normalizarIdentificacion('\t12345678Z\n')).toBe('12345678Z');
  });

  it('should handle complex formats', () => {
    expect(normalizarIdentificacion('12.345.678-z')).toBe('12345678Z');
    expect(normalizarIdentificacion('  X-1.234.567-L  ')).toBe('X1234567L');
  });

  it('should handle already normalized input', () => {
    expect(normalizarIdentificacion('12345678Z')).toBe('12345678Z');
    expect(normalizarIdentificacion('X1234567L')).toBe('X1234567L');
  });
});

// ========================================
// validarNIF
// ========================================

describe('validarNIF', () => {
  describe('Valid NIFs', () => {
    it.each(NIFs_VALIDOS)('should validate %s as valid NIF', (nif) => {
      expect(validarNIF(nif)).toBe(true);
    });

    it('should validate NIFs with different formats', () => {
      expect(validarNIF('12.345.678-Z')).toBe(true);
      expect(validarNIF('12 345 678 Z')).toBe(true);
      expect(validarNIF('12-345-678-Z')).toBe(true);
      expect(validarNIF('12345678z')).toBe(true); // lowercase
    });
  });

  describe('Invalid NIFs', () => {
    it.each(NIFs_INVALIDOS)('should reject %s as invalid', (nif) => {
      expect(validarNIF(nif)).toBe(false);
    });

    it('should reject NIF with wrong checksum letter', () => {
      expect(validarNIF('12345678A')).toBe(false); // Should be Z
      expect(validarNIF('87654321Z')).toBe(false); // Should be X
    });

    it('should reject NIF with invalid format', () => {
      expect(validarNIF('1234567Z')).toBe(false); // 7 digits
      expect(validarNIF('123456789Z')).toBe(false); // 9 digits
      expect(validarNIF('ABCDEFGHZ')).toBe(false); // Letters instead of numbers
    });

    it('should reject empty or null input', () => {
      expect(validarNIF('')).toBe(false);
      expect(validarNIF('   ')).toBe(false);
      // @ts-expect-error Testing null case
      expect(validarNIF(null)).toBe(false);
      // @ts-expect-error Testing undefined case
      expect(validarNIF(undefined)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle NIFs starting with zeros', () => {
      expect(validarNIF('00000000T')).toBe(true);
      expect(validarNIF('00000001R')).toBe(true);
    });

    it('should handle maximum valid NIF', () => {
      expect(validarNIF('99999999R')).toBe(true);
    });

    it('should reject NIE format in NIF validation', () => {
      // NIE válido pero pasado a validarNIF (debería fallar)
      expect(validarNIF('X1234567L')).toBe(false);
    });
  });
});

// ========================================
// validarNIE
// ========================================

describe('validarNIE', () => {
  describe('Valid NIEs', () => {
    it.each(NIEs_VALIDOS)('should validate %s as valid NIE', (nie) => {
      expect(validarNIE(nie)).toBe(true);
    });

    it('should validate NIEs with X prefix', () => {
      expect(validarNIE('X1234567L')).toBe(true);
      expect(validarNIE('X0000000T')).toBe(true);
    });

    it('should validate NIEs with Y prefix', () => {
      expect(validarNIE('Y7654321G')).toBe(true);
    });

    it('should validate NIEs with Z prefix', () => {
      expect(validarNIE('Z2000000V')).toBe(true);
    });

    it('should validate NIEs with different formats', () => {
      expect(validarNIE('X-1.234.567-L')).toBe(true);
      expect(validarNIE('X 1234567 L')).toBe(true);
      expect(validarNIE('x1234567l')).toBe(true); // lowercase
    });
  });

  describe('Invalid NIEs', () => {
    it('should reject NIE with wrong checksum letter', () => {
      expect(validarNIE('X1234567Z')).toBe(false); // Should be L
      expect(validarNIE('Y7654321A')).toBe(false); // Should be G
    });

    it('should reject NIE with invalid prefix', () => {
      expect(validarNIE('A1234567L')).toBe(false); // A not allowed
      expect(validarNIE('W1234567L')).toBe(false); // W not allowed
    });

    it('should reject NIE with wrong number of digits', () => {
      expect(validarNIE('X123456L')).toBe(false); // 6 digits
      expect(validarNIE('X12345678L')).toBe(false); // 8 digits
    });

    it('should reject empty or null input', () => {
      expect(validarNIE('')).toBe(false);
      expect(validarNIE('   ')).toBe(false);
      // @ts-expect-error Testing null case
      expect(validarNIE(null)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle NIEs with zeros', () => {
      expect(validarNIE('X0000000T')).toBe(true);
    });

    it('should reject NIF format in NIE validation', () => {
      // NIF válido pero pasado a validarNIE (debería fallar)
      expect(validarNIE('12345678Z')).toBe(false);
    });
  });
});

// ========================================
// validarNIFoNIE (función combinada)
// ========================================

describe('validarNIFoNIE', () => {
  it('should validate valid NIFs', () => {
    NIFs_VALIDOS.forEach((nif) => {
      expect(validarNIFoNIE(nif)).toBe(true);
    });
  });

  it('should validate valid NIEs', () => {
    NIEs_VALIDOS.forEach((nie) => {
      expect(validarNIFoNIE(nie)).toBe(true);
    });
  });

  it('should reject invalid NIFs', () => {
    expect(validarNIFoNIE('12345678A')).toBe(false);
    expect(validarNIFoNIE('1234567Z')).toBe(false);
  });

  it('should reject invalid NIEs', () => {
    expect(validarNIFoNIE('X1234567Z')).toBe(false);
    expect(validarNIFoNIE('A1234567L')).toBe(false);
  });

  it('should auto-detect NIF vs NIE', () => {
    // NIF (empieza con dígito)
    expect(validarNIFoNIE('12345678Z')).toBe(true);

    // NIE (empieza con X/Y/Z)
    expect(validarNIFoNIE('X1234567L')).toBe(true);
  });

  it('should handle different formats', () => {
    expect(validarNIFoNIE('12.345.678-Z')).toBe(true);
    expect(validarNIFoNIE('X-1.234.567-L')).toBe(true);
  });

  it('should reject empty input', () => {
    expect(validarNIFoNIE('')).toBe(false);
    // @ts-expect-error Testing null case
    expect(validarNIFoNIE(null)).toBe(false);
  });
});

// ========================================
// obtenerInfoValidacionNIF
// ========================================

describe('obtenerInfoValidacionNIF', () => {
  describe('Valid cases', () => {
    it('should return valid info for correct NIF', () => {
      const result = obtenerInfoValidacionNIF('12345678Z');

      expect(result.valido).toBe(true);
      expect(result.tipo).toBe('NIF');
      expect(result.mensaje).toBeUndefined();
    });

    it('should return valid info for correct NIE', () => {
      const result = obtenerInfoValidacionNIF('X1234567L');

      expect(result.valido).toBe(true);
      expect(result.tipo).toBe('NIE');
      expect(result.mensaje).toBeUndefined();
    });
  });

  describe('Invalid cases with descriptive messages', () => {
    it('should provide error message for empty input', () => {
      const result = obtenerInfoValidacionNIF('');

      expect(result.valido).toBe(false);
      expect(result.tipo).toBe('INVALIDO');
      expect(result.mensaje).toBe('El NIF/NIE es obligatorio');
    });

    it('should provide error message for invalid NIF format', () => {
      const result = obtenerInfoValidacionNIF('1234567Z');

      expect(result.valido).toBe(false);
      expect(result.tipo).toBe('NIF');
      expect(result.mensaje).toContain('Formato de NIF inválido');
    });

    it('should provide error message for wrong NIF checksum', () => {
      const result = obtenerInfoValidacionNIF('12345678A');

      expect(result.valido).toBe(false);
      expect(result.tipo).toBe('NIF');
      expect(result.mensaje).toContain('La letra del NIF es incorrecta');
      expect(result.letraCorrecta).toBe('Z');
    });

    it('should provide correct letter for wrong NIE checksum', () => {
      const result = obtenerInfoValidacionNIF('X1234567Z');

      expect(result.valido).toBe(false);
      expect(result.tipo).toBe('NIE');
      expect(result.mensaje).toContain('La letra del NIE es incorrecta');
      expect(result.letraCorrecta).toBe('L');
    });

    it('should provide error message for invalid NIE format', () => {
      const result = obtenerInfoValidacionNIF('X123456L');

      expect(result.valido).toBe(false);
      expect(result.tipo).toBe('NIE');
      expect(result.mensaje).toContain('Formato de NIE inválido');
    });
  });

  describe('Helpful error messages', () => {
    it('should suggest correct letter for NIF with wrong checksum', () => {
      const result = obtenerInfoValidacionNIF('87654321Z');

      expect(result.valido).toBe(false);
      expect(result.letraCorrecta).toBe('X');
      expect(result.mensaje).toContain('La letra correcta es: X');
    });

    it('should suggest correct letter for NIE with wrong checksum', () => {
      const result = obtenerInfoValidacionNIF('Y7654321A');

      expect(result.valido).toBe(false);
      expect(result.letraCorrecta).toBe('G');
      expect(result.mensaje).toContain('La letra correcta es: G');
    });
  });
});

// ========================================
// formatearNIF
// ========================================

describe('formatearNIF', () => {
  it('should format NIF with hyphen', () => {
    expect(formatearNIF('12345678Z')).toBe('12345678-Z');
    expect(formatearNIF('87654321X')).toBe('87654321-X');
  });

  it('should format NIE with hyphen', () => {
    expect(formatearNIF('X1234567L')).toBe('X1234567-L');
    expect(formatearNIF('Y7654321Z')).toBe('Y7654321-Z');
  });

  it('should handle already formatted input', () => {
    expect(formatearNIF('12345678-Z')).toBe('12345678-Z');
    expect(formatearNIF('12.345.678-Z')).toBe('12345678-Z');
  });

  it('should clean and format messy input', () => {
    expect(formatearNIF('12.345.678 - Z')).toBe('12345678-Z');
    expect(formatearNIF('X-1.234.567-L')).toBe('X1234567-L');
  });

  it('should convert to uppercase', () => {
    expect(formatearNIF('12345678z')).toBe('12345678-Z');
    expect(formatearNIF('x1234567l')).toBe('X1234567-L');
  });

  it('should handle edge cases', () => {
    expect(formatearNIF('')).toBe('');
    expect(formatearNIF('   ')).toBe('');
  });

  it('should return original for invalid length', () => {
    expect(formatearNIF('123')).toBe('123');
    expect(formatearNIF('12345678901')).toBe('12345678901');
  });
});

// ========================================
// INTEGRATION TESTS
// ========================================

describe('Integration: Full validation flow', () => {
  it('should validate real-world NIF examples from users', () => {
    const ejemplosReales = [
      { input: '12.345.678-Z', expected: true },
      { input: '12 345 678 Z', expected: true },
      { input: '12345678z', expected: true },
      { input: '12345678-z', expected: true },
    ];

    ejemplosReales.forEach(({ input, expected }) => {
      expect(validarNIFoNIE(input)).toBe(expected);
    });
  });

  it('should validate real-world NIE examples from users', () => {
    const ejemplosReales = [
      { input: 'X-1234567-L', expected: true },
      { input: 'X 1234567 L', expected: true },
      { input: 'x1234567l', expected: true },
      { input: 'X.1234567.L', expected: true },
    ];

    ejemplosReales.forEach(({ input, expected }) => {
      expect(validarNIFoNIE(input)).toBe(expected);
    });
  });

  it('should complete cycle: validate, get info, format', () => {
    const nif = '12345678Z';

    // 1. Validar
    expect(validarNIFoNIE(nif)).toBe(true);

    // 2. Obtener info
    const info = obtenerInfoValidacionNIF(nif);
    expect(info.valido).toBe(true);
    expect(info.tipo).toBe('NIF');

    // 3. Formatear
    const formatted = formatearNIF(nif);
    expect(formatted).toBe('12345678-Z');
  });
});
