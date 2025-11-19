/**
 * Tipos centrales para el sistema de integraciones
 *
 * Este archivo define las interfaces y tipos compartidos por todos los proveedores
 * de integración. Sigue el principio de Open/Closed: abierto para extensión,
 * cerrado para modificación.
 */

import {
  IntegracionEstado,
  TipoIntegracion,
  EstadoSync,
  TipoSync,
} from '@prisma/client'

// ============================================================================
// PROVIDER TYPES
// ============================================================================

/**
 * Identificadores de proveedores soportados
 */
export type ProviderId =
  | 'slack'
  | 'google_calendar'
  | 'google_drive'
  | 'google_gmail'
  | 'microsoft_teams'
  | 'microsoft_calendar'
  | 'microsoft_onedrive'
  | 'payfit'
  | 'factorial'
  | 'a3'
  | 'bamboohr'
  | 'personio'
  | 'hibob'

/**
 * Categorías de proveedores
 */
export type ProviderCategory =
  | 'comunicacion'
  | 'calendario'
  | 'almacenamiento'
  | 'nominas'
  | 'hr'
  | 'email'

/**
 * Metadata del proveedor
 */
export interface ProviderMetadata {
  id: ProviderId
  name: string
  category: ProviderCategory
  description: string
  logoUrl?: string
  websiteUrl?: string
  docsUrl?: string
  supportsOAuth: boolean
  supportsWebhooks: boolean
  supportsSync: boolean
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

/**
 * Tipos de autenticación soportados
 */
export type AuthType = 'oauth2' | 'api_key' | 'basic' | 'custom'

/**
 * Configuración OAuth 2.0
 */
export interface OAuth2Config {
  authUrl: string
  tokenUrl: string
  clientId: string
  clientSecret: string
  scopes: string[]
  redirectUri: string
  state?: string
  pkce?: boolean
}

/**
 * Tokens OAuth 2.0
 */
export interface OAuth2Tokens {
  accessToken: string
  refreshToken?: string
  tokenType: string
  expiresAt: Date
  scopes: string[]
}

/**
 * Credenciales de API Key
 */
export interface ApiKeyCredentials {
  apiKey: string
  apiSecret?: string
}

/**
 * Credenciales básicas
 */
export interface BasicCredentials {
  username: string
  password: string
}

/**
 * Union type para todas las credenciales
 */
export type Credentials = OAuth2Tokens | ApiKeyCredentials | BasicCredentials

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

/**
 * Configuración de integración
 */
export interface IntegrationConfig {
  id: string
  empresaId: string
  usuarioId?: string
  providerId: ProviderId
  tipo: TipoIntegracion
  estado: IntegracionEstado
  credentials: Credentials
  settings?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * Estado de la integración
 */
export interface IntegrationStatus {
  isConnected: boolean
  estado: IntegracionEstado
  lastSync?: Date
  lastError?: string
  tokensExpireAt?: Date
  healthStatus: 'healthy' | 'warning' | 'error'
}

// ============================================================================
// SYNC TYPES
// ============================================================================

/**
 * Opciones de sincronización
 */
export interface SyncOptions {
  type: TipoSync
  incremental?: boolean // Si true, solo sincronizar cambios desde lastSync
  limit?: number // Límite de items a procesar
  filters?: Record<string, unknown> // Filtros específicos del proveedor
  dryRun?: boolean // Si true, no hacer cambios reales
}

/**
 * Resultado de sincronización
 */
export interface SyncResult {
  success: boolean
  estado: EstadoSync
  itemsProcesados: number
  itemsCreados: number
  itemsActualizados: number
  itemsEliminados: number
  itemsFallidos: number
  errors: SyncError[]
  duration: number // milisegundos
  metadata?: Record<string, unknown>
}

/**
 * Error de sincronización
 */
export interface SyncError {
  item?: string
  error: string
  code?: string
  recoverable: boolean
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

/**
 * Configuración de webhook
 */
export interface WebhookConfig {
  url: string
  secret?: string
  events: string[]
  active: boolean
}

/**
 * Evento de webhook entrante
 */
export interface WebhookEvent {
  id: string
  providerId: ProviderId
  type: string
  payload: unknown
  timestamp: Date
  signature?: string
  metadata?: Record<string, unknown>
}

/**
 * Validación de webhook
 */
export interface WebhookValidation {
  isValid: boolean
  error?: string
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Opciones de petición HTTP
 */
export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
  body?: unknown
  timeout?: number
}

/**
 * Respuesta HTTP
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  statusCode: number
  headers: Record<string, string>
  rateLimit?: RateLimitInfo
}

/**
 * Error de API
 */
export interface ApiError {
  code: string
  message: string
  details?: unknown
  retryable: boolean
  retryAfter?: number // segundos
}

/**
 * Información de rate limiting
 */
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: Date
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Tipos de eventos internos del sistema
 */
export type IntegrationEventType =
  | 'integration.connected'
  | 'integration.disconnected'
  | 'integration.error'
  | 'sync.started'
  | 'sync.completed'
  | 'sync.failed'
  | 'webhook.received'
  | 'webhook.processed'
  | 'token.refreshed'
  | 'token.expired'

/**
 * Evento interno del sistema
 */
export interface IntegrationEvent {
  type: IntegrationEventType
  integrationId: string
  providerId: ProviderId
  timestamp: Date
  data?: unknown
  error?: string
}

// ============================================================================
// LOGGER TYPES
// ============================================================================

/**
 * Niveles de log
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Contexto de log
 */
export interface LogContext {
  integrationId?: string
  providerId?: ProviderId
  syncId?: string
  webhookId?: string
  userId?: string
  empresaId?: string
  [key: string]: unknown
}

/**
 * Entrada de log
 */
export interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  error?: Error
  timestamp: Date
}

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

/**
 * Interfaz base que deben implementar todos los proveedores
 */
export interface IProvider {
  /** Metadata del proveedor */
  readonly metadata: ProviderMetadata

  /** Inicializar proveedor con configuración */
  initialize(config: IntegrationConfig): Promise<void>

  /** Verificar estado de la conexión */
  checkConnection(): Promise<IntegrationStatus>

  /** Desconectar y limpiar recursos */
  disconnect(): Promise<void>
}

/**
 * Interfaz para proveedores con OAuth
 */
export interface IOAuthProvider extends IProvider {
  /** Obtener URL de autorización OAuth */
  getAuthorizationUrl(state?: string): Promise<string>

  /** Intercambiar código de autorización por tokens */
  exchangeCodeForTokens(code: string): Promise<OAuth2Tokens>

  /** Refrescar access token */
  refreshAccessToken(refreshToken: string): Promise<OAuth2Tokens>

  /** Revocar tokens */
  revokeTokens(): Promise<void>
}

/**
 * Interfaz para proveedores con sincronización
 */
export interface ISyncProvider extends IProvider {
  /** Sincronizar datos */
  sync(options?: SyncOptions): Promise<SyncResult>

  /** Obtener última fecha de sincronización */
  getLastSyncDate(): Promise<Date | null>
}

/**
 * Interfaz para proveedores con webhooks
 */
export interface IWebhookProvider extends IProvider {
  /** Registrar webhook */
  registerWebhook(config: WebhookConfig): Promise<string>

  /** Actualizar webhook */
  updateWebhook(webhookId: string, config: Partial<WebhookConfig>): Promise<void>

  /** Eliminar webhook */
  deleteWebhook(webhookId: string): Promise<void>

  /** Validar webhook entrante */
  validateWebhook(event: WebhookEvent): Promise<WebhookValidation>

  /** Procesar evento de webhook */
  processWebhookEvent(event: WebhookEvent): Promise<void>
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Resultado con éxito/error
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

/**
 * Función de retry
 */
export type RetryFunction<T> = () => Promise<T>

/**
 * Opciones de retry
 */
export interface RetryOptions {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors?: string[]
}
