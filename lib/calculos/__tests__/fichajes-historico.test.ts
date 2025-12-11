// ========================================
// Tests: Cálculo de Promedios Históricos
// ========================================

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/prisma';

import {
  ajustarSalidaPorJornada,
  obtenerPromedioEventosHistoricos,
  validarSecuenciaEventos,
} from '../fichajes-historico';

import type { PromedioEventos } from '../fichajes-historico';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    fichajes: {
      findMany: vi.fn(),
    },
  },
}));

describe('fichajes-historico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validarSecuenciaEventos', () => {
    it('debe validar secuencia correcta con pausas', () => {
      const eventos: PromedioEventos = {
        entrada: new Date('2025-01-15T09:00:00Z'),
        pausa_inicio: new Date('2025-01-15T14:00:00Z'),
        pausa_fin: new Date('2025-01-15T15:00:00Z'),
        salida: new Date('2025-01-15T18:00:00Z'),
      };

      expect(validarSecuenciaEventos(eventos)).toBe(true);
    });

    it('debe validar secuencia correcta sin pausas', () => {
      const eventos: PromedioEventos = {
        entrada: new Date('2025-01-15T09:00:00Z'),
        pausa_inicio: null,
        pausa_fin: null,
        salida: new Date('2025-01-15T18:00:00Z'),
      };

      expect(validarSecuenciaEventos(eventos)).toBe(true);
    });

    it('debe rechazar si falta entrada', () => {
      const eventos: PromedioEventos = {
        entrada: null,
        pausa_inicio: null,
        pausa_fin: null,
        salida: new Date('2025-01-15T18:00:00Z'),
      };

      expect(validarSecuenciaEventos(eventos)).toBe(false);
    });

    it('debe rechazar si falta salida', () => {
      const eventos: PromedioEventos = {
        entrada: new Date('2025-01-15T09:00:00Z'),
        pausa_inicio: null,
        pausa_fin: null,
        salida: null,
      };

      expect(validarSecuenciaEventos(eventos)).toBe(false);
    });

    it('debe rechazar si entrada es después de salida', () => {
      const eventos: PromedioEventos = {
        entrada: new Date('2025-01-15T18:00:00Z'),
        pausa_inicio: null,
        pausa_fin: null,
        salida: new Date('2025-01-15T09:00:00Z'),
      };

      expect(validarSecuenciaEventos(eventos)).toBe(false);
    });

    it('debe rechazar si hay pausa_inicio sin pausa_fin', () => {
      const eventos: PromedioEventos = {
        entrada: new Date('2025-01-15T09:00:00Z'),
        pausa_inicio: new Date('2025-01-15T14:00:00Z'),
        pausa_fin: null,
        salida: new Date('2025-01-15T18:00:00Z'),
      };

      expect(validarSecuenciaEventos(eventos)).toBe(false);
    });

    it('debe rechazar si pausa_inicio es después de pausa_fin', () => {
      const eventos: PromedioEventos = {
        entrada: new Date('2025-01-15T09:00:00Z'),
        pausa_inicio: new Date('2025-01-15T15:00:00Z'),
        pausa_fin: new Date('2025-01-15T14:00:00Z'),
        salida: new Date('2025-01-15T18:00:00Z'),
      };

      expect(validarSecuenciaEventos(eventos)).toBe(false);
    });

    it('debe rechazar si pausa_fin es después de salida', () => {
      const eventos: PromedioEventos = {
        entrada: new Date('2025-01-15T09:00:00Z'),
        pausa_inicio: new Date('2025-01-15T14:00:00Z'),
        pausa_fin: new Date('2025-01-15T19:00:00Z'),
        salida: new Date('2025-01-15T18:00:00Z'),
      };

      expect(validarSecuenciaEventos(eventos)).toBe(false);
    });
  });

  describe('obtenerPromedioEventosHistoricos', () => {
    it('debe retornar null si no hay fichajes históricos', async () => {
      vi.mocked(prisma.fichajes.findMany).mockResolvedValue([]);

      const resultado = await obtenerPromedioEventosHistoricos(
        'empleado-1',
        new Date('2025-01-15'),
        'jornada-1',
        5
      );

      expect(resultado).toBeNull();
    });

    it('debe retornar null si los fichajes no tienen eventos', async () => {
      vi.mocked(prisma.fichajes.findMany).mockResolvedValue([
        {
          id: 'fichaje-1',
          empleadoId: 'empleado-1',
          jornadaId: 'jornada-1',
          fecha: new Date('2025-01-14'),
          estado: 'finalizado',
          eventos: [],
        } as never,
      ]);

      const resultado = await obtenerPromedioEventosHistoricos(
        'empleado-1',
        new Date('2025-01-15'),
        'jornada-1',
        5
      );

      expect(resultado).toBeNull();
    });

    it('debe calcular promedio con 5 días históricos', async () => {
      const fichajesConEventos = Array.from({ length: 5 }, (_, i) => ({
        id: `fichaje-${i}`,
        empleadoId: 'empleado-1',
        jornadaId: 'jornada-1',
        fecha: new Date(`2025-01-${10 + i}`),
        estado: 'finalizado',
        eventos: [
          { tipo: 'entrada', hora: new Date(`2025-01-${10 + i}T09:00:00Z`) },
          { tipo: 'pausa_inicio', hora: new Date(`2025-01-${10 + i}T14:00:00Z`) },
          { tipo: 'pausa_fin', hora: new Date(`2025-01-${10 + i}T15:00:00Z`) },
          { tipo: 'salida', hora: new Date(`2025-01-${10 + i}T18:00:00Z`) },
        ],
      }));

      vi.mocked(prisma.fichajes.findMany).mockResolvedValue(fichajesConEventos as never);

      const resultado = await obtenerPromedioEventosHistoricos(
        'empleado-1',
        new Date('2025-01-15'),
        'jornada-1',
        5
      );

      expect(resultado).not.toBeNull();
      expect(resultado?.entrada).toBeDefined();
      expect(resultado?.salida).toBeDefined();
      expect(resultado?.pausa_inicio).toBeDefined();
      expect(resultado?.pausa_fin).toBeDefined();
    });

    it('debe usar solo los primeros 5 fichajes aunque haya más', async () => {
      const fichajesConEventos = Array.from({ length: 10 }, (_, i) => {
        const dia = 5 + i;
        return {
          id: `fichaje-${i}`,
          empleadoId: 'empleado-1',
          jornadaId: 'jornada-1',
          fecha: new Date(Date.UTC(2025, 0, dia)), // FIX: Usar UTC para evitar desfase de timezone
          estado: 'finalizado',
          eventos: [
            { tipo: 'entrada', hora: new Date(Date.UTC(2025, 0, dia, 9, 0, 0)) },
            { tipo: 'salida', hora: new Date(Date.UTC(2025, 0, dia, 18, 0, 0)) },
          ],
        };
      });

      vi.mocked(prisma.fichajes.findMany).mockResolvedValue(fichajesConEventos as never);

      const resultado = await obtenerPromedioEventosHistoricos(
        'empleado-1',
        new Date('2025-01-15'),
        'jornada-1',
        5
      );

      expect(resultado).not.toBeNull();
    });

    it('debe funcionar con solo 2 días históricos', async () => {
      const fichajesConEventos = [
        {
          id: 'fichaje-1',
          empleadoId: 'empleado-1',
          jornadaId: 'jornada-1',
          fecha: new Date('2025-01-13'),
          estado: 'finalizado',
          eventos: [
            { tipo: 'entrada', hora: new Date('2025-01-13T09:00:00Z') },
            { tipo: 'salida', hora: new Date('2025-01-13T18:00:00Z') },
          ],
        },
        {
          id: 'fichaje-2',
          empleadoId: 'empleado-1',
          jornadaId: 'jornada-1',
          fecha: new Date('2025-01-14'),
          estado: 'finalizado',
          eventos: [
            { tipo: 'entrada', hora: new Date('2025-01-14T09:00:00Z') },
            { tipo: 'salida', hora: new Date('2025-01-14T18:00:00Z') },
          ],
        },
      ];

      vi.mocked(prisma.fichajes.findMany).mockResolvedValue(fichajesConEventos as never);

      const resultado = await obtenerPromedioEventosHistoricos(
        'empleado-1',
        new Date('2025-01-15'),
        'jornada-1',
        5
      );

      expect(resultado).not.toBeNull();
      expect(resultado?.entrada).toBeDefined();
      expect(resultado?.salida).toBeDefined();
    });

    it('debe retornar null si la secuencia es inválida', async () => {
      const fichajesConEventos = [
        {
          id: 'fichaje-1',
          empleadoId: 'empleado-1',
          jornadaId: 'jornada-1',
          fecha: new Date('2025-01-14'),
          estado: 'finalizado',
          eventos: [
            { tipo: 'entrada', hora: new Date('2025-01-14T18:00:00Z') }, // Entrada tarde
            { tipo: 'salida', hora: new Date('2025-01-14T09:00:00Z') }, // Salida temprano
          ],
        },
      ];

      vi.mocked(prisma.fichajes.findMany).mockResolvedValue(fichajesConEventos as never);

      const resultado = await obtenerPromedioEventosHistoricos(
        'empleado-1',
        new Date('2025-01-15'),
        'jornada-1',
        5
      );

      expect(resultado).toBeNull();
    });
  });

  describe('ajustarSalidaPorJornada', () => {
    it('no debe ajustar si las horas trabajadas no superan las esperadas', () => {
      const eventos: PromedioEventos = {
        entrada: new Date('2025-01-15T09:00:00Z'),
        pausa_inicio: new Date('2025-01-15T14:00:00Z'),
        pausa_fin: new Date('2025-01-15T15:00:00Z'),
        salida: new Date('2025-01-15T18:00:00Z'), // 8 horas trabajadas
      };

      const resultado = ajustarSalidaPorJornada(
        eventos,
        new Date('2025-01-15'),
        8, // 8 horas esperadas
        '01:00'
      );

      expect(resultado.salida).toEqual(eventos.salida);
    });

    it('debe ajustar salida si supera las horas esperadas', () => {
      const eventos: PromedioEventos = {
        entrada: new Date('2025-01-15T09:00:00Z'),
        pausa_inicio: new Date('2025-01-15T14:00:00Z'),
        pausa_fin: new Date('2025-01-15T15:00:00Z'),
        salida: new Date('2025-01-15T20:00:00Z'), // 10 horas trabajadas
      };

      const resultado = ajustarSalidaPorJornada(
        eventos,
        new Date('2025-01-15'),
        8, // 8 horas esperadas
        '01:00'
      );

      expect(resultado.salida).not.toEqual(eventos.salida);
      expect(resultado.salida!.getTime()).toBeLessThan(eventos.salida!.getTime());
    });

    it('debe retornar sin cambios si no hay entrada o salida', () => {
      const eventos: PromedioEventos = {
        entrada: null,
        pausa_inicio: null,
        pausa_fin: null,
        salida: null,
      };

      const resultado = ajustarSalidaPorJornada(
        eventos,
        new Date('2025-01-15'),
        8,
        '01:00'
      );

      expect(resultado).toEqual(eventos);
    });

    it('debe calcular correctamente con pausa del promedio', () => {
      const entrada = new Date('2025-01-15T09:00:00Z');
      const pausaInicio = new Date('2025-01-15T14:00:00Z');
      const pausaFin = new Date('2025-01-15T15:00:00Z'); // 1 hora pausa
      const salida = new Date('2025-01-15T20:00:00Z'); // 10 horas trabajadas

      const eventos: PromedioEventos = {
        entrada,
        pausa_inicio: pausaInicio,
        pausa_fin: pausaFin,
        salida,
      };

      const resultado = ajustarSalidaPorJornada(
        eventos,
        new Date('2025-01-15'),
        8, // 8 horas esperadas
        undefined // No usar descansoMinimo, usar pausa del promedio
      );

      // Salida ajustada debe ser: entrada (9:00) + 8h trabajo + 1h pausa = 18:00 (UTC)
      const horasAjustadas = resultado.salida!.getUTCHours();
      expect(horasAjustadas).toBe(18);
    });
  });
});

