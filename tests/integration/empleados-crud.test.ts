/**
 * Tests de integración: CRUD de Empleados con DB real
 * Valida operaciones completas contra base de datos
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { EstadoEmpleado, TipoContrato } from '@/lib/constants/enums';
import bcrypt from 'bcryptjs';

describe.skip('Empleados CRUD Integration', () => {
  let testEmpresaId: string;
  let testEmpleadoId: string;

  beforeAll(async () => {
    // Crear empresa de test
    const empresa = await prisma.empresa.create({
      data: {
        nombre: 'Empresa Test Integration',
        cif: `TEST${Date.now()}`,
        email: `test${Date.now()}@integration.com`,
      },
    });

    testEmpresaId = empresa.id;
  });

  afterAll(async () => {
    // Limpiar datos de test
    if (testEmpresaId) {
      await prisma.empleado.deleteMany({
        where: { empresaId: testEmpresaId },
      });

      await prisma.empresa.delete({
        where: { id: testEmpresaId },
      });
    }

    await prisma.$disconnect();
  });

  describe('Crear Empleado', () => {
    it('debe crear empleado con datos mínimos', async () => {
      const empleado = await prisma.empleado.create({
        data: {
          empresaId: testEmpresaId,
          nombre: 'Juan',
          apellidos: 'Pérez García',
          email: `juan.perez${Date.now()}@test.com`,
          nif: `12345678${Date.now().toString().slice(-1)}`,
          fechaAlta: new Date(),
          estado: EstadoEmpleado.activo,
          tipoContrato: TipoContrato.indefinido,
        },
      });

      expect(empleado.id).toBeDefined();
      expect(empleado.nombre).toBe('Juan');
      expect(empleado.apellidos).toBe('Pérez García');
      expect(empleado.estado).toBe(EstadoEmpleado.activo);

      testEmpleadoId = empleado.id;
    });

    it('debe crear empleado con todos los campos opcionales', async () => {
      const empleado = await prisma.empleado.create({
        data: {
          empresaId: testEmpresaId,
          nombre: 'María',
          apellidos: 'González López',
          email: `maria.gonzalez${Date.now()}@test.com`,
          nif: `87654321${Date.now().toString().slice(-1)}`,
          telefono: '+34600123456',
          numeroSeguridadSocial: '281234567890',
          fechaNacimiento: new Date('1990-05-15'),
          fechaAlta: new Date(),
          estado: EstadoEmpleado.activo,
          tipoContrato: TipoContrato.indefinido,
          salarioBase: 30000,
          puesto: 'Desarrolladora',
          departamento: 'Tecnología',
        },
      });

      expect(empleado.id).toBeDefined();
      expect(empleado.telefono).toBe('+34600123456');
      expect(empleado.numeroSeguridadSocial).toBe('281234567890');
      expect(empleado.salarioBase).toBe(30000);
    });

    it('debe rechazar email duplicado en la misma empresa', async () => {
      const email = `duplicado${Date.now()}@test.com`;

      // Crear primer empleado
      await prisma.empleado.create({
        data: {
          empresaId: testEmpresaId,
          nombre: 'Pedro',
          apellidos: 'Sánchez',
          email,
          fechaAlta: new Date(),
          estado: EstadoEmpleado.activo,
          tipoContrato: TipoContrato.indefinido,
        },
      });

      // Intentar crear segundo con mismo email
      await expect(
        prisma.empleado.create({
          data: {
            empresaId: testEmpresaId,
            nombre: 'Luis',
            apellidos: 'Martínez',
            email, // Email duplicado
            fechaAlta: new Date(),
            estado: EstadoEmpleado.activo,
            tipoContrato: TipoContrato.indefinido,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Leer Empleado', () => {
    beforeEach(async () => {
      // Crear empleado de test si no existe
      if (!testEmpleadoId) {
        const empleado = await prisma.empleado.create({
          data: {
            empresaId: testEmpresaId,
            nombre: 'Test',
            apellidos: 'Usuario',
            email: `test${Date.now()}@test.com`,
            fechaAlta: new Date(),
            estado: EstadoEmpleado.activo,
            tipoContrato: TipoContrato.indefinido,
          },
        });
        testEmpleadoId = empleado.id;
      }
    });

    it('debe obtener empleado por ID', async () => {
      const empleado = await prisma.empleado.findUnique({
        where: { id: testEmpleadoId },
      });

      expect(empleado).not.toBeNull();
      expect(empleado?.id).toBe(testEmpleadoId);
    });

    it('debe obtener empleados de una empresa', async () => {
      const empleados = await prisma.empleado.findMany({
        where: { empresaId: testEmpresaId },
      });

      expect(empleados.length).toBeGreaterThan(0);
      expect(empleados.every((e) => e.empresaId === testEmpresaId)).toBe(true);
    });

    it('debe filtrar por estado', async () => {
      const activos = await prisma.empleado.findMany({
        where: {
          empresaId: testEmpresaId,
          estado: EstadoEmpleado.activo,
        },
      });

      expect(activos.every((e) => e.estado === EstadoEmpleado.activo)).toBe(true);
    });

    it('debe incluir relaciones (usuario, jornada)', async () => {
      const empleado = await prisma.empleado.findUnique({
        where: { id: testEmpleadoId },
        include: {
          usuario: true,
          jornadaAsignacion: true,
        },
      });

      expect(empleado).not.toBeNull();
      // Las relaciones pueden ser null si no existen
      expect(empleado).toHaveProperty('usuario');
      expect(empleado).toHaveProperty('jornadaAsignacion');
    });
  });

  describe('Actualizar Empleado', () => {
    beforeEach(async () => {
      if (!testEmpleadoId) {
        const empleado = await prisma.empleado.create({
          data: {
            empresaId: testEmpresaId,
            nombre: 'Test',
            apellidos: 'Usuario',
            email: `test${Date.now()}@test.com`,
            fechaAlta: new Date(),
            estado: EstadoEmpleado.activo,
            tipoContrato: TipoContrato.indefinido,
          },
        });
        testEmpleadoId = empleado.id;
      }
    });

    it('debe actualizar datos básicos', async () => {
      const updated = await prisma.empleado.update({
        where: { id: testEmpleadoId },
        data: {
          telefono: '+34611222333',
          puesto: 'Senior Developer',
        },
      });

      expect(updated.telefono).toBe('+34611222333');
      expect(updated.puesto).toBe('Senior Developer');
    });

    it('debe actualizar salario', async () => {
      const salarioNuevo = 35000;

      const updated = await prisma.empleado.update({
        where: { id: testEmpleadoId },
        data: { salarioBase: salarioNuevo },
      });

      expect(updated.salarioBase).toBe(salarioNuevo);
    });

    it('debe cambiar estado a baja', async () => {
      const updated = await prisma.empleado.update({
        where: { id: testEmpleadoId },
        data: {
          estado: EstadoEmpleado.baja,
          fechaBaja: new Date(),
        },
      });

      expect(updated.estado).toBe(EstadoEmpleado.baja);
      expect(updated.fechaBaja).not.toBeNull();
    });
  });

  describe('Eliminar Empleado', () => {
    it('debe poder eliminar empleado', async () => {
      // Crear empleado temporal
      const tempEmpleado = await prisma.empleado.create({
        data: {
          empresaId: testEmpresaId,
          nombre: 'Temporal',
          apellidos: 'Para Borrar',
          email: `temp${Date.now()}@test.com`,
          fechaAlta: new Date(),
          estado: EstadoEmpleado.activo,
          tipoContrato: TipoContrato.temporal,
        },
      });

      // Eliminarlo
      await prisma.empleado.delete({
        where: { id: tempEmpleado.id },
      });

      // Verificar que ya no existe
      const deleted = await prisma.empleado.findUnique({
        where: { id: tempEmpleado.id },
      });

      expect(deleted).toBeNull();
    });
  });

  describe('Empleado con Usuario', () => {
    it('debe crear empleado con usuario asociado', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);

      const empleado = await prisma.empleado.create({
        data: {
          empresaId: testEmpresaId,
          nombre: 'Con',
          apellidos: 'Usuario',
          email: `conusuario${Date.now()}@test.com`,
          fechaAlta: new Date(),
          estado: EstadoEmpleado.activo,
          tipoContrato: TipoContrato.indefinido,
          usuario: {
            create: {
              empresaId: testEmpresaId,
              email: `conusuario${Date.now()}@test.com`,
              passwordHash,
              rol: 'empleado',
              activo: true,
            },
          },
        },
        include: {
          usuario: true,
        },
      });

      expect(empleado.usuario).not.toBeNull();
      expect(empleado.usuario?.email).toBe(empleado.email);
      expect(empleado.usuario?.rol).toBe('empleado');
    });

    it('debe poder obtener empleado desde usuario', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const email = `reverse${Date.now()}@test.com`;

      const empleado = await prisma.empleado.create({
        data: {
          empresaId: testEmpresaId,
          nombre: 'Reverse',
          apellidos: 'Lookup',
          email,
          fechaAlta: new Date(),
          estado: EstadoEmpleado.activo,
          tipoContrato: TipoContrato.indefinido,
          usuario: {
            create: {
              empresaId: testEmpresaId,
              email,
              passwordHash,
              rol: 'empleado',
              activo: true,
            },
          },
        },
      });

      // Buscar usuario y obtener empleado
      const usuario = await prisma.usuario.findUnique({
        where: { email },
        include: { empleado: true },
      });

      expect(usuario).not.toBeNull();
      expect(usuario?.empleado?.id).toBe(empleado.id);
    });
  });

  describe('Queries complejas', () => {
    it('debe contar empleados activos', async () => {
      const count = await prisma.empleado.count({
        where: {
          empresaId: testEmpresaId,
          estado: EstadoEmpleado.activo,
        },
      });

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('debe buscar por texto en nombre/apellidos', async () => {
      await prisma.empleado.create({
        data: {
          empresaId: testEmpresaId,
          nombre: 'Buscable',
          apellidos: 'Apellido Único',
          email: `buscable${Date.now()}@test.com`,
          fechaAlta: new Date(),
          estado: EstadoEmpleado.activo,
          tipoContrato: TipoContrato.indefinido,
        },
      });

      const results = await prisma.empleado.findMany({
        where: {
          empresaId: testEmpresaId,
          OR: [
            { nombre: { contains: 'Buscable', mode: 'insensitive' } },
            { apellidos: { contains: 'Único', mode: 'insensitive' } },
          ],
        },
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('debe ordenar por fecha de alta', async () => {
      const empleados = await prisma.empleado.findMany({
        where: { empresaId: testEmpresaId },
        orderBy: { fechaAlta: 'desc' },
        take: 5,
      });

      expect(empleados.length).toBeGreaterThanOrEqual(0);

      // Verificar orden descendente
      for (let i = 0; i < empleados.length - 1; i++) {
        expect(empleados[i].fechaAlta.getTime()).toBeGreaterThanOrEqual(
          empleados[i + 1].fechaAlta.getTime()
        );
      }
    });
  });
});
