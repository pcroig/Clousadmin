'use server';

// ========================================
// Login Server Actions
// ========================================

import { revalidatePath } from 'next/cache';
import { authenticate, createSession } from '@/lib/auth';
import { rateLimitLogin, getClientIP } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export async function loginAction(email: string, password: string) {
  try {
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
    const usuarioExistente = await prisma.usuario.findUnique({
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
        emailNoExiste: false, // No revelar que el email no existe
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
    const usuarioActualizado = await prisma.usuario.findUnique({
      where: { id: usuario.id },
      select: { activo: true },
    });

    if (!usuarioActualizado || !usuarioActualizado.activo) {
      return {
        success: false,
        error: 'Usuario inactivo. Contacta con tu administrador.',
      };
    }

    // Garantizar que el usuario tiene su empleadoId sincronizado (autocorrección)
    let empleadoId = usuario.empleadoId;

    if (!empleadoId) {
      try {
        const empleadoRelacionado =
          usuario.empleado ||
          (await prisma.empleado.findUnique({
            where: { usuarioId: usuario.id },
            select: { id: true },
          }));

        if (empleadoRelacionado?.id) {
          const usuarioConEmpleado = await prisma.usuario.update({
            where: { id: usuario.id },
            data: { empleadoId: empleadoRelacionado.id },
            select: { empleadoId: true },
          });

          empleadoId = usuarioConEmpleado.empleadoId;
        }
      } catch (linkError) {
        console.error('[Login] Error sincronizando empleadoId del usuario:', linkError);
      }
    }

    // Crear sesión con valor actualizado de activo y metadata
    await createSession(
      {
        user: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          rol: usuario.rol,
          empresaId: usuario.empresaId,
          empleadoId,
          avatar: usuario.avatar,
          activo: usuarioActualizado.activo, // Usar valor actualizado de BD
        },
      },
      {
        ipAddress: clientIP,
        userAgent: headersList.get('user-agent') || undefined,
      }
    );

    return {
      success: true,
      rol: usuario.rol,
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

