/**
 * Auth helpers para tests
 * Crea tokens JWT y sesiones mockeadas
 */

import * as jose from 'jose';
import { UsuarioRol } from '@/lib/constants/enums';

export interface MockUser {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: UsuarioRol;
  empresaId: string;
  empleadoId?: string;
}

export interface MockSession {
  user: MockUser;
  expires: string;
}

/**
 * Crea un JWT válido para tests
 */
export async function createTestJWT(
  payload: Partial<MockUser> & { empresaId: string }
): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'test-secret'
  );

  const token = await new jose.SignJWT({
    id: payload.id || 'test-user-id',
    email: payload.email || 'test@example.com',
    nombre: payload.nombre || 'Test',
    apellidos: payload.apellidos || 'User',
    rol: payload.rol || UsuarioRol.empleado,
    empresaId: payload.empresaId,
    empleadoId: payload.empleadoId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(secret);

  return token;
}

/**
 * Crea una sesión mockeada
 */
export function createMockSession(
  overrides: Partial<MockUser> & { empresaId: string }
): MockSession {
  return {
    user: {
      id: overrides.id || 'test-user-id',
      email: overrides.email || 'test@example.com',
      nombre: overrides.nombre || 'Test',
      apellidos: overrides.apellidos || 'User',
      rol: overrides.rol || UsuarioRol.empleado,
      empresaId: overrides.empresaId,
      empleadoId: overrides.empleadoId,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Crea headers con autenticación para requests
 */
export async function createAuthHeaders(
  userPayload: Partial<MockUser> & { empresaId: string }
): Promise<Record<string, string>> {
  const token = await createTestJWT(userPayload);

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Factory para crear usuarios de test con diferentes roles
 */
export const mockUsers = {
  empleado: (empresaId: string, empleadoId?: string): MockUser => ({
    id: 'empleado-user-id',
    email: 'empleado@test.com',
    nombre: 'Juan',
    apellidos: 'Pérez',
    rol: UsuarioRol.empleado,
    empresaId,
    empleadoId: empleadoId || 'empleado-id',
  }),

  manager: (empresaId: string, empleadoId?: string): MockUser => ({
    id: 'manager-user-id',
    email: 'manager@test.com',
    nombre: 'María',
    apellidos: 'García',
    rol: UsuarioRol.manager,
    empresaId,
    empleadoId: empleadoId || 'manager-empleado-id',
  }),

  hrAdmin: (empresaId: string): MockUser => ({
    id: 'hr-admin-user-id',
    email: 'hr@test.com',
    nombre: 'Ana',
    apellidos: 'Martínez',
    rol: UsuarioRol.hr_admin,
    empresaId,
  }),

  platformAdmin: (empresaId: string): MockUser => ({
    id: 'platform-admin-user-id',
    email: 'admin@test.com',
    nombre: 'Admin',
    apellidos: 'System',
    rol: UsuarioRol.platform_admin,
    empresaId,
  }),
};
