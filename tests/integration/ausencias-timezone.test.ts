// ========================================
// Integration Tests: Ausencias - Timezone Safety
// ========================================
// Validar que el sistema maneja correctamente ausencias
// creadas desde diferentes timezones

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { normalizeToUTCDate } from '@/lib/utils/dates';
import { calcularDias } from '@/lib/calculos/ausencias';

describe('Ausencias - Timezone Safety (Integration)', () => {
  describe('calcularDias - normalización automática', () => {
    const empresaIdMock = 'test-empresa-id';

    it('calcula días correctamente sin importar el timezone de entrada', async () => {
      // Simular ausencia 17-22 enero desde diferentes timezones

      // Madrid (UTC+1)
      const resultadoMadrid = await calcularDias(
        new Date('2025-01-17T00:00:00+01:00'),
        new Date('2025-01-22T00:00:00+01:00'),
        empresaIdMock
      );

      // New York (UTC-5)
      const resultadoNY = await calcularDias(
        new Date('2025-01-17T00:00:00-05:00'),
        new Date('2025-01-22T00:00:00-05:00'),
        empresaIdMock
      );

      // UTC directo
      const resultadoUTC = await calcularDias(
        new Date('2025-01-17T00:00:00Z'),
        new Date('2025-01-22T00:00:00Z'),
        empresaIdMock
      );

      // Todos deben retornar exactamente 6 días naturales
      expect(resultadoMadrid.diasNaturales).toBe(6);
      expect(resultadoNY.diasNaturales).toBe(6);
      expect(resultadoUTC.diasNaturales).toBe(6);
    });

    it('acepta strings ISO y normaliza correctamente', async () => {
      const resultado = await calcularDias(
        '2025-01-17T23:00:00+01:00', // 17 enero en Madrid
        '2025-01-22T12:00:00-05:00', // 22 enero en NY
        empresaIdMock
      );

      expect(resultado.diasNaturales).toBe(6);
    });

    it('maneja correctamente rangos que cruzan cambio de DST', async () => {
      // En España, el DST (horario de verano) comienza el último domingo de marzo
      // 2025: cambio el 30 de marzo (UTC+1 → UTC+2)

      const resultado = await calcularDias(
        '2025-03-25T00:00:00+01:00', // Antes del cambio
        '2025-04-05T00:00:00+02:00', // Después del cambio
        empresaIdMock
      );

      // Debe contar 12 días naturales (25 marzo - 5 abril)
      // NO debe fallar por el cambio de hora
      expect(resultado.diasNaturales).toBe(12);
    });
  });

  describe('Validación de fechas en ausencias (solapes)', () => {
    it('detecta solape correctamente cuando las fechas están normalizadas', () => {
      // Ausencia existente: 17-22 enero
      const existenteInicio = normalizeToUTCDate('2025-01-17T00:00:00Z');
      const existenteFin = normalizeToUTCDate('2025-01-22T00:00:00Z');

      // Nueva ausencia: 20-25 enero (solapa con 20-22)
      const nuevaInicio = normalizeToUTCDate('2025-01-20T00:00:00Z');
      const nuevaFin = normalizeToUTCDate('2025-01-25T00:00:00Z');

      // Verificar solape: nueva.inicio <= existente.fin && nueva.fin >= existente.inicio
      const haysolape =
        nuevaInicio <= existenteFin &&
        nuevaFin >= existenteInicio;

      expect(haysolape).toBe(true);
    });

    it('no detecta falso positivo de solape por diferencia de timezone', () => {
      // Ausencia existente: 17-22 enero
      const existenteInicio = normalizeToUTCDate('2025-01-17T00:00:00Z');
      const existenteFin = normalizeToUTCDate('2025-01-22T00:00:00Z');

      // Nueva ausencia: 23-28 enero (NO solapa)
      // PERO si se envía desde Madrid sin normalizar:
      const nuevaInicioSinNormalizar = new Date('2025-01-23T00:00:00+01:00');
      // Se convertiría a 2025-01-22T23:00:00Z (día 22 en UTC!)

      // CON normalización:
      const nuevaInicio = normalizeToUTCDate(nuevaInicioSinNormalizar);
      const nuevaFin = normalizeToUTCDate('2025-01-28T00:00:00+01:00');

      const haysolape =
        nuevaInicio <= existenteFin &&
        nuevaFin >= existenteInicio;

      // ANTES del fix: daría falso positivo (solaparía por 1 hora)
      // DESPUÉS del fix: correctamente NO solapa
      expect(haysolape).toBe(false);
      expect(nuevaInicio.toISOString()).toBe('2025-01-23T00:00:00.000Z');
    });
  });

  describe('Comparación de fechas para determinar estado', () => {
    it('determina correctamente si una ausencia está completada vs confirmada', () => {
      const hoy = normalizeToUTCDate(new Date());

      // Ausencia que terminó ayer
      const fechaFinPasada = new Date(hoy);
      fechaFinPasada.setUTCDate(hoy.getUTCDate() - 1);
      const finPasadaNormalizada = normalizeToUTCDate(fechaFinPasada);

      // Ausencia que termina mañana
      const fechaFinFutura = new Date(hoy);
      fechaFinFutura.setUTCDate(hoy.getUTCDate() + 1);
      const finFuturaNormalizada = normalizeToUTCDate(fechaFinFutura);

      expect(finPasadaNormalizada < hoy).toBe(true);  // → completada
      expect(finFuturaNormalizada >= hoy).toBe(true); // → confirmada
    });

    it('no produce error cuando se comparan fechas del mismo día', () => {
      const hoy = normalizeToUTCDate(new Date());
      const hoyTambien = normalizeToUTCDate(new Date());

      // Ambas deben ser exactamente iguales (medianoche UTC)
      expect(hoy.getTime()).toBe(hoyTambien.getTime());
      expect(hoy >= hoyTambien).toBe(true);
      expect(hoy <= hoyTambien).toBe(true);
    });
  });

  describe('Edge cases - Cambios de año y meses', () => {
    it('calcula días correctamente cruzando fin de año', async () => {
      const resultado = await calcularDias(
        '2024-12-28T00:00:00Z',
        '2025-01-05T00:00:00Z',
        'test-empresa-id'
      );

      // 28,29,30,31 dic + 1,2,3,4,5 ene = 9 días
      expect(resultado.diasNaturales).toBe(9);
    });

    it('calcula días correctamente en meses con diferentes días (febrero)', async () => {
      const resultado = await calcularDias(
        '2025-02-01T00:00:00Z',
        '2025-02-28T00:00:00Z',
        'test-empresa-id'
      );

      // Febrero 2025 tiene 28 días (no bisiesto)
      expect(resultado.diasNaturales).toBe(28);
    });

    it('maneja correctamente año bisiesto', async () => {
      const resultado = await calcularDias(
        '2024-02-01T00:00:00Z',
        '2024-02-29T00:00:00Z',
        'test-empresa-id'
      );

      // Febrero 2024 tiene 29 días (bisiesto)
      expect(resultado.diasNaturales).toBe(29);
    });
  });

  describe('Regresión - Bug original 17-22 → 16-21', () => {
    it('REGRESIÓN: crear ausencia desde Mi Espacio (empleado) preserva fechas', () => {
      // Simular comportamiento del frontend empleado
      const fechaInicioLocal = new Date(2025, 0, 17); // 17 enero local
      const fechaFinLocal = new Date(2025, 0, 22);    // 22 enero local

      // Frontend normaliza antes de enviar
      const payload = {
        fechaInicio: normalizeToUTCDate(fechaInicioLocal).toISOString(),
        fechaFin: normalizeToUTCDate(fechaFinLocal).toISOString(),
      };

      // Backend recibe y vuelve a normalizar (defensa en profundidad)
      const inicioBackend = normalizeToUTCDate(payload.fechaInicio);
      const finBackend = normalizeToUTCDate(payload.fechaFin);

      // Fechas deben mantenerse como 17-22
      expect(inicioBackend.getUTCDate()).toBe(17);
      expect(finBackend.getUTCDate()).toBe(22);
      expect(inicioBackend.toISOString()).toBe('2025-01-17T00:00:00.000Z');
      expect(finBackend.toISOString()).toBe('2025-01-22T00:00:00.000Z');
    });

    it('REGRESIÓN: crear ausencia desde HR (sin normalización frontend) también funciona', () => {
      // Simular que HR envía fechas sin normalizar (caso legacy)
      const fechaSinNormalizar = '2025-01-17T12:30:00+01:00';

      // Backend DEBE normalizar de todas formas
      const normalizada = normalizeToUTCDate(fechaSinNormalizar);

      expect(normalizada.toISOString()).toBe('2025-01-17T00:00:00.000Z');
    });
  });
});
