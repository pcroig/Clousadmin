import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  consumeRecoveryToken,
  hashPassword,
  invalidateAllUserSessions,
  validateRecoveryToken,
} from '@/lib/auth';
import { sendPasswordResetConfirmationEmail } from '@/lib/emails/password-recovery';
import { prisma } from '@/lib/prisma';

const resetSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, any>;
    const { token, password } = resetSchema.parse(body);

    const validation = await validateRecoveryToken(token);
    if (!validation) {
      return NextResponse.json(
        { success: false, error: 'invalid_or_expired' },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: validation.usuarioId },
      select: { id: true, email: true },
    });

    if (!usuario) {
      await consumeRecoveryToken(token);
      return NextResponse.json(
        { success: false, error: 'invalid_or_expired' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { password: hashedPassword },
    });

    await invalidateAllUserSessions(usuario.id);
    await consumeRecoveryToken(token);

    try {
      await sendPasswordResetConfirmationEmail(usuario.email);
    } catch (emailError) {
      console.error('[Password Recovery] Error sending confirmation email:', emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Password Recovery] Reset error:', error);
    return NextResponse.json(
      { success: false, error: 'invalid_request' },
      { status: 400 }
    );
  }
}

