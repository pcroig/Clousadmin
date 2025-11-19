/**
 * Constantes y configuración para el sistema de integraciones
 *
 * Centraliza URLs de APIs, scopes OAuth, y configuración de rate limits
 * para todos los proveedores soportados.
 */

import type { ProviderMetadata, ProviderId, RetryOptions } from './types'

// ============================================================================
// PROVIDER METADATA
// ============================================================================

export const PROVIDER_METADATA: Record<ProviderId, ProviderMetadata> = {
  // Slack
  slack: {
    id: 'slack',
    name: 'Slack',
    category: 'comunicacion',
    description: 'Plataforma de comunicación empresarial',
    logoUrl: 'https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png',
    websiteUrl: 'https://slack.com',
    docsUrl: 'https://api.slack.com',
    supportsOAuth: true,
    supportsWebhooks: true,
    supportsSync: true,
  },

  // Google Calendar
  google_calendar: {
    id: 'google_calendar',
    name: 'Google Calendar',
    category: 'calendario',
    description: 'Calendario y gestión de eventos de Google',
    logoUrl: 'https://www.google.com/calendar/about/images/calendar-logo.png',
    websiteUrl: 'https://calendar.google.com',
    docsUrl: 'https://developers.google.com/calendar',
    supportsOAuth: true,
    supportsWebhooks: true,
    supportsSync: true,
  },

  // Google Drive
  google_drive: {
    id: 'google_drive',
    name: 'Google Drive',
    category: 'almacenamiento',
    description: 'Almacenamiento en la nube de Google',
    logoUrl: 'https://www.google.com/drive/static/images/drive/logo-drive.png',
    websiteUrl: 'https://drive.google.com',
    docsUrl: 'https://developers.google.com/drive',
    supportsOAuth: true,
    supportsWebhooks: true,
    supportsSync: true,
  },

  // Google Gmail
  google_gmail: {
    id: 'google_gmail',
    name: 'Gmail',
    category: 'email',
    description: 'Servicio de correo electrónico de Google',
    logoUrl: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico',
    websiteUrl: 'https://gmail.com',
    docsUrl: 'https://developers.google.com/gmail',
    supportsOAuth: true,
    supportsWebhooks: true,
    supportsSync: true,
  },

  // Microsoft Teams
  microsoft_teams: {
    id: 'microsoft_teams',
    name: 'Microsoft Teams',
    category: 'comunicacion',
    description: 'Plataforma de colaboración de Microsoft',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg',
    websiteUrl: 'https://teams.microsoft.com',
    docsUrl: 'https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview',
    supportsOAuth: true,
    supportsWebhooks: true,
    supportsSync: true,
  },

  // Microsoft Calendar (Outlook)
  microsoft_calendar: {
    id: 'microsoft_calendar',
    name: 'Outlook Calendar',
    category: 'calendario',
    description: 'Calendario de Outlook/Microsoft 365',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg',
    websiteUrl: 'https://outlook.com',
    docsUrl: 'https://learn.microsoft.com/en-us/graph/api/resources/calendar',
    supportsOAuth: true,
    supportsWebhooks: true,
    supportsSync: true,
  },

  // Microsoft OneDrive
  microsoft_onedrive: {
    id: 'microsoft_onedrive',
    name: 'OneDrive',
    category: 'almacenamiento',
    description: 'Almacenamiento en la nube de Microsoft',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg',
    websiteUrl: 'https://onedrive.com',
    docsUrl: 'https://learn.microsoft.com/en-us/graph/api/resources/onedrive',
    supportsOAuth: true,
    supportsWebhooks: true,
    supportsSync: true,
  },

  // PayFit
  payfit: {
    id: 'payfit',
    name: 'PayFit',
    category: 'nominas',
    description: 'Software de gestión de nóminas y RR.HH.',
    logoUrl: 'https://www.payfit.com/favicon.ico',
    websiteUrl: 'https://www.payfit.com',
    docsUrl: 'https://developers.payfit.com',
    supportsOAuth: true,
    supportsWebhooks: true,
    supportsSync: true,
  },

  // Factorial
  factorial: {
    id: 'factorial',
    name: 'Factorial',
    category: 'nominas',
    description: 'Plataforma de gestión de RR.HH. y nóminas',
    logoUrl: 'https://factorial.mx/favicon.ico',
    websiteUrl: 'https://factorial.mx',
    docsUrl: 'https://apidoc.factorialhr.com',
    supportsOAuth: true,
    supportsWebhooks: true,
    supportsSync: true,
  },

  // A3
  a3: {
    id: 'a3',
    name: 'A3 Software',
    category: 'nominas',
    description: 'Software de gestión empresarial y nóminas',
    logoUrl: 'https://www.wolterskluwer.com/favicon.ico',
    websiteUrl: 'https://www.wolterskluwer.com/es-es/solutions/a3',
    docsUrl: 'https://www.wolterskluwer.com/es-es/solutions/a3',
    supportsOAuth: false,
    supportsWebhooks: false,
    supportsSync: true,
  },

  // BambooHR
  bamboohr: {
    id: 'bamboohr',
    name: 'BambooHR',
    category: 'hr',
    description: 'Sistema de gestión de recursos humanos',
    logoUrl: 'https://www.bamboohr.com/favicon.ico',
    websiteUrl: 'https://www.bamboohr.com',
    docsUrl: 'https://documentation.bamboohr.com',
    supportsOAuth: false,
    supportsWebhooks: true,
    supportsSync: true,
  },

  // Personio
  personio: {
    id: 'personio',
    name: 'Personio',
    category: 'hr',
    description: 'Plataforma todo-en-uno de RR.HH.',
    logoUrl: 'https://www.personio.com/favicon.ico',
    websiteUrl: 'https://www.personio.com',
    docsUrl: 'https://developer.personio.de',
    supportsOAuth: false,
    supportsWebhooks: true,
    supportsSync: true,
  },

  // HiBob
  hibob: {
    id: 'hibob',
    name: 'HiBob',
    category: 'hr',
    description: 'Plataforma moderna de gestión de personas',
    logoUrl: 'https://www.hibob.com/favicon.ico',
    websiteUrl: 'https://www.hibob.com',
    docsUrl: 'https://apidocs.hibob.com',
    supportsOAuth: false,
    supportsWebhooks: true,
    supportsSync: true,
  },
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {
  // Slack
  slack: {
    auth: 'https://slack.com/oauth/v2/authorize',
    token: 'https://slack.com/api/oauth.v2.access',
    api: 'https://slack.com/api',
  },

  // Google
  google: {
    auth: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    calendar: 'https://www.googleapis.com/calendar/v3',
    drive: 'https://www.googleapis.com/drive/v3',
    gmail: 'https://www.googleapis.com/gmail/v1',
  },

  // Microsoft
  microsoft: {
    auth: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    graph: 'https://graph.microsoft.com/v1.0',
  },

  // PayFit
  payfit: {
    auth: 'https://oauth.payfit.com/authorize',
    token: 'https://oauth.payfit.com/token',
    api: 'https://api.payfit.com/v1',
  },

  // Factorial
  factorial: {
    auth: 'https://app.factorialhr.com/oauth/authorize',
    token: 'https://app.factorialhr.com/oauth/token',
    api: 'https://api.factorialhr.com/api/v1',
  },

  // A3 (API Key basado)
  a3: {
    api: 'https://api.a3software.com/v1',
  },

  // BambooHR (subdomain basado)
  bamboohr: {
    api: (subdomain: string) => `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1`,
  },

  // Personio (API Key basado)
  personio: {
    auth: 'https://api.personio.de/v1/auth',
    api: 'https://api.personio.de/v1',
  },

  // HiBob (API Key basado)
  hibob: {
    api: 'https://api.hibob.com/v1',
  },
} as const

// ============================================================================
// OAUTH SCOPES
// ============================================================================

export const OAUTH_SCOPES = {
  // Slack
  slack: {
    basic: ['users:read', 'channels:read'],
    notifications: ['chat:write', 'chat:write.public'],
    full: ['users:read', 'channels:read', 'chat:write', 'chat:write.public', 'im:write'],
  },

  // Google Calendar
  google_calendar: {
    readonly: ['https://www.googleapis.com/auth/calendar.readonly'],
    events: ['https://www.googleapis.com/auth/calendar.events'],
    full: ['https://www.googleapis.com/auth/calendar'],
  },

  // Google Drive
  google_drive: {
    readonly: ['https://www.googleapis.com/auth/drive.readonly'],
    file: ['https://www.googleapis.com/auth/drive.file'],
    full: ['https://www.googleapis.com/auth/drive'],
  },

  // Google Gmail
  google_gmail: {
    readonly: ['https://www.googleapis.com/auth/gmail.readonly'],
    send: ['https://www.googleapis.com/auth/gmail.send'],
    full: ['https://www.googleapis.com/auth/gmail.modify'],
  },

  // Microsoft Teams
  microsoft_teams: {
    basic: ['Team.ReadBasic.All', 'Channel.ReadBasic.All'],
    messages: ['ChannelMessage.Read.All', 'ChannelMessage.Send'],
    full: ['Team.ReadBasic.All', 'Channel.ReadBasic.All', 'ChannelMessage.Read.All', 'ChannelMessage.Send'],
  },

  // Microsoft Calendar
  microsoft_calendar: {
    readonly: ['Calendars.Read'],
    readwrite: ['Calendars.ReadWrite'],
    shared: ['Calendars.Read.Shared', 'Calendars.ReadWrite.Shared'],
  },

  // Microsoft OneDrive
  microsoft_onedrive: {
    readonly: ['Files.Read'],
    readwrite: ['Files.ReadWrite'],
    all: ['Files.ReadWrite.All'],
  },

  // PayFit
  payfit: {
    basic: ['read:employees', 'read:payslips'],
    full: ['read:employees', 'read:payslips', 'read:absences', 'write:absences'],
  },

  // Factorial
  factorial: {
    basic: ['read', 'leaves:read'],
    full: ['read', 'write', 'leaves:read', 'leaves:write'],
  },
} as const

// ============================================================================
// RATE LIMITS
// ============================================================================

/**
 * Rate limits por proveedor (requests por segundo)
 */
export const RATE_LIMITS: Record<ProviderId, number> = {
  slack: 1, // Tier 3: 1/seg, Tier 2: 20/min
  google_calendar: 10, // 10 req/seg, 1000 req/100seg
  google_drive: 10,
  google_gmail: 10,
  microsoft_teams: 5, // Variable según endpoint
  microsoft_calendar: 5,
  microsoft_onedrive: 5,
  payfit: 2,
  factorial: 5,
  a3: 1,
  bamboohr: 1, // No documentado, conservador
  personio: 5,
  hibob: 10,
}

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

/**
 * Configuración de retry por defecto
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 segundo
  maxDelay: 30000, // 30 segundos
  backoffMultiplier: 2,
  retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', '429', '500', '502', '503', '504'],
}

/**
 * Configuración de retry por proveedor
 */
export const PROVIDER_RETRY_OPTIONS: Partial<Record<ProviderId, RetryOptions>> = {
  slack: {
    ...DEFAULT_RETRY_OPTIONS,
    maxAttempts: 5,
    retryableErrors: [...DEFAULT_RETRY_OPTIONS.retryableErrors!, 'ratelimited'],
  },
  google_calendar: {
    ...DEFAULT_RETRY_OPTIONS,
    maxAttempts: 4,
  },
  microsoft_teams: {
    ...DEFAULT_RETRY_OPTIONS,
    maxAttempts: 4,
  },
}

// ============================================================================
// TIMEOUT CONFIGURATION
// ============================================================================

/**
 * Timeouts en milisegundos
 */
export const TIMEOUTS = {
  default: 30000, // 30 segundos
  upload: 120000, // 2 minutos para uploads
  download: 120000, // 2 minutos para downloads
  webhook: 5000, // 5 segundos para webhooks
} as const

// ============================================================================
// WEBHOOK CONFIGURATION
// ============================================================================

/**
 * Duración de webhooks en segundos
 */
export const WEBHOOK_DURATIONS = {
  google_calendar: 604800, // 7 días (máximo permitido)
  slack: 0, // No expiran
  microsoft: 4230, // ~70 minutos (máximo permitido)
  default: 86400, // 24 horas
} as const

// ============================================================================
// SYNC CONFIGURATION
// ============================================================================

/**
 * Intervalos de sincronización en milisegundos
 */
export const SYNC_INTERVALS = {
  realtime: 60000, // 1 minuto
  frequent: 300000, // 5 minutos
  normal: 900000, // 15 minutos
  hourly: 3600000, // 1 hora
  daily: 86400000, // 24 horas
} as const

/**
 * Límites de paginación por defecto
 */
export const PAGINATION_LIMITS = {
  default: 100,
  slack: 100,
  google: 250,
  microsoft: 100,
  payroll: 50,
  hr: 100,
} as const

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Códigos de error del sistema de integraciones
 */
export const ERROR_CODES = {
  // Authentication
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REFRESH_FAILED: 'TOKEN_REFRESH_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',

  // API
  API_ERROR: 'API_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Sync
  SYNC_FAILED: 'SYNC_FAILED',
  SYNC_PARTIAL: 'SYNC_PARTIAL',

  // Webhook
  WEBHOOK_VALIDATION_FAILED: 'WEBHOOK_VALIDATION_FAILED',
  WEBHOOK_REGISTRATION_FAILED: 'WEBHOOK_REGISTRATION_FAILED',

  // System
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  INTEGRATION_NOT_FOUND: 'INTEGRATION_NOT_FOUND',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
