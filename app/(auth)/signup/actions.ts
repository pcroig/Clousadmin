'use server';

// ========================================
// Signup Server Actions
// ========================================

import { headers } from 'next/headers';
import { z } from 'zod';

import { createSession, hashPassword } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { usarInvitacionSignup, verificarInvitacionSignup } from '@/lib/invitaciones-signup';
import { getOrCreateDefaultJornada } from '@/lib/jornadas/get-or-create-default';
import { prisma } from '@/lib/prisma';
import { getClientIP } from '@/lib/rate-limit';
import { signupSchema } from '@/lib/validaciones/schemas';

/**
 * Registrar nueva empresa + primer usuario HR Admin
 * Crea automáticamente: Empresa → Usuario → Empleado → Sesión
 * REQUIERE: Token de invitación válido
 */
export async function signupEmpresaAction(
  data: z.infer<typeof signupSchema> & { token?: string }
) {
  try {
    const headersList = headers();
    const clientIP = getClientIP(headersList);
    const ipAddress = clientIP === 'unknown-ip' ? undefined : clientIP;

    // Validar datos
    const validatedData = signupSchema.parse(data);

    // Verificar invitación (requerida)
    if (!data.token) {
      return {
        success: false,
        error: 'Se requiere una invitación válida para crear una cuenta',
        requiereInvitacion: true,
      };
    }

    const verificacion = await verificarInvitacionSignup(data.token);
    if (!verificacion.success) {
      return {
        success: false,
        error: verificacion.error || 'Invitación inválida o expirada',
        requiereInvitacion: true,
      };
    }

    // Verificar que el email coincida con la invitación
    if (!verificacion.invitacion || verificacion.invitacion.email.toLowerCase() !== validatedData.email.toLowerCase()) {
      return {
        success: false,
        error: 'El email debe coincidir con el de la invitación',
        requiereInvitacion: true,
      };
    }

    // Verificar que el email no exista ya como usuario
    const existingUser = await prisma.usuario.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Ya existe una cuenta con este email',
      };
    }

    // Hash de la contraseña
    const hashedPassword = await hashPassword(validatedData.password);

    // Crear todo en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear empresa
      const empresa = await tx.empresa.create({
        data: {
          nombre: validatedData.nombreEmpresa,
          web: validatedData.webEmpresa || null,
        },
      });

      // 2. Crear jornada por defecto (40 horas, flexible, límites 7:00-21:00)
      const jornadaPorDefecto = await getOrCreateDefaultJornada(tx, empresa.id);

      // 3. Crear usuario HR Admin
      const usuario = await tx.usuario.create({
        data: {
          email: validatedData.email.toLowerCase(),
          password: hashedPassword,
          nombre: validatedData.nombre,
          apellidos: validatedData.apellidos,
          empresaId: empresa.id,
          rol: UsuarioRol.hr_admin,
          emailVerificado: true, // Auto-verificado en signup
          activo: true,
        },
      });

      // 4. Crear empleado asociado al usuario con jornada por defecto asignada
      const empleado = await tx.empleado.create({
        data: {
          usuarioId: usuario.id,
          empresaId: empresa.id,
          nombre: validatedData.nombre,
          apellidos: validatedData.apellidos,
          email: validatedData.email.toLowerCase(),
          fechaAlta: new Date(),
          jornadaId: jornadaPorDefecto.id, // Asignar jornada por defecto
          onboardingCompletado: false, // Se completará en /onboarding/cargar-datos
          activo: true,
        },
      });

      // 5. Vincular empleado al usuario
      await tx.usuario.update({
        where: { id: usuario.id },
        data: { empleadoId: empleado.id },
      });

      if (validatedData.consentimientoTratamiento) {
        await tx.consentimiento.create({
          data: {
            empresaId: empresa.id,
            empleadoId: empleado.id,
            tipo: 'tratamiento_datos',
            descripcion:
              'Consentimiento para el tratamiento de datos personales necesarios para el onboarding de Clousadmin.',
            otorgado: true,
            otorgadoEn: new Date(),
            version: '1.0',
            ipAddress,
          },
        });
      }

      return { usuario, empresa, empleado, jornadaPorDefecto };
    });

    // 5. Marcar invitación como usada
    await usarInvitacionSignup(data.token);

    // 6. Crear sesión automáticamente (usuario autenticado tras signup)
    await createSession({
      user: {
        id: result.usuario.id,
        email: result.usuario.email,
        nombre: result.usuario.nombre,
        apellidos: result.usuario.apellidos,
        rol: result.usuario.rol,
        empresaId: result.usuario.empresaId,
        empleadoId: result.empleado.id,
        avatar: result.empleado.fotoUrl, // Usar empleado.fotoUrl como fuente de verdad
        activo: result.usuario.activo,
      },
    });

    return {
      success: true,
      empresaId: result.empresa.id,
      usuarioId: result.usuario.id,
    };
  } catch (error) {
    console.error('[signupEmpresaAction] Error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Error de validación',
      };
    }

    return {
      success: false,
      error: 'Error al crear la cuenta. Por favor, inténtalo de nuevo.',
    };
  }
}

