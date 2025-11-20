/**
 * BaseApiProvider - Clase base para proveedores con API Key
 *
 * Extiende BaseProvider para proveedores que usan autenticación
 * por API Key en lugar de OAuth 2.0
 */

import { BaseProvider } from './provider'
import type { ApiKeyCredentials, BasicCredentials } from '../types'
import { InvalidCredentialsError } from '../utils/errors'

/**
 * Clase base para proveedores que usan API Key
 */
export abstract class BaseApiProvider extends BaseProvider {
  /** Credenciales de API */
  protected credentials?: ApiKeyCredentials | BasicCredentials

  /**
   * Establecer credenciales de API
   */
  setCredentials(credentials: ApiKeyCredentials | BasicCredentials): void {
    this.credentials = credentials

    this.logger.debug('Credentials set', {
      type: 'apiKey' in credentials ? 'apiKey' : 'basic',
      hasSecret: 'apiSecret' in credentials && !!credentials.apiSecret,
    })
  }

  /**
   * Obtener credenciales
   */
  protected getCredentials(): ApiKeyCredentials | BasicCredentials {
    if (!this.credentials) {
      throw new InvalidCredentialsError(
        'No credentials set. Call setCredentials() first.',
        this.providerId
      )
    }

    return this.credentials
  }

  /**
   * Override de getDefaultHeaders para incluir autenticación
   */
  protected getDefaultHeaders(): Record<string, string> {
    const headers = super.getDefaultHeaders()

    if (!this.credentials) {
      return headers
    }

    // API Key authentication
    if ('apiKey' in this.credentials) {
      // Cada proveedor puede tener su propio formato
      // Este es el formato más común, pero puede ser override
      headers['Authorization'] = `Bearer ${this.credentials.apiKey}`

      // Algunos proveedores usan headers custom
      // Ejemplo: headers['X-API-Key'] = this.credentials.apiKey
    }
    // Basic authentication
    else if ('username' in this.credentials && 'password' in this.credentials) {
      const encoded = btoa(`${this.credentials.username}:${this.credentials.password}`)
      headers['Authorization'] = `Basic ${encoded}`
    }

    return headers
  }

  /**
   * Método helper para proveedores con headers custom de API key
   */
  protected getApiKeyHeader(headerName: string): Record<string, string> {
    const credentials = this.getCredentials() as ApiKeyCredentials

    return {
      [headerName]: credentials.apiKey,
      ...(credentials.apiSecret && {
        [`${headerName}-Secret`]: credentials.apiSecret,
      }),
    }
  }

  /**
   * Verificar si las credenciales son válidas
   */
  protected async validateCredentials(): Promise<boolean> {
    try {
      // Health check verificará las credenciales
      return await this.healthCheck()
    } catch (error) {
      this.logger.error('Credentials validation failed', error as Error)
      return false
    }
  }

  /**
   * Health check (debe ser implementado por subclases)
   */
  protected abstract healthCheck(): Promise<boolean>
}
