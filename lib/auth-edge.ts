// ========================================
// Authentication Edge Utilities
// ========================================
// Funciones de autenticación compatibles con Edge Runtime
// NO importar Prisma ni módulos de Node.js aquí

import { jwtVerify, SignJWT } from 'jose';

import type { SessionData } from '@/types/auth';

// Configuración
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!nextAuthSecret) {
  throw new Error('[auth-edge] NEXTAUTH_SECRET no está definido');
}

const JWT_SECRET = new TextEncoder().encode(nextAuthSecret);

/**
 * Verificar y decodificar token JWT
 * Compatible con Edge Runtime (no usa Prisma)
 */
const SILENCED_JOSE_ERROR_CODES = new Set([
  'ERR_JWS_INVALID',
  'ERR_JWT_EXPIRED',
  'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
  'ERR_JWT_CLAIM_INVALID',
]);

function isExpectedTokenError(error: unknown): error is Error & { code?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    SILENCED_JOSE_ERROR_CODES.has((error as { code: string }).code)
  );
}

export async function verifyToken(token: string): Promise<SessionData | null> {
  const normalizedToken = token.trim();

  // Evitar verificar tokens que claramente no son JWT compactos
  if (!normalizedToken || normalizedToken.split('.').length !== 3) {
    return null;
  }

  try {
    const verified = await jwtVerify(normalizedToken, JWT_SECRET);
    return verified.payload as unknown as SessionData;
  } catch (error) {
    if (isExpectedTokenError(error)) {
      return null;
    }

    console.error('Error verificando token:', error);
    return null;
  }
}

/**
 * Crear token JWT
 * Compatible con Edge Runtime (no usa Prisma)
 */
export async function createToken(payload: SessionData): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}












