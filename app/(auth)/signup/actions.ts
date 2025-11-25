'use server';

// ========================================
// Signup Server Actions
// ========================================

import { headers } from 'next/headers';
import { z } from 'zod';

import { createSession, hashPassword } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { usarInvitacionSignup, verificarInvitacionSignup } from '@/lib/invitaciones-signup';
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
    const headersList = await headers();
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

    // Verificar si tenemos datos previos en waitlist (para sincronizar)
    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

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

      // 2. Crear usuario HR Admin
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

      // 3. Crear empleado asociado al usuario
      const empleado = await tx.empleado.create({
        data: {
          usuarioId: usuario.id,
          empresaId: empresa.id,
          nombre: validatedData.nombre,
          apellidos: validatedData.apellidos,
          email: validatedData.email.toLowerCase(),
          fechaAlta: new Date(),
          onboardingCompletado: false, // Se completará en /onboarding/cargar-datos
          activo: true,
        },
      });

      // 4. Vincular empleado al usuario
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

      return { usuario, empresa, empleado };
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

    // 7. Mantener sincronizada la entrada en waitlist (si venía de ahí)
    if (waitlistEntry) {
      const nombreCompleto = `${validatedData.nombre} ${validatedData.apellidos}`.trim();
      try {
        await prisma.waitlist.update({
          where: { id: waitlistEntry.id },
          data: {
            nombre: nombreCompleto || waitlistEntry.nombre,
            empresa: validatedData.nombreEmpresa || waitlistEntry.empresa,
          },
        });
      } catch (syncError) {
        console.error('[signupEmpresaAction] Error sincronizando waitlist:', syncError);
      }
    }

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

