'use server';

// ========================================
// Server Actions - Platform Admin Invitations
// ========================================

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { convertirWaitlistEnInvitacion, crearInvitacionSignup } from '@/lib/invitaciones-signup';
import { prisma } from '@/lib/prisma';
import { cancelSubscriptionAtPeriodEnd } from '@/lib/stripe/subscriptions';

const emailSchema = z.object({
  email: z.string().email('Introduce un email válido'),
});

const deactivateCompanySchema = z.object({
  empresaId: z.string().uuid('ID de empresa inválido'),
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

    const company = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        activo: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            cancelAtPeriodEnd: true,
          },
        },
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
      await tx.empresa.update({
        where: { id: empresaId },
        data: { activo: false },
      });

      await tx.usuario.updateMany({
        where: { empresaId },
        data: { activo: false },
      });

      await tx.empleado.updateMany({
        where: { empresaId },
        data: {
          estadoEmpleado: 'suspendido',
          fechaBaja: new Date(),
        },
      });

      await tx.sesionActiva.deleteMany({
        where: {
          usuario: {
            is: { empresaId },
          },
        },
      });
    });

    const activeSubscription = company.subscriptions[0];
    if (activeSubscription && !activeSubscription.cancelAtPeriodEnd) {
      try {
        await cancelSubscriptionAtPeriodEnd(activeSubscription.id);
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



