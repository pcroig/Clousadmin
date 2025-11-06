/**
 * Google OAuth - Iniciar flujo de autenticación
 * GET /api/auth/google
 */

import { NextRequest, NextResponse } from "next/server";
import { createOAuthProvider } from "@/lib/oauth/providers";
import {
  getGoogleOAuthConfig,
  GOOGLE_LOGIN_SCOPES,
  isGoogleOAuthConfigured,
} from "@/lib/oauth/config";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  try {
    // Verificar que Google OAuth esté configurado
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google OAuth not configured. Please set up GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        },
        { status: 500 }
      );
    }

    // Generar state para CSRF protection
    const state = randomBytes(32).toString("hex");

    // Crear proveedor de Google OAuth
    const config = getGoogleOAuthConfig();
    const googleProvider = createOAuthProvider("google", config);

    // Generar URL de autorización
    const authUrl = googleProvider.getAuthorizationUrl(
      state,
      GOOGLE_LOGIN_SCOPES
    );

    // Guardar state en cookie para verificación posterior
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutos
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error iniciando Google OAuth:", error);

    return NextResponse.json(
      { error: "Failed to initiate Google OAuth" },
      { status: 500 }
    );
  }
}
