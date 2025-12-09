'use server';

// ========================================
// Server Actions - Platform Admin Invitations
// ========================================

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { convertirWaitlistEnInvitacion, crearInvitacionSignup } from '@/lib/invitaciones-signup';
import { hasSubscriptionTable } from '@/lib/platform/subscriptions';
import { prisma } from '@/lib/prisma';
import { cancelSubscriptionAtPeriodEnd } from '@/lib/stripe/subscriptions';
import { idSchema } from '@/lib/validaciones/schemas';

const emailSchema = z.object({
  email: z.string().email('Introduce un email válido'),
});

const deactivateCompanySchema = z.object({
  empresaId: idSchema,
});

const reactivateCompanySchema = z.object({
  empresaId: idSchema,
});

const deleteCompanySchema = z.object({
  empresaId: idSchema,
});

type ActionResult = {
  success: boolean;
  error?: string;
  url?: string;
};

async function assertPlatformAdmin() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.platform_admin) {
    throw new Error('No autorizado');
  }

  return session;
}

export async function generarInvitacionSignupAction(email: string): Promise<ActionResult> {
  try {
    const session = await assertPlatformAdmin();
    const { email: validatedEmail } = emailSchema.parse({ email });

    const result = await crearInvitacionSignup(validatedEmail, session.user.email);

    if (!result.success || !result.url) {
      return {
        success: false,
        error: result.error || 'No se pudo crear la invitación',
      };
    }

    revalidatePath('/platform/invitaciones');

    return {
      success: true,
      url: result.url,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Email inválido',
      };
    }

    console.error('[generarInvitacionSignupAction] Error:', error);
    return {
      success: false,
      error: 'Error al crear la invitación',
    };
  }
}

export async function convertirWaitlistEntryAction(email: string): Promise<ActionResult> {
  try {
    const session = await assertPlatformAdmin();
    const { email: validatedEmail } = emailSchema.parse({ email });

    const result = await convertirWaitlistEnInvitacion(validatedEmail, session.user.email);

    if (!result.success || !result.url) {
      return {
        success: false,
        error: result.error || 'No se pudo convertir la waitlist',
      };
    }

    revalidatePath('/platform/invitaciones');

    return {
      success: true,
      url: result.url,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Email inválido',
      };
    }

    console.error('[convertirWaitlistEntryAction] Error:', error);
    return {
      success: false,
      error: 'Error al convertir la waitlist',
    };
  }
}

export async function deactivateCompanyAction(rawEmpresaId: string): Promise<ActionResult> {
  try {
    await assertPlatformAdmin();
    const { empresaId } = deactivateCompanySchema.parse({ empresaId: rawEmpresaId });

    const company = await prisma.empresas.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        activo: true,
      },
    });

    if (!company) {
      return {
        success: false,
        error: 'Empresa no encontrada',
      };
    }

    if (!company.activo) {
      return {
        success: false,
        error: 'La empresa ya está inactiva',
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.empresas.update({
        where: { id: empresaId },
        data: { activo: false },
      });

      await tx.usuarios.updateMany({
        where: { empresaId },
        data: { activo: false },
      });

      await tx.empleados.updateMany({
        where: { empresaId },
        data: {
          estadoEmpleado: 'suspendido',
          fechaBaja: new Date(),
        },
      });

      await tx.sesiones_activas.deleteMany({
        where: {
          usuario: {
            is: { empresaId },
          },
        },
      });
    });

    // Si las suscripciones están activas, cancelar la suscripción en Stripe
    const includeSubscriptions = await hasSubscriptionTable();
    if (includeSubscriptions) {
      try {
        const activeSubscription = await prisma.subscriptions.findFirst({
          where: { empresaId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            cancelAtPeriodEnd: true,
          },
        });

        if (activeSubscription && !activeSubscription.cancelAtPeriodEnd) {
          await cancelSubscriptionAtPeriodEnd(activeSubscription.id);
        }
      } catch (error) {
        console.error('[deactivateCompanyAction] Error cancelando suscripción en Stripe:', error);
      }
    }

    revalidatePath('/platform/invitaciones');

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message ?? 'Datos inválidos',
      };
    }

    console.error('[deactivateCompanyAction] Error:', error);
    return {
      success: false,
      error: 'No se pudo desactivar la empresa',
    };
  }
}

export async function reactivateCompanyAction(rawEmpresaId: string): Promise<ActionResult> {
  try {
    await assertPlatformAdmin();
    const { empresaId } = reactivateCompanySchema.parse({ empresaId: rawEmpresaId });

    const company = await prisma.empresas.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        activo: true,
        deletedAt: true,
      },
    });

    if (!company) {
      return {
        success: false,
        error: 'Empresa no encontrada',
      };
    }

    if (company.deletedAt) {
      return {
        success: false,
        error: 'No se puede reactivar una empresa eliminada',
      };
    }

    if (company.activo) {
      return {
        success: false,
        error: 'La empresa ya está activa',
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.empresas.update({
        where: { id: empresaId },
        data: { activo: true },
      });

      await tx.usuarios.updateMany({
        where: { empresaId },
        data: { activo: true },
      });

      await tx.empleados.updateMany({
        where: {
          empresaId,
          estadoEmpleado: 'suspendido',
        },
        data: {
          estadoEmpleado: 'activo',
          fechaBaja: null,
        },
      });
    });

    revalidatePath('/platform/invitaciones');

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message ?? 'Datos inválidos',
      };
    }

    console.error('[reactivateCompanyAction] Error:', error);
    return {
      success: false,
      error: 'No se pudo reactivar la empresa',
    };
  }
}

export async function deleteCompanyAction(rawEmpresaId: string): Promise<ActionResult> {
  try {
    await assertPlatformAdmin();
    const { empresaId } = deleteCompanySchema.parse({ empresaId: rawEmpresaId });

    const company = await prisma.empresas.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        activo: true,
        deletedAt: true,
      },
    });

    if (!company) {
      return {
        success: false,
        error: 'Empresa no encontrada',
      };
    }

    if (company.deletedAt) {
      return {
        success: false,
        error: 'La empresa ya está eliminada',
      };
    }

    if (company.activo) {
      return {
        success: false,
        error: 'Debes suspender la empresa antes de eliminarla',
      };
    }

    await prisma.empresas.update({
      where: { id: empresaId },
      data: { deletedAt: new Date() },
    });

    revalidatePath('/platform/invitaciones');

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message ?? 'Datos inválidos',
      };
    }

    console.error('[deleteCompanyAction] Error:', error);
    return {
      success: false,
      error: 'No se pudo eliminar la empresa',
    };
  }
}



