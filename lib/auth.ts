// ========================================
// Authentication Utilities
// ========================================
// Core authentication functions using bcrypt and JWT

import { randomBytes } from 'crypto';

import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';

import { createToken, verifyToken } from '@/lib/auth-edge';
import { prisma } from '@/lib/prisma';

import type { SessionData, UsuarioAutenticado } from '@/types/auth';

// Configuración
const SESSION_COOKIE_NAME = 'clousadmin-session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días
const PASSWORD_RECOVERY_PREFIX = 'password-recovery:';
const TWO_FACTOR_CHALLENGE_PREFIX = 'two-factor-challenge:';
const RECOVERY_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const TWO_FACTOR_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface ValidatedTokenPayload {
  usuarioId: string;
  expires: Date;
  tokenHash: string;
}

/**
 * Hash de contraseña con bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

/**
 * Verificar contraseña con bcrypt
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

// Re-exportar funciones de Edge Runtime para compatibilidad
export { verifyToken, createToken } from '@/lib/auth-edge';

/**
 * Hash de token JWT con SHA-256 usando Web Crypto API
 * Usado para almacenar tokens en BD sin exponer el JWT completo
 * Compatible con Edge Runtime y Node.js Runtime
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Crear sesión (guardar cookie + registrar en BD)
 */
export async function createSession(
  sessionData: SessionData,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  const token = await createToken(sessionData);
  const tokenHash = await hashToken(token);
  const cookieStore = await cookies();
  
  // Guardar sesión en BD (tabla sesionesActivas)
  try {
    await prisma.sesionActiva.create({
      data: {
        usuarioId: sessionData.user.id,
        tokenHash,
        ipAddress: metadata?.ipAddress || null,
        userAgent: metadata?.userAgent || null,
        expiraEn: new Date(Date.now() + SESSION_DURATION),
      },
    });
  } catch (error) {
    console.error('[Auth] Error guardando sesión activa:', error);
    // Continuar aunque falle el guardado en BD
  }
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

/**
 * Obtener sesión actual (con verificación en BD)
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME);

  if (!token) {
    return null;
  }

  // Verificar JWT
  const sessionData = await verifyToken(token.value);
  if (!sessionData) {
    return null;
  }

  // Verificar que la sesión existe en BD y no ha sido invalidada
  const tokenHash = await hashToken(token.value);
  try {
    const sesionActiva = await prisma.sesionActiva.findUnique({
      where: { tokenHash },
    });

    if (!sesionActiva) {
      // Sesión invalidada (no existe en BD)
      return null;
    }

    // Verificar expiración
    if (sesionActiva.expiraEn < new Date()) {
      // Sesión expirada, eliminar de BD
      await prisma.sesionActiva.delete({ where: { tokenHash } });
      return null;
    }

    // Actualizar último uso
    await prisma.sesionActiva.update({
      where: { tokenHash },
      data: { ultimoUso: new Date() },
    });

    // Verificar que usuario sigue activo (cada request)
    const usuario = await prisma.usuario.findUnique({
      where: { id: sessionData.user.id },
      select: { activo: true },
    });

    if (!usuario || !usuario.activo) {
      // Usuario desactivado, invalidar sesión
      await prisma.sesionActiva.delete({ where: { tokenHash } });
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error('[Auth] Error verificando sesión activa:', error);
    // Si falla la verificación en BD, permitir sesión (degradar graciosamente)
    return sessionData;
  }
}

/**
 * Destruir sesión (logout)
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME);

  // Eliminar sesión de BD
  if (token) {
    const tokenHash = await hashToken(token.value);
    try {
      await prisma.sesionActiva.delete({
        where: { tokenHash },
      });
    } catch (error) {
      console.error('[Auth] Error eliminando sesión activa:', error);
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Invalidar todas las sesiones de un usuario
 * Útil al cambiar contraseña o por razones de seguridad
 */
export async function invalidateAllUserSessions(usuarioId: string): Promise<void> {
  try {
    await prisma.sesionActiva.deleteMany({
      where: { usuarioId },
    });
  } catch (error) {
    console.error('[Auth] Error invalidando sesiones de usuario:', error);
    throw error;
  }
}

/**
 * Listar sesiones activas de un usuario
 */
export async function getUserActiveSessions(usuarioId: string) {
  return prisma.sesionActiva.findMany({
    where: {
      usuarioId,
      expiraEn: { gt: new Date() },
    },
    orderBy: { ultimoUso: 'desc' },
  });
}

/**
 * Limpiar sesiones expiradas (ejecutar periódicamente)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.sesionActiva.deleteMany({
      where: {
        expiraEn: { lt: new Date() },
      },
    });
    return result.count;
  } catch (error) {
    console.error('[Auth] Error limpiando sesiones expiradas:', error);
    return 0;
  }
}

/**
 * Generar token de recuperación de contraseña
 */
export async function generateRecoveryToken(
  usuarioId: string
): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = await hashToken(token);
  const identifier = `${PASSWORD_RECOVERY_PREFIX}${usuarioId}`;
  const expires = new Date(Date.now() + RECOVERY_TOKEN_TTL_MS);

  await prisma.verificationToken.deleteMany({
    where: { identifier },
  });

  await prisma.verificationToken.create({
    data: {
      identifier,
      token: tokenHash,
      expires,
    },
  });

  return { token, expires };
}

/**
 * Validar token de recuperación de contraseña sin consumirlo
 */
export async function validateRecoveryToken(
  rawToken: string
): Promise<ValidatedTokenPayload | null> {
  const tokenHash = await hashToken(rawToken);
  const tokenRecord = await prisma.verificationToken.findUnique({
    where: { token: tokenHash },
  });

  if (!tokenRecord || !tokenRecord.identifier.startsWith(PASSWORD_RECOVERY_PREFIX)) {
    return null;
  }

  if (tokenRecord.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: tokenHash } });
    return null;
  }

  const usuarioId = tokenRecord.identifier.replace(PASSWORD_RECOVERY_PREFIX, '');

  return {
    usuarioId,
    expires: tokenRecord.expires,
    tokenHash,
  };
}

/**
 * Consumir token de recuperación (lo elimina tras validarlo)
 */
export async function consumeRecoveryToken(
  rawToken: string
): Promise<{ usuarioId: string } | null> {
  const validation = await validateRecoveryToken(rawToken);
  if (!validation) {
    return null;
  }

  await prisma.verificationToken.delete({
    where: { token: validation.tokenHash },
  });

  return { usuarioId: validation.usuarioId };
}

/**
 * Crear challenge temporal para verificación de 2FA
 */
export async function createTwoFactorChallenge(
  usuarioId: string
): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = await hashToken(token);
  const identifier = `${TWO_FACTOR_CHALLENGE_PREFIX}${usuarioId}`;
  const expires = new Date(Date.now() + TWO_FACTOR_TOKEN_TTL_MS);

  await prisma.verificationToken.deleteMany({
    where: { identifier },
  });

  await prisma.verificationToken.create({
    data: {
      identifier,
      token: tokenHash,
      expires,
    },
  });

  return { token, expires };
}

/**
 * Validar challenge 2FA
 */
export async function validateTwoFactorChallenge(
  rawToken: string
): Promise<ValidatedTokenPayload | null> {
  const tokenHash = await hashToken(rawToken);
  const tokenRecord = await prisma.verificationToken.findUnique({
    where: { token: tokenHash },
  });

  if (!tokenRecord || !tokenRecord.identifier.startsWith(TWO_FACTOR_CHALLENGE_PREFIX)) {
    return null;
  }

  if (tokenRecord.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: tokenHash } });
    return null;
  }

  const usuarioId = tokenRecord.identifier.replace(
    TWO_FACTOR_CHALLENGE_PREFIX,
    ''
  );

  return {
    usuarioId,
    expires: tokenRecord.expires,
    tokenHash,
  };
}

/**
 * Consumir challenge 2FA
 */
export async function consumeTwoFactorChallenge(
  rawToken: string
): Promise<{ usuarioId: string } | null> {
  const validation = await validateTwoFactorChallenge(rawToken);
  if (!validation) {
    return null;
  }

  await prisma.verificationToken.delete({
    where: { token: validation.tokenHash },
  });

  return { usuarioId: validation.usuarioId };
}

/**
 * Autenticar usuario (login)
 */
export async function authenticate(
  email: string,
  password: string
): Promise<UsuarioAutenticado | null> {
  // Buscar usuario por email
  const usuario = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      empleado: true,
    },
  });

  if (!usuario) {
    return null;
  }

  // Verificar que el usuario tiene password configurado
  if (!usuario.password) {
    return null;
  }

  // Verificar contraseña
  const isValid = await verifyPassword(password, usuario.password);

  if (!isValid) {
    return null;
  }

  // Actualizar último acceso
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcceso: new Date() },
  });

  return usuario;
}

/**
 * Registrar nuevo usuario
 */
export async function registerUser(data: {
  email: string;
  password: string;
  nombre: string;
  apellidos: string;
  empresaId: string;
  rol?: string;
  empleadoId?: string;
}): Promise<UsuarioAutenticado> {
  // Hash de contraseña
  const hashedPassword = await hashPassword(data.password);

  // Crear usuario
  const usuario = await prisma.usuario.create({
    data: {
      email: data.email.toLowerCase(),
      password: hashedPassword,
      nombre: data.nombre,
      apellidos: data.apellidos,
      empresaId: data.empresaId,
      rol: data.rol || 'empleado',
      empleadoId: data.empleadoId || null,
      emailVerificado: false,
      activo: true,
    },
    include: {
      empleado: true,
    },
  });

  return usuario;
}

/**
 * Obtener usuario por ID
 */
export async function getUserById(
  userId: string
): Promise<UsuarioAutenticado | null> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    include: {
      empleado: true,
    },
  });

  return usuario;
}

/**
 * Verificar si el usuario tiene un rol específico
 */
export function hasRole(session: SessionData | null, role: string): boolean {
  return session?.user?.rol === role;
}

/**
 * Verificar si el usuario es HR Admin
 */
export function isHRAdmin(session: SessionData | null): boolean {
  return hasRole(session, 'hr_admin');
}

/**
 * Verificar si el usuario es Manager
 */
export function isManager(session: SessionData | null): boolean {
  return hasRole(session, 'manager');
}

/**
 * Verificar si el usuario tiene acceso a un recurso
 */
export async function canAccessResource(
  session: SessionData | null,
  resourceEmpresaId: string
): Promise<boolean> {
  if (!session) return false;

  // HR Admin puede acceder a recursos de su empresa
  if (isHRAdmin(session)) {
    return session.user.empresaId === resourceEmpresaId;
  }

  // Los demás solo a recursos de su empresa
  return session.user.empresaId === resourceEmpresaId;
}

/**
 * Verificar si el usuario puede ver/editar datos de otro empleado
 */
export async function canAccessEmpleado(
  session: SessionData | null,
  empleadoId: string
): Promise<boolean> {
  if (!session) return false;

  // HR Admin puede acceder a todos los empleados de su empresa
  if (isHRAdmin(session)) {
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      select: { empresaId: true },
    });

    return empleado?.empresaId === session.user.empresaId;
  }

  // Manager puede acceder a sus empleados a cargo
  if (isManager(session) && session.user.empleadoId) {
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      select: { managerId: true, empresaId: true },
    });

    return (
      empleado?.empresaId === session.user.empresaId &&
      empleado?.managerId === session.user.empleadoId
    );
  }

  // Los empleados solo pueden acceder a sus propios datos
  return session.user.empleadoId === empleadoId;
}

