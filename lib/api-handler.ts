// ========================================
// API Handler Utilities
// ========================================
// Helpers reutilizables para API routes - manejo de auth, errores, validación

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { getClientIP, rateLimitApi, rateLimitApiWrite } from '@/lib/rate-limit';

import type { SessionData } from '@/types/auth';


// ========================================
// Types
// ========================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  details?: unknown;
}

export interface AuthenticatedContext {
  session: SessionData;
  request: NextRequest;
}

// ========================================
// Authentication Helpers
// ========================================

/**
 * Verifica que existe sesión activa
 * Retorna 401 si no hay sesión
 */
export async function requireAuth(
  _req: NextRequest
): Promise<{ session: SessionData } | NextResponse> {
  void _req;
  const session = await getSession();
  
  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    );
  }
  
  return { session };
}

/**
 * Verifica que el usuario tiene uno de los roles especificados
 * Retorna 403 si no tiene permisos
 */
export function requireRole(
  session: SessionData,
  allowedRoles: string[]
): NextResponse | null {
  if (!allowedRoles.includes(session.user.rol)) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Verifica que el usuario es HR Admin
 * Retorna 403 si no es HR Admin
 */
export function requireHRAdmin(session: SessionData): NextResponse | null {
  return requireRole(session, ['hr_admin']);
}

/**
 * Verifica que el usuario es HR Admin o Manager
 * Retorna 403 si no tiene permisos
 */
export function requireHROrManager(session: SessionData): NextResponse | null {
  return requireRole(session, ['hr_admin', 'manager']);
}

/**
 * Verifica que el recurso pertenece a la misma empresa del usuario
 */
export function verifyEmpresaAccess(
  session: SessionData,
  resourceEmpresaId: string
): NextResponse | null {
  if (session.user.empresaId !== resourceEmpresaId) {
    return NextResponse.json(
      { error: 'No autorizado - recurso de otra empresa' },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Verifica que el empleado puede acceder al recurso
 * - HR Admin: acceso a todos los empleados de su empresa
 * - Empleado: solo a sus propios datos
 */
export function verifyEmpleadoAccess(
  session: SessionData,
  targetEmpleadoId: string
): NextResponse | null {
  // HR Admin puede acceder a todo
  if (session.user.rol === UsuarioRol.hr_admin) {
    return null;
  }
  
  // Empleado solo a sus propios datos
  if (session.user.empleadoId !== targetEmpleadoId) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 403 }
    );
  }
  
  return null;
}

// ========================================
// Validation Helpers
// ========================================

/**
 * Valida el body de la request con un schema Zod
 * Retorna los datos validados o un NextResponse con error 400
 */
export async function validateRequest<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | NextResponse> {
  try {
    const body = await req.json();
    const validatedData = schema.parse(body);
    return { data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: error.issues,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 400 }
    );
  }
}

// ========================================
// Error Handling
// ========================================

/**
 * Maneja errores de API de forma centralizada
 * Retorna NextResponse apropiado según el tipo de error
 */
export function handleApiError(
  error: unknown,
  context: string
): NextResponse {
  console.error(`[API Error - ${context}]`, error);
  
  // Error de Zod (validación)
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Datos inválidos',
        details: error.issues,
      },
      { status: 400 }
    );
  }
  
  // Error genérico
  if (error instanceof Error) {
    // En desarrollo, mostrar detalles del error
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        {
          error: 'Error interno del servidor',
          message: error.message,
          stack: error.stack,
        },
        { status: 500 }
      );
    }
  }
  
  // Error genérico en producción
  return NextResponse.json(
    { error: 'Error interno del servidor' },
    { status: 500 }
  );
}

// ========================================
// Response Helpers
// ========================================

/**
 * Respuesta exitosa genérica
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {                                                                               
  return NextResponse.json(data, { status });
}

/**
 * Respuesta de creación exitosa
 */
export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

/**
 * Respuesta de no encontrado
 */
export function notFoundResponse(message: string = 'Recurso no encontrado'): NextResponse {                                                                     
  return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * Respuesta de bad request
 */
export function badRequestResponse(message: string, details?: unknown): NextResponse {                                                                          
  const payload: { error: string; details?: unknown } = { error: message };
  if (typeof details !== 'undefined') {
    payload.details = details;
  }

  return NextResponse.json(payload, { status: 400 });
}

/**
 * Respuesta de forbidden (403)
 */
export function forbiddenResponse(message: string = 'No autorizado'): NextResponse {                                                                            
  return NextResponse.json({ error: message }, { status: 403 });
}

// ========================================
// Rate Limiting Helpers
// ========================================

/**
 * Verifica rate limit para el request actual
 * Retorna 429 si se excede el límite
 * @param req - Request de Next.js
 * @param isWrite - true para POST/PATCH/DELETE (límite más estricto), false para GET                                                                           
 */
export async function requireRateLimit(
  req: NextRequest,
  isWrite: boolean = false
): Promise<NextResponse | null> {
  try {
    const clientIP = getClientIP(req.headers);
    const identifier = `api:${clientIP}`;
    
    const result = isWrite 
      ? await rateLimitApiWrite(identifier)
      : await rateLimitApi(identifier);
    
    if (!result.success) {
      const headers = new Headers();
      headers.set('Retry-After', result.retryAfter?.toString() || '60');
      headers.set('X-RateLimit-Limit', result.limit.toString());
      headers.set('X-RateLimit-Remaining', '0');
      headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());
      
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes',
          retryAfter: result.retryAfter,
          message: `Has excedido el límite de solicitudes. Por favor, espera ${result.retryAfter} segundos.`,                                                   
        },
        { status: 429, headers }
      );
    }
    
    return null;
  } catch (error) {
    // Si falla el rate limiting, permitir request (degradar graciosamente)
    console.error('[Rate Limit] Error en requireRateLimit:', error);
    return null;
  }
}

// ========================================
// Combined Helpers
// ========================================

/**
 * Helper que combina autenticación + validación de rol
 * Retorna sesión o error
 */
export async function requireAuthAndRole(
  req: NextRequest,
  allowedRoles: string[]
): Promise<{ session: SessionData } | NextResponse> {
  const authResult = await requireAuth(req);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const roleError = requireRole(authResult.session, allowedRoles);
  if (roleError) {
    return roleError;
  }
  
  return authResult;
}

/**
 * Helper que combina autenticación + verificación HR Admin
 * Retorna sesión o error
 */
export async function requireAuthAsHR(
  req: NextRequest
): Promise<{ session: SessionData } | NextResponse> {
  return requireAuthAndRole(req, ['hr_admin']);
}

/**
 * Helper que combina autenticación + verificación HR o Manager
 * Retorna sesión o error
 */
export async function requireAuthAsHROrManager(
  req: NextRequest
): Promise<{ session: SessionData } | NextResponse> {
  return requireAuthAndRole(req, ['hr_admin', 'manager']);
}

/**
 * Helper completo: Rate Limit + Auth + Role
 * Ideal para APIs POST/PATCH/DELETE que requieren autenticación
 */
export async function requireRateLimitAuthAndRole(
  req: NextRequest,
  allowedRoles: string[],
  isWrite: boolean = true
): Promise<{ session: SessionData } | NextResponse> {
  // 1. Verificar rate limit primero (antes de cualquier query a BD)
  const rateLimitError = await requireRateLimit(req, isWrite);
  if (rateLimitError) {
    return rateLimitError;
  }
  
  // 2. Verificar autenticación y rol
  return requireAuthAndRole(req, allowedRoles);
}

/**
 * Helper completo para endpoints HR: Rate Limit + Auth HR Admin
 */
export async function requireRateLimitAuthHR(
  req: NextRequest,
  isWrite: boolean = true
): Promise<{ session: SessionData } | NextResponse> {
  return requireRateLimitAuthAndRole(req, ['hr_admin'], isWrite);
}
