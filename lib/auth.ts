// ========================================
// Authentication Utilities
// ========================================
// Core authentication functions using bcrypt and JWT

import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { SessionData, UsuarioAutenticado } from '@/types/auth';

// Configuración
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
);
const SESSION_COOKIE_NAME = 'clousadmin-session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días

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

/**
 * Crear token JWT
 */
export async function createToken(payload: SessionData): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verificar y decodificar token JWT
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
 * Crear sesión (guardar cookie)
 */
export async function createSession(sessionData: SessionData): Promise<void> {
  const token = await createToken(sessionData);
  const cookieStore = await cookies();
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

/**
 * Obtener sesión actual
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME);

  if (!token) {
    return null;
  }

  return verifyToken(token.value);
}

/**
 * Destruir sesión (logout)
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
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

