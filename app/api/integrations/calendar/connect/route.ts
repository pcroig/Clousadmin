/**
 * Calendar Integration - Connect
 * GET /api/integrations/calendar/connect
 * Iniciar flujo OAuth para conectar Google Calendar
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createOAuthProvider } from "@/lib/oauth/providers";
import {
  getGoogleCalendarOAuthConfig,
  GOOGLE_CALENDAR_SCOPES,
  GOOGLE_LOGIN_SCOPES,
} from "@/lib/oauth/config";
import { randomBytes } from "crypto";

import { UsuarioRol } from '@/lib/constants/enums';

export async function GET(req: NextRequest) {
  try {
    // Verificar sesión
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener tipo de integración (empresa o personal)
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "personal"; // 'personal' o 'empresa'

    // Verificar permisos
    if (type === "empresa" && session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: "Only HR admins can connect company calendar" },
        { status: 403 }
      );
    }

    // Generar state para CSRF protection
    const state = randomBytes(32).toString("hex");

    // Crear proveedor OAuth (usar config específica para calendario)
    const config = getGoogleCalendarOAuthConfig();
    const googleProvider = createOAuthProvider("google", config);

    // Scopes necesarios: login + calendar
    const scopes = [...GOOGLE_LOGIN_SCOPES, ...GOOGLE_CALENDAR_SCOPES];

    // Generar URL de autorización
    const authUrl = googleProvider.getAuthorizationUrl(state, scopes);

    // Guardar state y tipo en cookie
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("calendar_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutos
      path: "/",
    });
    response.cookies.set("calendar_integration_type", type, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error iniciando conexión de calendario:", error);
    return NextResponse.json(
      { error: "Failed to initiate calendar connection" },
      { status: 500 }
    );
  }
}
