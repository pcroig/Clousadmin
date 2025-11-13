/**
 * Cliente Redis compartido para caché y colas
 */

import Redis from 'ioredis';

// Configuración de Redis
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_TLS = process.env.REDIS_TLS === 'true';

/**
 * Cliente Redis principal para caché
 */
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Requerido para BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  tls: REDIS_TLS ? {} : undefined,
  lazyConnect: true, // No conectar automáticamente
});

/**
 * Cliente Redis para subscriber (BullMQ)
 */
export const redisSubscriber = redis.duplicate();

// Logging de conexión
redis.on('connect', () => {
  console.log('[Redis] Conectado correctamente');
});

redis.on('error', (error) => {
  console.error('[Redis] Error de conexión:', error.message);
});

// Conectar al inicio
redis.connect().catch((error) => {
  console.error('[Redis] No se pudo conectar:', error.message);
  console.warn('[Redis] El caché estará deshabilitado');
});

/**
 * Utilidades de caché con TTL
 */
export const cache = {
  /**
   * Obtener valor del caché
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[Cache] Error al obtener ${key}:`, error);
      return null;
    }
  },

  /**
   * Guardar valor en caché con TTL (segundos)
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 86400): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      console.error(`[Cache] Error al guardar ${key}:`, error);
    }
  },

  /**
   * Eliminar valor del caché
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`[Cache] Error al eliminar ${key}:`, error);
    }
  },

  /**
   * Limpiar todo el caché (usar con cuidado)
   */
  async flush(): Promise<void> {
    try {
      await redis.flushdb();
      console.log('[Cache] Caché limpiado correctamente');
    } catch (error) {
      console.error('[Cache] Error al limpiar caché:', error);
    }
  },

  /**
   * Verificar si el caché está disponible
   */
  async isAvailable(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Cerrar conexiones (para testing)
 */
export async function closeRedis(): Promise<void> {
  await Promise.all([
    redis.quit(),
    redisSubscriber.quit(),
  ]);
}
