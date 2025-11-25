/**
 * Tests unitarios para cálculos de ausencias
 * Prueba la lógica de cálculo de días laborables y saldo
 */

import { describe, it, expect } from 'vitest';
import {
  determinarEstadoTrasAprobacion,
  esFinDeSemana,
} from '@/lib/calculos/ausencias';
import { EstadoAusencia } from '@/lib/constants/enums';

describe('Cálculos de Ausencias', () => {
  describe('determinarEstadoTrasAprobacion', () => {
    it('debe marcar como completada si la fecha fin ya pasó', () => {
      // Fecha de hace 10 días
      const fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() - 10);

      const estado = determinarEstadoTrasAprobacion(fechaFin);

      expect(estado).toBe(EstadoAusencia.completada);
    });

    it('debe marcar como confirmada si la fecha fin es hoy', () => {
      const fechaFin = new Date(); // Hoy

      const estado = determinarEstadoTrasAprobacion(fechaFin);

      expect(estado).toBe(EstadoAusencia.confirmada);
    });

    it('debe marcar como confirmada si la fecha fin es futura', () => {
      // Fecha en 10 días
      const fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + 10);

      const estado = determinarEstadoTrasAprobacion(fechaFin);

      expect(estado).toBe(EstadoAusencia.confirmada);
    });

    it('debe ignorar la hora al comparar fechas', () => {
      // Fecha de ayer pero con hora futura
      const fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() - 1);
      fechaFin.setHours(23, 59, 59); // 23:59 de ayer

      const estado = determinarEstadoTrasAprobacion(fechaFin);

      // Debe ser completada porque ayer ya pasó, independiente de la hora
      expect(estado).toBe(EstadoAusencia.completada);
    });
  });

  describe('esFinDeSemana', () => {
    it('debe detectar sábado como fin de semana', () => {
      // Crear un sábado (6 de enero de 2024 fue sábado)
      const sabado = new Date('2024-01-06');

      expect(esFinDeSemana(sabado)).toBe(true);
    });

    it('debe detectar domingo como fin de semana', () => {
      // Crear un domingo (7 de enero de 2024 fue domingo)
      const domingo = new Date('2024-01-07');

      expect(esFinDeSemana(domingo)).toBe(true);
    });

    it('NO debe detectar lunes como fin de semana', () => {
      // Crear un lunes (8 de enero de 2024 fue lunes)
      const lunes = new Date('2024-01-08');

      expect(esFinDeSemana(lunes)).toBe(false);
    });

    it('NO debe detectar viernes como fin de semana', () => {
      // Crear un viernes (5 de enero de 2024 fue viernes)
      const viernes = new Date('2024-01-05');

      expect(esFinDeSemana(viernes)).toBe(false);
    });

    it('debe funcionar con diferentes meses y años', () => {
      const sabado2025 = new Date('2025-03-15'); // Sábado
      const domingo2023 = new Date('2023-12-31'); // Domingo
      const miercoles = new Date('2024-06-19'); // Miércoles

      expect(esFinDeSemana(sabado2025)).toBe(true);
      expect(esFinDeSemana(domingo2023)).toBe(true);
      expect(esFinDeSemana(miercoles)).toBe(false);
    });
  });

  describe('Casos edge de fechas', () => {
    it('debe manejar correctamente cambio de año', () => {
      // 31 de diciembre (viernes en 2021)
      const finAno = new Date('2021-12-31');
      expect(esFinDeSemana(finAno)).toBe(false);

      // 1 de enero (sábado en 2022)
      const inicioAno = new Date('2022-01-01');
      expect(esFinDeSemana(inicioAno)).toBe(true);
    });

    it('debe manejar años bisiestos', () => {
      // 29 de febrero de 2024 (jueves)
      const bisiesto = new Date('2024-02-29');
      expect(esFinDeSemana(bisiesto)).toBe(false);
    });

    it('debe manejar correctamente fechas con diferentes zonas horarias', () => {
      // Crear fecha con diferentes horas
      const fecha1 = new Date('2024-01-06T00:00:00Z'); // Medianoche UTC
      const fecha2 = new Date('2024-01-06T23:59:59Z'); // Casi medianoche UTC

      // Ambas deben ser sábado
      expect(esFinDeSemana(fecha1)).toBe(true);
      expect(esFinDeSemana(fecha2)).toBe(true);
    });
  });

  describe('Transiciones de estado', () => {
    it('debe transicionar correctamente ausencias que terminan mañana', () => {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);

      // Aún no ha terminado, debe estar confirmada
      expect(determinarEstadoTrasAprobacion(manana)).toBe(
        EstadoAusencia.confirmada
      );
    });

    it('debe transicionar correctamente ausencias que terminan en una semana', () => {
      const unaSemana = new Date();
      unaSemana.setDate(unaSemana.getDate() + 7);

      expect(determinarEstadoTrasAprobacion(unaSemana)).toBe(
        EstadoAusencia.confirmada
      );
    });

    it('debe marcar como completada ausencias de hace exactamente un día', () => {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);

      expect(determinarEstadoTrasAprobacion(ayer)).toBe(
        EstadoAusencia.completada
      );
    });
  });
});
