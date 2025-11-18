/**
 * Google OAuth - Callback
 * GET /api/auth/google/callback
 * Recibe el código de autorización de Google y crea la sesión
 */

import { NextRequest, NextResponse } from "next/server";
import { createOAuthProvider } from "@/lib/oauth/providers";
import { getGoogleOAuthConfig } from "@/lib/oauth/config";
import { OAuthManager } from "@/lib/oauth/oauth-manager";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionData } from "@/types/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Verificar si hubo error en la autorización
    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/login?error=oauth_error`, req.url)
      );
    }

    // Verificar código de autorización
    if (!code) {
      return NextResponse.redirect(
        new URL(`/login?error=missing_code`, req.url)
      );
    }

    // Verificar state (CSRF protection)
    const savedState = req.cookies.get("oauth_state")?.value;
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        new URL(`/login?error=invalid_state`, req.url)
      );
    }

    // Crear proveedor de Google OAuth
    const config = getGoogleOAuthConfig();
    const googleProvider = createOAuthProvider("google", config);

    // Intercambiar código por tokens
    const tokens = await googleProvider.exchangeCodeForTokens(code);

    // Obtener información del usuario de Google
    const googleUser = await googleProvider.getUserInfo(tokens.access_token);

    // Validar que tengamos la información necesaria
    if (!googleUser.email) {
      console.error("Google OAuth: No email returned from Google");
      return NextResponse.redirect(
        new URL(`/login?error=oauth_error&message=No email provided by Google`, req.url)
      );
    }

    // Verificar que el email esté verificado
    if (!googleUser.verified_email) {
      return NextResponse.redirect(
        new URL(`/login?error=email_not_verified`, req.url)
      );
    }

    // Buscar usuario existente por email o googleId
    let usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: googleUser.email.toLowerCase() },
          { googleId: googleUser.id },
        ],
      },
      include: {
        empleado: true,
      },
    });

    if (usuario) {
      // Usuario existe - vincular Google ID si no está vinculado
      if (!usuario.googleId) {
        usuario = await prisma.usuario.update({
          where: { id: usuario.id },
          data: { googleId: googleUser.id },
          include: { empleado: true },
        });
      }

      // Verificar que el usuario esté activo
      if (!usuario.activo) {
        return NextResponse.redirect(
          new URL(`/login?error=user_inactive`, req.url)
        );
      }

      // Actualizar último acceso
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { ultimoAcceso: new Date() },
      });
    } else {
      // Usuario no existe - en un sistema multi-tenant con invitaciones,
      // no creamos usuarios automáticamente
      // Redirigir a login con mensaje de que necesita ser invitado
      const emailParam = googleUser.email
        ? `&email=${encodeURIComponent(googleUser.email)}`
        : "";
      return NextResponse.redirect(
        new URL(`/login?error=no_account${emailParam}`, req.url)
      );
    }

    // Almacenar tokens OAuth en la tabla Account
    await OAuthManager.storeTokens(
      usuario.id,
      "google",
      googleUser.id,
      tokens
    );

    // Obtener avatar del empleado si existe
    let avatarUrl: string | null = null;
    if (usuario.empleadoId) {
      try {
        const empleado = await prisma.empleado.findUnique({
          where: { id: usuario.empleadoId },
          select: { fotoUrl: true },
        });
        avatarUrl = empleado?.fotoUrl || null;
      } catch (avatarError) {
        console.error('[Google OAuth] Error obteniendo avatar del empleado:', avatarError);
      }
    }

    // Crear sesión JWT (reutilizando el sistema actual)
    const sessionData: SessionData = {
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        rol: usuario.rol,
        empresaId: usuario.empresaId,
        empleadoId: usuario.empleadoId || null,
        avatar: avatarUrl, // Usar empleado.fotoUrl como fuente de verdad
        activo: usuario.activo,
      },
    };

    // Obtener metadata de la request
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    await createSession(sessionData, { ipAddress, userAgent });

    // Redirigir según rol del usuario
    let dashboardUrl = "/empleado/dashboard"; // Default
    if (usuario.rol === "hr_admin") {
      dashboardUrl = "/hr/dashboard";
    } else if (usuario.rol === "manager") {
      dashboardUrl = "/manager/dashboard";
    } else if (usuario.rol === "platform_admin") {
      dashboardUrl = "/hr/dashboard"; // Platform admin usa el dashboard de HR
    }

    // Limpiar cookie de state
    const response = NextResponse.redirect(new URL(dashboardUrl, req.url));
    response.cookies.delete("oauth_state");

    return response;
  } catch (error) {
    console.error("[Google OAuth Callback] Error:", error);

    // Limpiar cookie de state
    const response = NextResponse.redirect(
      new URL(`/login?error=oauth_error`, req.url)
    );
    response.cookies.delete("oauth_state");

    return response;
  }
}
