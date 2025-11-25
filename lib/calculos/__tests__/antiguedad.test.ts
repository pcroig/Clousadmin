/**
 * Tests para cálculo de antigüedad de empleados
 */

import { describe, it, expect } from 'vitest';
import { obtenerRangoFechaAntiguedad } from '@/lib/calculos/antiguedad';

describe('Cálculos de Antigüedad', () => {
  describe('obtenerRangoFechaAntiguedad', () => {
    it('should return correct range for 6_12_meses', () => {
      const rango = obtenerRangoFechaAntiguedad('6_12_meses');

      expect(rango).toBeTruthy();
      expect(rango?.gte).toBeInstanceOf(Date);
      expect(rango?.lt).toBeInstanceOf(Date);
      expect(rango!.gte!.getTime()).toBeLessThan(rango!.lt!.getTime());
    });

    it('should return only lt for mas_5_años', () => {
      const rango = obtenerRangoFechaAntiguedad('mas_5_años');

      expect(rango).toBeTruthy();
      expect(rango?.lt).toBeInstanceOf(Date);
      expect(rango?.gte).toBeUndefined();
    });

    it('should return null for "todos"', () => {
      const rango = obtenerRangoFechaAntiguedad('todos');
      expect(rango).toBeNull();
    });

    it('should return null for unknown values', () => {
      const rango = obtenerRangoFechaAntiguedad('desconocido');
      expect(rango).toBeNull();
    });

    it('should return valid date ranges for all known periods', () => {
      const periods = [
        'menos_6_meses',
        '6_12_meses',
        '1_3_años',
        '3_5_años',
        'mas_5_años'
      ];

      periods.forEach(period => {
        const rango = obtenerRangoFechaAntiguedad(period);
        expect(rango).toBeTruthy();

        // Verify dates are valid
        if (rango?.gte) {
          expect(rango.gte).toBeInstanceOf(Date);
          expect(Number.isNaN(rango.gte.getTime())).toBe(false);
        }
        if (rango?.lt) {
          expect(rango.lt).toBeInstanceOf(Date);
          expect(Number.isNaN(rango.lt.getTime())).toBe(false);
        }
      });
    });
  });
});
