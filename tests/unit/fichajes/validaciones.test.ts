/**
 * Tests unitarios para validaciones de fichajes
 * Prueba la lógica de negocio sin dependencias externas
 */

import { describe, expect, it } from 'vitest';

import {
  calcularHorasTrabajadas,
  calcularTiempoEnPausa,
  validarEvento,
} from '@/lib/calculos/fichajes';
import { TipoFichajeEvento } from '@/lib/constants/enums';

describe('Validaciones de Fichajes', () => {
  describe('calcularHorasTrabajadas', () => {
    it('debe calcular horas trabajadas correctamente con entrada y salida', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.entrada,
          hora: new Date('2024-01-01T09:00:00'),
        },
        {
          tipo: TipoFichajeEvento.salida,
          hora: new Date('2024-01-01T18:00:00'),
        },
      ];

      const horas = calcularHorasTrabajadas(eventos as any);

      // 9 horas = 9 * 60 * 60 * 1000 ms
      expect(horas).toBe(9);
    });

    it('debe calcular horas trabajadas restando pausas', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.entrada,
          hora: new Date('2024-01-01T09:00:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_inicio,
          hora: new Date('2024-01-01T14:00:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_fin,
          hora: new Date('2024-01-01T15:00:00'),
        },
        {
          tipo: TipoFichajeEvento.salida,
          hora: new Date('2024-01-01T18:00:00'),
        },
      ];

      const horas = calcularHorasTrabajadas(eventos as any);

      // 9 horas totales - 1 hora pausa = 8 horas
      expect(horas).toBe(8);
    });

    it('debe retornar null si no hay entrada', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.salida,
          hora: new Date('2024-01-01T18:00:00'),
        },
      ];

      const horas = calcularHorasTrabajadas(eventos as any);

      expect(horas).toBeNull();
    });

    it('debe retornar null si no hay salida', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.entrada,
          hora: new Date('2024-01-01T09:00:00'),
        },
      ];

      const horas = calcularHorasTrabajadas(eventos as any);

      expect(horas).toBeNull();
    });

    it('debe manejar múltiples pausas correctamente', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.entrada,
          hora: new Date('2024-01-01T09:00:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_inicio,
          hora: new Date('2024-01-01T11:00:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_fin,
          hora: new Date('2024-01-01T11:30:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_inicio,
          hora: new Date('2024-01-01T14:00:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_fin,
          hora: new Date('2024-01-01T15:00:00'),
        },
        {
          tipo: TipoFichajeEvento.salida,
          hora: new Date('2024-01-01T18:00:00'),
        },
      ];

      const horas = calcularHorasTrabajadas(eventos as any);

      // 9 horas - 0.5h - 1h = 7.5 horas
      expect(horas).toBe(7.5);
    });
  });

  describe('calcularTiempoEnPausa', () => {
    it('debe calcular tiempo de pausa correctamente', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.pausa_inicio,
          hora: new Date('2024-01-01T14:00:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_fin,
          hora: new Date('2024-01-01T15:00:00'),
        },
      ];

      const tiempoPausa = calcularTiempoEnPausa(eventos as any);

      expect(tiempoPausa).toBe(1);
    });

    it('debe retornar 0 si no hay pausas', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.entrada,
          hora: new Date('2024-01-01T09:00:00'),
        },
        {
          tipo: TipoFichajeEvento.salida,
          hora: new Date('2024-01-01T18:00:00'),
        },
      ];

      const tiempoPausa = calcularTiempoEnPausa(eventos as any);

      expect(tiempoPausa).toBe(0);
    });

    it('debe calcular múltiples pausas correctamente', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.pausa_inicio,
          hora: new Date('2024-01-01T11:00:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_fin,
          hora: new Date('2024-01-01T11:30:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_inicio,
          hora: new Date('2024-01-01T14:00:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_fin,
          hora: new Date('2024-01-01T15:00:00'),
        },
      ];

      const tiempoPausa = calcularTiempoEnPausa(eventos as any);

      // 0.5h + 1h = 1.5 horas
      expect(tiempoPausa).toBe(1.5);
    });

    it('debe ignorar pausas sin cerrar', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.pausa_inicio,
          hora: new Date('2024-01-01T14:00:00'),
        },
        // No hay pausa_fin
      ];

      const tiempoPausa = calcularTiempoEnPausa(eventos as any);

      expect(tiempoPausa).toBe(0);
    });
  });

  describe('validarEvento', () => {
    it('debe aceptar entrada como primer evento', () => {
      const eventos: any[] = [];
      const nuevoEvento = {
        tipo: TipoFichajeEvento.entrada,
        hora: new Date(),
      };

      const resultado = validarEvento(eventos, nuevoEvento as any);

      expect(resultado.valido).toBe(true);
    });

    it('debe rechazar doble entrada sin salida previa', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.entrada,
          hora: new Date('2024-01-01T09:00:00'),
        },
      ];

      const nuevoEvento = {
        tipo: TipoFichajeEvento.entrada,
        hora: new Date('2024-01-01T10:00:00'),
      };

      const resultado = validarEvento(eventos as any, nuevoEvento as any);

      expect(resultado.valido).toBe(false);
      expect(resultado.error).toContain('Ya existe una entrada');
    });

    it('debe rechazar salida sin entrada previa', () => {
      const eventos: any[] = [];
      const nuevoEvento = {
        tipo: TipoFichajeEvento.salida,
        hora: new Date(),
      };

      const resultado = validarEvento(eventos, nuevoEvento as any);

      expect(resultado.valido).toBe(false);
      expect(resultado.error).toContain('No tienes una jornada iniciada');
    });

    it('debe rechazar pausa sin entrada previa', () => {
      const eventos: any[] = [];
      const nuevoEvento = {
        tipo: TipoFichajeEvento.pausa_inicio,
        hora: new Date(),
      };

      const resultado = validarEvento(eventos, nuevoEvento as any);

      expect(resultado.valido).toBe(false);
      expect(resultado.error).toContain('Debes estar trabajando para pausar');
    });

    it('debe rechazar pausa_fin sin pausa_inicio previo', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.entrada,
          hora: new Date('2024-01-01T09:00:00'),
        },
      ];

      const nuevoEvento = {
        tipo: TipoFichajeEvento.pausa_fin,
        hora: new Date('2024-01-01T10:00:00'),
      };

      const resultado = validarEvento(eventos as any, nuevoEvento as any);

      expect(resultado.valido).toBe(false);
      expect(resultado.error).toContain('pausa');
    });

    it('debe aceptar secuencia válida de eventos', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.entrada,
          hora: new Date('2024-01-01T09:00:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_inicio,
          hora: new Date('2024-01-01T14:00:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_fin,
          hora: new Date('2024-01-01T15:00:00'),
        },
      ];

      const nuevoEvento = {
        tipo: TipoFichajeEvento.salida,
        hora: new Date('2024-01-01T18:00:00'),
      };

      const resultado = validarEvento(eventos as any, nuevoEvento as any);

      expect(resultado.valido).toBe(true);
    });

    it('debe rechazar eventos con timestamp anterior al último evento', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.entrada,
          hora: new Date('2024-01-01T09:00:00'),
        },
        {
          tipo: TipoFichajeEvento.salida,
          hora: new Date('2024-01-01T18:00:00'),
        },
      ];

      const nuevoEvento = {
        tipo: TipoFichajeEvento.pausa_inicio,
        hora: new Date('2024-01-01T14:00:00'), // Anterior a la salida
      };

      const resultado = validarEvento(eventos as any, nuevoEvento as any);

      expect(resultado.valido).toBe(false);
      expect(resultado.error).toContain('posterior al último registro');
    });
  });

  describe('Casos edge', () => {
    it('debe manejar eventos vacíos sin errores', () => {
      const eventos: any[] = [];

      const horas = calcularHorasTrabajadas(eventos);
      const pausas = calcularTiempoEnPausa(eventos);

      expect(horas).toBeNull();
      expect(pausas).toBe(0);
    });

    it('debe calcular correctamente jornada nocturna (cruza medianoche)', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.entrada,
          hora: new Date('2024-01-01T22:00:00'),
        },
        {
          tipo: TipoFichajeEvento.salida,
          hora: new Date('2024-01-02T06:00:00'),
        },
      ];

      const horas = calcularHorasTrabajadas(eventos as any);

      // 8 horas (22:00 a 06:00)
      expect(horas).toBe(8);
    });

    it('debe manejar pausas muy cortas (minutos)', () => {
      const eventos = [
        {
          tipo: TipoFichajeEvento.entrada,
          hora: new Date('2024-01-01T09:00:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_inicio,
          hora: new Date('2024-01-01T11:00:00'),
        },
        {
          tipo: TipoFichajeEvento.pausa_fin,
          hora: new Date('2024-01-01T11:15:00'),
        },
        {
          tipo: TipoFichajeEvento.salida,
          hora: new Date('2024-01-01T18:00:00'),
        },
      ];

      const horas = calcularHorasTrabajadas(eventos as any);

      // 9h - 0.25h = 8.75 horas
      expect(horas).toBe(8.75);
    });
  });
});
