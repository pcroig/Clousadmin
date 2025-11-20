/**
 * OAuth Manager - Gestión centralizada de OAuth 2.0
 *
 * Coordina el flujo OAuth para todos los proveedores:
 * - Generación de URLs de autorización
 * - Intercambio de códigos por tokens
 * - Refresh de tokens
 * - Revocación de tokens
 */

import type { ProviderId, OAuth2Tokens, OAuth2Config } from '../types'
import { IntegrationLogger } from '../utils/logger'
import {
  AuthenticationError,
  IntegrationNotFoundError,
  wrapError,
} from '../utils/errors'
import prisma from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'

const logger = IntegrationLogger.create({
  service: 'integrations',
  component: 'oauth-manager',
})

/**
 * Configuración OAuth por proveedor
 * En producción, estos valores deberían venir de variables de entorno
 */
function getOAuthConfig(providerId: ProviderId): OAuth2Config {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/integrations/oauth/${providerId}/callback`

  // Configuraciones por proveedor
  switch (providerId) {
    case 'slack':
      return {
        authUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        clientId: process.env.SLACK_CLIENT_ID!,
        clientSecret: process.env.SLACK_CLIENT_SECRET!,
        scopes: ['users:read', 'channels:read', 'chat:write'],
        redirectUri,
      }

    case 'google_calendar':
    case 'google_drive':
    case 'google_gmail':
      return {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scopes: getGoogleScopes(providerId),
        redirectUri,
        pkce: true, // Google recomienda PKCE
      }

    case 'microsoft_teams':
    case 'microsoft_calendar':
    case 'microsoft_onedrive':
      return {
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        scopes: getMicrosoftScopes(providerId),
        redirectUri,
      }

    case 'payfit':
      return {
        authUrl: 'https://oauth.payfit.com/authorize',
        tokenUrl: 'https://oauth.payfit.com/token',
        clientId: process.env.PAYFIT_CLIENT_ID!,
        clientSecret: process.env.PAYFIT_CLIENT_SECRET!,
        scopes: ['read:employees', 'read:payslips'],
        redirectUri,
      }

    case 'factorial':
      return {
        authUrl: 'https://app.factorialhr.com/oauth/authorize',
        tokenUrl: 'https://app.factorialhr.com/oauth/token',
        clientId: process.env.FACTORIAL_CLIENT_ID!,
        clientSecret: process.env.FACTORIAL_CLIENT_SECRET!,
        scopes: ['read', 'leaves:read'],
        redirectUri,
      }

    default:
      throw new Error(`OAuth configuration not found for provider: ${providerId}`)
  }
}

/**
 * Helper para obtener scopes de Google
 */
function getGoogleScopes(providerId: ProviderId): string[] {
  switch (providerId) {
    case 'google_calendar':
      return ['https://www.googleapis.com/auth/calendar']
    case 'google_drive':
      return ['https://www.googleapis.com/auth/drive.file']
    case 'google_gmail':
      return ['https://www.googleapis.com/auth/gmail.send']
    default:
      return []
  }
}

/**
 * Helper para obtener scopes de Microsoft
 */
function getMicrosoftScopes(providerId: ProviderId): string[] {
  switch (providerId) {
    case 'microsoft_teams':
      return ['Team.ReadBasic.All', 'Channel.ReadBasic.All', 'ChannelMessage.Send']
    case 'microsoft_calendar':
      return ['Calendars.ReadWrite']
    case 'microsoft_onedrive':
      return ['Files.ReadWrite']
    default:
      return []
  }
}

/**
 * OAuth Manager
 */
export class OAuthManager {
  /**
   * Obtener URL de autorización para iniciar flujo OAuth
   */
  async getAuthorizationUrl(
    providerId: ProviderId,
    empresaId: string,
    usuarioId?: string,
    customState?: Record<string, unknown>
  ): Promise<string> {
    logger.info('Generating OAuth authorization URL', {
      providerId,
      empresaId,
      usuarioId,
    })

    try {
      const config = getOAuthConfig(providerId)

      // Crear state con información necesaria para el callback
      const state = JSON.stringify({
        providerId,
        empresaId,
        usuarioId,
        timestamp: Date.now(),
        ...customState,
      })

      // Encriptar state para seguridad
      const encryptedState = encrypt(state)

      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scopes.join(' '),
        state: encryptedState,
        access_type: 'offline', // Para obtener refresh token (Google)
        prompt: 'consent', // Forzar consentimiento para obtener refresh token
      })

      const authUrl = `${config.authUrl}?${params.toString()}`

      logger.debug('OAuth URL generated', {
        providerId,
        authUrl: config.authUrl, // Solo la URL base
      })

      return authUrl
    } catch (error) {
      logger.error('Failed to generate authorization URL', error as Error, {
        providerId,
      })
      throw wrapError(error, providerId)
    }
  }

  /**
   * Intercambiar código de autorización por tokens
   */
  async exchangeCodeForTokens(
    code: string,
    state: string
  ): Promise<{
    tokens: OAuth2Tokens
    providerId: ProviderId
    empresaId: string
    usuarioId?: string
  }> {
    logger.info('Exchanging authorization code for tokens')

    try {
      // Desencriptar y parsear state
      const decryptedState = decrypt(state)
      const stateData = JSON.parse(decryptedState) as {
        providerId: ProviderId
        empresaId: string
        usuarioId?: string
        timestamp: number
      }

      // Verificar que el state no sea muy antiguo (máx 10 minutos)
      const stateAge = Date.now() - stateData.timestamp
      if (stateAge > 10 * 60 * 1000) {
        throw new AuthenticationError('OAuth state expired', stateData.providerId)
      }

      const { providerId, empresaId, usuarioId } = stateData
      const config = getOAuthConfig(providerId)

      logger.debug('Making token exchange request', { providerId })

      // Hacer petición para intercambiar código por tokens
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
        }).toString(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Token exchange failed', new Error(errorText), {
          providerId,
          status: response.status,
        })
        throw new AuthenticationError(
          `Token exchange failed: ${response.statusText}`,
          providerId
        )
      }

      const data = await response.json()

      const tokens: OAuth2Tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type || 'Bearer',
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scopes: data.scope ? data.scope.split(' ') : config.scopes,
      }

      logger.info('Successfully exchanged code for tokens', {
        providerId,
        hasRefreshToken: !!tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      })

      return {
        tokens,
        providerId,
        empresaId,
        usuarioId,
      }
    } catch (error) {
      logger.error('Failed to exchange code for tokens', error as Error)
      throw wrapError(error)
    }
  }

  /**
   * Refrescar access token
   */
  async refreshAccessToken(integrationId: string): Promise<OAuth2Tokens> {
    logger.info('Refreshing access token', { integrationId })

    try {
      // Obtener integración y token actual
      const integration = await prisma.integracion.findUnique({
        where: { id: integrationId },
        include: { token: true },
      })

      if (!integration) {
        throw new IntegrationNotFoundError(integrationId)
      }

      if (!integration.token) {
        throw new AuthenticationError(
          'No token found for integration',
          integration.proveedor as ProviderId
        )
      }

      const providerId = integration.proveedor as ProviderId
      const config = getOAuthConfig(providerId)

      // Desencriptar refresh token
      const refreshToken = decrypt(integration.token.refreshToken!)

      logger.debug('Making token refresh request', { integrationId, providerId })

      // Hacer petición para refrescar token
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }).toString(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Token refresh failed', new Error(errorText), {
          integrationId,
          providerId,
          status: response.status,
        })
        throw new AuthenticationError(
          `Token refresh failed: ${response.statusText}`,
          providerId
        )
      }

      const data = await response.json()

      const tokens: OAuth2Tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Usar nuevo si existe
        tokenType: data.token_type || 'Bearer',
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scopes: data.scope ? data.scope.split(' ') : integration.token.scopes,
      }

      // Actualizar tokens en DB
      await this.saveTokens(integrationId, tokens)

      logger.info('Successfully refreshed access token', {
        integrationId,
        providerId,
        expiresAt: tokens.expiresAt,
      })

      return tokens
    } catch (error) {
      logger.error('Failed to refresh access token', error as Error, {
        integrationId,
      })
      throw wrapError(error)
    }
  }

  /**
   * Guardar tokens en base de datos
   */
  async saveTokens(integrationId: string, tokens: OAuth2Tokens): Promise<void> {
    logger.debug('Saving tokens to database', { integrationId })

    try {
      // Encriptar tokens
      const encryptedAccessToken = encrypt(tokens.accessToken)
      const encryptedRefreshToken = tokens.refreshToken
        ? encrypt(tokens.refreshToken)
        : null

      // Upsert token
      await prisma.integracionToken.upsert({
        where: { integracionId: integrationId },
        create: {
          integracionId: integrationId,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenType: tokens.tokenType,
          expiresAt: tokens.expiresAt,
          scopes: tokens.scopes,
        },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenType: tokens.tokenType,
          expiresAt: tokens.expiresAt,
          scopes: tokens.scopes,
          lastRefreshed: new Date(),
          refreshCount: { increment: 1 },
        },
      })

      logger.debug('Tokens saved successfully', { integrationId })
    } catch (error) {
      logger.error('Failed to save tokens', error as Error, { integrationId })
      throw wrapError(error)
    }
  }

  /**
   * Revocar tokens
   */
  async revokeTokens(integrationId: string): Promise<void> {
    logger.info('Revoking tokens', { integrationId })

    try {
      // Eliminar tokens de la base de datos
      await prisma.integracionToken.delete({
        where: { integracionId: integrationId },
      })

      logger.info('Tokens revoked successfully', { integrationId })
    } catch (error) {
      logger.error('Failed to revoke tokens', error as Error, { integrationId })
      throw wrapError(error)
    }
  }
}

/**
 * Instancia singleton de OAuth Manager
 */
export const oauthManager = new OAuthManager()
