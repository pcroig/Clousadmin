/**
 * Google OAuth entrypoint & API login
 * - GET: Redirige a NextAuth (para flujo web)
 * - POST: Login programático con credential (para apps externas)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createSession } from '@/lib/auth';
import { getGoogleOAuthConfig } from '@/lib/oauth/config';
import { GoogleOAuthProvider } from '@/lib/oauth/providers/google';
import { prisma } from '@/lib/prisma';
import { getClientIP, rateLimitLogin } from '@/lib/rate-limit';

import type { SessionData } from '@/types/auth';

const credentialSchema = z.object({
  credential: z.string().min(10, 'Token de Google inválido'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credential } = credentialSchema.parse(body);

    const headersList = req.headers;
    const clientIP = getClientIP(headersList);

    const provider = new GoogleOAuthProvider(getGoogleOAuthConfig());
    const tokenPayload = await provider.verifyIdToken(credential);

    const email = tokenPayload.email?.toLowerCase();
    const googleSub = tokenPayload.sub;

    if (!email || !googleSub) {
      return NextResponse.json(
        { error: 'No pudimos obtener tu email de Google. Inténtalo de nuevo.' },
        { status: 400 }
      );
    }

    const rateLimitIdentifier = `google:${email}:${clientIP}`;
    const rateLimitResult = await rateLimitLogin(rateLimitIdentifier);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error:
            'Demasiados intentos de inicio de sesión con Google. Inténtalo de nuevo más tarde.',
          retryAfter: rateLimitResult.retryAfter ?? 60,
        },
        { status: 429 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        empleado: {
          select: { id: true, fotoUrl: true },
        },
        empresa: {
          select: { activo: true },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json(
        {
          error:
            'No existe una cuenta con este email. Necesitas una invitación válida para usar Clousadmin.',
        },
        { status: 401 }
      );
    }

    if (!usuario.activo || usuario.empresa?.activo === false) {
      return NextResponse.json(
        { error: 'Tu cuenta está inactiva. Contacta con tu administrador.' },
        { status: 403 }
      );
    }

    if (!usuario.googleId || usuario.googleId !== googleSub) {
      try {
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { googleId: googleSub },
        });
      } catch (linkError) {
        console.error('[Google OAuth API] Error vinculando googleId:', linkError);
      }
    }

    let empleadoId = usuario.empleadoId ?? usuario.empleado?.id ?? null;
    if (!empleadoId) {
      try {
        const empleadoRelacionado = await prisma.empleado.findUnique({
          where: { usuarioId: usuario.id },
          select: { id: true },
        });

        if (empleadoRelacionado?.id) {
          await prisma.usuario.update({
            where: { id: usuario.id },
            data: { empleadoId: empleadoRelacionado.id },
          });
          empleadoId = empleadoRelacionado.id;
        }
      } catch (linkError) {
        console.error('[Google OAuth API] Error sincronizando empleadoId:', linkError);
      }
    }

    const avatarUrl = usuario.empleado?.fotoUrl ?? usuario.avatar ?? null;

    try {
      await prisma.sesionActiva.deleteMany({
        where: { usuarioId: usuario.id },
      });
    } catch (sessionError) {
      console.error('[Google OAuth API] Error invalidando sesiones anteriores:', sessionError);
    }

    const sessionData: SessionData = {
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        rol: usuario.rol,
        empresaId: usuario.empresaId,
        empleadoId,
        avatar: avatarUrl,
        activo: usuario.activo,
      },
    };

    const sessionToken = await createSession(sessionData, {
      ipAddress: clientIP,
      userAgent: headersList.get('user-agent') || undefined,
    });

    console.info(`[Google OAuth API] Login exitoso - ${usuario.email}`);

    return NextResponse.json({
      token: sessionToken,
      user: sessionData.user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      );
    }

    console.error('[Google OAuth API] Error:', error);
    return NextResponse.json(
      { error: 'No se pudo autenticar con Google' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        {
          error:
            'Google OAuth not configured. Please set up GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
        },
        { status: 500 }
      );
    }

    const nextAuthUrl = new URL('/api/auth/signin/google', req.url);

    const callbackUrl = req.nextUrl.searchParams.get('callbackUrl');
    if (callbackUrl) {
      nextAuthUrl.searchParams.set('callbackUrl', callbackUrl);
    }

    return NextResponse.redirect(nextAuthUrl);
  } catch (error) {
    console.error('[Google OAuth] Error redirecting to NextAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google OAuth' },
      { status: 500 }
    );
  }
}
