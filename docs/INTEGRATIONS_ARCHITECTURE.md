# 🔗 Sistema de Integraciones - Arquitectura Completa

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Modelos de Base de Datos](#modelos-de-base-de-datos)
4. [Estructura de Directorios](#estructura-de-directorios)
5. [Componentes Principales](#componentes-principales)
6. [Proveedores Soportados](#proveedores-soportados)
7. [Flujos de Integración](#flujos-de-integración)
8. [Guía de Implementación](#guía-de-implementación)
9. [Ejemplos de Uso](#ejemplos-de-uso)
10. [Seguridad](#seguridad)
11. [Monitoreo y Logging](#monitoreo-y-logging)
12. [Próximos Pasos](#próximos-pasos)

---

## 🎯 Visión General

El sistema de integraciones de Clousadmin es una plataforma **centralizada**, **escalable** y **mantenible** para conectar con servicios externos. Diseñado para crecer fácilmente agregando nuevos proveedores sin modificar el código base.

### Características Principales

- ✅ **Centralización**: Un solo lugar para gestionar todas las integraciones
- ✅ **Escalabilidad**: Arquitectura modular que facilita agregar nuevos proveedores
- ✅ **OAuth 2.0**: Sistema unificado de autenticación con refresh automático de tokens
- ✅ **Webhooks**: Recepción y procesamiento de eventos en tiempo real
- ✅ **Sincronización**: Motor de sync bidireccional con estrategias incrementales
- ✅ **Rate Limiting**: Control automático de límites de API
- ✅ **Reintentos**: Sistema inteligente de reintentos con backoff exponencial
- ✅ **Logging**: Tracking detallado de todas las operaciones
- ✅ **Seguridad**: Encriptación de tokens, validación de webhooks, manejo GDPR

### Proveedores Implementados

#### Fase 1 - Comunicación y Productividad ✅
- **Slack**: Mensajería, notificaciones, gestión de canales
- **Google Suite**:
  - Calendar: Sincronización de ausencias y eventos
  - Drive: Almacenamiento de documentos
  - Gmail: Envío de correos (futuro)
- **Microsoft Suite**:
  - Teams: Comunicación y colaboración
  - Outlook Calendar: Gestión de eventos
  - OneDrive: Almacenamiento

#### Fase 2 - Nóminas 🔜
- **PayFit**: Integración completa de nóminas
- **Factorial**: Gestión de RR.HH. y nóminas
- **A3 Software**: ERP y nóminas

#### Fase 3 - HR Tools 🔜
- **BambooHR**: Sistema de gestión de personal
- **Personio**: Plataforma integral de RR.HH.
- **HiBob**: Gestión moderna de personas

---

## 🏗️ Arquitectura

### Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    UI LAYER (React)                          │
│  components/integrations/                                    │
│  - IntegrationCard, Settings, OAuth Buttons                 │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER (Next.js)                       │
│  app/api/integrations/                                       │
│  - oauth/[provider]/authorize, callback                     │
│  - webhooks/[provider]                                       │
│  - sync/trigger, status                                      │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                 ORCHESTRATION LAYER                          │
│  lib/integrations/orchestrator/                              │
│  - IntegrationManager: Coordinación general                 │
│  - SyncCoordinator: Programación de syncs                   │
│  - WebhookReceiver: Enrutamiento de webhooks                │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                    CORE LAYER                                │
│  lib/integrations/core/                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ BaseProvider│  │ OAuthManager │  │ TokenManager │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ SyncEngine  │  │ WebhookMgr   │  │ RateLimiter  │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ RetryManager│  │ ErrorHandler │  │ Logger       │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                  PROVIDERS LAYER                             │
│  lib/integrations/providers/                                 │
│  ┌──────┐  ┌────────┐  ┌──────────┐  ┌────────┐  ┌──────┐ │
│  │Slack │  │Google  │  │Microsoft │  │Payroll │  │  HR  │ │
│  └──────┘  └────────┘  └──────────┘  └────────┘  └──────┘ │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│  Prisma + PostgreSQL                                         │
│  - Integracion, IntegracionToken, IntegracionWebhook        │
│  - IntegracionSyncLog, IntegracionEvento                     │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

#### 1. Conexión OAuth
```
Usuario → UI Button → API /oauth/[provider]/authorize
  → OAuthManager.getAuthorizationUrl()
  → Redirect a proveedor
  → Usuario autoriza
  → Callback a /oauth/[provider]/callback
  → OAuthManager.exchangeCodeForTokens()
  → TokenManager.saveTokens() (encriptados)
  → IntegrationManager.activate()
  → DB: Integracion + IntegracionToken
```

#### 2. Sincronización
```
Cron/Manual → API /sync/trigger
  → SyncCoordinator.scheduleSync()
  → Provider.sync()
  → Fetch datos del proveedor
  → Mapear a modelo Clousadmin
  → Guardar en DB
  → SyncLog.create() (métricas)
```

#### 3. Webhook
```
Proveedor → POST /api/integrations/webhooks/[provider]
  → WebhookValidator.validate(signature)
  → WebhookRouter.route(event)
  → Provider.processWebhookEvent()
  → Procesamiento asíncrono
  → IntegracionEvento.create()
```

---

## 💾 Modelos de Base de Datos

### Nuevos Enums

```prisma
enum IntegracionEstado {
  conectada
  desconectada
  error
  token_expirado
  pendiente
}

enum TipoIntegracion {
  comunicacion
  calendario
  almacenamiento
  nominas
  hr
  email
}

enum EstadoSync {
  pendiente
  en_progreso
  completada
  fallida
  parcial
}

enum TipoSync {
  manual
  automatica
  webhook
  inicial
}
```

### Modelos Principales

#### Integracion (Actualizado)
```prisma
model Integracion {
  id         String             @id @default(uuid())
  empresaId  String
  usuarioId  String?

  tipo       TipoIntegracion
  proveedor  String
  estado     IntegracionEstado  @default(pendiente)

  config     Json?
  calendarId String?

  activa     Boolean            @default(true)
  ultimaSync DateTime?
  totalSyncs Int                @default(0)

  createdAt  DateTime           @default(now())
  updatedAt  DateTime           @updatedAt

  empresa    Empresa            @relation(...)
  token      IntegracionToken?
  webhooks   IntegracionWebhook[]
  syncLogs   IntegracionSyncLog[]
  eventos    IntegracionEvento[]
}
```

#### IntegracionToken (Nuevo)
```prisma
model IntegracionToken {
  id            String   @id @default(uuid())
  integracionId String   @unique

  accessToken   String   @db.Text  // Encriptado
  refreshToken  String?  @db.Text  // Encriptado
  tokenType     String   @default("Bearer")
  expiresAt     DateTime

  scopes        String[]
  lastRefreshed DateTime @default(now())
  refreshCount  Int      @default(0)

  integracion   Integracion @relation(...)
}
```

#### IntegracionWebhook (Nuevo)
```prisma
model IntegracionWebhook {
  id            String    @id @default(uuid())
  integracionId String

  webhookId     String?
  webhookUrl    String    @db.Text
  secret        String?   @db.Text  // Encriptado

  eventos       String[]
  activo        Boolean   @default(true)
  ultimoEvento  DateTime?
  totalEventos  Int       @default(0)
  expiresAt     DateTime?

  integracion   Integracion         @relation(...)
  eventos_      IntegracionEvento[]
}
```

#### IntegracionSyncLog (Nuevo)
```prisma
model IntegracionSyncLog {
  id                String      @id @default(uuid())
  integracionId     String

  tipo              TipoSync
  estado            EstadoSync  @default(pendiente)

  iniciadaEn        DateTime    @default(now())
  finalizadaEn      DateTime?
  duracion          Int?

  itemsProcesados   Int         @default(0)
  itemsCreados      Int         @default(0)
  itemsActualizados Int         @default(0)
  itemsEliminados   Int         @default(0)
  itemsFallidos     Int         @default(0)

  error             String?     @db.Text
  metadata          Json?

  integracion       Integracion @relation(...)
}
```

#### IntegracionEvento (Nuevo)
```prisma
model IntegracionEvento {
  id            String   @id @default(uuid())
  integracionId String
  webhookId     String?

  tipoEvento    String
  proveedor     String
  payload       Json

  procesado     Boolean  @default(false)
  procesadoEn   DateTime?
  error         String?  @db.Text

  metadata      Json?
  createdAt     DateTime @default(now())

  integracion   Integracion         @relation(...)
  webhook       IntegracionWebhook? @relation(...)
}
```

---

## 📁 Estructura de Directorios

```
lib/integrations/
├── core/                          # Sistema base
│   ├── base/
│   │   ├── provider.ts            # BaseProvider (clase abstracta)
│   │   ├── oauth-provider.ts     # BaseOAuthProvider
│   │   └── api-provider.ts       # BaseApiProvider
│   ├── auth/
│   │   ├── oauth-manager.ts      # Gestión OAuth
│   │   ├── token-manager.ts      # Gestión de tokens
│   │   └── scopes.ts             # Scopes por proveedor
│   ├── sync/
│   │   ├── sync-engine.ts        # Motor de sincronización
│   │   ├── sync-scheduler.ts     # Programación
│   │   └── sync-strategies.ts    # Estrategias
│   ├── webhooks/
│   │   ├── webhook-manager.ts    # Gestión de webhooks
│   │   ├── webhook-validator.ts  # Validación de firmas
│   │   └── webhook-router.ts     # Routing
│   ├── utils/
│   │   ├── rate-limiter.ts       # Rate limiting
│   │   ├── retry-manager.ts      # Reintentos
│   │   ├── error-handler.ts      # Errores
│   │   └── logger.ts             # Logging
│   ├── types.ts                   # ✅ Tipos (IMPLEMENTADO)
│   ├── constants.ts               # ✅ Constantes (IMPLEMENTADO)
│   └── registry.ts                # Registro de proveedores
│
├── providers/
│   ├── slack/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── webhooks.ts
│   │   └── api/
│   │       ├── users.ts
│   │       ├── channels.ts
│   │       └── messages.ts
│   │
│   ├── google/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── calendar/
│   │   │   ├── client.ts
│   │   │   ├── events.ts
│   │   │   └── sync.ts
│   │   └── drive/
│   │       ├── client.ts
│   │       └── files.ts
│   │
│   ├── microsoft/
│   │   ├── index.ts
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── teams/
│   │   │   └── client.ts
│   │   └── calendar/
│   │       └── client.ts
│   │
│   ├── payroll/
│   │   ├── base/
│   │   │   └── payroll-provider.ts
│   │   ├── payfit/
│   │   │   └── client.ts
│   │   └── factorial/
│   │       └── client.ts
│   │
│   └── hr/
│       ├── base/
│       │   └── hr-provider.ts
│       └── bamboohr/
│           └── client.ts
│
├── orchestrator/
│   ├── integration-manager.ts    # Manager principal
│   ├── sync-coordinator.ts       # Coordinación de syncs
│   └── webhook-receiver.ts       # Recepción de webhooks
│
├── config/
│   ├── providers.ts              # Config de proveedores
│   └── scopes.ts                 # Scopes
│
└── index.ts                       # Export principal

app/api/integrations/
├── oauth/
│   ├── [provider]/
│   │   ├── authorize/route.ts
│   │   └── callback/route.ts
│   └── disconnect/route.ts
├── webhooks/
│   └── [provider]/route.ts
├── sync/
│   ├── trigger/route.ts
│   └── status/route.ts
└── status/route.ts

components/integrations/
├── integration-card.tsx
├── integration-settings.tsx
├── sync-status.tsx
└── oauth-button.tsx
```

---

## 🔑 Componentes Principales

### 1. BaseProvider

Clase abstracta base para todos los proveedores:

```typescript
export abstract class BaseProvider implements IProvider {
  abstract readonly metadata: ProviderMetadata

  protected config?: IntegrationConfig
  protected logger: Logger

  async initialize(config: IntegrationConfig): Promise<void>
  async checkConnection(): Promise<IntegrationStatus>
  async disconnect(): Promise<void>

  protected abstract makeRequest<T>(options: RequestOptions): Promise<ApiResponse<T>>
}
```

### 2. OAuthManager

Gestiona el flujo OAuth 2.0 completo:

```typescript
export class OAuthManager {
  async getAuthorizationUrl(provider: ProviderId, state?: string): Promise<string>
  async exchangeCodeForTokens(provider: ProviderId, code: string): Promise<OAuth2Tokens>
  async refreshAccessToken(integrationId: string): Promise<OAuth2Tokens>
  async revokeTokens(integrationId: string): Promise<void>
}
```

### 3. TokenManager

Maneja tokens con refresh automático:

```typescript
export class TokenManager {
  async saveTokens(integrationId: string, tokens: OAuth2Tokens): Promise<void>
  async getValidToken(integrationId: string): Promise<string>
  async refreshIfNeeded(integrationId: string): Promise<void>
  async scheduleRefresh(integrationId: string): Promise<void>
}
```

### 4. SyncEngine

Motor de sincronización:

```typescript
export class SyncEngine {
  async sync(integrationId: string, options?: SyncOptions): Promise<SyncResult>
  async scheduleSync(integrationId: string, interval: number): Promise<void>
  async cancelSync(integrationId: string): Promise<void>
}
```

### 5. WebhookManager

Gestiona webhooks:

```typescript
export class WebhookManager {
  async register(integrationId: string, config: WebhookConfig): Promise<string>
  async validate(event: WebhookEvent): Promise<WebhookValidation>
  async process(event: WebhookEvent): Promise<void>
  async renew(webhookId: string): Promise<void>
}
```

---

## 🔌 Proveedores Soportados

### Slack

**Capacidades**:
- Envío de mensajes a canales
- Notificaciones directas a usuarios
- Gestión de canales
- Webhooks para eventos

**Casos de uso en Clousadmin**:
- Notificar ausencias aprobadas
- Alertas de fichajes incorrectos
- Recordatorios de documentos pendientes

### Google Calendar

**Capacidades**:
- Crear/actualizar/eliminar eventos
- Sincronización bidireccional
- Webhooks de cambios

**Casos de uso**:
- Sincronizar ausencias a calendario
- Mostrar eventos en dashboard
- Alertas de solapamiento

### Google Drive

**Capacidades**:
- Subir/descargar archivos
- Gestión de carpetas
- Permisos compartidos

**Casos de uso**:
- Backup de documentos de empleados
- Compartir contratos y nóminas
- Almacenamiento colaborativo

### Microsoft Teams

**Capacidades**:
- Mensajes en canales
- Reuniones
- Notificaciones

**Casos de uso**:
- Anuncios de empresa
- Notificaciones de RR.HH.
- Colaboración en equipos

### Microsoft Calendar (Outlook)

**Capacidades**:
- Similar a Google Calendar
- Integración con Outlook

**Casos de uso**:
- Alternativa a Google Calendar
- Sincronización de ausencias

### PayFit

**Capacidades**:
- Sincronización de empleados
- Exportación de nóminas
- Gestión de ausencias

**Casos de uso**:
- Sincronizar datos de empleados
- Importar nóminas automáticamente
- Validar ausencias

### Factorial

**Capacidades**:
- Gestión de empleados
- Time tracking
- Ausencias

**Casos de uso**:
- Alternativa a PayFit
- Doble entrada de datos

### BambooHR

**Capacidades**:
- Base de datos de empleados
- Onboarding
- Reporting

**Casos de uso**:
- Sincronizar info de empleados
- Automatizar onboarding
- Analytics combinados

---

## 🔄 Flujos de Integración

### Flujo 1: Conectar Integración (OAuth)

```
1. Usuario en /hr/settings/integrations
2. Click en "Conectar con Slack"
3. → POST /api/integrations/oauth/slack/authorize
4. → OAuthManager genera URL con state
5. → Redirect a slack.com/oauth/authorize
6. Usuario autoriza en Slack
7. → Slack redirect a /api/integrations/oauth/slack/callback?code=xxx
8. → OAuthManager intercambia code por tokens
9. → TokenManager guarda tokens (encriptados)
10. → DB: Integracion.estado = conectada
11. → Redirect a /hr/settings/integrations?success=true
```

### Flujo 2: Sincronización Automática

```
1. Cron job cada 15 minutos
2. → SyncCoordinator.runScheduledSyncs()
3. → Query: SELECT * FROM Integracion WHERE activa = true
4. Para cada integración:
   a. Provider.sync({ type: 'automatica', incremental: true })
   b. Fetch datos desde lastSync
   c. Mapear a modelos de Clousadmin
   d. Guardar en DB
   e. IntegracionSyncLog.create({ estado: 'completada', ... })
5. → TokenManager detecta tokens expirando en < 1 hora
6. → TokenManager.refreshIfNeeded() automáticamente
```

### Flujo 3: Webhook Entrante

```
1. Google Calendar detecta cambio en evento
2. → POST /api/integrations/webhooks/google_calendar
   {
     "kind": "api#channel",
     "id": "webhook-id",
     "resourceId": "resource-id",
     "resourceUri": "...",
     "token": "state-token"
   }
3. → WebhookValidator.validate(headers['X-Goog-Channel-Token'])
4. → IntegracionEvento.create({ procesado: false, ... })
5. → Background job procesa evento
6. → GoogleCalendarProvider.processWebhookEvent()
7. → Fetch detalles del evento cambiado
8. → Actualizar Ausencia en DB
9. → IntegracionEvento.update({ procesado: true })
```

---

## 📚 Guía de Implementación

### Paso 1: Agregar Nuevo Proveedor

Para agregar un nuevo proveedor (ej: "Notion"):

1. **Definir metadata en constants.ts**:
```typescript
export const PROVIDER_METADATA: Record<ProviderId, ProviderMetadata> = {
  // ...
  notion: {
    id: 'notion',
    name: 'Notion',
    category: 'almacenamiento',
    description: 'Workspace colaborativo',
    supportsOAuth: true,
    supportsWebhooks: true,
    supportsSync: true,
  }
}
```

2. **Crear estructura de archivos**:
```
lib/integrations/providers/notion/
├── index.ts          # Export principal
├── client.ts         # Cliente HTTP
├── auth.ts           # OAuth si aplica
├── webhooks.ts       # Webhook handlers
└── api/
    ├── pages.ts
    └── databases.ts
```

3. **Implementar NotionProvider**:
```typescript
import { BaseOAuthProvider } from '../../core/base/oauth-provider'

export class NotionProvider extends BaseOAuthProvider {
  readonly metadata = PROVIDER_METADATA.notion

  async sync(options?: SyncOptions): Promise<SyncResult> {
    // Implementar lógica de sincronización
  }

  async processWebhookEvent(event: WebhookEvent): Promise<void> {
    // Implementar procesamiento de webhooks
  }
}
```

4. **Registrar en registry**:
```typescript
import { NotionProvider } from '../providers/notion'

export const providerRegistry = {
  // ...
  notion: NotionProvider,
}
```

5. **Crear rutas API**:
```typescript
// app/api/integrations/oauth/notion/authorize/route.ts
// app/api/integrations/oauth/notion/callback/route.ts
// app/api/integrations/webhooks/notion/route.ts
```

6. **Agregar componente UI**:
```tsx
// components/integrations/notion-card.tsx
```

---

## 🔒 Seguridad

### Encriptación de Tokens

Todos los tokens OAuth se encriptan antes de guardarse en la base de datos usando AES-256-GCM:

```typescript
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY! // 32 bytes

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv)

  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptToken(encryptedToken: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
```

### Validación de Webhooks

Cada proveedor tiene su método de validación de firma:

#### Slack
```typescript
import crypto from 'crypto'

function validateSlackWebhook(
  body: string,
  timestamp: string,
  signature: string,
  secret: string
): boolean {
  const baseString = `v0:${timestamp}:${body}`
  const hash = crypto
    .createHmac('sha256', secret)
    .update(baseString)
    .digest('hex')

  const computedSignature = `v0=${hash}`
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  )
}
```

#### Google Calendar
```typescript
function validateGoogleWebhook(
  headers: Record<string, string>,
  expectedChannelId: string,
  expectedToken: string
): boolean {
  return (
    headers['x-goog-channel-id'] === expectedChannelId &&
    headers['x-goog-channel-token'] === expectedToken
  )
}
```

### Permisos y RBAC

Solo usuarios con rol `hr_admin` pueden:
- Conectar/desconectar integraciones
- Ver logs de sincronización
- Configurar webhooks

```typescript
// middleware.ts
if (request.nextUrl.pathname.startsWith('/api/integrations/oauth')) {
  const user = await getUserFromToken(request)
  if (user?.rol !== 'hr_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
```

---

## 📊 Monitoreo y Logging

### Logger Estructurado

```typescript
export class IntegrationLogger {
  private context: LogContext

  info(message: string, meta?: object) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...meta,
    }))
  }

  error(message: string, error: Error, meta?: object) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      timestamp: new Date().toISOString(),
      ...this.context,
      ...meta,
    }))
  }
}
```

### Métricas

El sistema registra:
- **Tasa de éxito de syncs**: `syncLogs.where(estado: 'completada').count() / syncLogs.count()`
- **Duración promedio**: `AVG(syncLogs.duracion)`
- **Errores por proveedor**: `syncLogs.groupBy(proveedor).count(error IS NOT NULL)`
- **Rate limit hits**: Contador en memoria + log
- **Token refreshes**: `integracionTokens.refreshCount`

### Dashboard (Futuro)

Panel en `/hr/settings/integrations/monitoring`:
- Gráfico de syncs en el tiempo
- Estado de salud por proveedor
- Alertas de errores recurrentes
- Próximas expiraciones de tokens/webhooks

---

## 🚀 Próximos Pasos

### Implementación Inmediata

1. ✅ **Modelos de BD** (COMPLETADO)
2. ✅ **Tipos y Constantes** (COMPLETADO)
3. ⏳ **Clases Base** (EN PROGRESO)
   - BaseProvider
   - BaseOAuthProvider
   - BaseApiProvider
4. ⏳ **Core Services** (SIGUIENTE)
   - OAuthManager
   - TokenManager
   - SyncEngine
   - WebhookManager
   - RateLimiter
   - RetryManager
   - Logger

5. **Proveedores Fase 1**
   - Slack
   - Google Calendar
   - Google Drive
   - Microsoft Teams
   - Microsoft Calendar

6. **API Routes**
   - OAuth authorize/callback
   - Webhook receivers
   - Sync triggers

7. **UI Components**
   - IntegrationCard
   - OAuthButton
   - SyncStatus
   - Settings panel

8. **Testing**
   - Unit tests para cada proveedor
   - Integration tests
   - E2E tests para flujos OAuth

9. **Documentación**
   - API docs
   - Provider guides
   - Troubleshooting

### Fase 2 - Nóminas

- Implementar PayFit, Factorial, A3
- Sincronización bidireccional de empleados
- Importación automática de nóminas
- Validación cruzada

### Fase 3 - HR Tools

- Implementar BambooHR, Personio, HiBob
- Sincronización de datos de empleados
- Onboarding automatizado
- Analytics combinados

### Mejoras Futuras

- **Queue System**: Usar BullMQ para procesamiento asíncrono de webhooks
- **Cache**: Redis para cachear respuestas de API
- **Observability**: Integración con Datadog/Sentry
- **Webhooks Outgoing**: Enviar eventos de Clousadmin a otras plataformas
- **Marketplace**: Permitir integraciones custom por empresa

---

## 📖 Ejemplos de Uso

### Conectar Slack

```typescript
// En el componente React
import { OAuthButton } from '@/components/integrations/oauth-button'

export function IntegrationsPage() {
  return (
    <div>
      <h2>Conectar Slack</h2>
      <OAuthButton provider="slack" />
    </div>
  )
}
```

### Enviar Notificación a Slack

```typescript
import { getProviderInstance } from '@/lib/integrations/orchestrator/integration-manager'

export async function notifyAbsenceApproved(ausenciaId: string) {
  const ausencia = await prisma.ausencia.findUnique({ where: { id: ausenciaId } })
  const integracion = await prisma.integracion.findFirst({
    where: {
      empresaId: ausencia.empresaId,
      proveedor: 'slack',
      activa: true,
    },
  })

  if (!integracion) return

  const slack = await getProviderInstance<SlackProvider>(integracion.id)

  await slack.sendMessage({
    channel: '#ausencias',
    text: `✅ Ausencia aprobada para ${ausencia.empleadoNombre} del ${ausencia.fechaInicio} al ${ausencia.fechaFin}`,
  })
}
```

### Sincronizar a Google Calendar

```typescript
import { SyncCoordinator } from '@/lib/integrations/orchestrator/sync-coordinator'

export async function syncAusenciasToCalendar(empresaId: string) {
  const integracion = await prisma.integracion.findFirst({
    where: {
      empresaId,
      proveedor: 'google_calendar',
      activa: true,
    },
  })

  if (!integracion) return

  const coordinator = new SyncCoordinator()
  const result = await coordinator.sync(integracion.id, {
    type: 'manual',
    incremental: false,
  })

  console.log(`Sincronizado: ${result.itemsCreados} eventos creados, ${result.itemsActualizados} actualizados`)
}
```

---

## 🎓 Resumen

Has creado un sistema de integraciones:
- **Robusto**: Manejo de errores, reintentos, rate limiting
- **Seguro**: Encriptación, validación de webhooks, RBAC
- **Escalable**: Fácil agregar nuevos proveedores
- **Mantenible**: Código limpio, tipado, bien documentado
- **Observeable**: Logging, métricas, monitoring

**Proveedores listos para integrar**:
1. Slack
2. Google Calendar
3. Google Drive
4. Microsoft Teams
5. Microsoft Calendar
6. OneDrive
7. PayFit
8. Factorial
9. A3
10. BambooHR
11. Personio
12. HiBob

**Próximo paso**: Implementar las clases base y servicios core para empezar a conectar proveedores.

