'use server';

import { revalidatePath } from 'next/cache';

import { getSession, verifyPassword } from '@/lib/auth';
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateBackupCodes,
  generateTotpQrData,
  generateTotpSecret,
  getTotpUri,
  hashBackupCodes,
  verifyTotpCode,
} from '@/lib/auth/two-factor';
import { prisma } from '@/lib/prisma';
import { JSON_NULL } from '@/lib/prisma/json';

async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function startTwoFactorSetup() {
  const session = await requireSession();
  const secret = generateTotpSecret();
  const encryptedSecret = encryptTotpSecret(secret);
  const otpauthUrl = getTotpUri(session.user.email, secret);
  const qr = await generateTotpQrData(otpauthUrl);

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: {
      totpSecret: encryptedSecret,
      totpEnabled: false,
      backupCodes: JSON_NULL,
    },
  });

  return { secret, qr };
}

export async function confirmTwoFactorSetup(code: string) {
  const session = await requireSession();
  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: {
      totpSecret: true,
    },
  });

  if (!usuario?.totpSecret) {
    return { success: false, error: 'Primero genera el código QR para configurar 2FA.' };
  }

  const secret = decryptTotpSecret(usuario.totpSecret);
  const valid = verifyTotpCode(secret, code);

  if (!valid) {
    return { success: false, error: 'Código inválido. Inténtalo de nuevo.' };
  }

  const backupCodes = generateBackupCodes(10);

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: {
      totpEnabled: true,
      totpEnabledAt: new Date(),
      backupCodes: hashBackupCodes(backupCodes),
    },
  });

  revalidatePath('/configuracion/seguridad');

  return { success: true, backupCodes };
}

export async function regenerateBackupCodesAction() {
  const session = await requireSession();
  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { totpEnabled: true },
  });

  if (!usuario?.totpEnabled) {
    return { success: false, error: 'Activa 2FA antes de generar códigos.' };
  }

  const backupCodes = generateBackupCodes(10);

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { backupCodes: hashBackupCodes(backupCodes) },
  });

  return { success: true, backupCodes };
}

export async function disableTwoFactorAction(password: string) {
  const session = await requireSession();

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: {
      password: true,
    },
  });

  if (!usuario?.password) {
    return { success: false, error: 'No podemos validar tu cuenta.' };
  }

  const validPassword = await verifyPassword(password, usuario.password);
  if (!validPassword) {
    return { success: false, error: 'Contraseña incorrecta.' };
  }

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: {
      totpEnabled: false,
      totpEnabledAt: null,
      totpSecret: null,
      backupCodes: JSON_NULL,
    },
  });

  revalidatePath('/configuracion/seguridad');

  return { success: true };
}

