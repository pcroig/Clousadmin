/**
 * Tests unitarios para balance de horas
 * Cobertura: funciones puras
 */

import { describe, expect, it } from 'vitest';

import { generarDiasDelPeriodo } from '../balance-horas';

// ========================================
// generarDiasDelPeriodo
// ========================================

describe('generarDiasDelPeriodo', () => {
  it('should generate days for a single day period', () => {
    const inicio = new Date('2024-06-15T00:00:00Z');
    const fin = new Date('2024-06-15T00:00:00Z');

    const dias = generarDiasDelPeriodo(inicio, fin);

    expect(dias).toHaveLength(1);
    expect(dias[0].fecha.toISOString()).toContain('2024-06-15');
  });

  it('should generate days for a one week period', () => {
    const inicio = new Date('2024-06-17T00:00:00Z'); // Lunes
    const fin = new Date('2024-06-23T00:00:00Z'); // Domingo

    const dias = generarDiasDelPeriodo(inicio, fin);

    expect(dias).toHaveLength(7);
  });

  it('should generate days for a full month', () => {
    const inicio = new Date('2024-06-01T00:00:00Z');
    const fin = new Date('2024-06-30T00:00:00Z');

    const dias = generarDiasDelPeriodo(inicio, fin);

    expect(dias).toHaveLength(30); // Junio tiene 30 días
  });

  it('should include both start and end dates', () => {
    const inicio = new Date('2024-06-10T00:00:00Z');
    const fin = new Date('2024-06-12T00:00:00Z');

    const dias = generarDiasDelPeriodo(inicio, fin);

    expect(dias).toHaveLength(3);
    expect(dias[0].fecha.toISOString()).toContain('2024-06-10');
    expect(dias[2].fecha.toISOString()).toContain('2024-06-12');
  });

  it('should handle leap year', () => {
    const inicio = new Date('2024-02-28T00:00:00Z');
    const fin = new Date('2024-03-01T00:00:00Z');

    const dias = generarDiasDelPeriodo(inicio, fin);

    expect(dias).toHaveLength(3); // 28, 29 de feb + 1 de marzo
  });

  it('should handle year transition', () => {
    const inicio = new Date('2023-12-30T00:00:00Z');
    const fin = new Date('2024-01-02T00:00:00Z');

    const dias = generarDiasDelPeriodo(inicio, fin);

    expect(dias).toHaveLength(4); // 30, 31 dic + 1, 2 enero
  });

  it('should normalize times to UTC midnight', () => {
    const inicio = new Date('2024-06-15T14:30:00Z');
    const fin = new Date('2024-06-17T18:45:00Z');

    const dias = generarDiasDelPeriodo(inicio, fin);

    dias.forEach((dia) => {
      expect(dia.fecha.getUTCHours()).toBe(0);
      expect(dia.fecha.getUTCMinutes()).toBe(0);
      expect(dia.fecha.getUTCSeconds()).toBe(0);
    });
  });

  it('should generate keys for each day', () => {
    const inicio = new Date('2024-06-15T00:00:00Z');
    const fin = new Date('2024-06-17T00:00:00Z');

    const dias = generarDiasDelPeriodo(inicio, fin);

    expect(dias[0].key).toBeDefined();
    expect(dias[1].key).toBeDefined();
    expect(dias[2].key).toBeDefined();
    expect(dias[0].key).not.toBe(dias[1].key); // Claves únicas por día
  });
});
