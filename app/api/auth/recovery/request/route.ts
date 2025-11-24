import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateRecoveryToken } from '@/lib/auth';
import { sendPasswordRecoveryEmail } from '@/lib/emails/password-recovery';
import { prisma } from '@/lib/prisma';
import { getClientIP, rateLimitLogin } from '@/lib/rate-limit';
import { getJsonBody } from '@/lib/utils/json';

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await getJsonBody<Record<string, unknown>>(req);
    const { email } = requestSchema.parse(body);
    const normalizedEmail = email.toLowerCase();

    const headersList = await headers();
    const clientIP = getClientIP(headersList);
    const rateIdentifier = `pwd-recovery:${normalizedEmail}:${clientIP}`;
    const rateResult = await rateLimitLogin(rateIdentifier);

    if (!rateResult.success) {
      return NextResponse.json(
        { success: false, error: 'rate_limit', retryAfter: rateResult.retryAfter ?? 60 },
        { status: 429 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (usuario) {
      try {
        const { token } = await generateRecoveryToken(usuario.id);
        await sendPasswordRecoveryEmail({
          email: usuario.email,
          token,
        });
      } catch (error) {
        console.error('[Password Recovery] Error sending email:', error);
        // No revelamos errores al usuario para evitar enumeración
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Password Recovery] Request error:', error);
    return NextResponse.json(
      { success: false, error: 'invalid_request' },
      { status: 400 }
    );
  }
}

