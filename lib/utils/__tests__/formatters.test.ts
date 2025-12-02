// ========================================
// Tests para lib/utils/formatters.ts
// ========================================

import { describe, expect, it } from 'vitest';

import { extraerHoraDeISO, formatearHorasMinutos } from '../formatters';

describe('extraerHoraDeISO', () => {
  describe('casos válidos', () => {
    it('extrae hora correctamente de ISO string completo', () => {
      expect(extraerHoraDeISO('2024-12-02T09:30:00.000Z')).toBe('09:30');
    });

    it('extrae hora correctamente sin milisegundos', () => {
      expect(extraerHoraDeISO('2024-12-02T14:45:00Z')).toBe('14:45');
    });

    it('extrae hora correctamente con offset de zona horaria', () => {
      expect(extraerHoraDeISO('2024-12-02T16:20:00+01:00')).toBe('16:20');
    });

    it('extrae hora a medianoche', () => {
      expect(extraerHoraDeISO('2024-12-02T00:00:00.000Z')).toBe('00:00');
    });

    it('extrae hora al final del día', () => {
      expect(extraerHoraDeISO('2024-12-02T23:59:00.000Z')).toBe('23:59');
    });

    it('extrae hora con segundos no cero', () => {
      expect(extraerHoraDeISO('2024-12-02T12:34:56.789Z')).toBe('12:34');
    });
  });

  describe('casos inválidos', () => {
    it('retorna null para string null', () => {
      expect(extraerHoraDeISO(null)).toBe(null);
    });

    it('retorna null para string undefined', () => {
      expect(extraerHoraDeISO(undefined)).toBe(null);
    });

    it('retorna null para string vacío', () => {
      expect(extraerHoraDeISO('')).toBe(null);
    });

    it('retorna null para string muy corto', () => {
      expect(extraerHoraDeISO('2024-12-02')).toBe(null);
    });

    it('retorna null para string sin formato ISO (sin T)', () => {
      expect(extraerHoraDeISO('2024-12-02 09:30:00')).toBe(null);
    });

    it('retorna null para string completamente inválido', () => {
      expect(extraerHoraDeISO('invalid')).toBe(null);
    });

    it('retorna null para solo hora sin fecha', () => {
      expect(extraerHoraDeISO('09:30:00')).toBe(null);
    });

    it('retorna null para número como string', () => {
      expect(extraerHoraDeISO('123456789')).toBe(null);
    });
  });

  describe('casos edge', () => {
    it('maneja ISO strings con diferentes formatos de milisegundos', () => {
      expect(extraerHoraDeISO('2024-12-02T09:30:00.1Z')).toBe('09:30');
      expect(extraerHoraDeISO('2024-12-02T09:30:00.12Z')).toBe('09:30');
      expect(extraerHoraDeISO('2024-12-02T09:30:00.123Z')).toBe('09:30');
    });

    it('maneja ISO strings con diferentes zonas horarias', () => {
      expect(extraerHoraDeISO('2024-12-02T09:30:00-05:00')).toBe('09:30');
      expect(extraerHoraDeISO('2024-12-02T09:30:00+08:00')).toBe('09:30');
    });

    it('maneja fechas futuras', () => {
      expect(extraerHoraDeISO('2099-12-31T23:59:59.999Z')).toBe('23:59');
    });

    it('maneja fechas antiguas', () => {
      expect(extraerHoraDeISO('1900-01-01T00:00:00.000Z')).toBe('00:00');
    });
  });
});

describe('formatearHorasMinutos', () => {
  describe('casos válidos', () => {
    it('formatea horas enteras correctamente', () => {
      expect(formatearHorasMinutos(8)).toBe('8h 0m');
    });

    it('formatea horas con minutos correctamente', () => {
      expect(formatearHorasMinutos(8.5)).toBe('8h 30m');
    });

    it('formatea horas con decimales complejos', () => {
      expect(formatearHorasMinutos(7.75)).toBe('7h 45m');
    });

    it('formatea cero horas', () => {
      expect(formatearHorasMinutos(0)).toBe('0h 0m');
    });

    it('formatea horas negativas (balance negativo)', () => {
      // Math.floor(-2.5) = -3, minutos = (-2.5 - (-3)) * 60 = 0.5 * 60 = 30
      expect(formatearHorasMinutos(-2.5)).toBe('-3h 30m');
    });

    it('acepta strings numéricos', () => {
      expect(formatearHorasMinutos('8.5')).toBe('8h 30m');
    });
  });

  describe('casos inválidos', () => {
    it('retorna 0h 0m para null', () => {
      expect(formatearHorasMinutos(null)).toBe('0h 0m');
    });

    it('retorna 0h 0m para undefined', () => {
      expect(formatearHorasMinutos(undefined)).toBe('0h 0m');
    });

    it('retorna 0h 0m para string no numérico', () => {
      expect(formatearHorasMinutos('invalid')).toBe('0h 0m');
    });
  });

  describe('casos edge', () => {
    it('redondea minutos correctamente', () => {
      expect(formatearHorasMinutos(1.016666)).toBe('1h 1m'); // ~1 minuto
      expect(formatearHorasMinutos(1.983333)).toBe('1h 59m'); // ~59 minutos
    });

    it('maneja valores muy pequeños', () => {
      expect(formatearHorasMinutos(0.01)).toBe('0h 1m');
    });

    it('maneja valores muy grandes', () => {
      expect(formatearHorasMinutos(100.5)).toBe('100h 30m');
    });
  });
});

