// ========================================
// Invitaciones - Employee Onboarding Invitations
// ========================================
// Utilities for creating, verifying, and accepting employee invitations

import { hashPassword } from '@/lib/auth';
import { sendOnboardingEmail } from '@/lib/email';
import { crearOnboarding, type TipoOnboarding } from '@/lib/onboarding';
import { prisma } from '@/lib/prisma';

import type { InvitacionEmpleado } from '@prisma/client';

/**
 * Crear invitación para un empleado
 */
export async function crearInvitacion(
  empleadoId: string,
  empresaId: string,
  email: string,
  tipoOnboarding: TipoOnboarding = 'completo',
  options?: { baseUrl?: string }
) {
  try {
    // Verificar si ya existe una invitación activa
    const invitacionExistente = await prisma.invitacionEmpleado.findUnique({
      where: { empleadoId },
    });

    if (invitacionExistente && !invitacionExistente.aceptada) {
      // Si existe y no ha sido aceptada, eliminarla para crear una nueva
      await prisma.invitacionEmpleado.delete({
        where: { id: invitacionExistente.id },
      });
    }

    const onboarding = await crearOnboarding(empleadoId, empresaId, tipoOnboarding, options);

    if (!onboarding.success) {
      return {
        success: false,
        error: onboarding.error || 'Error al crear onboarding',
      };
    }

    const tokenExpiraValue = onboarding.onboarding.tokenExpira;
    const expiraEn =
      tokenExpiraValue instanceof Date
        ? tokenExpiraValue
        : tokenExpiraValue
        ? new Date(tokenExpiraValue as string | number)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitacion = await prisma.invitacionEmpleado.create({
      data: {
        empresaId,
        empleadoId,
        email,
        token: onboarding.token,
        expiraEn,
      },
    });

    return {
      success: true,
      token: onboarding.token,
      url: onboarding.url,
      invitacion,
    };
  } catch (error) {
    console.error('[crearInvitacion] Error:', error);
    return {
      success: false,
      error: 'Error al crear la invitación',
    };
  }
}

type InvitacionEntidad = InvitacionEmpleado;

export interface InvitarEmpleadoParams {
  empleadoId: string;
  empresaId: string;
  email: string;
  nombre: string;
  apellidos: string;
  tipoOnboarding?: TipoOnboarding;
  empresaNombre?: string;
  baseUrl?: string;
}

export interface InvitarEmpleadoResult {
  success: boolean;
  url?: string;
  invitacion?: InvitacionEntidad;
  emailEnviado: boolean;
  error?: string;
}

/**
 * Crear invitación y enviar email automáticamente
 */
export async function invitarEmpleado({
  empleadoId,
  empresaId,
  email,
  nombre,
  apellidos,
  tipoOnboarding = 'completo',
  empresaNombre,
  baseUrl,
}: InvitarEmpleadoParams): Promise<InvitarEmpleadoResult> {
  const invitacion = await crearInvitacion(
    empleadoId,
    empresaId,
    email,
    tipoOnboarding,
    { baseUrl }
  );

  if (!invitacion.success || !invitacion.url) {
    return {
      success: false,
      emailEnviado: false,
      error: invitacion.error || 'No se pudo crear la invitación',
    };
  }

  let nombreEmpresa = empresaNombre;
  try {
    if (!nombreEmpresa) {
      const empresa = await prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { nombre: true },
      });
      nombreEmpresa = empresa?.nombre || 'Tu empresa';
    }
  } catch (error) {
    console.warn(
      '[invitarEmpleado] No se pudo obtener nombre de empresa, usando valor por defecto:',
      error
    );
    nombreEmpresa = 'Tu empresa';
  }

  const nombreEmpresaFinal = nombreEmpresa || 'Tu empresa';

  let emailEnviado = false;
  try {
    await sendOnboardingEmail(
      nombre,
      apellidos,
      email,
      nombreEmpresaFinal,
      invitacion.url
    );
    emailEnviado = true;
  } catch (error) {
    console.error('[invitarEmpleado] Error enviando email de onboarding:', error);
  }

  return {
    success: invitacion.success,
    url: invitacion.url,
    invitacion: invitacion.invitacion,
    emailEnviado,
    error: emailEnviado ? undefined : 'No se pudo enviar el email de invitación',
  };
}

/**
 * Verificar si una invitación es válida
 */
export async function verificarInvitacion(token: string) {
  try {
    const invitacion = await prisma.invitacionEmpleado.findUnique({
      where: { token },
      include: {
        empleado: {
          include: {
            usuario: true,
          },
        },
        empresa: true,
      },
    });

    if (!invitacion) {
      return { valida: false, error: 'Invitación no encontrada' };
    }

    if (invitacion.aceptada) {
      return { valida: false, error: 'Invitación ya utilizada' };
    }

    if (new Date() > invitacion.expiraEn) {
      return { valida: false, error: 'Invitación expirada' };
    }

    return { valida: true, invitacion };
  } catch (error) {
    console.error('[verificarInvitacion] Error:', error);
    return {
      valida: false,
      error: 'Error al verificar la invitación',
    };
  }
}

/**
 * Aceptar invitación y configurar contraseña del usuario
 */
export async function aceptarInvitacion(token: string, password: string) {
  try {
    // Verificar invitación
    const verificacion = await verificarInvitacion(token);
    
    if (!verificacion.valida || !verificacion.invitacion) {
      return {
        success: false,
        error: verificacion.error || 'Invitación inválida',
      };
    }

    const { invitacion } = verificacion;

    // Hash de contraseña
    const hashedPassword = await hashPassword(password);

    // Actualizar usuario con contraseña y marcar como verificado
    const usuario = await prisma.usuario.update({
      where: { id: invitacion.empleado.usuarioId },
      data: {
        password: hashedPassword,
        emailVerificado: true,
        activo: true,
      },
    });

    // Marcar empleado como onboarding completado
    await prisma.empleado.update({
      where: { id: invitacion.empleadoId },
      data: {
        onboardingCompletado: true,
        onboardingCompletadoEn: new Date(),
      },
    });

    // Marcar invitación como aceptada
    await prisma.invitacionEmpleado.update({
      where: { id: invitacion.id },
      data: { aceptada: true },
    });

    console.log(
      `[aceptarInvitacion] Usuario ${usuario.email} aceptó invitación`
    );

    return { success: true, usuario };
  } catch (error) {
    console.error('[aceptarInvitacion] Error:', error);
    return {
      success: false,
      error: 'Error al aceptar la invitación',
    };
  }
}

/**
 * Obtener invitación de un empleado
 */
export async function obtenerInvitacionPorEmpleado(empleadoId: string) {
  try {
    const invitacion = await prisma.invitacionEmpleado.findUnique({
      where: { empleadoId },
    });

    return invitacion;
  } catch (error) {
    console.error('[obtenerInvitacionPorEmpleado] Error:', error);
    return null;
  }
}




















