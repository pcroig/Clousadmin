// ========================================
// Tests: Date Utilities - Timezone Safety
// ========================================

import { describe, expect, it } from 'vitest';
import {
  normalizeToUTCDate,
  normalizeRangeToUTC,
  isSameDayUTC,
  getDaysBetween,
  toDateInputValue,
} from '@/lib/utils/dates';

describe('normalizeToUTCDate', () => {
  it('normaliza fecha local a medianoche UTC conservando el día calendario', () => {
    // Madrid (UTC+1): 17 enero 2025, 23:00 local
    // En UTC: 17 enero 2025, 22:00
    // Esperado: 17 enero 2025, 00:00 UTC
    const fecha = new Date('2025-01-17T23:00:00+01:00');
    const normalizada = normalizeToUTCDate(fecha);

    expect(normalizada.toISOString()).toBe('2025-01-17T00:00:00.000Z');
    expect(normalizada.getUTCFullYear()).toBe(2025);
    expect(normalizada.getUTCMonth()).toBe(0); // enero = 0
    expect(normalizada.getUTCDate()).toBe(17);
  });

  it('normaliza fecha de timezone negativo (UTC-5)', () => {
    // New York (UTC-5): 17 enero 2025, 12:00 local
    // En UTC: 17 enero 2025, 17:00
    // Esperado: 17 enero 2025, 00:00 UTC
    const fecha = new Date('2025-01-17T12:00:00-05:00');
    const normalizada = normalizeToUTCDate(fecha);

    expect(normalizada.toISOString()).toBe('2025-01-17T00:00:00.000Z');
  });

  it('normaliza fecha ya en UTC', () => {
    const fecha = new Date('2025-01-17T15:30:00Z');
    const normalizada = normalizeToUTCDate(fecha);

    expect(normalizada.toISOString()).toBe('2025-01-17T00:00:00.000Z');
  });

  it('maneja string ISO como entrada', () => {
    const normalizada = normalizeToUTCDate('2025-01-17T23:59:59+02:00');
    expect(normalizada.toISOString()).toBe('2025-01-17T00:00:00.000Z');
  });

  it('normaliza correctamente cuando la fecha local cruza medianoche en UTC', () => {
    // Caso edge: 17 enero 2025, 02:00 local en UTC+2
    // En UTC: 17 enero 2025, 00:00 (justo en medianoche)
    // Esperado: 17 enero 2025, 00:00 UTC (no debe retroceder al día 16)
    const fecha = new Date('2025-01-17T02:00:00+02:00');
    const normalizada = normalizeToUTCDate(fecha);

    expect(normalizada.toISOString()).toBe('2025-01-17T00:00:00.000Z');
  });
});

describe('normalizeRangeToUTC', () => {
  it('normaliza un rango de fechas completo', () => {
    const { inicio, fin } = normalizeRangeToUTC(
      '2025-01-17T23:00:00+01:00',
      '2025-01-22T12:00:00-05:00'
    );

    expect(inicio.toISOString()).toBe('2025-01-17T00:00:00.000Z');
    expect(fin.toISOString()).toBe('2025-01-22T00:00:00.000Z');
  });
});

describe('isSameDayUTC', () => {
  it('retorna true para fechas del mismo día en diferentes horas', () => {
    expect(isSameDayUTC(
      '2025-01-17T00:00:00Z',
      '2025-01-17T23:59:59Z'
    )).toBe(true);
  });

  it('retorna false para fechas de días diferentes', () => {
    expect(isSameDayUTC(
      '2025-01-17T23:59:59Z',
      '2025-01-18T00:00:01Z'
    )).toBe(false);
  });

  it('normaliza antes de comparar (ignora timezone de entrada)', () => {
    // Ambas representan el 17 de enero
    expect(isSameDayUTC(
      '2025-01-17T23:00:00+01:00', // 17 enero en Madrid
      '2025-01-17T12:00:00-05:00'  // 17 enero en New York
    )).toBe(true);
  });
});

describe('getDaysBetween', () => {
  it('calcula días entre fechas correctamente (inclusivo)', () => {
    const dias = getDaysBetween('2025-01-17', '2025-01-22');
    // 17, 18, 19, 20, 21, 22 = 6 días
    expect(dias).toBe(6);
  });

  it('retorna 1 para el mismo día', () => {
    const dias = getDaysBetween('2025-01-17', '2025-01-17');
    expect(dias).toBe(1);
  });

  it('normaliza antes de calcular (evita errores por timezone)', () => {
    // Ambos representan el rango 17-22
    const dias = getDaysBetween(
      '2025-01-17T23:00:00+01:00',
      '2025-01-22T12:00:00-05:00'
    );
    expect(dias).toBe(6);
  });

  it('calcula correctamente rangos que cruzan DST', () => {
    // En España, DST cambia el último domingo de marzo
    // Rango que cruza el cambio: 25 marzo - 5 abril
    const dias = getDaysBetween('2025-03-25', '2025-04-05');
    expect(dias).toBe(12); // Debe contar días calendario, no horas
  });
});

describe('toDateInputValue', () => {
  it('convierte fecha a formato YYYY-MM-DD', () => {
    const fecha = new Date('2025-01-17T15:30:00Z');
    const valor = toDateInputValue(fecha);
    expect(valor).toBe('2025-01-17');
  });

  it('normaliza a UTC antes de formatear', () => {
    // Aunque la hora local sea del día 18, debe retornar el día 17
    const fecha = new Date('2025-01-17T23:00:00+01:00');
    const valor = toDateInputValue(fecha);
    expect(valor).toBe('2025-01-17');
  });
});

describe('Regression tests - Problema original (17-22 se guardaba como 16-21)', () => {
  it('FIX: ausencia 17-22 desde Madrid (UTC+1) se persiste correctamente', () => {
    // Simular que el usuario en Madrid selecciona 17-22 enero
    const fechaInicio = new Date('2025-01-17T00:00:00+01:00');
    const fechaFin = new Date('2025-01-22T00:00:00+01:00');

    const inicioNormalizado = normalizeToUTCDate(fechaInicio);
    const finNormalizado = normalizeToUTCDate(fechaFin);

    // ANTES del fix: toISOString() convertía a 2025-01-16T23:00:00Z
    // DESPUÉS del fix: normaliza a 2025-01-17T00:00:00Z
    expect(inicioNormalizado.toISOString()).toBe('2025-01-17T00:00:00.000Z');
    expect(finNormalizado.toISOString()).toBe('2025-01-22T00:00:00.000Z');
  });

  it('FIX: ausencia 17-22 desde New York (UTC-5) se persiste correctamente', () => {
    const fechaInicio = new Date('2025-01-17T00:00:00-05:00');
    const fechaFin = new Date('2025-01-22T00:00:00-05:00');

    const inicioNormalizado = normalizeToUTCDate(fechaInicio);
    const finNormalizado = normalizeToUTCDate(fechaFin);

    // ANTES del fix: toISOString() convertía a 2025-01-17T05:00:00Z
    // DESPUÉS del fix: normaliza a 2025-01-17T00:00:00Z
    expect(inicioNormalizado.toISOString()).toBe('2025-01-17T00:00:00.000Z');
    expect(finNormalizado.toISOString()).toBe('2025-01-22T00:00:00.000Z');
  });

  it('FIX: cálculo de días es consistente sin importar el timezone del cliente', () => {
    // Madrid
    const diasMadrid = getDaysBetween(
      '2025-01-17T00:00:00+01:00',
      '2025-01-22T00:00:00+01:00'
    );

    // New York
    const diasNY = getDaysBetween(
      '2025-01-17T00:00:00-05:00',
      '2025-01-22T00:00:00-05:00'
    );

    // Tokio (UTC+9)
    const diasTokio = getDaysBetween(
      '2025-01-17T00:00:00+09:00',
      '2025-01-22T00:00:00+09:00'
    );

    // Todos deben calcular exactamente 6 días
    expect(diasMadrid).toBe(6);
    expect(diasNY).toBe(6);
    expect(diasTokio).toBe(6);
  });
});
