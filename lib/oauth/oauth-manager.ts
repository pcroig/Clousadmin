/**
 * OAuth Manager
 * Gestión centralizada de tokens OAuth en la base de datos
 */

import { prisma } from "@/lib/prisma";

import { createOAuthProvider } from "./providers";

import type {
  OAuthConfig,
  OAuthProviderName,
  OAuthTokens,
  StoredOAuthData,
} from "./types";

export class OAuthManager {
  /**
   * Almacenar tokens OAuth en la tabla Account
   */
  static async storeTokens(
    usuarioId: string,
    provider: OAuthProviderName,
    providerUserId: string,
    tokens: OAuthTokens
  ): Promise<void> {
    try {
      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId: providerUserId,
          },
        },
        update: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
          token_type: tokens.token_type,
          scope: tokens.scope,
          id_token: tokens.id_token,
        },
        create: {
          userId: usuarioId,
          type: "oauth",
          provider,
          providerAccountId: providerUserId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
          token_type: tokens.token_type,
          scope: tokens.scope,
          id_token: tokens.id_token,
        },
      });
    } catch (error) {
      console.error("Error storing OAuth tokens:", error);
      throw new Error("Failed to store OAuth tokens");
    }
  }

  /**
   * Obtener tokens OAuth de la base de datos
   */
  static async getTokens(
    usuarioId: string,
    provider: OAuthProviderName
  ): Promise<StoredOAuthData | null> {
    try {
      const account = await prisma.account.findFirst({
        where: {
          userId: usuarioId,
          provider,
        },
      });

      if (!account || !account.access_token) {
        return null;
      }

      return {
        provider,
        providerUserId: account.providerAccountId,
        accessToken: account.access_token,
        refreshToken: account.refresh_token || undefined,
        expiresAt: account.expires_at || undefined,
        scope: account.scope || undefined,
      };
    } catch (error) {
      console.error("Error getting OAuth tokens:", error);
      throw new Error("Failed to get OAuth tokens");
    }
  }

  /**
   * Verificar si un token ha expirado
   */
  static isTokenExpired(expiresAt?: number): boolean {
    if (!expiresAt) return false;

    const now = Math.floor(Date.now() / 1000);
    // Considera expirado si quedan menos de 5 minutos
    return expiresAt - now < 300;
  }

  /**
   * Obtener un access token válido (renovándolo si es necesario)
   */
  static async getValidAccessToken(
    usuarioId: string,
    provider: OAuthProviderName,
    config: OAuthConfig
  ): Promise<string | null> {
    try {
      const storedData = await this.getTokens(usuarioId, provider);

      if (!storedData) {
        return null;
      }

      // Si el token no ha expirado, devolverlo directamente
      if (!this.isTokenExpired(storedData.expiresAt)) {
        return storedData.accessToken;
      }

      // Si no hay refresh token, no se puede renovar
      if (!storedData.refreshToken) {
        console.warn("Access token expired and no refresh token available");
        return null;
      }

      // Renovar el access token
      console.log("Access token expired, refreshing...");
      const oauthProvider = createOAuthProvider(provider, config);
      const newTokens = await oauthProvider.refreshAccessToken(
        storedData.refreshToken
      );

      // Actualizar tokens en BD
      await this.storeTokens(
        usuarioId,
        provider,
        storedData.providerUserId,
        newTokens
      );

      return newTokens.access_token;
    } catch (error) {
      console.error("Error getting valid access token:", error);
      throw new Error("Failed to get valid access token");
    }
  }

  /**
   * Eliminar tokens OAuth (desconectar cuenta)
   */
  static async revokeTokens(
    usuarioId: string,
    provider: OAuthProviderName,
    config: OAuthConfig
  ): Promise<void> {
    try {
      const storedData = await this.getTokens(usuarioId, provider);

      if (!storedData) {
        return;
      }

      // Revocar tokens en el proveedor
      try {
        const oauthProvider = createOAuthProvider(provider, config);
        await oauthProvider.revokeTokens(storedData.accessToken);
      } catch (error) {
        console.error("Error revoking tokens with provider:", error);
        // Continuar para eliminar de BD aunque falle la revocación
      }

      // Eliminar de la base de datos
      await prisma.account.deleteMany({
        where: {
          userId: usuarioId,
          provider,
        },
      });
    } catch (error) {
      console.error("Error revoking OAuth tokens:", error);
      throw new Error("Failed to revoke OAuth tokens");
    }
  }

  /**
   * Verificar si un usuario tiene cuenta OAuth conectada
   */
  static async hasOAuthAccount(
    usuarioId: string,
    provider: OAuthProviderName
  ): Promise<boolean> {
    try {
      const account = await prisma.account.findFirst({
        where: {
          userId: usuarioId,
          provider,
        },
      });

      return !!account;
    } catch (error) {
      console.error("Error checking OAuth account:", error);
      return false;
    }
  }
}
