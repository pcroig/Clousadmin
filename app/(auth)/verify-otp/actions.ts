'use server';

import { cookies, headers } from 'next/headers';

import {
  consumeTwoFactorChallenge,
  createSession,
  validateTwoFactorChallenge,
} from '@/lib/auth';
import {
  decryptTotpSecret,
  verifyBackupCode,
  verifyTotpCode,
} from '@/lib/auth/two-factor';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

import type { SessionData } from '@/types/auth';

const TWO_FACTOR_COOKIE = 'clousadmin-2fa';

interface VerifyOtpState {
  success?: boolean;
  error?: string;
  redirect?: string;
}

function getRedirectPath(rol: UsuarioRol): string {
  switch (rol) {
    case UsuarioRol.hr_admin:
    case UsuarioRol.platform_admin:
      return '/hr/dashboard';
    case UsuarioRol.manager:
      return '/manager/dashboard';
    default:
      return '/empleado/dashboard';
  }
}

export async function verifyOtpAction(
  _prevState: VerifyOtpState,
  formData: FormData
): Promise<VerifyOtpState> {
  try {
    const code = String(formData.get('code') || '').trim();

    if (!code) {
      return { success: false, error: 'Introduce el código de verificación.' };
    }

    const cookieStore = await cookies();
    const pendingToken = cookieStore.get(TWO_FACTOR_COOKIE)?.value;

    if (!pendingToken) {
      return { success: false, error: 'La sesión de verificación expiró. Inicia sesión de nuevo.' };
    }

    const challenge = await validateTwoFactorChallenge(pendingToken);
    if (!challenge) {
      cookieStore.delete(TWO_FACTOR_COOKIE);
      return { success: false, error: 'La sesión de verificación expiró. Inicia sesión de nuevo.' };
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { id: challenge.usuarioId },
      include: {
        empleado: {
          select: { fotoUrl: true },
        },
      },
    });

    if (!usuario || !usuario.totpSecret) {
      cookieStore.delete(TWO_FACTOR_COOKIE);
      await consumeTwoFactorChallenge(pendingToken);
      return { success: false, error: 'No se pudo verificar tu cuenta. Intenta iniciar sesión otra vez.' };
    }

    const secret = decryptTotpSecret(usuario.totpSecret);
    let verified = verifyTotpCode(secret, code);
    let backupCodes = (usuario.backupCodes as string[] | null) ?? null;

    if (!verified && backupCodes) {
      const { valid, remaining } = verifyBackupCode(backupCodes, code);
      if (valid) {
        verified = true;
        backupCodes = remaining;
        await prisma.usuarios.update({
          where: { id: usuario.id },
          data: { backupCodes },
        });
      }
    }

    if (!verified) {
      return { success: false, error: 'Código incorrecto. Intenta de nuevo.' };
    }

    await consumeTwoFactorChallenge(pendingToken);
    cookieStore.delete(TWO_FACTOR_COOKIE);

    await prisma.usuarios.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || undefined;
    const userAgent = headersList.get('user-agent') || undefined;

    const sessionData: SessionData = {
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        rol: usuario.rol,
        empresaId: usuario.empresaId,
        empleadoId: usuario.empleadoId,
        avatar: usuario.empleado?.fotoUrl || usuario.avatar || null,
        activo: usuario.activo,
      },
    };

    await createSession(sessionData, { ipAddress, userAgent });

    return {
      success: true,
      redirect: getRedirectPath(usuario.rol as UsuarioRol),
    };
  } catch (error) {
    console.error('[verifyOtpAction] Error:', error);
    return {
      success: false,
      error: 'No pudimos verificar tu código. Intenta de nuevo.',
    };
  }
}

