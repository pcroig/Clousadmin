// ========================================
// Rate Limiting System
// ========================================
// Rate limiting con Redis en producción y fallback a memoria (Map) en desarrollo/test
// Soporta sincronización multi-instancia en producción

import { redis } from './redis';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// Configuración de límites por tipo de request
const RATE_LIMITS = {
  login: {
    window: 10 * 1000, // 10 segundos
    max: 5, // 5 intentos
  },
  loginHourly: {
    window: 60 * 60 * 1000, // 1 hora
    max: 20, // 20 intentos
  },
  api: {
    window: 60 * 1000, // 1 minuto
    max: 100, // 100 requests
  },
  apiWrite: {
    window: 60 * 1000, // 1 minuto  
    max: 50, // 50 requests (POST/PATCH/DELETE)
  },
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

// Storage en memoria (Map) - Usado solo en desarrollo/test
const rateLimitStore = new Map<string, RateLimitEntry>();

// Determinar si usar Redis o Map
const USE_REDIS = process.env.NODE_ENV === 'production' || process.env.FORCE_REDIS === 'true';

/**
 * Limpiar entradas expiradas del store (ejecutar periódicamente)
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Ejecutar limpieza cada 5 minutos
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Rate limiting con Redis (producción)
 */
async function rateLimitRedis(
  key: string,
  config: { window: number; max: number },
  now: number
): Promise<RateLimitResult> {
  try {
    // Usar Redis para rate limiting con comandos atómicos
    const ttlSeconds = Math.ceil(config.window / 1000);
    
    // INCR es atómico - incrementa y retorna el nuevo valor
    const count = await redis.incr(key);
    
    if (count === 1) {
      // Primera request en esta ventana - setear TTL
      await redis.expire(key, ttlSeconds);
    }
    
    const resetAt = now + config.window;
    
    if (count > config.max) {
      // Límite excedido
      const ttl = await redis.ttl(key);
      const retryAfter = Math.max(1, ttl);
      
      return {
        success: false,
        limit: config.max,
        remaining: 0,
        reset: resetAt,
        retryAfter,
      };
    }
    
    // Dentro del límite
    return {
      success: true,
      limit: config.max,
      remaining: config.max - count,
      reset: resetAt,
    };
  } catch (error) {
    // Si Redis falla, permitir request (fail-open)
    console.error('[Rate Limit Redis] Error, allowing request:', error);
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now(),
    };
  }
}

/**
 * Rate limiting con Map (desarrollo/test)
 */
function rateLimitMap(
  key: string,
  config: { window: number; max: number },
  now: number
): RateLimitResult {
  // Obtener entrada existente o crear nueva
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Nueva ventana o expirada
    const resetAt = now + config.window;
    rateLimitStore.set(key, { count: 1, resetAt });
    
    return {
      success: true,
      limit: config.max,
      remaining: config.max - 1,
      reset: resetAt,
    };
  }

  // Incrementar contador
  entry.count++;
  rateLimitStore.set(key, entry);

  if (entry.count > config.max) {
    // Límite excedido
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    
    return {
      success: false,
      limit: config.max,
      remaining: 0,
      reset: entry.resetAt,
      retryAfter,
    };
  }

  // Dentro del límite
  return {
    success: true,
    limit: config.max,
    remaining: config.max - entry.count,
    reset: entry.resetAt,
  };
}

/**
 * Rate limiting principal
 * @param identifier - Identificador único (IP, email, IP+email, etc.)
 * @param type - Tipo de rate limit a aplicar
 * @returns Resultado con success, remaining, retryAfter
 */
export async function rateLimit(
  identifier: string,
  type: RateLimitType = 'api'
): Promise<RateLimitResult> {
  try {
    const config = RATE_LIMITS[type];
    const now = Date.now();
    const key = `ratelimit:${type}:${identifier}`;

    // Usar Redis en producción, Map en desarrollo/test
    if (USE_REDIS) {
      return await rateLimitRedis(key, config, now);
    } else {
      return rateLimitMap(key, config, now);
    }
  } catch (error) {
    // Fallback: si falla el rate limiting, permitir request
    // En producción, loggear este error para investigar
    console.error('[Rate Limit] Error, allowing request:', error);
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now(),
    };
  }
}

/**
 * Rate limit específico para login (multi-ventana)
 * Aplica límite de 10s Y límite de 1h
 */
export async function rateLimitLogin(identifier: string): Promise<RateLimitResult> {
  // Primero verificar límite de 10 segundos
  const shortTermResult = await rateLimit(identifier, 'login');
  if (!shortTermResult.success) {
    return shortTermResult;
  }

  // Luego verificar límite de 1 hora
  const longTermResult = await rateLimit(identifier, 'loginHourly');
  if (!longTermResult.success) {
    return longTermResult;
  }

  // Ambos límites ok
  return shortTermResult;
}

/**
 * Rate limit para APIs de escritura (POST/PATCH/DELETE)
 */
export async function rateLimitApiWrite(identifier: string): Promise<RateLimitResult> {
  return rateLimit(identifier, 'apiWrite');
}

/**
 * Rate limit para APIs de lectura (GET)
 */
export async function rateLimitApi(identifier: string): Promise<RateLimitResult> {
  return rateLimit(identifier, 'api');
}

/**
 * Obtener IP del request (helper)
 * Soporta x-forwarded-for, x-real-ip, etc.
 * Acepta Headers o ReadonlyHeaders (Next.js 16)
 */
export function getClientIP(headers: Pick<Headers, 'get'>): string {
  // Prioridad: x-forwarded-for > x-real-ip > x-client-ip > fallback
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const clientIp = headers.get('x-client-ip');
  if (clientIp) {
    return clientIp;
  }

  // Fallback para desarrollo local
  return 'unknown-ip';
}

/**
 * Reset rate limit para un identificador específico
 * Útil para testing o para resetear después de verificación exitosa
 */
export async function resetRateLimit(identifier: string, type: RateLimitType = 'api'): Promise<void> {
  const key = `ratelimit:${type}:${identifier}`;
  
  if (USE_REDIS) {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('[Rate Limit] Error resetting Redis key:', error);
    }
  } else {
    rateLimitStore.delete(key);
  }
}

/**
 * Obtener estadísticas actuales de rate limit
 * Útil para debugging y monitoreo
 */
export async function getRateLimitStats(identifier: string, type: RateLimitType = 'api'): Promise<{
  attempts: number;
  remaining: number;
  resetAt: number | null;
}> {
  const key = `ratelimit:${type}:${identifier}`;
  const config = RATE_LIMITS[type];

  if (USE_REDIS) {
    try {
      const count = await redis.get(key);
      const ttl = await redis.ttl(key);
      
      if (!count || ttl <= 0) {
        return {
          attempts: 0,
          remaining: config.max,
          resetAt: null,
        };
      }
      
      const attempts = parseInt(count, 10);
      return {
        attempts,
        remaining: Math.max(0, config.max - attempts),
        resetAt: Date.now() + (ttl * 1000),
      };
    } catch (error) {
      console.error('[Rate Limit] Error getting Redis stats:', error);
      return {
        attempts: 0,
        remaining: config.max,
        resetAt: null,
      };
    }
  } else {
    const entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetAt < Date.now()) {
      return {
        attempts: 0,
        remaining: config.max,
        resetAt: null,
      };
    }

    return {
      attempts: entry.count,
      remaining: Math.max(0, config.max - entry.count),
      resetAt: entry.resetAt,
    };
  }
}













