/**
 * Sistema de manejo de errores para integraciones
 *
 * Define clases de error personalizadas para diferentes escenarios
 * de integración, facilitando el manejo y debugging.
 */

import { ERROR_CODES, type ErrorCode } from '../constants'
import type { ProviderId } from '../types'

/**
 * Error base para integraciones
 */
export class IntegrationError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public providerId?: ProviderId,
    public statusCode?: number,
    public retryable: boolean = false,
    public cause?: Error
  ) {
    super(message)
    this.name = 'IntegrationError'

    // Mantener stack trace original
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      providerId: this.providerId,
      statusCode: this.statusCode,
      retryable: this.retryable,
      cause: this.cause?.message,
    }
  }
}

/**
 * Error de autenticación
 */
export class AuthenticationError extends IntegrationError {
  constructor(
    message: string,
    providerId?: ProviderId,
    cause?: Error
  ) {
    super(message, ERROR_CODES.AUTH_FAILED, providerId, 401, false, cause)
    this.name = 'AuthenticationError'
  }
}

/**
 * Error de token expirado
 */
export class TokenExpiredError extends IntegrationError {
  constructor(
    message: string = 'Token has expired',
    providerId?: ProviderId,
    cause?: Error
  ) {
    super(message, ERROR_CODES.TOKEN_EXPIRED, providerId, 401, true, cause)
    this.name = 'TokenExpiredError'
  }
}

/**
 * Error de refresh de token
 */
export class TokenRefreshError extends IntegrationError {
  constructor(
    message: string,
    providerId?: ProviderId,
    cause?: Error
  ) {
    super(message, ERROR_CODES.TOKEN_REFRESH_FAILED, providerId, 401, false, cause)
    this.name = 'TokenRefreshError'
  }
}

/**
 * Error de credenciales inválidas
 */
export class InvalidCredentialsError extends IntegrationError {
  constructor(
    message: string,
    providerId?: ProviderId,
    cause?: Error
  ) {
    super(message, ERROR_CODES.INVALID_CREDENTIALS, providerId, 401, false, cause)
    this.name = 'InvalidCredentialsError'
  }
}

/**
 * Error de red
 */
export class NetworkError extends IntegrationError {
  constructor(
    message: string,
    providerId?: ProviderId,
    cause?: Error
  ) {
    super(message, ERROR_CODES.NETWORK_ERROR, providerId, undefined, true, cause)
    this.name = 'NetworkError'
  }
}

/**
 * Error de timeout
 */
export class TimeoutError extends IntegrationError {
  constructor(
    message: string,
    providerId?: ProviderId,
    cause?: Error
  ) {
    super(message, ERROR_CODES.TIMEOUT, providerId, 408, true, cause)
    this.name = 'TimeoutError'
  }
}

/**
 * Error de rate limit
 */
export class RateLimitError extends IntegrationError {
  constructor(
    message: string,
    providerId?: ProviderId,
    public retryAfter?: number,
    cause?: Error
  ) {
    super(message, ERROR_CODES.RATE_LIMITED, providerId, 429, true, cause)
    this.name = 'RateLimitError'
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    }
  }
}

/**
 * Error de API
 */
export class ApiError extends IntegrationError {
  constructor(
    message: string,
    providerId?: ProviderId,
    statusCode?: number,
    public response?: unknown,
    cause?: Error
  ) {
    super(
      message,
      ERROR_CODES.API_ERROR,
      providerId,
      statusCode,
      statusCode ? statusCode >= 500 : false,
      cause
    )
    this.name = 'ApiError'
  }

  toJSON() {
    return {
      ...super.toJSON(),
      response: this.response,
    }
  }
}

/**
 * Error de recurso no encontrado
 */
export class ResourceNotFoundError extends IntegrationError {
  constructor(
    resource: string,
    providerId?: ProviderId,
    cause?: Error
  ) {
    super(
      `Resource not found: ${resource}`,
      ERROR_CODES.RESOURCE_NOT_FOUND,
      providerId,
      404,
      false,
      cause
    )
    this.name = 'ResourceNotFoundError'
  }
}

/**
 * Error de permisos
 */
export class PermissionDeniedError extends IntegrationError {
  constructor(
    message: string,
    providerId?: ProviderId,
    cause?: Error
  ) {
    super(message, ERROR_CODES.PERMISSION_DENIED, providerId, 403, false, cause)
    this.name = 'PermissionDeniedError'
  }
}

/**
 * Error de sincronización
 */
export class SyncError extends IntegrationError {
  constructor(
    message: string,
    providerId?: ProviderId,
    public partial: boolean = false,
    cause?: Error
  ) {
    super(
      message,
      partial ? ERROR_CODES.SYNC_PARTIAL : ERROR_CODES.SYNC_FAILED,
      providerId,
      undefined,
      true,
      cause
    )
    this.name = 'SyncError'
  }

  toJSON() {
    return {
      ...super.toJSON(),
      partial: this.partial,
    }
  }
}

/**
 * Error de webhook
 */
export class WebhookError extends IntegrationError {
  constructor(
    message: string,
    providerId?: ProviderId,
    cause?: Error
  ) {
    super(message, ERROR_CODES.WEBHOOK_VALIDATION_FAILED, providerId, 400, false, cause)
    this.name = 'WebhookError'
  }
}

/**
 * Error de configuración
 */
export class ConfigurationError extends IntegrationError {
  constructor(
    message: string,
    providerId?: ProviderId,
    cause?: Error
  ) {
    super(message, ERROR_CODES.CONFIGURATION_ERROR, providerId, 500, false, cause)
    this.name = 'ConfigurationError'
  }
}

/**
 * Error de proveedor no encontrado
 */
export class ProviderNotFoundError extends IntegrationError {
  constructor(
    providerId: ProviderId,
    cause?: Error
  ) {
    super(
      `Provider not found: ${providerId}`,
      ERROR_CODES.PROVIDER_NOT_FOUND,
      providerId,
      404,
      false,
      cause
    )
    this.name = 'ProviderNotFoundError'
  }
}

/**
 * Error de integración no encontrada
 */
export class IntegrationNotFoundError extends IntegrationError {
  constructor(
    integrationId: string,
    cause?: Error
  ) {
    super(
      `Integration not found: ${integrationId}`,
      ERROR_CODES.INTEGRATION_NOT_FOUND,
      undefined,
      404,
      false,
      cause
    )
    this.name = 'IntegrationNotFoundError'
  }
}

/**
 * Determinar si un error es retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof IntegrationError) {
    return error.retryable
  }

  // Errores de red comunes
  const retryableMessages = [
    'ETIMEDOUT',
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    'EPIPE',
    'socket hang up',
  ]

  return retryableMessages.some((msg) =>
    error.message.toLowerCase().includes(msg.toLowerCase())
  )
}

/**
 * Extraer mensaje de error user-friendly
 */
export function getUserFriendlyMessage(error: Error): string {
  if (error instanceof AuthenticationError) {
    return 'Error de autenticación. Por favor, reconecta la integración.'
  }

  if (error instanceof TokenExpiredError) {
    return 'La sesión ha expirado. Por favor, reconecta la integración.'
  }

  if (error instanceof RateLimitError) {
    return 'Se ha alcanzado el límite de peticiones. Por favor, intenta más tarde.'
  }

  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return 'Error de conexión. Por favor, verifica tu conexión a internet.'
  }

  if (error instanceof PermissionDeniedError) {
    return 'No tienes permisos suficientes. Contacta con soporte.'
  }

  if (error instanceof ResourceNotFoundError) {
    return 'El recurso solicitado no existe.'
  }

  if (error instanceof SyncError) {
    return 'Error al sincronizar datos. Los datos pueden estar incompletos.'
  }

  if (error instanceof IntegrationError) {
    return error.message
  }

  return 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.'
}

/**
 * Convertir error nativo a IntegrationError
 */
export function wrapError(error: unknown, providerId?: ProviderId): IntegrationError {
  if (error instanceof IntegrationError) {
    return error
  }

  if (error instanceof Error) {
    // Detectar tipos específicos de error por mensaje
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return new AuthenticationError(error.message, providerId, error)
    }

    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return new RateLimitError(error.message, providerId, undefined, error)
    }

    if (error.message.includes('timeout')) {
      return new TimeoutError(error.message, providerId, error)
    }

    if (
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ENOTFOUND')
    ) {
      return new NetworkError(error.message, providerId, error)
    }

    return new IntegrationError(
      error.message,
      ERROR_CODES.API_ERROR,
      providerId,
      undefined,
      isRetryableError(error),
      error
    )
  }

  return new IntegrationError(
    String(error),
    ERROR_CODES.API_ERROR,
    providerId,
    undefined,
    false
  )
}
