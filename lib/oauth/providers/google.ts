/**
 * Google OAuth Provider
 * Implementa el flujo OAuth 2.0 para Google
 */

import { OAuth2Client } from "google-auth-library";
import type {
  OAuthProvider,
  OAuthTokens,
  OAuthUserInfo,
  OAuthConfig,
} from "../types";

export class GoogleOAuthProvider implements OAuthProvider {
  name = "google" as const;
  private client: OAuth2Client;
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Generar URL de autorización OAuth
   */
  getAuthorizationUrl(state: string, scopes: string[]): string {
    const url = this.client.generateAuthUrl({
      access_type: "offline", // Para obtener refresh token
      prompt: "consent", // Forzar consent screen para refresh token
      scope: scopes,
      state,
    });

    return url;
  }

  /**
   * Intercambiar código de autorización por tokens
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    try {
      const { tokens } = await this.client.getToken(code);

      return {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || undefined,
        expires_at: tokens.expiry_date
          ? Math.floor(tokens.expiry_date / 1000)
          : undefined,
        token_type: tokens.token_type || undefined,
        scope: tokens.scope || undefined,
        id_token: tokens.id_token || undefined,
      };
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      throw new Error("Failed to exchange authorization code for tokens");
    }
  }

  /**
   * Renovar access token usando refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      this.client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.client.refreshAccessToken();

      return {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || refreshToken, // Google puede no devolver nuevo refresh token
        expires_at: credentials.expiry_date
          ? Math.floor(credentials.expiry_date / 1000)
          : undefined,
        token_type: credentials.token_type || undefined,
        scope: credentials.scope || undefined,
        id_token: credentials.id_token || undefined,
      };
    } catch (error) {
      console.error("Error refreshing access token:", error);
      throw new Error("Failed to refresh access token");
    }
  }

  /**
   * Obtener información del usuario de Google
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      this.client.setCredentials({
        access_token: accessToken,
      });

      // Obtener información del usuario usando el access token
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user info from Google");
      }

      const data = await response.json();

      // Validar que tengamos datos mínimos requeridos
      if (!data.id) {
        throw new Error("Google API did not return user ID");
      }

      if (!data.email) {
        throw new Error("Google API did not return user email");
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name || undefined,
        picture: data.picture || undefined,
        verified_email: data.verified_email || false,
      };
    } catch (error) {
      console.error("Error getting user info:", error);
      throw new Error("Failed to get user info from Google");
    }
  }

  /**
   * Revocar tokens (logout)
   */
  async revokeTokens(token: string): Promise<void> {
    try {
      await this.client.revokeToken(token);
    } catch (error) {
      console.error("Error revoking token:", error);
      throw new Error("Failed to revoke token");
    }
  }

  /**
   * Verificar ID token de Google
   */
  async verifyIdToken(idToken: string): Promise<{
    email: string;
    sub: string;
    name?: string;
    picture?: string;
  }> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.config.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new Error("Invalid ID token payload");
      }

      return {
        email: payload.email!,
        sub: payload.sub,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (error) {
      console.error("Error verifying ID token:", error);
      throw new Error("Failed to verify ID token");
    }
  }
}
