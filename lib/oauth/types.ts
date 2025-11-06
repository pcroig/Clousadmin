/**
 * OAuth System Types
 * Tipos compartidos para el sistema de OAuth modular
 */

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // Unix timestamp
  token_type?: string;
  scope?: string;
  id_token?: string;
}

export interface OAuthUserInfo {
  id: string; // Provider user ID (e.g., Google sub)
  email: string;
  name?: string;
  picture?: string;
  verified_email?: boolean;
}

export interface OAuthProvider {
  /** Nombre del proveedor (google, microsoft, etc.) */
  name: string;

  /** Generar URL de autorización OAuth */
  getAuthorizationUrl(state: string, scopes: string[]): string;

  /** Intercambiar código de autorización por tokens */
  exchangeCodeForTokens(code: string): Promise<OAuthTokens>;

  /** Renovar access token usando refresh token */
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;

  /** Obtener información del usuario del proveedor */
  getUserInfo(accessToken: string): Promise<OAuthUserInfo>;

  /** Revocar tokens (logout) */
  revokeTokens(token: string): Promise<void>;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export type OAuthProviderName = "google" | "microsoft";

export interface StoredOAuthData {
  provider: OAuthProviderName;
  providerUserId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
}
