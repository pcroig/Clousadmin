/**
 * BaseOAuthProvider - Clase base para proveedores con OAuth 2.0
 *
 * Extiende BaseProvider con funcionalidad OAuth completa incluyendo
 * autorización, intercambio de tokens, y refresh automático.
 */

import { BaseProvider } from './provider'
import type {
  IOAuthProvider,
  OAuth2Config,
  OAuth2Tokens,
  RequestOptions,
  ApiResponse,
} from '../types'
import {
  AuthenticationError,
  TokenExpiredError,
  TokenRefreshError,
  wrapError,
} from '../utils/errors'

/**
 * Clase base abstracta para proveedores con OAuth 2.0
 */
export abstract class BaseOAuthProvider extends BaseProvider implements IOAuthProvider {
  /** Configuración OAuth (debe ser implementada por cada proveedor) */
  protected abstract getOAuthConfig(): OAuth2Config

  /** Tokens OAuth actuales */
  protected tokens?: OAuth2Tokens

  /**
   * Obtener URL de autorización OAuth
   */
  async getAuthorizationUrl(state?: string): Promise<string> {
    const oauthConfig = this.getOAuthConfig()

    const params = new URLSearchParams({
      client_id: oauthConfig.clientId,
      redirect_uri: oauthConfig.redirectUri,
      response_type: 'code',
      scope: oauthConfig.scopes.join(' '),
      ...(state && { state }),
      ...(oauthConfig.state && { state: oauthConfig.state }),
    })

    // PKCE si está habilitado
    if (oauthConfig.pkce) {
      const { codeChallenge, codeVerifier } = await this.generatePKCE()
      params.append('code_challenge', codeChallenge)
      params.append('code_challenge_method', 'S256')

      // Guardar code_verifier para usarlo en el exchange
      // (En implementación real, guardar en sesión o estado temporal)
      this.logger.debug('PKCE enabled for OAuth flow', { codeChallenge })
    }

    const authUrl = `${oauthConfig.authUrl}?${params.toString()}`

    this.logger.info('Generated OAuth authorization URL', {
      authUrl: authUrl.split('?')[0], // Log solo la URL base por seguridad
      scopes: oauthConfig.scopes,
    })

    return authUrl
  }

  /**
   * Intercambiar código de autorización por tokens
   */
  async exchangeCodeForTokens(code: string): Promise<OAuth2Tokens> {
    const oauthConfig = this.getOAuthConfig()

    this.logger.info('Exchanging authorization code for tokens')

    try {
      const body: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        redirect_uri: oauthConfig.redirectUri,
      }

      // Agregar code_verifier si se usó PKCE
      if (oauthConfig.pkce) {
        // En implementación real, recuperar de sesión
        // body.code_verifier = savedCodeVerifier
      }

      const response = await this.makeTokenRequest<{
        access_token: string
        refresh_token?: string
        token_type: string
        expires_in: number
        scope?: string
      }>(oauthConfig.tokenUrl, body)

      if (!response.success || !response.data) {
        throw new AuthenticationError(
          'Failed to exchange code for tokens',
          this.providerId,
          response.error
        )
      }

      const { access_token, refresh_token, token_type, expires_in, scope } = response.data

      const tokens: OAuth2Tokens = {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenType: token_type || 'Bearer',
        expiresAt: new Date(Date.now() + expires_in * 1000),
        scopes: scope ? scope.split(' ') : oauthConfig.scopes,
      }

      this.tokens = tokens

      this.logger.info('Successfully exchanged code for tokens', {
        hasRefreshToken: !!tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
      })

      return tokens
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens', error as Error)
      throw wrapError(error, this.providerId)
    }
  }

  /**
   * Refrescar access token usando refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuth2Tokens> {
    const oauthConfig = this.getOAuthConfig()

    this.logger.info('Refreshing access token')

    try {
      const body = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
      }

      const response = await this.makeTokenRequest<{
        access_token: string
        refresh_token?: string
        token_type: string
        expires_in: number
        scope?: string
      }>(oauthConfig.tokenUrl, body)

      if (!response.success || !response.data) {
        throw new TokenRefreshError(
          'Failed to refresh access token',
          this.providerId,
          response.error
        )
      }

      const { access_token, refresh_token, token_type, expires_in, scope } = response.data

      const tokens: OAuth2Tokens = {
        accessToken: access_token,
        refreshToken: refresh_token || refreshToken, // Usar el nuevo si existe, sino mantener el anterior
        tokenType: token_type || 'Bearer',
        expiresAt: new Date(Date.now() + expires_in * 1000),
        scopes: scope ? scope.split(' ') : oauthConfig.scopes,
      }

      this.tokens = tokens

      this.logger.info('Successfully refreshed access token', {
        expiresAt: tokens.expiresAt,
        hasNewRefreshToken: refresh_token !== undefined,
      })

      return tokens
    } catch (error) {
      this.logger.error('Failed to refresh access token', error as Error)
      throw wrapError(error, this.providerId)
    }
  }

  /**
   * Revocar tokens
   */
  async revokeTokens(): Promise<void> {
    this.ensureInitialized()

    if (!this.tokens) {
      this.logger.warn('No tokens to revoke')
      return
    }

    this.logger.info('Revoking OAuth tokens')

    try {
      // Implementación específica del proveedor
      await this.performTokenRevocation(this.tokens)

      this.tokens = undefined

      this.logger.info('Successfully revoked tokens')
    } catch (error) {
      this.logger.error('Failed to revoke tokens', error as Error)
      throw wrapError(error, this.providerId)
    }
  }

  /**
   * Realizar revocación de tokens (debe ser implementado por subclases si soportado)
   */
  protected async performTokenRevocation(tokens: OAuth2Tokens): Promise<void> {
    // Por defecto, solo limpiar tokens localmente
    // Subclases pueden override para hacer revocación real
    this.logger.debug('Default token revocation (no server-side revocation)')
  }

  /**
   * Obtener access token válido (refrescar si es necesario)
   */
  protected async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new AuthenticationError(
        'No tokens available. Please authenticate first.',
        this.providerId
      )
    }

    // Verificar si el token está próximo a expirar (margen de 5 minutos)
    const expiresIn = this.tokens.expiresAt.getTime() - Date.now()
    const needsRefresh = expiresIn < 5 * 60 * 1000 // 5 minutos

    if (needsRefresh) {
      if (!this.tokens.refreshToken) {
        throw new TokenExpiredError(
          'Access token expired and no refresh token available',
          this.providerId
        )
      }

      this.logger.debug('Access token expiring soon, refreshing', {
        expiresIn,
        expiresAt: this.tokens.expiresAt,
      })

      await this.refreshAccessToken(this.tokens.refreshToken)
    }

    return this.tokens.accessToken
  }

  /**
   * Override de getDefaultHeaders para incluir Authorization
   */
  protected getDefaultHeaders(): Record<string, string> {
    const headers = super.getDefaultHeaders()

    if (this.tokens) {
      headers['Authorization'] = `${this.tokens.tokenType} ${this.tokens.accessToken}`
    }

    return headers
  }

  /**
   * Hacer petición a token endpoint
   */
  private async makeTokenRequest<T>(
    url: string,
    body: Record<string, string>
  ): Promise<ApiResponse<T>> {
    // No usar makeRequest aquí para evitar rate limiting en token requests
    return await this.executeRequest<T>({
      method: 'POST',
      url,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    })
  }

  /**
   * Generar PKCE (Proof Key for Code Exchange)
   */
  private async generatePKCE(): Promise<{
    codeVerifier: string
    codeChallenge: string
  }> {
    // Generar code_verifier aleatorio
    const codeVerifier = this.generateRandomString(128)

    // Generar code_challenge (SHA-256 del verifier)
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    const hash = await crypto.subtle.digest('SHA-256', data)
    const codeChallenge = this.base64URLEncode(hash)

    return { codeVerifier, codeChallenge }
  }

  /**
   * Generar string aleatorio
   */
  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    const values = crypto.getRandomValues(new Uint8Array(length))
    return Array.from(values)
      .map((x) => possible[x % possible.length])
      .join('')
  }

  /**
   * Base64 URL encode
   */
  private base64URLEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  /**
   * Establecer tokens (útil cuando se cargan desde DB)
   */
  setTokens(tokens: OAuth2Tokens): void {
    this.tokens = tokens
    this.logger.debug('Tokens set', {
      hasRefreshToken: !!tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    })
  }

  /**
   * Obtener tokens actuales
   */
  getTokens(): OAuth2Tokens | undefined {
    return this.tokens
  }
}
