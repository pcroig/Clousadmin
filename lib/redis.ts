/**
 * Cliente Redis compartido para caché y colas
 */

import Redis from 'ioredis';

// Configuración de Redis
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_TLS = process.env.REDIS_TLS === 'true';

// Estado de conexión
let redisConnected = false;
let errorLogged = false;
let lastErrorTime = 0;
const ERROR_LOG_INTERVAL = 60000; // Solo mostrar error cada 60 segundos

/**
 * Cliente Redis principal para caché
 */
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Requerido para BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    // Limitar reintentos - después de 5 intentos, dejar de intentar
    if (times > 5) {
      return null; // No más reintentos
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  tls: REDIS_TLS ? {} : undefined,
  lazyConnect: true, // No conectar automáticamente
  enableOfflineQueue: false, // No encolar comandos si está offline
});

/**
 * Cliente Redis para subscriber (BullMQ)
 */
export const redisSubscriber = redis.duplicate();

// Logging de conexión
redis.on('connect', () => {
  redisConnected = true;
  errorLogged = false; // Reset error log cuando se conecta
  console.log('[Redis] Conectado correctamente');
});

redis.on('ready', () => {
  redisConnected = true;
});

redis.on('error', (error) => {
  redisConnected = false;
  const now = Date.now();
  
  // Solo mostrar error una vez o cada 60 segundos
  if (!errorLogged || (now - lastErrorTime) > ERROR_LOG_INTERVAL) {
    console.warn('[Redis] No disponible - funcionando en modo degradado (sin caché)');
    errorLogged = true;
    lastErrorTime = now;
  }
});

redis.on('close', () => {
  redisConnected = false;
});

// Conectar al inicio (silenciosamente)
redis.connect().catch(() => {
  // Error ya manejado por el event handler
  // No mostrar aquí para evitar duplicados
});

/**
 * Utilidades de caché con TTL
 */
export const cache = {
  /**
   * Obtener valor del caché
   */
  async get<T>(key: string): Promise<T | null> {
    if (!redisConnected) return null;
    try {
      const value = await redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch {
      // Silenciar errores - Redis no disponible
      return null;
    }
  },

  /**
   * Guardar valor en caché con TTL (segundos)
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 86400): Promise<void> {
    if (!redisConnected) return;
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Silenciar errores - Redis no disponible
    }
  },

  /**
   * Eliminar valor del caché
   */
  async del(key: string): Promise<void> {
    if (!redisConnected) return;
    try {
      await redis.del(key);
    } catch {
      // Silenciar errores - Redis no disponible
    }
  },

  /**
   * Limpiar todo el caché (usar con cuidado)
   */
  async flush(): Promise<void> {
    if (!redisConnected) return;
    try {
      await redis.flushdb();
      console.log('[Cache] Caché limpiado correctamente');
    } catch {
      // Silenciar errores - Redis no disponible
    }
  },

  /**
   * Verificar si el caché está disponible
   */
  async isAvailable(): Promise<boolean> {
    if (!redisConnected) return false;
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
