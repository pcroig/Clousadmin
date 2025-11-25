/**
 * Tests de integración para /api/fichajes/eventos
 * PRIORIDAD: CRÍTICA (obligatorio legal en España)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/fichajes/eventos/route';
import { createMockRequest, parseResponse } from '@/tests/helpers/api';
import { createMockSession, mockUsers } from '@/tests/helpers/auth';
import { fichajeFactory, empresaFactory } from '@/tests/helpers/factories';
import { TipoFichajeEvento } from '@/lib/constants/enums';

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
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    fichajeEvento: {
      create: vi.fn(),
    },
  },
}));

import { requireAuth } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';

describe('POST /api/fichajes/eventos', () => {
  const empresaId = 'empresa-test-id';
  const empleadoId = 'empleado-test-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticación y autorización', () => {
    it('debe rechazar peticiones sin autenticación', async () => {
      const mockRequireAuth = requireAuth as any;
      mockRequireAuth.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'No autorizado' }), {
          status: 401,
        })
      );

      const request = createMockRequest('/api/fichajes/eventos', {
        method: 'POST',
        body: {
          fichajeId: 'test-id',
          tipo: TipoFichajeEvento.entrada,
          hora: new Date().toISOString(),
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('debe permitir peticiones con sesión válida', async () => {
      const session = createMockSession({
        empresaId,
        empleadoId,
        rol: 'empleado' as any,
      });

      const mockRequireAuth = requireAuth as any;
      mockRequireAuth.mockResolvedValueOnce({ session });

      // Usar un UUID válido
      const fichajeId = '550e8400-e29b-41d4-a716-446655440000';
      const fichaje = { ...fichajeFactory.build(empleadoId, empresaId), id: fichajeId };

      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findFirst.mockResolvedValueOnce(fichaje);
      mockPrisma.fichajeEvento.create.mockResolvedValueOnce({
        id: 'evento-id',
        fichajeId: fichaje.id,
        tipo: TipoFichajeEvento.entrada,
        hora: new Date(),
      });
      mockPrisma.fichaje.findUnique.mockResolvedValueOnce({
        ...fichaje,
        eventos: [],
      });
      mockPrisma.fichaje.update.mockResolvedValueOnce(fichaje);

      const request = createMockRequest('/api/fichajes/eventos', {
        method: 'POST',
        body: {
          fichajeId: fichaje.id,
          tipo: TipoFichajeEvento.entrada,
          hora: new Date().toISOString(),
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.eventoId).toBe('evento-id');
    });
  });

  describe('Validación de datos', () => {
    const setupAuth = () => {
      const session = createMockSession({
        empresaId,
        empleadoId,
        rol: 'empleado' as any,
      });
      (requireAuth as any).mockResolvedValue({ session });
    };

    it('debe rechazar tipo de evento inválido', async () => {
      setupAuth();

      const request = createMockRequest('/api/fichajes/eventos', {
        method: 'POST',
        body: {
          fichajeId: 'test-id',
          tipo: 'tipo_invalido', // Tipo no permitido
          hora: new Date().toISOString(),
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('debe rechazar fichajeId no UUID', async () => {
      setupAuth();

      const request = createMockRequest('/api/fichajes/eventos', {
        method: 'POST',
        body: {
          fichajeId: 'not-a-uuid',
          tipo: TipoFichajeEvento.entrada,
          hora: new Date().toISOString(),
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('debe rechazar si el fichaje no existe', async () => {
      setupAuth();

      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findFirst.mockResolvedValueOnce(null);

      const request = createMockRequest('/api/fichajes/eventos', {
        method: 'POST',
        body: {
          fichajeId: 'non-existent-id',
          tipo: TipoFichajeEvento.entrada,
          hora: new Date().toISOString(),
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await parseResponse(response);
      expect(data.message).toContain('no encontrado');
    });
  });

  describe('Creación de eventos', () => {
    const setupAuthAndFichaje = () => {
      const session = createMockSession({
        empresaId,
        empleadoId,
        rol: 'empleado' as any,
      });
      (requireAuth as any).mockResolvedValue({ session });

      const fichaje = fichajeFactory.build(empleadoId, empresaId);
      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findFirst.mockResolvedValue(fichaje);
      mockPrisma.fichaje.findUnique.mockResolvedValue({
        ...fichaje,
        eventos: [],
      });
      mockPrisma.fichaje.update.mockResolvedValue(fichaje);

      return fichaje;
    };

    it('debe crear evento de entrada correctamente', async () => {
      const fichaje = setupAuthAndFichaje();
      const hora = new Date();

      const mockPrisma = prisma as any;
      const eventoCreado = {
        id: 'evento-entrada-id',
        fichajeId: fichaje.id,
        tipo: TipoFichajeEvento.entrada,
        hora,
        editado: false,
        motivoEdicion: null,
      };
      mockPrisma.fichajeEvento.create.mockResolvedValueOnce(eventoCreado);

      const request = createMockRequest('/api/fichajes/eventos', {
        method: 'POST',
        body: {
          fichajeId: fichaje.id,
          tipo: TipoFichajeEvento.entrada,
          hora: hora.toISOString(),
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.fichajeEvento.create).toHaveBeenCalledWith({
        data: {
          fichajeId: fichaje.id,
          tipo: TipoFichajeEvento.entrada,
          hora: expect.any(Date),
          editado: false,
          motivoEdicion: null,
        },
      });

      const data = await parseResponse(response);
      expect(data.eventoId).toBe('evento-entrada-id');
    });

    it('debe crear evento de salida correctamente', async () => {
      const fichaje = setupAuthAndFichaje();
      const hora = new Date();

      const mockPrisma = prisma as any;
      mockPrisma.fichajeEvento.create.mockResolvedValueOnce({
        id: 'evento-salida-id',
        fichajeId: fichaje.id,
        tipo: TipoFichajeEvento.salida,
        hora,
      });

      const request = createMockRequest('/api/fichajes/eventos', {
        method: 'POST',
        body: {
          fichajeId: fichaje.id,
          tipo: TipoFichajeEvento.salida,
          hora: hora.toISOString(),
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('debe marcar evento como editado si incluye motivoEdicion', async () => {
      const fichaje = setupAuthAndFichaje();
      const hora = new Date();
      const motivo = 'Olvidé fichar';

      const mockPrisma = prisma as any;
      mockPrisma.fichajeEvento.create.mockResolvedValueOnce({
        id: 'evento-id',
        fichajeId: fichaje.id,
        tipo: TipoFichajeEvento.entrada,
        hora,
        editado: true,
        motivoEdicion: motivo,
      });

      const request = createMockRequest('/api/fichajes/eventos', {
        method: 'POST',
        body: {
          fichajeId: fichaje.id,
          tipo: TipoFichajeEvento.entrada,
          hora: hora.toISOString(),
          motivoEdicion: motivo,
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.fichajeEvento.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          editado: true,
          motivoEdicion: motivo,
        }),
      });
    });
  });

  describe('Recálculo de horas', () => {
    it('debe recalcular horas trabajadas después de crear evento', async () => {
      const session = createMockSession({
        empresaId,
        empleadoId,
        rol: 'empleado' as any,
      });
      (requireAuth as any).mockResolvedValue({ session });

      const fichaje = fichajeFactory.build(empleadoId, empresaId);
      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findFirst.mockResolvedValue(fichaje);
      mockPrisma.fichajeEvento.create.mockResolvedValue({
        id: 'evento-id',
        tipo: TipoFichajeEvento.entrada,
      });

      // Simular fichaje con eventos
      const horaEntrada = new Date('2024-01-01T09:00:00');
      const horaSalida = new Date('2024-01-01T18:00:00');
      mockPrisma.fichaje.findUnique.mockResolvedValue({
        ...fichaje,
        eventos: [
          { tipo: TipoFichajeEvento.entrada, hora: horaEntrada },
          { tipo: TipoFichajeEvento.salida, hora: horaSalida },
        ],
      });

      const request = createMockRequest('/api/fichajes/eventos', {
        method: 'POST',
        body: {
          fichajeId: fichaje.id,
          tipo: TipoFichajeEvento.salida,
          hora: horaSalida.toISOString(),
        },
      });

      await POST(request);

      // Verificar que se llamó a update con horas calculadas
      expect(mockPrisma.fichaje.update).toHaveBeenCalledWith({
        where: { id: fichaje.id },
        data: expect.objectContaining({
          horasTrabajadas: expect.any(Number),
          horasEnPausa: expect.any(Number),
        }),
      });
    });
  });

  describe('Control de acceso por empresa', () => {
    it('debe rechazar si el fichaje pertenece a otra empresa', async () => {
      const session = createMockSession({
        empresaId: 'empresa-A',
        empleadoId,
        rol: 'empleado' as any,
      });
      (requireAuth as any).mockResolvedValue({ session });

      // Fichaje de empresa diferente
      const mockPrisma = prisma as any;
      mockPrisma.fichaje.findFirst.mockResolvedValueOnce(null);

      const request = createMockRequest('/api/fichajes/eventos', {
        method: 'POST',
        body: {
          fichajeId: 'fichaje-empresa-B',
          tipo: TipoFichajeEvento.entrada,
          hora: new Date().toISOString(),
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
    });
  });
});
