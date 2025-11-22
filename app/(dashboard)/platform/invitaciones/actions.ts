'use server';

// ========================================
// Server Actions - Platform Admin Invitations
// ========================================

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { convertirWaitlistEnInvitacion, crearInvitacionSignup } from '@/lib/invitaciones-signup';

const emailSchema = z.object({
  email: z.string().email('Introduce un email válido'),
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



