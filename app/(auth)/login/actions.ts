'use server';

// ========================================
// Login Server Actions
// ========================================

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';

import {
  authenticate,
  createSession,
  createTwoFactorChallenge,
} from '@/lib/auth';
import { getClientIP, rateLimitLogin } from '@/lib/rate-limit';

const TWO_FACTOR_COOKIE = 'clousadmin-2fa';

interface LoginActionResult {
  success: boolean;
  error?: string;
  rol?: string;
  rateLimited?: boolean;
  retryAfter?: number;
  twoFactorRequired?: boolean;
}

export async function loginAction(email: string, password: string): Promise<LoginActionResult> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(TWO_FACTOR_COOKIE);

    // 1. Rate limiting ANTES de cualquier verificación
    // Usar email + IP para identificar (prevenir ataques distribuidos)
    const headersList = await headers();
    const clientIP = getClientIP(headersList);
    const rateLimitIdentifier = `${email.toLowerCase()}:${clientIP}`;
    
    const rateLimitResult = await rateLimitLogin(rateLimitIdentifier);
    
    if (!rateLimitResult.success) {
      // Bloqueado por rate limiting
      return {
        success: false,
        error: 'rate_limit_exceeded',
        rateLimited: true,
        retryAfter: rateLimitResult.retryAfter || 60,
      };
    }

    // 2. Timing attack mitigation: añadir delay mínimo constante
    const startTime = Date.now();
    
    // Verificar si el email existe primero
    const { prisma } = await import('@/lib/prisma');
    const usuarioExistente = await prisma.usuarios.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Si el email no existe, aún así intentar autenticar (prevenir timing attacks)
    // El resultado será null pero el tiempo será similar
    const usuario = usuarioExistente 
      ? await authenticate(email, password)
      : null;
    
    // Estandarizar tiempo de respuesta (mínimo 200ms para prevenir timing attacks)
    const elapsedTime = Date.now() - startTime;
    const minResponseTime = 200;
    if (elapsedTime < minResponseTime) {
      await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
    }

    // Si el email no existe, retornar error genérico (no revelar)
    if (!usuarioExistente) {
      return {
        success: false,
        error: 'Credenciales incorrectas',
      };
    }

    // Autenticar usuario (ya se hizo arriba)
    if (!usuario) {
      return {
        success: false,
        error: 'Credenciales incorrectas',
      };
    }

    // Verificar estado activo directamente desde la BD (no confiar en el objeto devuelto)
    const usuarioActualizado = await prisma.usuarios.findUnique({
      where: { id: usuarioExistente.id },
      select: { activo: true },
    });

    if (!usuarioActualizado || !usuarioActualizado.activo) {
      return {
        success: false,
        error: 'Usuario inactivo. Contacta con tu administrador.',
      };
    }

    // Garantizar que el usuario tiene su empleadoId sincronizado (autocorrección)
    let empleadoId = usuarioExistente.empleadoId;

    if (!empleadoId) {
      try {
        const empleadoRelacionado =
          usuario.empleado ||
          (await prisma.empleados.findUnique({
            where: { usuarioId: usuarioExistente.id },
            select: { id: true },
          }));

        if (empleadoRelacionado?.id) {
          const usuarioConEmpleado = await prisma.usuarios.update({
            where: { id: usuarioExistente.id },
            data: { empleadoId: empleadoRelacionado.id },
            select: { empleadoId: true },
          });

          empleadoId = usuarioConEmpleado.empleadoId;
        }
      } catch (linkError) {
        console.error('[Login] Error sincronizando empleadoId del usuario:', linkError);
      }
    }

    // Si tiene 2FA habilitado, crear challenge y redirigir a OTP
    if (usuarioExistente.totpEnabled) {
      try {
        const { token, expires } = await createTwoFactorChallenge(usuarioExistente.id);
        cookieStore.set(TWO_FACTOR_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: Math.floor((expires.getTime() - Date.now()) / 1000),
          path: '/',
        });
      } catch (challengeError) {
        console.error('[Login] Error generando challenge 2FA:', challengeError);
        return {
          success: false,
          error: 'No pudimos iniciar tu verificación en dos pasos. Inténtalo de nuevo.',
        };
      }

      return {
        success: false,
        twoFactorRequired: true,
      };
    }

    // CRÍTICO: Invalidar todas las sesiones antiguas del usuario antes de crear una nueva
    // Esto previene problemas con cookies antiguas que puedan tener datos desactualizados (ej. rol incorrecto)
    try {
      const sesionesEliminadas = await prisma.sesiones_activas.deleteMany({
        where: { usuarioId: usuarioExistente.id },
      });
      
      if (sesionesEliminadas.count > 0) {
        console.info(
          `[Login] Invalidadas ${sesionesEliminadas.count} sesión(es) antigua(s) para usuario ${usuarioExistente.email}`
        );
      }
    } catch (sessionError) {
      console.error('[Login] Error al invalidar sesiones antiguas:', sessionError);
      // Continuar aunque falle la invalidación (no bloquear el login)
    }

    // Obtener avatar del empleado si existe
    let avatarUrl: string | null = null;
    if (empleadoId) {
      try {
        const empleado = await prisma.empleados.findUnique({
          where: { id: empleadoId },
          select: { fotoUrl: true },
        });
        avatarUrl = empleado?.fotoUrl || null;
      } catch (avatarError) {
        console.error('[Login] Error obteniendo avatar del empleado:', avatarError);
      }
    }

    // Crear sesión con valor actualizado de activo y metadata
    await createSession(
      {
        user: {
          id: usuarioExistente.id,
          email: usuarioExistente.email,
          nombre: usuarioExistente.nombre,
          apellidos: usuarioExistente.apellidos,
          rol: usuarioExistente.rol,
          empresaId: usuarioExistente.empresaId,
          empleadoId,
          avatar: avatarUrl, // Usar empleado.fotoUrl como fuente de verdad
          activo: usuarioActualizado.activo, // Usar valor actualizado de BD
        },
      },
      {
        ipAddress: clientIP,
        userAgent: headersList.get('user-agent') || undefined,
      }
    );

    // Logging para auditoría y debugging (sin información sensible)
    console.info(
      `[Login] Login exitoso - Email: ${usuarioExistente.email}, Rol: ${usuarioExistente.rol}, EmpresaId: ${usuarioExistente.empresaId}`
    );

    return {
      success: true,
      rol: usuarioExistente.rol,
    };
  } catch (error) {
    console.error('[Login] Error:', error);
    return {
      success: false,
      error: 'Error al iniciar sesión. Inténtalo de nuevo.',
    };
  }
}

export async function logoutAction() {
  const { destroySession } = await import('@/lib/auth');
  await destroySession();
  
  // Limpiar el caché de todas las rutas
  revalidatePath('/', 'layout');
  
  return { success: true };
}

