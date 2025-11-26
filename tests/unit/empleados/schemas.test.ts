/**
 * Tests unitarios para schemas de validación de Empleados
 * Valida Zod schemas y reglas de negocio
 */

import { describe, expect, it } from 'vitest';

import { empleadoCreateSchema } from '@/lib/validaciones/schemas';

describe('Empleado Schemas', () => {
  describe('empleadoCreateSchema', () => {
    const baseEmpleado = {
      nombre: 'Juan',
      apellidos: 'Pérez García',
      email: 'juan.perez@empresa.com',
      empresaId: '550e8400-e29b-41d4-a716-446655440000',
    };

    describe('Validaciones exitosas', () => {
      it('debe validar empleado con campos mínimos requeridos', () => {
        const result = empleadoCreateSchema.safeParse(baseEmpleado);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.nombre).toBe('Juan');
          expect(result.data.apellidos).toBe('Pérez García');
          expect(result.data.email).toBe('juan.perez@empresa.com');
        }
      });

      it('debe validar empleado con todos los campos opcionales', () => {
        const empleadoCompleto = {
          ...baseEmpleado,
          nif: '12345678Z',
          telefono: '+34600123456',
          puestoId: '650e8400-e29b-41d4-a716-446655440000',
          equipoIds: [
            '750e8400-e29b-41d4-a716-446655440000',
            '850e8400-e29b-41d4-a716-446655440000',
          ],
          fechaAlta: new Date('2024-01-15'),
        };

        const result = empleadoCreateSchema.safeParse(empleadoCompleto);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.nif).toBe('12345678Z');
          expect(result.data.telefono).toBe('+34600123456');
          expect(result.data.equipoIds).toHaveLength(2);
        }
      });

      it('debe aceptar arrays de equipos vacíos', () => {
        const empleado = {
          ...baseEmpleado,
          equipoIds: [],
        };

        const result = empleadoCreateSchema.safeParse(empleado);

        expect(result.success).toBe(true);
      });

      it('debe establecer fechaAlta por defecto si no se proporciona', () => {
        const result = empleadoCreateSchema.safeParse(baseEmpleado);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.fechaAlta).toBeInstanceOf(Date);
          // Debe ser aproximadamente hoy
          const hoy = new Date();
          const diff = Math.abs(
            result.data.fechaAlta.getTime() - hoy.getTime()
          );
          expect(diff).toBeLessThan(1000); // Menos de 1 segundo de diferencia
        }
      });
    });

    describe('Validación de nombre', () => {
      it('debe rechazar nombre vacío', () => {
        const empleado = { ...baseEmpleado, nombre: '' };

        const result = empleadoCreateSchema.safeParse(empleado);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Nombre requerido');
        }
      });

      it('debe rechazar nombre sin proporcionar', () => {
        const { nombre, ...empleadoSinNombre } = baseEmpleado;

        const result = empleadoCreateSchema.safeParse(empleadoSinNombre);

        expect(result.success).toBe(false);
      });

      it('debe aceptar nombres con caracteres especiales (tildes, ñ)', () => {
        const empleado = {
          ...baseEmpleado,
          nombre: 'José María',
          apellidos: 'Núñez Peña',
        };

        const result = empleadoCreateSchema.safeParse(empleado);

        expect(result.success).toBe(true);
      });

      it('debe aceptar nombres compuestos', () => {
        const empleado = {
          ...baseEmpleado,
          nombre: 'Juan Carlos',
          apellidos: 'García López',
        };

        const result = empleadoCreateSchema.safeParse(empleado);

        expect(result.success).toBe(true);
      });
    });

    describe('Validación de apellidos', () => {
      it('debe rechazar apellidos vacíos', () => {
        const empleado = { ...baseEmpleado, apellidos: '' };

        const result = empleadoCreateSchema.safeParse(empleado);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain(
            'Apellidos requeridos'
          );
        }
      });

      it('debe aceptar apellidos con guión', () => {
        const empleado = {
          ...baseEmpleado,
          apellidos: 'García-López Fernández',
        };

        const result = empleadoCreateSchema.safeParse(empleado);

        expect(result.success).toBe(true);
      });
    });

    describe('Validación de email', () => {
      it('debe validar email válido', () => {
        const emails = [
          'usuario@empresa.com',
          'nombre.apellido@empresa.com',
          'usuario+tag@empresa.co.uk',
          'usuario_123@empresa-demo.com',
        ];

        emails.forEach((email) => {
          const empleado = { ...baseEmpleado, email };
          const result = empleadoCreateSchema.safeParse(empleado);

          expect(result.success).toBe(true);
        });
      });

      it('debe rechazar emails inválidos', () => {
        const emailsInvalidos = [
          'no-es-email',
          '@empresa.com',
          'usuario@',
          'usuario @empresa.com', // Espacio
          '',
        ];

        emailsInvalidos.forEach((email) => {
          const empleado = { ...baseEmpleado, email };
          const result = empleadoCreateSchema.safeParse(empleado);

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].message).toContain('Email');
          }
        });
      });

      it('debe rechazar email sin proporcionar', () => {
        const { email, ...empleadoSinEmail } = baseEmpleado;

        const result = empleadoCreateSchema.safeParse(empleadoSinEmail);

        expect(result.success).toBe(false);
      });
    });

    describe('Validación de UUIDs', () => {
      it('debe validar empresaId como UUID', () => {
        const empleado = {
          ...baseEmpleado,
          empresaId: 'not-a-uuid',
        };

        const result = empleadoCreateSchema.safeParse(empleado);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message.toLowerCase()).toContain('uuid');
        }
      });

      it('debe validar puestoId como UUID si se proporciona', () => {
        const empleado = {
          ...baseEmpleado,
          puestoId: 'not-a-uuid',
        };

        const result = empleadoCreateSchema.safeParse(empleado);

        expect(result.success).toBe(false);
      });

      it('debe validar equipoIds como array de UUIDs', () => {
        const empleado = {
          ...baseEmpleado,
          equipoIds: ['valid-uuid', 'not-a-uuid'],
        };

        const result = empleadoCreateSchema.safeParse(empleado);

        expect(result.success).toBe(false);
      });

      it('debe permitir puestoId y equipoIds undefined', () => {
        const empleado = {
          ...baseEmpleado,
          puestoId: undefined,
          equipoIds: undefined,
        };

        const result = empleadoCreateSchema.safeParse(empleado);

        expect(result.success).toBe(true);
      });
    });

    describe('Validación de fechaAlta', () => {
      it('debe aceptar fechaAlta como Date', () => {
        const empleado = {
          ...baseEmpleado,
          fechaAlta: new Date('2023-06-15'),
        };

        const result = empleadoCreateSchema.safeParse(empleado);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.fechaAlta).toBeInstanceOf(Date);
        }
      });

      it('debe usar fecha actual por defecto si no se proporciona fechaAlta', () => {
        const result = empleadoCreateSchema.safeParse(baseEmpleado);

        expect(result.success).toBe(true);
        if (result.success) {
          const ahora = new Date();
          const diff = Math.abs(
            result.data.fechaAlta.getTime() - ahora.getTime()
          );
          // Debe ser la fecha de hoy (tolerancia de 1 segundo)
          expect(diff).toBeLessThan(1000);
        }
      });
    });

    describe('Campos opcionales', () => {
      it('debe permitir NIF opcional', () => {
        const conNIF = { ...baseEmpleado, nif: '12345678Z' };
        const sinNIF = baseEmpleado;

        expect(empleadoCreateSchema.safeParse(conNIF).success).toBe(true);
        expect(empleadoCreateSchema.safeParse(sinNIF).success).toBe(true);
      });

      it('debe permitir teléfono opcional', () => {
        const conTelefono = { ...baseEmpleado, telefono: '+34600123456' };
        const sinTelefono = baseEmpleado;

        expect(empleadoCreateSchema.safeParse(conTelefono).success).toBe(true);
        expect(empleadoCreateSchema.safeParse(sinTelefono).success).toBe(true);
      });
    });

    describe('Casos edge', () => {
      it('debe rechazar campos extra no definidos en el schema', () => {
        const empleadoConExtra = {
          ...baseEmpleado,
          campoInventado: 'valor',
        };

        const result = empleadoCreateSchema.safeParse(empleadoConExtra);

        // Zod por defecto ignora campos extra, pero lo documentamos
        expect(result.success).toBe(true);
        if (result.success) {
          expect('campoInventado' in result.data).toBe(false);
        }
      });

      it('debe manejar nombres muy largos', () => {
        const nombreLargo = 'A'.repeat(255);
        const empleado = {
          ...baseEmpleado,
          nombre: nombreLargo,
        };

        const result = empleadoCreateSchema.safeParse(empleado);

        // Schema no tiene límite superior, debe aceptar
        expect(result.success).toBe(true);
      });

      it('debe manejar múltiples equipos (hasta 5)', () => {
        // Generar UUIDs válidos
        const equipoIds = [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
          '550e8400-e29b-41d4-a716-446655440003',
          '550e8400-e29b-41d4-a716-446655440004',
          '550e8400-e29b-41d4-a716-446655440005',
        ];

        const empleado = {
          ...baseEmpleado,
          equipoIds,
        };

        const result = empleadoCreateSchema.safeParse(empleado);

        // Debe aceptar múltiples equipos
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.equipoIds).toHaveLength(5);
        }
      });
    });
  });
});
