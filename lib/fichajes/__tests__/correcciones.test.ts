/**
 * Tests para normalización de correcciones de fichajes
 */

import { describe, expect, it } from 'vitest';

import {
  normalizarFechaCorreccion,
  normalizarHoraCorreccion,
} from '@/lib/fichajes/correcciones';

describe('Correcciones de Fichaje', () => {
  describe('normalizarFechaCorreccion', () => {
    it('should parse valid dates and normalize to start of day', () => {
      const fecha = normalizarFechaCorreccion('2025-02-10T15:30:00Z');

      expect(fecha).toBeInstanceOf(Date);
      expect(fecha?.getHours()).toBe(0);
      expect(fecha?.getMinutes()).toBe(0);
      expect(fecha?.getSeconds()).toBe(0);
    });

    it('should return null for invalid dates', () => {
      const invalida = normalizarFechaCorreccion('fecha-no-valida');
      expect(invalida).toBeNull();
    });

    it('should handle various date formats', () => {
      const fechas = [
        '2025-02-10',
        '2025-02-10T00:00:00Z',
        '2025-02-10T23:59:59Z',
      ];

      fechas.forEach(fechaStr => {
        const fecha = normalizarFechaCorreccion(fechaStr);
        expect(fecha).toBeInstanceOf(Date);
        expect(fecha?.getHours()).toBe(0);
      });
    });
  });

  describe('normalizarHoraCorreccion', () => {
    const base = new Date('2025-02-10T00:00:00Z');

    it('should parse ISO datetime and preserve hour', () => {
      const desdeIso = normalizarHoraCorreccion('2025-02-10T08:15:00Z', base);

      expect(desdeIso).toBeInstanceOf(Date);
      expect(desdeIso?.getUTCHours()).toBe(8);
      expect(desdeIso?.getUTCMinutes()).toBe(15);
    });

    it('should parse HH:mm format and apply to base date', () => {
      const desdeHora = normalizarHoraCorreccion('09:45', base);

      expect(desdeHora).toBeInstanceOf(Date);
      expect(desdeHora?.getHours()).toBe(9);
      expect(desdeHora?.getMinutes()).toBe(45);
    });

    it('should return null for invalid time strings', () => {
      const invalida = normalizarHoraCorreccion('hora-no-valida', base);
      expect(invalida).toBeNull();
    });

    it('should handle edge cases', () => {
      // Midnight
      const midnight = normalizarHoraCorreccion('00:00', base);
      expect(midnight?.getHours()).toBe(0);
      expect(midnight?.getMinutes()).toBe(0);

      // End of day
      const endOfDay = normalizarHoraCorreccion('23:59', base);
      expect(endOfDay?.getHours()).toBe(23);
      expect(endOfDay?.getMinutes()).toBe(59);
    });
  });
});
