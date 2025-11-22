// ========================================
// Invitaciones de Signup - Company Signup Invitations
// ========================================
// Utilities for creating, verifying, and using signup invitations

import { randomBytes } from 'crypto';

import { getBaseUrl, sendSignupInvitationEmail, sendWaitlistInvitationEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

/**
 * Crear invitación para signup (crear empresa y cuenta)
 */
type CrearInvitacionOptions = {
  enviarEmail?: boolean;
};

export async function crearInvitacionSignup(
  email: string,
  invitadoPor?: string,
  options?: CrearInvitacionOptions
) {
  try {
    const shouldSendEmail = options?.enviarEmail ?? true;

    // Verificar si ya existe una invitación activa
    const invitacionExistente = await prisma.invitacionSignup.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (invitacionExistente && !invitacionExistente.usada) {
      // Si existe y no ha sido usada, regenerar token y extender fecha
      const token = randomBytes(32).toString('hex');
      const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

      const invitacion = await prisma.invitacionSignup.update({
        where: { id: invitacionExistente.id },
        data: {
          token,
          expiraEn,
          invitadoPor: invitadoPor || invitacionExistente.invitadoPor,
        },
      });

      const url = `${getBaseUrl()}/signup?token=${token}`;

      if (shouldSendEmail) {
        try {
          await sendSignupInvitationEmail(email, url);
        } catch (error) {
          console.error('[crearInvitacionSignup] Error enviando email:', error);
          // No fallar si el email no se puede enviar, solo loguear
        }
      }

      return {
        success: true,
        token,
        url,
        invitacion,
      };
    }

    // Crear nueva invitación
    const token = randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const invitacion = await prisma.invitacionSignup.create({
      data: {
        email: email.toLowerCase(),
        token,
        expiraEn,
        invitadoPor: invitadoPor || null,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/signup?token=${token}`;

    if (shouldSendEmail) {
      try {
        await sendSignupInvitationEmail(email, url);
      } catch (error) {
        console.error('[crearInvitacionSignup] Error enviando email:', error);
        // No fallar si el email no se puede enviar, solo loguear
      }
    }

    return {
      success: true,
      token,
      url,
      invitacion,
    };
  } catch (error) {
    console.error('[crearInvitacionSignup] Error:', error);
    return {
      success: false,
      error: 'Error al crear la invitación',
    };
  }
}

/**
 * Verificar si una invitación de signup es válida
 */
export async function verificarInvitacionSignup(token: string) {
  try {
    // Debug logging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('[verificarInvitacionSignup] Token recibido:', token ? `${token.substring(0, 20)}...` : 'null');
    }

    if (!token || token.trim() === '') {
      return {
        success: false,
        error: 'Token no proporcionado',
      };
    }

    const invitacion = await prisma.invitacionSignup.findUnique({
      where: { token },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[verificarInvitacionSignup] Invitación encontrada:', invitacion ? 'Sí' : 'No');
    }

    if (!invitacion) {
      return {
        success: false,
        error: 'Invitación no encontrada',
      };
    }

    if (invitacion.usada) {
      return {
        success: false,
        error: 'Esta invitación ya ha sido usada',
      };
    }

    const ahora = new Date();
    const expirada = ahora > invitacion.expiraEn;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[verificarInvitacionSignup] Fecha actual:', ahora.toISOString());
      console.log('[verificarInvitacionSignup] Expira en:', invitacion.expiraEn.toISOString());
      console.log('[verificarInvitacionSignup] ¿Expirada?:', expirada);
    }

    if (expirada) {
      return {
        success: false,
        error: 'Esta invitación ha expirado',
      };
    }

    return {
      success: true,
      invitacion,
    };
  } catch (error) {
    console.error('[verificarInvitacionSignup] Error:', error);
    return {
      success: false,
      error: 'Error al verificar la invitación',
    };
  }
}

/**
 * Obtener invitación por token (aunque esté usada)
 * Útil para continuar onboarding después de crear la cuenta
 */
export async function obtenerInvitacionSignupPorToken(token: string) {
  if (!token || token.trim() === '') {
    return null;
  }

  try {
    return await prisma.invitacionSignup.findUnique({
      where: { token },
    });
  } catch (error) {
    console.error('[obtenerInvitacionSignupPorToken] Error:', error);
    return null;
  }
}

/**
 * Marcar invitación como usada
 */
export async function usarInvitacionSignup(token: string) {
  try {
    const invitacion = await prisma.invitacionSignup.update({
      where: { token },
      data: {
        usada: true,
        usadoEn: new Date(),
      },
    });

    return {
      success: true,
      invitacion,
    };
  } catch (error) {
    console.error('[usarInvitacionSignup] Error:', error);
    return {
      success: false,
      error: 'Error al marcar la invitación como usada',
    };
  }
}

/**
 * Agregar email a waitlist
 */
export async function agregarAWaitlist(
  email: string,
  nombre?: string,
  empresa?: string,
  mensaje?: string
) {
  try {
    // Verificar si ya está en waitlist
    const existente = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existente) {
      return {
        success: false,
        error: 'Este email ya está en la lista de espera',
      };
    }

    // Verificar si ya tiene una invitación
    const invitacion = await prisma.invitacionSignup.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (invitacion && !invitacion.usada) {
      return {
        success: false,
        error: 'Ya tienes una invitación activa. Revisa tu email.',
      };
    }

    const waitlist = await prisma.waitlist.create({
      data: {
        email: email.toLowerCase(),
        nombre: nombre || null,
        empresa: empresa || null,
        mensaje: mensaje || null,
      },
    });

    // Enviar email de confirmación
    try {
      const { sendWaitlistConfirmationEmail } = await import('@/lib/email');
      await sendWaitlistConfirmationEmail(email);
    } catch (error) {
      console.error('[agregarAWaitlist] Error enviando email:', error);
      // No fallar si el email no se puede enviar
    }

    // Notificar internamente al equipo
    try {
      const { sendWaitlistInternalNotificationEmail } = await import('@/lib/email');
      await sendWaitlistInternalNotificationEmail({
        email,
        nombre: nombre || undefined,
        empresa: empresa || undefined,
        mensaje: mensaje || undefined,
      });
    } catch (error) {
      console.error('[agregarAWaitlist] Error enviando notificación interna:', error);
    }

    return {
      success: true,
      waitlist,
    };
  } catch (error) {
    console.error('[agregarAWaitlist] Error:', error);
    return {
      success: false,
      error: 'Error al agregar a la lista de espera',
    };
  }
}

/**
 * Convertir entrada de waitlist en invitación
 */
export async function convertirWaitlistEnInvitacion(
  email: string,
  invitadoPor?: string
) {
  try {
    const waitlist = await prisma.waitlist.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!waitlist) {
      return {
        success: false,
        error: 'No encontrado en waitlist',
      };
    }

    if (waitlist.invitado) {
      return {
        success: false,
        error: 'Ya tiene una invitación',
      };
    }

    // Crear invitación
    const result = await crearInvitacionSignup(email, invitadoPor, { enviarEmail: false });

    if (!result.success) {
      return result;
    }

    // Marcar waitlist como invitado
    await prisma.waitlist.update({
      where: { id: waitlist.id },
      data: {
        invitado: true,
        invitadoEn: new Date(),
      },
    });

    // Enviar email de invitación
    try {
      await sendWaitlistInvitationEmail(email, result.url!);
    } catch (error) {
      console.error('[convertirWaitlistEnInvitacion] Error enviando email:', error);
    }

    return result;
  } catch (error) {
    console.error('[convertirWaitlistEnInvitacion] Error:', error);
    return {
      success: false,
      error: 'Error al convertir waitlist en invitación',
    };
  }
}

