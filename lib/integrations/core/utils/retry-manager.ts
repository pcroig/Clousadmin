/**
 * Sistema de reintentos con backoff exponencial
 *
 * Implementa lógica de reintentos inteligente para manejar errores
 * transitorios de red, rate limiting, y otros errores recuperables.
 */

import type { RetryOptions, RetryFunction } from '../types'
import { DEFAULT_RETRY_OPTIONS, PROVIDER_RETRY_OPTIONS } from '../constants'
import { isRetryableError, RateLimitError, IntegrationError } from './errors'
import { logger } from './logger'
import type { ProviderId } from '../types'

export class RetryManager {
  private options: RetryOptions

  constructor(
    providerId?: ProviderId,
    customOptions?: Partial<RetryOptions>
  ) {
    // Usar opciones específicas del proveedor si existen, sino las por defecto
    const providerOptions = providerId ? PROVIDER_RETRY_OPTIONS[providerId] : undefined
    this.options = {
      ...DEFAULT_RETRY_OPTIONS,
      ...providerOptions,
      ...customOptions,
    }
  }

  /**
   * Ejecutar función con reintentos automáticos
   */
  async execute<T>(
    fn: RetryFunction<T>,
    context?: {
      operation?: string
      providerId?: ProviderId
      [key: string]: unknown
    }
  ): Promise<T> {
    let lastError: Error | undefined
    let attempt = 0

    const operationName = context?.operation || 'operation'
    const logContext = {
      ...context,
      maxAttempts: this.options.maxAttempts,
    }

    while (attempt < this.options.maxAttempts) {
      attempt++

      try {
        logger.debug(`${operationName} attempt ${attempt}/${this.options.maxAttempts}`, logContext)

        const result = await fn()

        if (attempt > 1) {
          logger.info(`${operationName} succeeded after ${attempt} attempts`, logContext)
        }

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        const isRetryable = this.shouldRetry(lastError, attempt)

        logger.warn(
          `${operationName} failed on attempt ${attempt}/${this.options.maxAttempts}`,
          {
            ...logContext,
            error: lastError.message,
            retryable: isRetryable,
            willRetry: isRetryable && attempt < this.options.maxAttempts,
          }
        )

        // Si no es retryable o es el último intento, lanzar error
        if (!isRetryable || attempt >= this.options.maxAttempts) {
          logger.error(
            `${operationName} failed after ${attempt} attempts`,
            lastError,
            logContext
          )
          throw lastError
        }

        // Calcular delay para el siguiente intento
        const delay = this.calculateDelay(attempt, lastError)

        logger.debug(
          `Waiting ${delay}ms before retry ${attempt + 1}`,
          { ...logContext, delay }
        )

        await this.sleep(delay)
      }
    }

    // Este código no debería alcanzarse, pero TypeScript lo requiere
    throw lastError || new Error('Max retry attempts reached')
  }

  /**
   * Determinar si el error debería ser reintentado
   */
  private shouldRetry(error: Error, attempt: number): boolean {
    // Si ya alcanzamos el máximo de intentos, no reintentar
    if (attempt >= this.options.maxAttempts) {
      return false
    }

    // Si es un error de rate limit, siempre reintentar (con delay)
    if (error instanceof RateLimitError) {
      return true
    }

    // Si es un IntegrationError con flag retryable
    if (error instanceof IntegrationError) {
      return error.retryable
    }

    // Si el error está en la lista de errores retryables
    if (this.options.retryableErrors) {
      return this.options.retryableErrors.some((retryableError) =>
        error.message.includes(retryableError) ||
        error.name.includes(retryableError)
      )
    }

    // Usar la función general de detección
    return isRetryableError(error)
  }

  /**
   * Calcular delay para el siguiente intento (backoff exponencial)
   */
  private calculateDelay(attempt: number, error: Error): number {
    // Si es rate limit error con retryAfter, usarlo
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000 // Convertir a milisegundos
    }

    // Backoff exponencial: initialDelay * (backoffMultiplier ^ (attempt - 1))
    const exponentialDelay =
      this.options.initialDelay * Math.pow(this.options.backoffMultiplier, attempt - 1)

    // Limitar al máximo delay
    const cappedDelay = Math.min(exponentialDelay, this.options.maxDelay)

    // Agregar jitter (variación aleatoria del ±20%) para evitar thundering herd
    const jitter = cappedDelay * 0.2 * (Math.random() - 0.5) * 2
    const delayWithJitter = Math.max(0, cappedDelay + jitter)

    return Math.floor(delayWithJitter)
  }

  /**
   * Sleep promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Obtener información de configuración actual
   */
  getConfig(): RetryOptions {
    return { ...this.options }
  }
}

/**
 * Helper para ejecutar con reintentos (sin crear instancia)
 */
export async function withRetry<T>(
  fn: RetryFunction<T>,
  options?: {
    providerId?: ProviderId
    retryOptions?: Partial<RetryOptions>
    context?: Record<string, unknown>
  }
): Promise<T> {
  const retryManager = new RetryManager(options?.providerId, options?.retryOptions)
  return retryManager.execute(fn, options?.context)
}

/**
 * Decorador para métodos que deberían tener reintentos automáticos
 */
export function Retry(options?: {
  providerId?: ProviderId
  retryOptions?: Partial<RetryOptions>
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const retryManager = new RetryManager(options?.providerId, options?.retryOptions)

      return retryManager.execute(
        () => originalMethod.apply(this, args),
        {
          operation: `${target.constructor.name}.${propertyKey}`,
          providerId: options?.providerId,
        }
      )
    }

    return descriptor
  }
}
