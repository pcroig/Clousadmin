// ========================================
// Multi-tenant Context Helpers
// ========================================
// Provides utilities to access tenant and user data injected via middleware

import { headers } from 'next/headers';

import { UsuarioRol } from '@/lib/constants/enums';
import {
  EMPLEADO_ID_HEADER,
  TENANT_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from '@/lib/constants/tenant';

export interface TenantContext {
  empresaId: string;
  userId: string;
  rol: UsuarioRol;
  empleadoId: string | null;
}

/**
 * Lee el contexto multi-tenant desde los headers de la request actual.
 * Devuelve null si el middleware no pudo inyectarlo (ej. ruta pública).
 */
export async function getTenantContextFromHeaders(): Promise<TenantContext | null> {
  const requestHeaders = await headers();

  const empresaId = requestHeaders.get(TENANT_HEADER);
  const userId = requestHeaders.get(USER_ID_HEADER);
  const rolHeader = requestHeaders.get(USER_ROLE_HEADER);

  if (!empresaId || !userId || !rolHeader) {
    return null;
  }

  const rol = rolHeader as UsuarioRol;
  const empleadoId = requestHeaders.get(EMPLEADO_ID_HEADER);

  return {
    empresaId,
    userId,
    rol,
    empleadoId: empleadoId && empleadoId.length > 0 ? empleadoId : null,
  };
}

/**
 * Helper para asegurar que el contexto está disponible y evitar repetir comprobaciones.
 * Lanza un error si no existe, por lo que debe envolverlo un try/catch o un redirect.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const context = await getTenantContextFromHeaders();

  if (!context) {
    throw new Error('Tenant context no disponible en los headers');
  }

  return context;
}

