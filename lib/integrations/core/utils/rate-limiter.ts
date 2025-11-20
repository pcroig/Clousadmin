/**
 * Rate Limiter con algoritmo Token Bucket
 *
 * Controla el rate limiting por proveedor para prevenir exceder
 * los límites de las APIs externas.
 */

import { RATE_LIMITS } from '../constants'
import type { ProviderId } from '../types'
import { RateLimitError } from './errors'
import { logger } from './logger'

/**
 * Bucket de tokens para un proveedor específico
 */
interface TokenBucket {
  tokens: number // Tokens disponibles
  lastRefill: number // Timestamp del último refill
  capacity: number // Capacidad máxima
  refillRate: number // Tokens por segundo
}

/**
 * Rate Limiter usando algoritmo Token Bucket
 */
export class RateLimiter {
  private buckets: Map<ProviderId, TokenBucket> = new Map()
  private readonly defaultCapacity = 10
  private readonly defaultRefillRate = 1 // 1 request por segundo

  /**
   * Obtener o crear bucket para un proveedor
   */
  private getBucket(providerId: ProviderId): TokenBucket {
    let bucket = this.buckets.get(providerId)

    if (!bucket) {
      const refillRate = RATE_LIMITS[providerId] || this.defaultRefillRate
      bucket = {
        tokens: refillRate,
        lastRefill: Date.now(),
        capacity: refillRate * 10, // Capacidad = 10 segundos de requests
        refillRate,
      }
      this.buckets.set(providerId, bucket)

      logger.debug(`Created rate limit bucket for ${providerId}`, {
        providerId,
        capacity: bucket.capacity,
        refillRate: bucket.refillRate,
      })
    }

    return bucket
  }

  /**
   * Refill tokens basado en tiempo transcurrido
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now()
    const timePassed = (now - bucket.lastRefill) / 1000 // Convertir a segundos

    if (timePassed > 0) {
      const tokensToAdd = timePassed * bucket.refillRate
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd)
      bucket.lastRefill = now
    }
  }

  /**
   * Consumir un token del bucket
   */
  private async consumeToken(providerId: ProviderId, cost: number = 1): Promise<void> {
    const bucket = this.getBucket(providerId)
    this.refillBucket(bucket)

    // Si no hay suficientes tokens, esperar
    if (bucket.tokens < cost) {
      const tokensNeeded = cost - bucket.tokens
      const waitTime = (tokensNeeded / bucket.refillRate) * 1000 // Convertir a ms

      logger.debug(`Rate limit: waiting ${waitTime}ms for ${providerId}`, {
        providerId,
        tokensAvailable: bucket.tokens,
        tokensNeeded: cost,
        waitTime,
      })

      // Esperar el tiempo necesario
      await this.sleep(waitTime)

      // Re-refill después de esperar
      this.refillBucket(bucket)
    }

    // Consumir tokens
    bucket.tokens -= cost

    logger.debug(`Rate limit: consumed ${cost} tokens for ${providerId}`, {
      providerId,
      tokensRemaining: bucket.tokens,
      capacity: bucket.capacity,
    })
  }

  /**
   * Ejecutar una función con rate limiting
   */
  async execute<T>(
    providerId: ProviderId,
    fn: () => Promise<T>,
    options?: {
      cost?: number // Costo en tokens (default: 1)
      priority?: 'high' | 'normal' | 'low' // Prioridad (futuro uso)
    }
  ): Promise<T> {
    const cost = options?.cost || 1

    try {
      // Consumir tokens (esto esperará si es necesario)
      await this.consumeToken(providerId, cost)

      // Ejecutar función
      return await fn()
    } catch (error) {
      // Si es un error de rate limit del servidor, actualizar nuestro bucket
      if (error instanceof RateLimitError && error.retryAfter) {
        logger.warn(`Server rate limit hit for ${providerId}, updating bucket`, {
          providerId,
          retryAfter: error.retryAfter,
        })

        // Vaciar tokens y actualizar lastRefill
        const bucket = this.getBucket(providerId)
        bucket.tokens = 0
        bucket.lastRefill = Date.now() + error.retryAfter * 1000
      }

      throw error
    }
  }

  /**
   * Verificar si hay tokens disponibles sin consumir
   */
  canExecute(providerId: ProviderId, cost: number = 1): boolean {
    const bucket = this.getBucket(providerId)
    this.refillBucket(bucket)
    return bucket.tokens >= cost
  }

  /**
   * Obtener información del bucket
   */
  getStatus(providerId: ProviderId): {
    tokensAvailable: number
    capacity: number
    refillRate: number
    percentAvailable: number
  } {
    const bucket = this.getBucket(providerId)
    this.refillBucket(bucket)

    return {
      tokensAvailable: bucket.tokens,
      capacity: bucket.capacity,
      refillRate: bucket.refillRate,
      percentAvailable: (bucket.tokens / bucket.capacity) * 100,
    }
  }

  /**
   * Resetear bucket de un proveedor
   */
  reset(providerId: ProviderId): void {
    this.buckets.delete(providerId)
    logger.info(`Rate limit bucket reset for ${providerId}`, { providerId })
  }

  /**
   * Resetear todos los buckets
   */
  resetAll(): void {
    this.buckets.clear()
    logger.info('All rate limit buckets reset')
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Instancia global de rate limiter
 */
export const rateLimiter = new RateLimiter()

/**
 * Helper para ejecutar con rate limiting
 */
export async function withRateLimit<T>(
  providerId: ProviderId,
  fn: () => Promise<T>,
  options?: {
    cost?: number
    priority?: 'high' | 'normal' | 'low'
  }
): Promise<T> {
  return rateLimiter.execute(providerId, fn, options)
}

/**
 * Decorador para métodos que requieren rate limiting
 */
export function RateLimit(providerId: ProviderId, cost: number = 1) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      return rateLimiter.execute(
        providerId,
        () => originalMethod.apply(this, args),
        { cost }
      )
    }

    return descriptor
  }
}
