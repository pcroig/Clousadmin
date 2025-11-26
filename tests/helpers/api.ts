/**
 * API testing helpers
 * Helpers para testear API routes de Next.js
 */

import { NextRequest } from 'next/server';

import type { MockSession } from './auth';

/**
 * Crea un NextRequest mockeado para tests
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options;

  // Construir URL con query params
  const fullUrl = new URL(url, 'http://localhost:3000');
  Object.entries(searchParams).forEach(([key, value]) => {
    fullUrl.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(fullUrl, requestInit);
}

/**
 * Mock de requireAuth para inyectar sesión en tests
 */
export function mockRequireAuth(session: MockSession) {
  return vi.fn().mockResolvedValue({ session });
}

/**
 * Parsea respuesta JSON de una Response de Next.js
 */
export async function parseResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  return JSON.parse(text);
}

/**
 * Helper para testear respuestas de API
 */
export const expectResponse = {
  /**
   * Verifica respuesta exitosa (200)
   */
  success: async (response: Response, expectedData?: any) => {
    expect(response.status).toBe(200);

    if (expectedData !== undefined) {
      const data = await parseResponse(response);
      expect(data).toMatchObject(expectedData);
    }
  },

  /**
   * Verifica respuesta creada (201)
   */
  created: async (response: Response, expectedData?: any) => {
    expect(response.status).toBe(201);

    if (expectedData !== undefined) {
      const data = await parseResponse(response);
      expect(data).toMatchObject(expectedData);
    }
  },

  /**
   * Verifica respuesta bad request (400)
   */
  badRequest: async (response: Response, expectedMessage?: string) => {
    expect(response.status).toBe(400);

    if (expectedMessage) {
      const data = await parseResponse(response);
      expect(data.message).toContain(expectedMessage);
    }
  },

  /**
   * Verifica respuesta unauthorized (401)
   */
  unauthorized: async (response: Response) => {
    expect(response.status).toBe(401);
  },

  /**
   * Verifica respuesta forbidden (403)
   */
  forbidden: async (response: Response) => {
    expect(response.status).toBe(403);
  },

  /**
   * Verifica respuesta not found (404)
   */
  notFound: async (response: Response) => {
    expect(response.status).toBe(404);
  },

  /**
   * Verifica respuesta con error de validación
   */
  validationError: async (response: Response, field?: string) => {
    expect(response.status).toBe(400);

    if (field) {
      const data = await parseResponse(response);
      expect(data.errors).toBeDefined();
      expect(data.errors).toHaveProperty(field);
    }
  },
};

/**
 * Mock de Prisma client para tests
 */
export function createMockPrismaClient() {
  return {
    fichaje: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    fichajeEvento: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ausencia: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    empleado: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    usuario: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    empresa: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(this)),
  };
}

/**
 * Limpia todos los mocks después de cada test
 */
export function cleanupMocks() {
  vi.clearAllMocks();
  vi.restoreAllMocks();
}
