# Configuración de Google OAuth y Google Calendar

Esta guía te ayudará a configurar Google OAuth para permitir el login con Google y la integración con Google Calendar en Clousadmin.

## Resumen de Funcionalidades

✅ **Login con Google** - Los usuarios pueden iniciar sesión con su cuenta de Google
✅ **Google Calendar Integration** - Sincronización automática de ausencias con Google Calendar
✅ **Calendarios personales** - Cada empleado puede conectar su propio Google Calendar
✅ **Calendario de empresa** - HR Admin puede conectar un calendario compartido
✅ **Sincronización bidireccional** - Cambios en Google Calendar se reflejan en Clousadmin (webhooks)

## Paso 1: Crear Proyecto en Google Cloud Console

**⚠️ IMPORTANTE**: Esta configuración se hace **UNA SOLA VEZ** como administrador de la plataforma. No es por empresa ni por usuario. Es una configuración global para toda la aplicación Clousadmin.

**¿Qué email usar?**
- Usa **TU email** (el que usas como desarrollador/administrador de Clousadmin)
- Este email es para **acceder a Google Cloud Console** y gestionar las credenciales
- **NO es el email de los usuarios finales** (empleados/HR admins)
- Este email solo se usa para configurar la integración, no aparece en ningún lado visible para usuarios

**¿Para qué sirve este proyecto?**
- Es el "contenedor" en Google Cloud donde configuras las credenciales OAuth
- Permite que Clousadmin se comunique con Google (login y Calendar)
- Es como tener una "licencia" que autoriza a tu aplicación a usar los servicios de Google

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con **tu email** (el del administrador/desarrollador)
3. Crea un nuevo proyecto o selecciona uno existente
4. Asegúrate de que el proyecto esté seleccionado en el dropdown superior

## Paso 2: Habilitar APIs Necesarias

1. Ve a "APIs & Services" > "Library"
2. Busca y habilita las siguientes APIs:
   - **Google+ API** (para obtener información del perfil de usuario)
   - **Google Calendar API** (para la integración de calendario)

## Paso 3: Configurar OAuth Consent Screen

**⚠️ IMPORTANTE**: También se configura **UNA SOLA VEZ** para toda la plataforma.

1. Ve a "APIs & Services" > "OAuth consent screen"
2. Selecciona "External" (para permitir que cualquier usuario con cuenta de Google pueda hacer login)
3. Completa la información requerida:
   - **App name**: Clousadmin
   - **User support email**: **Tu email** (el del administrador - para que Google te contacte si hay problemas)
   - **Developer contact information**: **Tu email** (el mismo - para que Google sepa quién es el desarrollador)
   
   **Nota**: Estos emails son solo para contacto administrativo con Google. Los usuarios finales NO verán estos emails.
4. Click en "Save and Continue"
5. En "Scopes", añade los siguientes scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   - `.../auth/calendar.events`
   - `.../auth/calendar.readonly`
6. Click en "Save and Continue"
7. En "Test users", puedes añadir emails de prueba (opcional si publicas la app)
8. Click en "Save and Continue"

## Paso 4: Crear Credenciales OAuth

1. Ve a "APIs & Services" > "Credentials"
2. Click en "+ CREATE CREDENTIALS" > "OAuth client ID"
3. Selecciona "Web application"
4. Configura:
   - **Name**: Clousadmin Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (desarrollo)
     - `https://tudominio.com` (producción)
  - **Authorized redirect URIs**:
    - `http://localhost:3000/api/auth/callback/google` (desarrollo · NextAuth v5)
    - `http://localhost:3000/api/integrations/calendar/callback` (desarrollo · Calendar)
    - `https://tudominio.com/api/auth/callback/google` (producción · NextAuth v5)
    - `https://tudominio.com/api/integrations/calendar/callback` (producción · Calendar)
    - *(Opcional)* `http(s)://.../api/auth/google/callback` si todavía tienes integraciones antiguas y quieres mantener compatibilidad con enlaces viejos.
5. Click en "Create"
6. **¡Guarda el Client ID y Client Secret!** Los necesitarás en el siguiente paso

## Paso 5: Configurar Variables de Entorno

1. Añade las siguientes variables a tu archivo `.env.local` en la raíz del proyecto:

```bash
# Google OAuth
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret"
```

**Nota**: 
- Si ya tienes un archivo `.env.local`, añade estas variables al final
- Si no tienes `.env.local`, créalo con estas variables (y las demás que necesites según `docs/SETUP.md`)
- `NEXT_PUBLIC_APP_URL` ya debería estar configurado (por defecto `http://localhost:3000`)

2. Reinicia el servidor de desarrollo para que cargue las nuevas variables:

```bash
# Si el servidor está corriendo, deténlo (Ctrl+C) y reinícialo:
npm run dev
```

## Paso 6: Probar Login con Google

1. Ve a `http://localhost:3000/login`
2. Haz click en "Continuar con Google"
3. Selecciona tu cuenta de Google
4. Acepta los permisos solicitados
5. Deberías ser redirigido al dashboard

**Nota**: Si no tienes una cuenta creada en Clousadmin con tu email de Google, verás un error indicando que necesitas una invitación. Esto es intencional en un sistema multi-tenant.

## Paso 7: Conectar Google Calendar

### Calendario Personal (Empleado)

1. Inicia sesión en Clousadmin
2. Ve a "Configuración" > "Integraciones"
3. En la sección "Google Calendar", click en "Conectar calendario personal"
4. Autoriza el acceso a tu Google Calendar
5. Se creará automáticamente un calendario "Clousadmin - Ausencias" en tu cuenta de Google

### Calendario de Empresa (HR Admin)

1. Inicia sesión como HR Admin
2. Ve a "Configuración" > "Integraciones"
3. En la sección "Google Calendar", click en "Conectar calendario de empresa"
4. Autoriza el acceso
5. Se creará un calendario compartido "Clousadmin - Ausencias" que mostrará todas las ausencias de la empresa

## Cómo Funciona la Sincronización

### Ausencias → Google Calendar

Cuando se **aprueba** una ausencia:
1. Se crea automáticamente un evento en todos los calendarios conectados
2. El evento incluye:
   - Título: "Tipo de Ausencia - Nombre Empleado"
   - Fechas: Inicio y fin de la ausencia
   - Descripción: Detalles de la ausencia
   - Color: Según el tipo de ausencia (verde para vacaciones, rojo para enfermedad, etc.)

Cuando se **rechaza o cancela** una ausencia:
1. Se elimina automáticamente el evento del calendario

### Google Calendar → Ausencias (Webhooks)

**⚠️ Requiere URL pública HTTPS en producción**

Si borras un evento de "Ausencia" en Google Calendar:
1. Google envía una notificación webhook a Clousadmin
2. La ausencia correspondiente se marca como "cancelada" automáticamente

## Webhooks en Producción

Para que los webhooks funcionen en producción, necesitas:

1. Un dominio con HTTPS (Google requiere HTTPS para webhooks)
2. Configurar la URL del webhook en la integración
3. El webhook se renueva automáticamente cada 7 días

**Desarrollo local**: Los webhooks no funcionarán en `localhost`. Puedes usar [ngrok](https://ngrok.com/) para crear un túnel HTTPS temporal.

## Troubleshooting

### Error: "Google OAuth not configured"

- Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén en tu `.env`
- Reinicia el servidor de desarrollo después de añadir las variables

### Error: "redirect_uri_mismatch"

- Asegúrate de que las URIs de redirect en Google Cloud Console coincidan exactamente con tu URL
- Verifica que `NEXT_PUBLIC_APP_URL` esté correctamente configurado

### Error: "Access blocked: This app's request is invalid"

- Verifica que hayas añadido todos los scopes necesarios en OAuth Consent Screen
- Si la app está en modo "Testing", añade tu email a los "Test users"

### Error: "No existe una cuenta con este email"

- Esto es esperado. Solo usuarios previamente invitados pueden hacer login
- El HR Admin debe crear primero una cuenta de empleado e invitarlo
- Una vez invitado, el empleado podrá vincular su cuenta de Google

### Calendario no sincroniza

- Verifica que la integración esté activa en "Configuración" > "Integraciones"
- Revisa los logs del servidor para ver si hay errores de OAuth
- Asegúrate de que la ausencia esté en estado "aprobada" o "en_curso"

## Arquitectura Técnica

### Sistema Híbrido

- **JWT actual**: Se mantiene para sesiones (no cambios en el flujo existente)
- **OAuth**: Solo para login con Google y tokens de API
- **Tokens OAuth**: Almacenados en tabla `Account` (modelo NextAuth)
- **Refresh automático**: Los tokens se renuevan automáticamente cuando expiran

### Estructura de Archivos

```
lib/oauth/
├── providers/
│   ├── google.ts           # Google OAuth provider
│   └── index.ts            # Provider factory
├── oauth-manager.ts        # Token management
├── config.ts               # OAuth configuration
└── types.ts                # Shared types

lib/integrations/
├── calendar/
│   ├── providers/
│   │   ├── google-calendar.ts  # Google Calendar API
│   │   └── index.ts
│   ├── calendar-manager.ts     # Sync logic
│   └── types.ts

app/api/auth/google/
├── route.ts                # Start OAuth flow
└── callback/route.ts       # OAuth callback

app/api/integrations/calendar/
├── connect/route.ts        # Connect calendar
├── callback/route.ts       # Calendar OAuth callback
├── disconnect/route.ts     # Disconnect calendar
└── webhook/route.ts        # Webhook handler
```

### Base de Datos

**Modelo Usuario** (modificado):
- `googleId`: ID único de Google (para vincular cuenta)

**Modelo Integracion** (modificado):
- `usuarioId`: Para integraciones personales (NULL = empresa)
- `calendarId`: ID del calendario en Google
- `config`: JSON con tokens OAuth y metadata

**Modelo Account** (existente):
- Almacena tokens OAuth (access_token, refresh_token, expires_at)

## Próximos Pasos

- [ ] Publicar la app en Google Cloud Console (sacarla de modo "Testing")
- [ ] Configurar dominio de producción con HTTPS
- [ ] Implementar integración con Outlook Calendar
- [ ] Añadir más opciones de personalización de calendarios

## Soporte

Si encuentras problemas, revisa:
1. Los logs del servidor (`npm run dev`)
2. La consola de Google Cloud Platform
3. Las variables de entorno en `.env`

---

**Documentación generada por Claude Code** 🤖
