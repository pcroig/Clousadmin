// ========================================
// Rate Limiting System
// ========================================
// Rate limiting con fallback a memoria (Map) para desarrollo local
// En producción se puede migrar a Redis/Upstash para sincronización multi-instancia

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

// Storage en memoria (Map)
// En producción, migrar a Redis para persistencia y sincronización
const rateLimitStore = new Map<string, RateLimitEntry>();

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
    const key = `${type}:${identifier}`;

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
 */
export function getClientIP(headers: Headers): string {
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
export function resetRateLimit(identifier: string, type: RateLimitType = 'api'): void {
  const key = `${type}:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Obtener estadísticas actuales de rate limit
 * Útil para debugging y monitoreo
 */
export function getRateLimitStats(identifier: string, type: RateLimitType = 'api'): {
  attempts: number;
  remaining: number;
  resetAt: number | null;
} {
  const key = `${type}:${identifier}`;
  const entry = rateLimitStore.get(key);
  const config = RATE_LIMITS[type];

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


