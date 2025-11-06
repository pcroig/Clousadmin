/**
 * OAuth Configuration
 * Configuración de proveedores OAuth
 */

import type { OAuthConfig } from "./types";

/**
 * Obtener configuración de Google OAuth
 */
export function getGoogleOAuthConfig(): OAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/api/auth/google/callback`,
  };
}

/**
 * Scopes para Google OAuth (Login)
 */
export const GOOGLE_LOGIN_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
];

/**
 * Scopes para Google Calendar
 */
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

/**
 * Verificar si Google OAuth está configurado
 */
export function isGoogleOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}
