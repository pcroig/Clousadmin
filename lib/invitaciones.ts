// ========================================
// Invitaciones - Employee Onboarding Invitations
// ========================================
// Utilities for creating, verifying, and accepting employee invitations

import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { randomBytes } from 'crypto';

/**
 * Crear invitación para un empleado
 */
export async function crearInvitacion(
  empleadoId: string,
  empresaId: string,
  email: string
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

    // Generar token único
    const token = randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const invitacion = await prisma.invitacionEmpleado.create({
      data: {
        empresaId,
        empleadoId,
        email,
        token,
        expiraEn,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const url = `${baseUrl}/onboarding/${token}`;

    return {
      success: true,
      token,
      url,
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



















