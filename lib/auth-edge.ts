// ========================================
// Authentication Edge Utilities
// ========================================
// Funciones de autenticación compatibles con Edge Runtime
// NO importar Prisma ni módulos de Node.js aquí

import { SignJWT, jwtVerify } from 'jose';
import type { SessionData } from '@/types/auth';

// Configuración
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
);

/**
 * Verificar y decodificar token JWT
 * Compatible con Edge Runtime (no usa Prisma)
 */
export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as SessionData;
  } catch (error) {
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





