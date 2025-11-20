/**
 * NextAuth catch-all route
 * - Handles Google OAuth login flow
 * - Creates Clousadmin session after successful OAuth callback
 */

import { headers } from 'next/headers';
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import { createSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { OAuthManager } from '@/lib/oauth/oauth-manager';
import { prisma } from '@/lib/prisma';

import type { SessionData } from '@/types/auth';

function assertGoogleConfig() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
    );
  }
}

function getDashboardRedirect(rol: UsuarioRol): string {
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

const handler = NextAuth({
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      try {
        assertGoogleConfig();

        if (!account || account.provider !== 'google') {
          return '/login?error=oauth_error';
        }

        if (!profile?.email) {
          return '/login?error=missing_email';
        }

        if (!(profile as { email_verified?: boolean }).email_verified) {
          return '/login?error=email_not_verified';
        }

        const email = profile.email.toLowerCase();

        let usuario = await prisma.usuario.findUnique({
          where: { email },
          include: {
            empleado: {
              select: { fotoUrl: true },
            },
          },
        });

        if (!usuario) {
          return `/login?error=no_account&email=${encodeURIComponent(email)}`;
        }

        if (!usuario.activo) {
          return '/login?error=user_inactive';
        }

        if (!usuario.googleId || usuario.googleId !== account.providerAccountId) {
          try {
            usuario = await prisma.usuario.update({
              where: { id: usuario.id },
              data: { googleId: account.providerAccountId },
              include: {
                empleado: {
                  select: { fotoUrl: true },
                },
              },
            });
          } catch (linkError) {
            console.error('[NextAuth] Error linking googleId:', linkError);
          }
        }

        // Guardar tokens OAuth si tenemos información
        if (account.access_token) {
          try {
            await OAuthManager.storeTokens(usuario.id, 'google', account.providerAccountId!, {
              access_token: account.access_token,
              refresh_token: account.refresh_token ?? undefined,
              expires_at: account.expires_at ?? undefined,
              token_type: account.token_type ?? undefined,
              scope: account.scope ?? undefined,
              id_token: account.id_token ?? undefined,
            });
          } catch (storeError) {
            console.error('[NextAuth] Error storing OAuth tokens:', storeError);
          }
        }

        // Actualizar último acceso
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { ultimoAcceso: new Date() },
        });

        const headersList = headers();
        const ipAddress = headersList.get('x-forwarded-for') || undefined;
        const userAgent = headersList.get('user-agent') || undefined;

        const avatarUrl =
          usuario.empleado?.fotoUrl ||
          usuario.avatar ||
          null;

        const sessionData: SessionData = {
          user: {
            id: usuario.id,
            email: usuario.email,
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            rol: usuario.rol,
            empresaId: usuario.empresaId,
            empleadoId: usuario.empleadoId || null,
            avatar: avatarUrl,
            activo: usuario.activo,
          },
        };

        await createSession(sessionData, { ipAddress, userAgent });

        return getDashboardRedirect(usuario.rol);
      } catch (error) {
        console.error('[NextAuth] signIn error:', error);
        return '/login?error=oauth_error';
      }
    },
  },
});

export { handler as GET, handler as POST };

