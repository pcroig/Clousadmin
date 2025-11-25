# Integración Google Calendar - Documentación Completa

## 📋 Índice
1. [Estado Actual](#estado-actual)
2. [Arquitectura](#arquitectura)
3. [Funcionalidades Implementadas](#funcionalidades-implementadas)
4. [Configuración](#configuración)
5. [Uso](#uso)
6. [Roadmap: Integración Bidireccional Completa (Tipo B)](#roadmap-tipo-b)
7. [Troubleshooting](#troubleshooting)

---

## Estado Actual

### ✅ Integración Tipo A (Implementada)
**Sincronización unidireccional: Clousadmin → Google Calendar**

- ✅ Login con Google OAuth
- ✅ Conexión de calendario personal por empleado
- ✅ Conexión de calendario de empresa (HR Admin)
- ✅ Sincronización automática de ausencias aprobadas a Google Calendar
- ✅ Uso del calendario principal del usuario (no crea calendarios nuevos)
- ✅ Actualización de eventos cuando cambia una ausencia
- ✅ Eliminación de eventos cuando se cancela/rechaza una ausencia
- ✅ Refresh automático de tokens OAuth

### 🚧 Integración Tipo B (No Implementada)
**Sincronización bidireccional completa**

Ver sección [Roadmap: Tipo B](#roadmap-tipo-b) para detalles de implementación futura.

---

## Arquitectura

### Estructura de Archivos

```
clousadmin/
├── lib/
│   ├── oauth/
│   │   ├── config.ts                    # Configuración OAuth (login vs calendario)
│   │   ├── oauth-manager.ts             # Gestión de tokens (store, refresh)
│   │   ├── types.ts                     # Tipos TypeScript
│   │   └── providers/
│   │       ├── google.ts                # Proveedor OAuth de Google
│   │       └── index.ts
│   └── integrations/
│       ├── types.ts                     # Tipos de integraciones
│       └── calendar/
│           ├── calendar-manager.ts      # Lógica de sincronización
│           └── providers/
│               ├── google-calendar.ts   # Google Calendar API wrapper
│               └── index.ts
├── app/api/
│   ├── auth/google/
│   │   ├── route.ts                     # Iniciar OAuth login
│   │   └── callback/route.ts            # Callback OAuth login
│   └── integrations/calendar/
│       ├── connect/route.ts             # Iniciar OAuth calendario
│       ├── callback/route.ts            # Callback OAuth calendario
│       ├── disconnect/route.ts          # Desconectar calendario
│       └── sync-existing/route.ts       # Sincronizar ausencias existentes
└── app/(dashboard)/
    ├── empleado/settings/integraciones/
    └── hr/settings/integraciones/
```

### Modelo de Datos

```prisma
// Usuario vinculado con Google
model Usuario {
  id        String   @id @default(cuid())
  email     String   @unique
  googleId  String?  @unique        // ID de Google del usuario
  accounts  Account[]                // Tokens OAuth
  // ...
}

// Tokens OAuth (para login y calendario)
model Account {
  id                String  @id @default(cuid())
  userId            String
  provider          String  // "google"
  providerAccountId String  // ID de Google del usuario
  access_token      String? // Token de acceso
  refresh_token     String? // Token de refresh
  expires_at        Int?    // Timestamp de expiración
  scope             String? // Scopes autorizados
  // ...
}

// Integración de calendario
model Integracion {
  id         String   @id @default(cuid())
  empresaId  String
  usuarioId  String?  // null = calendario empresa, valor = calendario personal
  tipo       String   // "calendario"
  proveedor  String   // "google_calendar"
  calendarId String?  // "primary" (calendario principal del usuario)
  config     Json     // { accessToken, refreshToken, expiresAt, ausenciaEventMap }
  activa     Boolean  @default(true)
  // ...
}
```

---

## Funcionalidades Implementadas

### 1. Login con Google OAuth

**Flujo:**
```
Usuario → /login → Click "Google"
  → /api/auth/google (entrypoint opcional)
  → Google (autoriza)
  → /api/auth/callback/google (callback oficial NextAuth v5)
  → Crea/actualiza usuario.googleId
  → Guarda tokens en Account
  → Redirige a /[rol]/dashboard
```

**Scopes:**
- `openid`
- `userinfo.email`
- `userinfo.profile`

### 2. Conexión de Calendario Personal

**Flujo:**
```
Empleado → /empleado/settings/integraciones → "Conectar Mi Calendario"
  → /api/integrations/calendar/connect?type=personal
  → Google (autoriza permisos de calendario)
  → /api/integrations/calendar/callback
  → Guarda Integracion con usuarioId y calendarId="primary"
  → Redirige a /empleado/settings/integraciones?success=true
```

**Scopes:**
- `openid`
- `userinfo.email`
- `userinfo.profile`
- `calendar` (acceso completo para crear calendarios y eventos)

### 3. Sincronización de Ausencias

**Cuándo se sincroniza:**
- ✅ Cuando se **aprueba** una ausencia (PATCH `/api/ausencias/[id]` con acción "aprobar")
- ✅ Cuando se **rechaza** una ausencia (elimina evento si existía)
- ✅ Cuando se **cancela** una ausencia (DELETE `/api/ausencias/[id]`)
- ❌ NO se sincroniza cuando se **crea** una ausencia (solo cuando se aprueba)

**Proceso de sincronización:**
```typescript
// 1. Buscar integraciones activas del empleado
const integraciones = await prisma.integracion.findMany({
  where: {
    empresaId: ausencia.empresaId,
    tipo: "calendario",
    activa: true,
    OR: [
      { usuarioId: null },              // Calendario de empresa
      { usuarioId: empleado.usuarioId }  // Calendario personal
    ]
  }
});

// 2. Para cada integración, sincronizar
for (const integracion of integraciones) {
  // 2.1. Obtener access token válido (refresh si es necesario)
  const validToken = await OAuthManager.getValidAccessToken(...);

  // 2.2. Crear/actualizar evento en Google Calendar
  const event = {
    summary: `${ausencia.tipo} - ${empleado.nombre}`,
    start: { date: ausencia.fechaInicio },
    end: { date: ausencia.fechaFin },
    colorId: getColorByType(ausencia.tipo) // Verde=vacaciones, Rojo=enfermedad
  };

  const eventId = await googleCalendar.events.insert({
    calendarId: integracion.calendarId, // "primary"
    requestBody: event
  });

  // 2.3. Guardar mapeo ausenciaId -> eventId para futuras actualizaciones
  await prisma.integracion.update({
    where: { id: integracion.id },
    data: {
      config: {
        ...config,
        ausenciaEventMap: { [ausencia.id]: eventId }
      }
    }
  });
}
```

### 4. Gestión de Tokens

**Refresh automático:**
```typescript
// lib/oauth/oauth-manager.ts
static async getValidAccessToken(userId, provider, oauthConfig) {
  const account = await prisma.account.findFirst({
    where: { userId, provider }
  });

  // Si el token no ha expirado, usarlo
  if (account.expires_at && account.expires_at > Date.now() / 1000) {
    return account.access_token;
  }

  // Si expiró, renovar con refresh_token
  const googleProvider = createOAuthProvider("google", oauthConfig);
  const newTokens = await googleProvider.refreshAccessToken(account.refresh_token);

  // Actualizar en BD
  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: newTokens.access_token,
      expires_at: newTokens.expires_at
    }
  });

  return newTokens.access_token;
}
```

---

## Configuración

### 1. Google Cloud Console

Ver `SETUP_GOOGLE_OAUTH.md` para instrucciones detalladas.

**Resumen:**
1. Crear proyecto en Google Cloud Console
2. Habilitar APIs: Google+ API, Google Calendar API
3. Configurar OAuth Consent Screen
4. Crear credenciales OAuth 2.0
5. Añadir Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (obligatorio para login con NextAuth v5)
   - `http://localhost:3000/api/integrations/calendar/callback` (para calendario)
6. Añadir scopes:
   - `openid`, `userinfo.email`, `userinfo.profile`
   - `calendar`

### 2. Variables de Entorno

```bash
# .env.local
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-tu-client-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Base de Datos

Asegúrate de que las migraciones estén aplicadas:

```bash
npx prisma migrate deploy
```

---

## Uso

### Como Empleado

1. **Conectar calendario:**
   - Ve a `/empleado/settings/integraciones`
   - Click en "Conectar Mi Calendario"
   - Autoriza los permisos de Google
   - Aparecerá "Calendario Principal - Conectado"

2. **Ver ausencias sincronizadas:**
   - Abre Google Calendar
   - Tus ausencias aprobadas aparecerán automáticamente
   - Los eventos tienen colores según tipo:
     - 🟢 Verde: Vacaciones
     - 🔴 Rojo: Enfermedad
     - 🟡 Amarillo: Otro

3. **Desconectar calendario:**
   - Ve a `/empleado/settings/integraciones`
   - Click en "Desconectar"
   - Los eventos NO se eliminan de Google Calendar (solo se detiene la sincronización)

### Como HR Admin

1. **Conectar calendario de empresa:**
   - Ve a `/hr/settings/integraciones`
   - Click en "Conectar calendario de empresa"
   - Autoriza con una cuenta de Google compartida
   - Todas las ausencias de todos los empleados se sincronizarán

2. **Aprobar ausencias:**
   - Al aprobar una ausencia, se sincroniza automáticamente
   - Si hay error, la ausencia se aprueba igual (la sincronización no es bloqueante)

### Sincronizar Ausencias Existentes

Si conectaste el calendario DESPUÉS de tener ausencias aprobadas:

```bash
# Como empleado logueado, abre:
http://localhost:3000/api/integrations/calendar/sync-existing
```

Este endpoint sincroniza todas tus ausencias aprobadas existentes.

---

## Roadmap: Tipo B

### Integración Bidireccional Completa

**Objetivo:** Ver y gestionar eventos de Google Calendar dentro de Clousadmin.

### Fase 1: Visualización de Calendario (2-3 días)

**Crear componente de calendario en Clousadmin:**

```typescript
// components/calendar/calendar-view.tsx
- Integrar librería: react-big-calendar o FullCalendar
- Cargar eventos desde Google Calendar API
- Mostrar ausencias + eventos de Google Calendar juntos
- Diferentes colores para distinguir:
  - Ausencias de Clousadmin (azul)
  - Eventos de Google (gris)
```

**Nuevo endpoint API:**

```typescript
// app/api/integrations/calendar/events/route.ts
GET /api/integrations/calendar/events?start=2025-11-01&end=2025-11-30

// Respuesta:
{
  events: [
    {
      id: "...",
      title: "Reunión con cliente",
      start: "2025-11-15T10:00:00Z",
      end: "2025-11-15T11:00:00Z",
      source: "google_calendar",
      editable: false
    },
    {
      id: "ausencia-id",
      title: "Vacaciones - Juan Pérez",
      start: "2025-11-16",
      end: "2025-11-17",
      source: "clousadmin",
      editable: true
    }
  ]
}
```

**Implementación:**

```typescript
// lib/integrations/calendar/calendar-manager.ts
static async getCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  // 1. Obtener integración del usuario
  const integracion = await prisma.integracion.findFirst({
    where: { usuarioId, tipo: "calendario", activa: true }
  });

  // 2. Obtener eventos de Google Calendar
  const validToken = await OAuthManager.getValidAccessToken(...);
  const googleCalendar = google.calendar({ version: "v3" });
  const response = await googleCalendar.events.list({
    calendarId: integracion.calendarId,
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    auth: this.getOAuth2Client(validToken)
  });

  // 3. Obtener ausencias de Clousadmin
  const ausencias = await prisma.ausencia.findMany({
    where: {
      empleadoId: usuario.empleadoId,
      fechaInicio: { gte: startDate },
      fechaFin: { lte: endDate }
    }
  });

  // 4. Combinar y retornar
  return [
    ...response.data.items.map(event => ({
      id: event.id,
      title: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      source: "google_calendar",
      editable: false
    })),
    ...ausencias.map(a => ({
      id: a.id,
      title: `${a.tipo} - ${a.empleado.nombre}`,
      start: a.fechaInicio,
      end: a.fechaFin,
      source: "clousadmin",
      editable: true
    }))
  ];
}
```

### Fase 2: Crear Eventos desde Clousadmin (1-2 días)

**Funcionalidad:**
- Crear eventos en Google Calendar desde Clousadmin
- Útil para bloquear tiempo, reuniones, etc.

```typescript
// app/api/integrations/calendar/events/route.ts
POST /api/integrations/calendar/events
{
  title: "Reunión de equipo",
  start: "2025-11-20T10:00:00Z",
  end: "2025-11-20T11:00:00Z",
  description: "Reunión semanal"
}

// Implementación:
static async createEvent(
  userId: string,
  event: CreateEventInput
): Promise<string> {
  const validToken = await OAuthManager.getValidAccessToken(...);
  const googleCalendar = google.calendar({ version: "v3" });

  const response = await googleCalendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.title,
      description: event.description,
      start: { dateTime: event.start },
      end: { dateTime: event.end }
    },
    auth: this.getOAuth2Client(validToken)
  });

  return response.data.id;
}
```

### Fase 3: Sincronización Bidireccional con Webhooks (3-4 días)

**NOTA:** Los webhooks solo funcionan en producción (requieren HTTPS).

**Objetivo:** Detectar cambios en Google Calendar y reflejarlos en Clousadmin.

**Implementación:**

```typescript
// 1. Configurar webhook al conectar calendario
// app/api/integrations/calendar/callback/route.ts
const watchResponse = await googleCalendar.channels.watch({
  calendarId: "primary",
  requestBody: {
    id: uuidv4(),
    type: "web_hook",
    address: `${NEXT_PUBLIC_APP_URL}/api/integrations/calendar/webhook`,
    expiration: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 días
  }
});

// Guardar channelId y resourceId en config
await prisma.integracion.update({
  where: { id: integracion.id },
  data: {
    config: {
      ...config,
      webhookChannelId: watchResponse.data.id,
      webhookResourceId: watchResponse.data.resourceId
    }
  }
});

// 2. Endpoint para recibir notificaciones
// app/api/integrations/calendar/webhook/route.ts
POST /api/integrations/calendar/webhook
Headers:
  X-Goog-Channel-ID: "channel-id"
  X-Goog-Resource-State: "sync" | "exists" | "not_exists"

export async function POST(req: NextRequest) {
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceState = req.headers.get("x-goog-resource-state");

  // Buscar integración por channelId
  const integracion = await prisma.integracion.findFirst({
    where: {
      config: { path: ["webhookChannelId"], equals: channelId }
    }
  });

  if (!integracion) return NextResponse.json({ ok: true });

  // Si es "sync", ignorar (es confirmación inicial)
  if (resourceState === "sync") {
    return NextResponse.json({ ok: true });
  }

  // Obtener cambios desde Google Calendar
  const validToken = await OAuthManager.getValidAccessToken(...);
  const events = await googleCalendar.events.list({
    calendarId: integracion.calendarId,
    syncToken: integracion.config.syncToken // Token de última sincronización
  });

  // Procesar cambios
  for (const event of events.data.items) {
    if (event.status === "cancelled") {
      // Evento eliminado en Google → Cancelar ausencia en Clousadmin
      await handleEventDeleted(event.id, integracion);
    } else {
      // Evento creado/actualizado → Opcional: crear/actualizar en Clousadmin
      // (depende de si quieres importar eventos de Google como ausencias)
    }
  }

  // Guardar nuevo syncToken
  await prisma.integracion.update({
    where: { id: integracion.id },
    data: {
      config: {
        ...integracion.config,
        syncToken: events.data.nextSyncToken
      }
    }
  });

  return NextResponse.json({ ok: true });
}

// 3. Renovar webhooks periódicamente (expiran cada 7 días)
// Crear un cron job o scheduled task
```

### Fase 4: Vista de Disponibilidad de Equipo (2-3 días)

**Para HR Admin/Manager:**

```typescript
// Componente: components/calendar/team-availability.tsx
- Mostrar calendarios de todo el equipo lado a lado
- Ver quién está disponible en un rango de fechas
- Útil para planificar reuniones y asignar trabajo

// Endpoint:
GET /api/integrations/calendar/team-availability?start=2025-11-01&end=2025-11-30&teamId=xxx

// Respuesta:
{
  teamMembers: [
    {
      empleadoId: "...",
      nombre: "Juan Pérez",
      events: [...]  // Eventos de Google + ausencias
    },
    ...
  ]
}
```

### Estimación Total: 8-12 días de desarrollo

**Dependencias técnicas:**
- Librería de calendario: react-big-calendar o FullCalendar
- Webhooks: Requiere dominio con HTTPS (no funciona en localhost)
- Cron jobs: Para renovar webhooks cada 7 días

---

## Troubleshooting

### Error: "Request had insufficient authentication scopes"

**Causa:** Los scopes configurados no son suficientes.

**Solución:**
1. Ve a Google Cloud Console → OAuth consent screen
2. Asegúrate de tener el scope `https://www.googleapis.com/auth/calendar`
3. Revoca el acceso previo: https://myaccount.google.com/permissions
4. Vuelve a conectar el calendario

### Error: "invalid_state" en callback

**Causa:** La cookie `oauth_state` expiró o no coincide.

**Solución:**
1. Verifica que las cookies estén habilitadas
2. Intenta de nuevo (el state expira en 10 minutos)
3. Si persiste, limpia cookies del navegador

### Las ausencias no se sincronizan

**Diagnóstico:**
```sql
-- 1. Verificar que la integración existe
SELECT * FROM integraciones WHERE tipo = 'calendario';

-- 2. Verificar que tiene calendarId
SELECT id, "calendarId", activa FROM integraciones WHERE tipo = 'calendario';

-- 3. Verificar que la ausencia está aprobada
SELECT id, estado, "aprobadaEn" FROM ausencias WHERE estado IN ('en_curso', 'completada');
```

**Soluciones:**
- Si no hay integración: Conectar calendario desde settings
- Si calendarId es null: Desconectar y volver a conectar
- Si la ausencia no está aprobada: Las ausencias solo se sincronizan al aprobarlas

### Sincronizar ausencias existentes

Si conectaste el calendario después de aprobar ausencias:

```bash
# Abre esta URL mientras estás logueado:
http://localhost:3000/api/integrations/calendar/sync-existing
```

### Token expirado

Los tokens se renuevan automáticamente, pero si hay error:

**Solución:**
1. Desconectar calendario desde settings
2. Volver a conectar
3. Los tokens se actualizarán

---

## Referencias

- [Google Calendar API](https://developers.google.com/calendar/api/v3/reference)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar Push Notifications](https://developers.google.com/calendar/api/guides/push)

---

**Última actualización:** 2025-11-10
**Versión:** 1.0 (Tipo A completo)
