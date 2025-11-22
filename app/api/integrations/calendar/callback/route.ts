/**
 * Calendar Integration - Callback
 * GET /api/integrations/calendar/callback
 * Callback OAuth para conectar Google Calendar
 */

import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { UsuarioRol } from '@/lib/constants/enums';
import { getGoogleCalendarOAuthConfig } from "@/lib/oauth/config";
import { OAuthManager } from "@/lib/oauth/oauth-manager";
import { createOAuthProvider } from "@/lib/oauth/providers";
import { prisma, Prisma } from "@/lib/prisma";

import type { CalendarIntegrationConfig } from "@/lib/integrations/types";


export async function GET(req: NextRequest) {
  try {
    // Verificar sesión
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(
        new URL("/login?error=session_expired", req.url)
      );
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Determinar URL de integraciones según rol
    let integracionesUrl = "/empleado/settings/integraciones";
    if (session.user.rol === UsuarioRol.hr_admin || session.user.rol === UsuarioRol.platform_admin) {
      integracionesUrl = "/hr/settings/integraciones";
    } else if (session.user.rol === UsuarioRol.manager) {
      integracionesUrl = "/manager/settings";
    }

    // Verificar si hubo error
    if (error) {
      return NextResponse.redirect(
        new URL(
          `${integracionesUrl}?error=calendar_oauth_error`,
          req.url
        )
      );
    }

    // Verificar código
    if (!code) {
      return NextResponse.redirect(
        new URL(
          `${integracionesUrl}?error=missing_code`,
          req.url
        )
      );
    }

    // Verificar state (CSRF protection)
    const savedState = req.cookies.get("calendar_oauth_state")?.value;
    const integrationType = req.cookies.get("calendar_integration_type")?.value || "personal";

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        new URL(
          `${integracionesUrl}?error=invalid_state`,
          req.url
        )
      );
    }

    // Verificar permisos para integración de empresa
    if (
      integrationType === "empresa" &&
      session.user.rol !== UsuarioRol.hr_admin
    ) {
      return NextResponse.redirect(
        new URL(
          `${integracionesUrl}?error=forbidden`,
          req.url
        )
      );
    }

    // Intercambiar código por tokens (usar config específica para calendario)
    const config = getGoogleCalendarOAuthConfig();
    const googleProvider = createOAuthProvider("google", config);
    const tokens = await googleProvider.exchangeCodeForTokens(code);

    // Obtener información del usuario de Google
    const googleUser = await googleProvider.getUserInfo(tokens.access_token);

    // Almacenar tokens OAuth
    await OAuthManager.storeTokens(
      session.user.id,
      "google",
      googleUser.id,
      tokens
    );

    // Usar el calendario primario del usuario en lugar de crear uno nuevo
    // Esto evita problemas con permisos y es más simple para el usuario
    const calendarId = "primary";

    // Crear integración en BD
    const integrationConfig: CalendarIntegrationConfig = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_at,
      scope: tokens.scope,
    };

    // Buscar integración existente
    const existingIntegration = await prisma.integracion.findFirst({
      where: {
        empresaId: session.user.empresaId,
        tipo: "calendario",
        proveedor: "google_calendar",
        usuarioId: integrationType === "personal" ? session.user.id : null,
      },
    });

    if (existingIntegration) {
      // Actualizar integración existente
      await prisma.integracion.update({
        where: { id: existingIntegration.id },
        data: {
          config: integrationConfig as Prisma.InputJsonValue,
          calendarId: calendarId,
          activa: true,
        },
      });
    } else {
      // Crear nueva integración
      await prisma.integracion.create({
        data: {
          empresaId: session.user.empresaId,
          usuarioId: integrationType === "personal" ? session.user.id : null,
          tipo: "calendario",
          proveedor: "google_calendar",
          config: integrationConfig as Prisma.InputJsonValue,
          calendarId: calendarId,
          activa: true,
        },
      });
    }

    // Limpiar cookies
    const response = NextResponse.redirect(
      new URL(`${integracionesUrl}?success=true`, req.url)
    );
    response.cookies.delete("calendar_oauth_state");
    response.cookies.delete("calendar_integration_type");

    return response;
  } catch (error) {
    console.error("Error en callback de calendario:", error);

    // En caso de error, redirigir a login ya que no tenemos sesión aquí
    const response = NextResponse.redirect(
      new URL("/login?error=calendar_failed", req.url)
    );
    response.cookies.delete("calendar_oauth_state");
    response.cookies.delete("calendar_integration_type");

    return response;
  }
}
