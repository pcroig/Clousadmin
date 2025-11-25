/**
 * Tests de integración para GET /api/fichajes
 * Prueba permisos por rol y paginación
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/fichajes/route';
import { createMockRequest, parseResponse } from '@/tests/helpers/api';
import { createMockSession, mockUsers } from '@/tests/helpers/auth';
import { fichajeFactory } from '@/tests/helpers/factories';
import { UsuarioRol, EstadoFichaje } from '@/lib/constants/enums';

// Mock de dependencies
vi.mock('@/lib/api-handler', async () => {
  const actual = await vi.importActual('@/lib/api-handler');
  return {
    ...actual,
    requireAuth: vi.fn(),
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    fichaje: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    empleado: {
      findMany: vi.fn(),
    },
  },
  Prisma: {},
}));

import { requireAuth } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';

describe('GET /api/fichajes', () => {
  const empresaId = 'empresa-test-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticación', () => {
    it('debe rechazar peticiones sin autenticación', async () => {
      (requireAuth as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'No autorizado' }), {
          status: 401,
        })
      );

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Permisos por rol - Empleado', () => {
    it('empleado debe ver solo sus propios fichajes', async () => {
      const empleadoId = 'empleado-123';
      const session = createMockSession({
        empresaId,
        empleadoId,
        rol: UsuarioRol.empleado,
      });
      (requireAuth as any).mockResolvedValue({ session });

      const fichajes = [
        fichajeFactory.build(empleadoId, empresaId),
        fichajeFactory.build(empleadoId, empresaId),
      ];

      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findMany.mockResolvedValue(fichajes);
      mockPrisma.fichaje.count.mockResolvedValue(2);

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.fichaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            empresaId,
            empleadoId, // Debe filtrar por empleadoId automáticamente
          }),
        })
      );
    });

    it('empleado NO debe poder ver fichajes de otros empleados', async () => {
      const empleadoId = 'empleado-123';
      const otroEmpleadoId = 'empleado-456';

      const session = createMockSession({
        empresaId,
        empleadoId,
        rol: UsuarioRol.empleado,
      });
      (requireAuth as any).mockResolvedValue({ session });

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
        searchParams: {
          empleadoId: otroEmpleadoId, // Intenta ver fichajes de otro
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await parseResponse(response);
      expect(data.message).toContain('No autorizado');
    });
  });

  describe('Permisos por rol - Manager', () => {
    it('manager debe ver solo fichajes de empleados a su cargo', async () => {
      const managerId = 'manager-123';
      const empleado1Id = 'empleado-1';
      const empleado2Id = 'empleado-2';

      const session = createMockSession({
        empresaId,
        empleadoId: managerId,
        rol: UsuarioRol.manager,
      });
      (requireAuth as any).mockResolvedValue({ session });

      // Simular empleados a cargo
      const mockPrisma = prisma as any;
      mockPrisma.empleado.findMany.mockResolvedValue([
        { id: empleado1Id },
        { id: empleado2Id },
      ]);

      mockPrisma.fichaje.findMany.mockResolvedValue([
        fichajeFactory.build(empleado1Id, empresaId),
        fichajeFactory.build(empleado2Id, empresaId),
      ]);
      mockPrisma.fichaje.count.mockResolvedValue(2);

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
      });

      await GET(request);

      // Debe consultar empleados a cargo
      expect(mockPrisma.empleado.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ managerId: managerId, empresaId }),
          select: expect.objectContaining({ id: true }),
        })
      );

      // Debe filtrar fichajes por empleados a cargo
      expect(mockPrisma.fichaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            empleadoId: { in: [empleado1Id, empleado2Id] },
          }),
        })
      );
    });
  });

  describe('Permisos por rol - HR Admin', () => {
    it('HR admin debe ver todos los fichajes de la empresa', async () => {
      const session = createMockSession({
        empresaId,
        rol: UsuarioRol.hr_admin,
      });
      (requireAuth as any).mockResolvedValue({ session });

      const fichajes = [
        fichajeFactory.build('empleado-1', empresaId),
        fichajeFactory.build('empleado-2', empresaId),
        fichajeFactory.build('empleado-3', empresaId),
      ];

      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findMany.mockResolvedValue(fichajes);
      mockPrisma.fichaje.count.mockResolvedValue(3);

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.fichaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { empresaId }, // Solo filtra por empresa, no por empleadoId
        })
      );
    });
  });

  describe('Filtros de búsqueda', () => {
    const setupHRAuth = () => {
      const session = createMockSession({
        empresaId,
        rol: UsuarioRol.hr_admin,
      });
      (requireAuth as any).mockResolvedValue({ session });
    };

    it('debe filtrar por empleadoId cuando se especifica', async () => {
      setupHRAuth();

      const empleadoId = 'empleado-123';
      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findMany.mockResolvedValue([]);
      mockPrisma.fichaje.count.mockResolvedValue(0);

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
        searchParams: { empleadoId },
      });

      await GET(request);

      expect(mockPrisma.fichaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            empleadoId,
          }),
        })
      );
    });

    it('debe filtrar por fecha cuando se especifica', async () => {
      setupHRAuth();

      const fecha = '2024-01-15';
      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findMany.mockResolvedValue([]);
      mockPrisma.fichaje.count.mockResolvedValue(0);

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
        searchParams: { fecha },
      });

      await GET(request);

      expect(mockPrisma.fichaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fecha: expect.any(Date),
          }),
        })
      );
    });

    it('debe filtrar por rango de fechas', async () => {
      setupHRAuth();

      const fechaInicio = '2024-01-01';
      const fechaFin = '2024-01-31';

      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findMany.mockResolvedValue([]);
      mockPrisma.fichaje.count.mockResolvedValue(0);

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
        searchParams: { fechaInicio, fechaFin },
      });

      await GET(request);

      expect(mockPrisma.fichaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fecha: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });

    it('debe filtrar por estado', async () => {
      setupHRAuth();

      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findMany.mockResolvedValue([]);
      mockPrisma.fichaje.count.mockResolvedValue(0);

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
        searchParams: { estado: EstadoFichaje.pendiente },
      });

      await GET(request);

      expect(mockPrisma.fichaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: EstadoFichaje.pendiente,
          }),
        })
      );
    });
  });

  describe('Paginación', () => {
    it('debe paginar correctamente con valores por defecto', async () => {
      const session = createMockSession({
        empresaId,
        rol: UsuarioRol.hr_admin,
      });
      (requireAuth as any).mockResolvedValue({ session });

      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findMany.mockResolvedValue([]);
      mockPrisma.fichaje.count.mockResolvedValue(0);

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
      });

      await GET(request);

      expect(mockPrisma.fichaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20, // Default limit
        })
      );
    });

    it('debe paginar con parámetros personalizados', async () => {
      const session = createMockSession({
        empresaId,
        rol: UsuarioRol.hr_admin,
      });
      (requireAuth as any).mockResolvedValue({ session });

      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findMany.mockResolvedValue([]);
      mockPrisma.fichaje.count.mockResolvedValue(0);

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
        searchParams: {
          page: '3',
          limit: '50',
        },
      });

      await GET(request);

      expect(mockPrisma.fichaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 100, // (3-1) * 50
          take: 50,
        })
      );
    });

    it('debe incluir metadatos de paginación en respuesta', async () => {
      const session = createMockSession({
        empresaId,
        rol: UsuarioRol.hr_admin,
      });
      (requireAuth as any).mockResolvedValue({ session });

      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findMany.mockResolvedValue([
        fichajeFactory.build('emp-1', empresaId),
      ]);
      mockPrisma.fichaje.count.mockResolvedValue(100);

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
        searchParams: {
          page: '2',
          limit: '20',
        },
      });

      const response = await GET(request);
      const data = await parseResponse(response);

      expect(data.pagination).toBeDefined();
      expect(data.pagination).toMatchObject({
        page: 2,
        limit: 20,
        total: 100,
        totalPages: 5,
      });
    });
  });

  describe('Parámetro propios', () => {
    it('debe devolver solo fichajes propios cuando propios=1', async () => {
      const empleadoId = 'empleado-123';
      const session = createMockSession({
        empresaId,
        empleadoId,
        rol: UsuarioRol.hr_admin, // Aunque sea HR, debe filtrar por empleadoId
      });
      (requireAuth as any).mockResolvedValue({ session });

      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findMany.mockResolvedValue([]);
      mockPrisma.fichaje.count.mockResolvedValue(0);

      const request = createMockRequest('/api/fichajes', {
        method: 'GET',
        searchParams: { propios: '1' },
      });

      await GET(request);

      expect(mockPrisma.fichaje.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            empleadoId,
          }),
        })
      );
    });
  });
});
