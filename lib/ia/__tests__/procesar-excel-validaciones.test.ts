/**
 * Tests para validación de empleados extraídos de Excel
 */

import { describe, expect, it } from 'vitest';

import {
  type EmpleadoDetectado,
  validarEmpleado,
} from '@/lib/ia/procesar-excel-empleados';

const baseEmpleado: EmpleadoDetectado = {
  nombre: 'Ana',
  apellidos: 'García',
  email: 'ana@example.com',
  nif: '12345678Z',
  nss: null,
  iban: null,
  telefono: null,
  fechaNacimiento: null,
  puesto: 'Desarrolladora',
  equipo: 'Engineering',
  manager: 'Laura',
  fechaAlta: '2024-01-01',
  tipoContrato: 'indefinido',
  salarioBaseAnual: 30000,
  salarioBaseMensual: 2500,
  direccion: null,
  direccionCalle: null,
  direccionNumero: null,
  direccionPiso: null,
  direccionProvincia: null,
  ciudad: null,
  codigoPostal: null,
};

describe('Validación de Empleados desde Excel', () => {
  describe('validarEmpleado', () => {
    it('should validate a correct employee', () => {
      const resultado = validarEmpleado(baseEmpleado);

      expect(resultado.valido).toBe(true);
      expect(resultado.errores).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const invalido: EmpleadoDetectado = {
        ...baseEmpleado,
        nombre: null,
        apellidos: '',
        email: '@invalid',  // Invalid email format
      };

      const resultado = validarEmpleado(invalido);

      expect(resultado.valido).toBe(false);
      expect(resultado.errores).toContain('Falta el nombre');
      expect(resultado.errores).toContain('Faltan los apellidos');
      expect(resultado.errores).toContain('Email inválido');
    });

    it('should validate email format', () => {
      const emailsInvalidos = [
        { ...baseEmpleado, email: 'invalid' },
        { ...baseEmpleado, email: '@example.com' },
        { ...baseEmpleado, email: 'user@' },
      ];

      emailsInvalidos.forEach(empleado => {
        const resultado = validarEmpleado(empleado);
        expect(resultado.valido).toBe(false);
        expect(resultado.errores.some(e => e.toLowerCase().includes('email'))).toBe(true);
      });
    });

    it('should accept valid email formats', () => {
      const emailsValidos = [
        'usuario@example.com',
        'test.user+tag@subdomain.example.co.uk',
        'user123@domain.io',
      ];

      emailsValidos.forEach(email => {
        const empleado = { ...baseEmpleado, email };
        const resultado = validarEmpleado(empleado);
        expect(resultado.valido).toBe(true);
      });
    });

    it('should validate all required fields are present', () => {
      // Only nombre, apellidos, and email are required by validarEmpleado
      const camposRequeridos: Array<keyof EmpleadoDetectado> = [
        'nombre',
        'apellidos',
        'email',
      ];

      camposRequeridos.forEach(campo => {
        const empleado = { ...baseEmpleado, [campo]: null };
        const resultado = validarEmpleado(empleado);
        expect(resultado.valido).toBe(false);
        expect(resultado.errores.length).toBeGreaterThan(0);
      });
    });
  });
});
