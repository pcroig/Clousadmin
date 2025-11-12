'use server';

// ========================================
// Onboarding Server Actions
// ========================================

import { prisma, Prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sedeCreateSchema, integracionCreateSchema } from '@/lib/validaciones/schemas';
import { crearInvitacion } from '@/lib/invitaciones';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { UsuarioRol } from '@/lib/constants/enums';

/**
 * Helper function to safely convert values to Prisma JSON input
 */
function toJsonValue<T extends Record<string, unknown>>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

/**
 * Crear una nueva sede para la empresa
 */
type AsignacionSedeInput = {
  tipo: 'empresa' | 'equipo';
  equipoId?: string;
};

export async function crearSedeAction({
  ciudad,
  asignacion,
}: {
  ciudad: string;
  asignacion?: AsignacionSedeInput;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    const validatedData = sedeCreateSchema.parse({
      ciudad,
      empresaId: session.user.empresaId,
      asignacion,
    });

    // Auto-generar nombre desde ciudad
    const nombre = `Sede ${validatedData.ciudad}`;

    const sede = await prisma.sede.create({
      data: {
        empresaId: validatedData.empresaId,
        nombre,
        ciudad: validatedData.ciudad,
      },
      include: {
        equipos: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    // Aplicar asignación inicial si procede
    if (validatedData.asignacion?.tipo === 'empresa') {
      await prisma.equipo.updateMany({
        where: {
          empresaId: session.user.empresaId,
        },
        data: {
          sedeId: sede.id,
        },
      });
    }

    if (validatedData.asignacion?.tipo === 'equipo') {
      if (!validatedData.asignacion.equipoId) {
        return {
          success: false,
          error: 'Debes seleccionar un equipo para asignar la sede',
        };
      }

      const equipo = await prisma.equipo.findFirst({
        where: {
          id: validatedData.asignacion.equipoId,
          empresaId: session.user.empresaId,
        },
      });

      if (!equipo) {
        return {
          success: false,
          error: 'Equipo no encontrado o sin permisos',
        };
      }

      await prisma.equipo.update({
        where: { id: equipo.id },
        data: {
          sedeId: sede.id,
        },
      });
    }

    const sedeActualizada = await prisma.sede.findUnique({
      where: { id: sede.id },
      include: {
        equipos: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    revalidatePath('/onboarding/cargar-datos');

    return {
      success: true,
      sede: sedeActualizada ?? sede,
    };
  } catch (error) {
    console.error('[crearSedeAction] Error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Error de validación',
      };
    }

    return {
      success: false,
      error: 'Error al crear la sede',
    };
  }
}

/**
 * Asignar una sede a toda la empresa o a un equipo específico
 */
export async function asignarSedeAction(
  sedeId: string,
  asignacion: AsignacionSedeInput
) {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    const sede = await prisma.sede.findFirst({
      where: {
        id: sedeId,
        empresaId: session.user.empresaId,
      },
      include: {
        equipos: {
          select: { id: true },
        },
      },
    });

    if (!sede) {
      return {
        success: false,
        error: 'Sede no encontrada',
      };
    }

    if (asignacion.tipo === 'empresa') {
      await prisma.equipo.updateMany({
        where: {
          empresaId: session.user.empresaId,
        },
        data: {
          sedeId: sede.id,
        },
      });
    } else {
      if (!asignacion.equipoId) {
        return {
          success: false,
          error: 'Equipo requerido para la asignación',
        };
      }

      const equipo = await prisma.equipo.findFirst({
        where: {
          id: asignacion.equipoId,
          empresaId: session.user.empresaId,
        },
      });

      if (!equipo) {
        return {
          success: false,
          error: 'Equipo no encontrado o sin permisos',
        };
      }

      await prisma.equipo.update({
        where: { id: equipo.id },
        data: {
          sedeId: sede.id,
        },
      });
    }

    const sedeActualizada = await prisma.sede.findUnique({
      where: { id: sede.id },
      include: {
        equipos: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    revalidatePath('/onboarding/cargar-datos');

    return {
      success: true,
      sede: sedeActualizada ?? sede,
    };
  } catch (error) {
    console.error('[asignarSedeAction] Error:', error);
    return {
      success: false,
      error: 'Error al asignar la sede',
    };
  }
}

/**
 * Eliminar una sede
 */
export async function eliminarSedeAction(sedeId: string) {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    // Verificar que la sede pertenece a la empresa del usuario
    const sede = await prisma.sede.findFirst({
      where: {
        id: sedeId,
        empresaId: session.user.empresaId,
      },
    });

    if (!sede) {
      return {
        success: false,
        error: 'Sede no encontrada',
      };
    }

    await prisma.sede.delete({
      where: { id: sedeId },
    });

    revalidatePath('/onboarding/cargar-datos');

    return {
      success: true,
    };
  } catch (error) {
    console.error('[eliminarSedeAction] Error:', error);
    return {
      success: false,
      error: 'Error al eliminar la sede',
    };
  }
}

/**
 * Configurar una integración
 */
export async function configurarIntegracionAction(
  tipo: 'calendario' | 'comunicacion' | 'nominas',
  proveedor: string,
  config?: Record<string, unknown>
) {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    const validatedData = integracionCreateSchema.parse({
      tipo,
      proveedor,
      config,
      empresaId: session.user.empresaId,
    });

    // Buscar si ya existe una integración con estos parámetros
    const existingIntegration = await prisma.integracion.findFirst({
      where: {
        empresaId: validatedData.empresaId,
        tipo: validatedData.tipo,
        proveedor: validatedData.proveedor,
        usuarioId: null, // Solo integraciones de empresa
      },
    });

    // Crear o actualizar la integración
    const integracion = existingIntegration
      ? await prisma.integracion.update({
          where: { id: existingIntegration.id },
          data: {
            config: toJsonValue(validatedData.config || {}),
            activa: true,
          },
        })
      : await prisma.integracion.create({
          data: {
            empresaId: validatedData.empresaId,
            tipo: validatedData.tipo,
            proveedor: validatedData.proveedor,
            config: toJsonValue(validatedData.config || {}),
            activa: true,
          },
        });

    revalidatePath('/onboarding/cargar-datos');

    return {
      success: true,
      integracion,
    };
  } catch (error) {
    console.error('[configurarIntegracionAction] Error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Error de validación',
      };
    }

    return {
      success: false,
      error: 'Error al configurar la integración',
    };
  }
}

/**
 * Invitar a un HR Admin adicional
 */
export async function invitarHRAdminAction(email: string, nombre: string, apellidos: string) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return {
        success: false,
        error: 'No tienes permisos para invitar HR admins',
      };
    }

    // Verificar que el email no exista
    const existingUser = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Ya existe un usuario con este email',
      };
    }

    // Crear usuario y empleado en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear usuario sin password (será establecida en el onboarding)
      const usuario = await tx.usuario.create({
        data: {
          email: email.toLowerCase(),
          nombre,
          apellidos,
          empresaId: session.user.empresaId,
          rol: UsuarioRol.hr_admin,
          emailVerificado: false,
          activo: false, // Se activará cuando acepte la invitación
        },
      });

      // 2. Crear empleado asociado
      const empleado = await tx.empleado.create({
        data: {
          usuarioId: usuario.id,
          empresaId: session.user.empresaId,
          nombre,
          apellidos,
          email: email.toLowerCase(),
          fechaAlta: new Date(),
          onboardingCompletado: false,
          activo: false,
        },
      });

      // 3. Vincular empleado al usuario
      await tx.usuario.update({
        where: { id: usuario.id },
        data: { empleadoId: empleado.id },
      });

      return { usuario, empleado };
    });

    // 4. Crear invitación
    const invitacion = await crearInvitacion(
      result.empleado.id,
      session.user.empresaId,
      email.toLowerCase()
    );

    revalidatePath('/onboarding/cargar-datos');

    return {
      success: true,
      invitacionUrl: invitacion.url,
    };
  } catch (error) {
    console.error('[invitarHRAdminAction] Error:', error);
    return {
      success: false,
      error: 'Error al enviar la invitación',
    };
  }
}

/**
 * Completar el onboarding y redirigir al dashboard
 */
export async function completarOnboardingAction() {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    // Marcar el onboarding como completado para el empleado
    if (session.user.empleadoId) {
      await prisma.empleado.update({
        where: { id: session.user.empleadoId },
        data: {
          onboardingCompletado: true,
          onboardingCompletadoEn: new Date(),
        },
      });
    }

    revalidatePath('/');
    revalidatePath('/hr/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('[completarOnboardingAction] Error:', error);
    return {
      success: false,
      error: 'Error al completar el onboarding',
    };
  }
}

