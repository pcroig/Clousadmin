/**
 * Tests unitarios para cálculos de ausencias
 * Cobertura: funciones puras y lógica de negocio
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EstadoAusencia } from '@/lib/constants/enums';
import {
  determinarEstadoTrasAprobacion,
  esFinDeSemana,
} from '../ausencias';

// ========================================
// determinarEstadoTrasAprobacion
// ========================================

describe('determinarEstadoTrasAprobacion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return completada when fechaFin is in the past', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    const fechaFin = new Date('2024-06-10T00:00:00Z');
    const resultado = determinarEstadoTrasAprobacion(fechaFin);
    expect(resultado).toBe(EstadoAusencia.completada);
  });

  it('should return confirmada when fechaFin is today', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    const fechaFin = new Date('2024-06-15T18:00:00Z');
    const resultado = determinarEstadoTrasAprobacion(fechaFin);
    expect(resultado).toBe(EstadoAusencia.confirmada);
  });

  it('should return confirmada when fechaFin is in the future', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    const fechaFin = new Date('2024-06-20T00:00:00Z');
    const resultado = determinarEstadoTrasAprobacion(fechaFin);
    expect(resultado).toBe(EstadoAusencia.confirmada);
  });
});

// ========================================
// esFinDeSemana
// ========================================

describe('esFinDeSemana', () => {
  it('should return true for Saturday', () => {
    const sabado = new Date('2024-06-15T12:00:00Z');
    expect(esFinDeSemana(sabado)).toBe(true);
  });

  it('should return true for Sunday', () => {
    const domingo = new Date('2024-06-16T12:00:00Z');
    expect(esFinDeSemana(domingo)).toBe(true);
  });

  it('should return false for Monday through Friday', () => {
    const lunes = new Date('2024-06-17T12:00:00Z');
    const martes = new Date('2024-06-18T12:00:00Z');
    const miercoles = new Date('2024-06-19T12:00:00Z');
    const jueves = new Date('2024-06-20T12:00:00Z');
    const viernes = new Date('2024-06-21T12:00:00Z');

    expect(esFinDeSemana(lunes)).toBe(false);
    expect(esFinDeSemana(martes)).toBe(false);
    expect(esFinDeSemana(miercoles)).toBe(false);
    expect(esFinDeSemana(jueves)).toBe(false);
    expect(esFinDeSemana(viernes)).toBe(false);
  });

  it('should identify all 7 days of the week correctly', () => {
    const semana = [
      { fecha: new Date('2024-06-16T12:00:00Z'), esFinDeSemana: true },  // domingo
      { fecha: new Date('2024-06-17T12:00:00Z'), esFinDeSemana: false }, // lunes
      { fecha: new Date('2024-06-18T12:00:00Z'), esFinDeSemana: false }, // martes
      { fecha: new Date('2024-06-19T12:00:00Z'), esFinDeSemana: false }, // miércoles
      { fecha: new Date('2024-06-20T12:00:00Z'), esFinDeSemana: false }, // jueves
      { fecha: new Date('2024-06-21T12:00:00Z'), esFinDeSemana: false }, // viernes
      { fecha: new Date('2024-06-22T12:00:00Z'), esFinDeSemana: true },  // sábado
    ];

    semana.forEach(({ fecha, esFinDeSemana: esperado }) => {
      expect(esFinDeSemana(fecha)).toBe(esperado);
    });
  });
});
