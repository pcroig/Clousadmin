/**
 * Sistema de logging estructurado para integraciones
 *
 * Proporciona logging con contexto, niveles, y formato JSON para
 * facilitar el análisis y debugging de integraciones.
 */

import type { LogLevel, LogContext, LogEntry } from '../types'

export class IntegrationLogger {
  private context: LogContext

  constructor(context: LogContext = {}) {
    this.context = context
  }

  /**
   * Crear logger con contexto específico
   */
  static create(context: LogContext): IntegrationLogger {
    return new IntegrationLogger(context)
  }

  /**
   * Agregar contexto adicional
   */
  withContext(additionalContext: LogContext): IntegrationLogger {
    return new IntegrationLogger({ ...this.context, ...additionalContext })
  }

  /**
   * Log de debug (solo en desarrollo)
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'production') return
    this.log('debug', message, meta)
  }

  /**
   * Log informativo
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta)
  }

  /**
   * Log de advertencia
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta)
  }

  /**
   * Log de error
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorInfo = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error as any).cause && { cause: (error as any).cause },
        }
      : { error }

    this.log('error', message, { ...meta, error: errorInfo })
  }

  /**
   * Método interno de logging
   */
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      context: this.context,
      timestamp: new Date(),
    }

    const logData = {
      ...entry,
      ...meta,
      // Serializar context y meta para logging
      context: this.serializeContext(entry.context),
      timestamp: entry.timestamp.toISOString(),
    }

    // En producción, esto debería ir a un servicio de logging como Datadog, CloudWatch, etc.
    const logString = JSON.stringify(logData, null, process.env.NODE_ENV === 'development' ? 2 : 0)

    switch (level) {
      case 'debug':
        console.debug(logString)
        break
      case 'info':
        console.log(logString)
        break
      case 'warn':
        console.warn(logString)
        break
      case 'error':
        console.error(logString)
        break
    }
  }

  /**
   * Serializar contexto para logging (remover valores sensibles)
   */
  private serializeContext(context?: LogContext): Record<string, unknown> {
    if (!context) return {}

    const serialized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(context)) {
      // No loguear tokens ni secretos
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
        serialized[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        // Serializar objetos anidados
        serialized[key] = JSON.stringify(value)
      } else {
        serialized[key] = value
      }
    }

    return serialized
  }

  /**
   * Medir duración de una operación
   */
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    meta?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now()
    this.debug(`${operation} started`, meta)

    try {
      const result = await fn()
      const duration = Date.now() - startTime

      this.info(`${operation} completed`, {
        ...meta,
        duration,
        durationFormatted: `${duration}ms`,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      this.error(`${operation} failed`, error as Error, {
        ...meta,
        duration,
        durationFormatted: `${duration}ms`,
      })

      throw error
    }
  }

  /**
   * Medir duración de una operación síncrona
   */
  measure<T>(operation: string, fn: () => T, meta?: Record<string, unknown>): T {
    const startTime = Date.now()
    this.debug(`${operation} started`, meta)

    try {
      const result = fn()
      const duration = Date.now() - startTime

      this.info(`${operation} completed`, {
        ...meta,
        duration,
        durationFormatted: `${duration}ms`,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      this.error(`${operation} failed`, error as Error, {
        ...meta,
        duration,
        durationFormatted: `${duration}ms`,
      })

      throw error
    }
  }
}

/**
 * Logger global para integraciones
 */
export const logger = IntegrationLogger.create({
  service: 'integrations',
})
