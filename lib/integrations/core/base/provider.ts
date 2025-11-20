/**
 * BaseProvider - Clase abstracta base para todos los proveedores
 *
 * Define la interfaz y funcionalidad común que todos los proveedores
 * deben implementar.
 */

import type {
  IProvider,
  ProviderMetadata,
  IntegrationConfig,
  IntegrationStatus,
  RequestOptions,
  ApiResponse,
  ProviderId,
} from '../types'
import { IntegrationLogger } from '../utils/logger'
import { RateLimiter } from '../utils/rate-limiter'
import { RetryManager } from '../utils/retry-manager'
import { wrapError, IntegrationError } from '../utils/errors'
import { TIMEOUTS } from '../constants'

/**
 * Clase base abstracta para proveedores de integración
 */
export abstract class BaseProvider implements IProvider {
  /** Metadata del proveedor (debe ser implementado por cada proveedor) */
  abstract readonly metadata: ProviderMetadata

  /** Configuración de la integración */
  protected config?: IntegrationConfig

  /** Logger con contexto del proveedor */
  protected logger: IntegrationLogger

  /** Rate limiter */
  protected rateLimiter: RateLimiter

  /** Retry manager */
  protected retryManager: RetryManager

  /** Estado de inicialización */
  protected initialized: boolean = false

  constructor() {
    // Inicializar con logger temporal (se actualizará en initialize)
    this.logger = IntegrationLogger.create({
      service: 'integrations',
      provider: 'unknown',
    })

    this.rateLimiter = new RateLimiter()
    this.retryManager = new RetryManager()
  }

  /**
   * Inicializar proveedor con configuración
   */
  async initialize(config: IntegrationConfig): Promise<void> {
    this.config = config

    // Actualizar logger con contexto completo
    this.logger = IntegrationLogger.create({
      service: 'integrations',
      provider: config.providerId,
      integrationId: config.id,
      empresaId: config.empresaId,
      usuarioId: config.usuarioId,
    })

    // Actualizar retry manager con configuración del proveedor
    this.retryManager = new RetryManager(config.providerId)

    this.logger.info('Provider initialized', {
      type: config.tipo,
      estado: config.estado,
    })

    this.initialized = true

    // Hook para inicialización personalizada
    await this.onInitialize()
  }

  /**
   * Hook para inicialización personalizada (opcional)
   */
  protected async onInitialize(): Promise<void> {
    // Subclases pueden override
  }

  /**
   * Verificar estado de la conexión
   */
  async checkConnection(): Promise<IntegrationStatus> {
    this.ensureInitialized()

    try {
      // Intentar hacer una petición simple para verificar conexión
      const isHealthy = await this.healthCheck()

      const status: IntegrationStatus = {
        isConnected: isHealthy,
        estado: isHealthy ? 'conectada' : 'error',
        lastSync: this.config?.metadata?.lastSync as Date | undefined,
        healthStatus: isHealthy ? 'healthy' : 'error',
      }

      this.logger.info('Connection check completed', {
        isConnected: isHealthy,
        estado: status.estado,
      })

      return status
    } catch (error) {
      this.logger.error('Connection check failed', error as Error)

      return {
        isConnected: false,
        estado: 'error',
        lastError: (error as Error).message,
        healthStatus: 'error',
      }
    }
  }

  /**
   * Health check específico del proveedor (debe ser implementado)
   */
  protected abstract healthCheck(): Promise<boolean>

  /**
   * Desconectar y limpiar recursos
   */
  async disconnect(): Promise<void> {
    this.ensureInitialized()

    this.logger.info('Disconnecting provider')

    // Hook para cleanup personalizado
    await this.onDisconnect()

    this.initialized = false
    this.config = undefined

    this.logger.info('Provider disconnected')
  }

  /**
   * Hook para cleanup personalizado (opcional)
   */
  protected async onDisconnect(): Promise<void> {
    // Subclases pueden override
  }

  /**
   * Hacer petición HTTP con rate limiting y retry
   */
  protected async makeRequest<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    this.ensureInitialized()

    const { method, url, headers = {}, params, body, timeout = TIMEOUTS.default } = options

    this.logger.debug(`Making ${method} request to ${url}`, {
      method,
      url,
      hasBody: !!body,
      hasParams: !!params,
    })

    try {
      // Ejecutar con rate limiting y retry
      return await this.rateLimiter.execute(
        this.config!.providerId,
        async () => {
          return await this.retryManager.execute(
            async () => {
              const response = await this.executeRequest<T>({
                method,
                url,
                headers,
                params,
                body,
                timeout,
              })

              this.logger.debug(`Request completed: ${method} ${url}`, {
                statusCode: response.statusCode,
                success: response.success,
              })

              return response
            },
            {
              operation: `${method} ${url}`,
              providerId: this.config!.providerId,
            }
          )
        }
      )
    } catch (error) {
      this.logger.error(`Request failed: ${method} ${url}`, error as Error)
      throw wrapError(error, this.config!.providerId)
    }
  }

  /**
   * Ejecutar petición HTTP real (debe ser implementado por subclases)
   */
  protected abstract executeRequest<T>(options: RequestOptions): Promise<ApiResponse<T>>

  /**
   * Construir URL con query params
   */
  protected buildUrl(baseUrl: string, params?: Record<string, string | number | boolean>): string {
    if (!params || Object.keys(params).length === 0) {
      return baseUrl
    }

    const url = new URL(baseUrl)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })

    return url.toString()
  }

  /**
   * Obtener headers por defecto (puede ser override)
   */
  protected getDefaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'Clousadmin/1.0',
    }
  }

  /**
   * Verificar que el proveedor esté inicializado
   */
  protected ensureInitialized(): void {
    if (!this.initialized || !this.config) {
      throw new IntegrationError(
        'Provider not initialized. Call initialize() first.',
        'CONFIGURATION_ERROR',
        this.metadata.id
      )
    }
  }

  /**
   * Obtener configuración actual
   */
  protected getConfig(): IntegrationConfig {
    this.ensureInitialized()
    return this.config!
  }

  /**
   * Obtener provider ID
   */
  get providerId(): ProviderId {
    return this.metadata.id
  }

  /**
   * Verificar si está inicializado
   */
  get isInitialized(): boolean {
    return this.initialized
  }
}
