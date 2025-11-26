# Autenticación y Onboarding

## Visión General

Sistema de autenticación robusto que soporta múltiples métodos de autenticación:
- ✅ Login local con email/contraseña (bcrypt)
- ✅ Google OAuth (NextAuth v5)
- ✅ Recuperación de contraseña
- ✅ Autenticación en dos pasos (2FA TOTP + Backup Codes) 

**Dos tipos de invitaciones:**
- **Invitación de Signup**: Para crear una nueva empresa y el primer HR Admin (requiere token de invitación)
- **Invitación de Empleado**: Para añadir empleados a una empresa existente (requiere HR Admin)

**Acceso:**
- Las empresas **solo** pueden crearse mediante invitación (no hay signup público)
- Los usuarios sin cuenta pueden unirse a la **waitlist**
- Los empleados se añaden mediante invitación del HR Admin

---

## Flujos de Autenticación

### 1. Crear Empresa y Cuenta (Signup con Invitación)

**Este flujo es para crear una nueva empresa y el primer HR Admin simultáneamente.**

#### Paso 1: Administrador de Plataforma invita a crear empresa

**Solo el administrador de la plataforma puede enviar invitaciones de signup.**

**Endpoint:** `POST /api/admin/invitar-signup`

**Autenticación:** Header `x-admin-key` con `PLATFORM_ADMIN_SECRET_KEY`

```bash
curl -X POST http://localhost:3000/api/admin/invitar-signup \
  -H "Content-Type: application/json" \
  -H "x-admin-key: TU_CLAVE_SECRETA" \
  -d '{"email":"nuevo@empresa.com"}'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Invitación enviada correctamente",
  "url": "http://localhost:3000/signup?token=abc123..."
}
```

📖 **Ver documentación completa:** [`docs/INVITAR_USUARIOS.md`](../INVITAR_USUARIOS.md)

#### Paso 2: Usuario recibe invitación

1. Usuario recibe email con enlace: `/signup?token=...`
2. O puede compartirse manualmente la URL de la respuesta

#### Paso 3: Usuario completa signup

1. Accede a `/signup?token=...`
2. Sistema verifica automáticamente:
   - Token válido
   - No expirado (7 días)
   - No usado previamente
3. Si válido, muestra formulario con:
   - **Email pre-rellenado y bloqueado** (viene de la invitación)
   - Campos para:
     - Nombre de la empresa *
     - Sitio web (opcional)
     - Nombre del administrador *
     - Apellidos del administrador *
     - Contraseña (mínimo 8 caracteres) *
4. Al enviar, el sistema:
   - Valida que el email coincida con la invitación
   - Hashea la contraseña con bcrypt
   - **Crea en transacción:**
     - Empresa
     - Usuario HR Admin
     - Empleado (vinculado al usuario)
   - Marca invitación como usada
   - Autentica automáticamente al usuario
   - **Continúa en el mismo flujo de signup** (no redirige a otra página)

**Server Action:** `signupEmpresaAction` en `app/(auth)/signup/actions.ts`

#### Paso 4: Onboarding Inicial de la Empresa (Continuación en `/signup`)

Después de crear la cuenta en el Paso 0, el usuario HR Admin continúa en la misma página `/signup` para completar la configuración inicial de la empresa. Este proceso consta de **7 pasos totales (0-6)**:

**Paso 0 - Crear Cuenta:**
- Nombre de la empresa *
- Sitio web (opcional)
- Nombre del administrador *
- Apellidos del administrador *
- Contraseña (mínimo 8 caracteres) *
- Consentimiento de tratamiento de datos *

**Paso 1 - Importar Empleados:**
- Importación masiva desde Excel con procesamiento IA
- Preview completo antes de confirmar
- Los empleados se crean sin jornada asignada (se asignará en el paso 3)

**Paso 2 - Configurar Sedes:**
- Crear sedes (oficinas) de la empresa
- Asignación automática a equipos o toda la empresa
- Cambios se persisten automáticamente

**Paso 3 - Jornada Laboral:**
- Configuración de la jornada predefinida (40h flexible por defecto, editable)
- Tipos: Fija (horario específico) o Flexible (horas semanales)
- Configuración de días laborables y descansos
- La jornada se guarda y se asigna automáticamente a todos los empleados sin jornada

**Paso 4 - Calendario Laboral:**
- Configuración del calendario laboral por defecto (días laborables: L-V, festivos nacionales)
- Gestión de festivos (importar desde archivo ICS/CSV o crear manualmente)
- Vista de calendario visual y lista de festivos

**Paso 5 - Integraciones (Opcional):**
- Configuración de integraciones opcionales (Google Calendar, etc.)

**Paso 6 - Invitar Administradores HR (Opcional):**
- Invitar otros miembros del equipo como HR Admin
- Puede seleccionar empleados ya importados en el paso 1
- Enlaces de invitación generados con URL de producción
- Al finalizar, completa el onboarding y redirige a `/hr/dashboard`

> **Nota importante:** 
> - La jornada por defecto **no se crea automáticamente** al crear la cuenta. Se configura en el paso 3 del onboarding.
> - Los empleados importados en el paso 1 quedan sin jornada hasta completar el paso 3.
> - El calendario laboral (días laborables y festivos) se configura en el paso 4.
> - Todos los pasos se completan en una única ruta: `/signup` (no hay redirección a otras páginas).

---

### 2. Waitlist (Lista de Espera)

**Para usuarios que quieren crear cuenta pero no tienen invitación.**

#### Acceso a waitlist

1. Desde `/login`: El banner "¿No tienes cuenta?" incluye un botón **Solicitar invitación** que abre un modal inline con el formulario de waitlist (sin salir de la página de login).
2. Directamente: `/waitlist` (página dedicada)
3. Por mensajes de error: Si un email no existe, se mantiene el aviso y CTA hacia la espera.

#### Formulario

- Nombre completo *
- Email corporativo *
- Empresa *
- Contexto/Mensaje adicional (opcional)

#### Proceso

1. Usuario completa formulario (modal desde `/login` o página `/waitlist`)
2. Entrada guardada en tabla `waitlist`
3. Se envían dos emails automáticamente:
   - Confirmación al usuario (`sendWaitlistConfirmationEmail`)
   - Notificación interna a `WAITLIST_NOTIFY_EMAIL` (configurado en `.env.local`)
4. Administrador de plataforma revisa `/platform/invitaciones` y convierte la solicitud en invitación
5. Usuario recibe invitación por email automáticamente

**Server Action:** `agregarAWaitlistAction` en `app/(auth)/waitlist/actions.ts`

---

### 3. Login Local (bcrypt)

**Credenciales de prueba:**

| Rol       | Email                            | Contraseña    |
|-----------|----------------------------------|---------------|
| HR Admin  | admin@clousadmin.com             | Admin123!     |
| Manager   | carlos.martinez@clousadmin.com   | Empleado123!  |
| Empleado  | ana.garcia@clousadmin.com        | Empleado123!  |

**Flujo:**
1. Usuario accede a `/login`
2. Ingresa email y contraseña
3. Sistema valida credenciales con bcrypt
4. Si el email no existe:
   - Muestra mensaje: "No tienes cuenta? Necesitas una invitación para crear una cuenta"
   - Opción para ir a `/waitlist`
5. Si el email existe, valida contraseña
6. Crea sesión JWT (cookie `clousadmin-session`, 7 días de duración)
7. Redirige según rol:
   - `platform_admin` → `/platform/invitaciones`
   - `hr_admin` → `/hr/dashboard`
   - `manager` → `/manager/dashboard`
   - `empleado` → `/empleado/dashboard`

---

### 4. Invitación de Empleados

**Solo HR Admin puede enviar invitaciones.**

#### Paso 1: HR crea empleado
Desde `Organización > Personas > + Crear persona`

#### Paso 2: Enviar invitación
**Endpoint:** `POST /api/empleados/invitar`

```json
{
  "empleadoId": "uuid-del-empleado",
  "email": "empleado@empresa.com"
}
```

**Respuesta:**
```json
{
  "success": true,
  "url": "http://localhost:3000/onboarding/TOKEN",
  "message": "Invitación enviada correctamente"
}
```

#### Paso 3: Empleado acepta invitación
1. Empleado recibe email con link: `/onboarding/TOKEN`
2. Accede a la página de onboarding
3. Sistema verifica:
   - Token válido
   - No aceptada previamente
   - No expirada (7 días)
4. Empleado crea su contraseña (mínimo 8 caracteres)
5. Sistema:
   - Hashea contraseña con bcrypt
   - Actualiza usuario: `password`, `emailVerificado: true`, `activo: true`
   - Marca empleado: `onboardingCompletado: true`
   - Marca invitación: `aceptada: true`
6. Redirige a `/login?onboarding=success`

**Endpoint:** `POST /api/empleados/aceptar-invitacion`

```json
{
  "token": "TOKEN",
  "password": "MiContraseñaSegura123!"
}
```

---

### 5. Google OAuth (NextAuth)

**Estado:** ✅ En producción

**Flujo:**
1. Usuario hace clic en "Continuar con Google" en `/login`
2. NextAuth redirige a Google para autorización
3. Google redirige a `/api/auth/callback/google` (callback oficial NextAuth v5)
4. Se crea sesión JWT propia (`lib/auth.ts`) y se persisten tokens OAuth en `Account`
5. Redirige al dashboard según rol del usuario

**Características:**
- Implementado con NextAuth v5 (`app/api/auth/[...nextauth]/route.ts`)
- Solo usuarios existentes pueden autenticarse (no se crean cuentas sin invitación)
- Los roles se respetan igual que en login local
- Si el email de Google no está verificado, se rechaza el login
- Los tokens OAuth se almacenan en la tabla `Account` para uso en integraciones

**Configuración:**
📖 **Ver guía completa:** [`docs/SETUP_GOOGLE_OAUTH.md`](../SETUP_GOOGLE_OAUTH.md)

**Variables de entorno requeridas:**
```env
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
NEXTAUTH_URL=https://tudominio.com
NEXTAUTH_SECRET=clave-super-secreta
```

**Importante:** La URI de callback `/api/auth/callback/google` debe estar registrada en Google Cloud Console.

---

### 6. Recuperación de contraseña (Password Recovery)

**Estado:** ✅ En producción

**Endpoints:**
- `POST /api/auth/recovery/request` → recibe email, aplica rate limiting y envía enlace firmado (válido 1h) usando Resend.
- `POST /api/auth/recovery/reset` → valida token y actualiza la contraseña (invalidando todas las sesiones activas).

**UI:**
- `/forgot-password` formulario público para solicitar el email.
- `/reset-password/[token]` formulario protegido que valida el token antes de permitir el cambio.

**Plantillas de email:** `lib/emails/password-recovery.ts`

---

### 7. Autenticación en dos pasos (2FA TOTP + Backup Codes)

**Estado:** ✅ En producción

**Características:**
- Configuración disponible en `/configuracion/seguridad`.
- Flujo guiado con QR + código de verificación inicial.
- 10 códigos de respaldo generados y almacenados con hash.
- Desactivación requiere contraseña del usuario.

**Login flow:**
1. Credenciales válidas + `totpEnabled=true` ⇒ se genera challenge temporal y se guarda en cookie `clousadmin-2fa`.
2. Usuario es redirigido a `/verify-otp` donde debe introducir TOTP o un backup code.
3. Tras verificar se crea sesión completa y se borra el challenge.

**Helpers clave:**
- `lib/auth/two-factor.ts` → generación/verificación de secretos, QR y backup codes.
- `createTwoFactorChallenge / validateTwoFactorChallenge` en `lib/auth.ts`.

---

## Modelo de Datos

### Usuario

```prisma
model Usuario {
  id              String   @id @default(uuid())
  empresaId       String
  empleadoId      String?  @unique // NULL si es admin sin empleado
  email           String   @unique
  password        String?  // Bcrypt hash
  cognitoId       String?  @unique // DEPRECADO: Campo legacy, no se usa (solo JWT)
  rol             String   @default("empleado") // 'hr_admin', 'manager', 'empleado'
  nombre          String
  apellidos       String
  avatar          String?  // DEPRECADO: Usar empleado.fotoUrl como fuente única de verdad
  activo          Boolean  @default(true)
  emailVerificado Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  ultimoAcceso    DateTime?
  
  // Relations
  empresa         Empresa
  empleado        Empleado?
  accounts        Account[]   // Para NextAuth OAuth
  sessions        Session[]   // Para NextAuth sessions
}
```

### InvitacionEmpleado

```prisma
model InvitacionEmpleado {
  id          String   @id @default(uuid())
  empresaId   String
  empleadoId  String   @unique
  email       String
  token       String   @unique // 64 caracteres hex
  expiraEn    DateTime // +7 días desde creación
  aceptada    Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  empresa     Empresa
  empleado    Empleado
}
```

### InvitacionSignup (Invitaciones para crear empresa)

```prisma
model InvitacionSignup {
  id          String    @id @default(uuid())
  email       String    @unique
  token       String    @unique // 64 caracteres hex
  expiraEn    DateTime
  usada       Boolean   @default(false)
  usadoEn     DateTime?
  invitadoPor String?   // Email del admin que envió la invitación
  createdAt   DateTime  @default(now())

  @@index([token])
  @@index([email])
  @@index([usada])
  @@map("invitaciones_signup")
}
```

### Waitlist (Lista de espera)

```prisma
model Waitlist {
  id         String    @id @default(uuid())
  email      String    @unique
  nombre     String?   @db.VarChar(200)
  empresa    String?   @db.VarChar(200) // Nombre de la empresa que quieren crear
  mensaje    String?   @db.Text
  invitado   Boolean   @default(false) // Si se convierte en invitación
  invitadoEn DateTime?
  createdAt  DateTime  @default(now())

  @@index([email])
  @@index([invitado])
  @@map("waitlist")
}
```

---

## 📡 API ENDPOINTS

### POST /api/admin/invitar-signup

**Auth:** `x-admin-key` header con `PLATFORM_ADMIN_SECRET_KEY`

**Body:**
```json
{
  "email": "nuevo@empresa.com"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Invitación enviada correctamente",
  "url": "https://tu-dominio.com/signup?token=abc123..."
}
```

**Errors:**
- `403` No autorizado (clave incorrecta)
- `400` Email inválido o faltante
- `500` Error al crear invitación

📖 **Ver documentación completa:** [`docs/INVITAR_USUARIOS.md`](../INVITAR_USUARIOS.md)

---

### POST /api/empleados/invitar

**Auth:** Solo HR Admin

**Body:**
```json
{
  "empleadoId": "string (uuid)",
  "email": "string (email)"
}
```

**Response 200:**
```json
{
  "success": true,
  "url": "string",
  "message": "Invitación enviada correctamente"
}
```

**Errors:**
- `403` No autorizado (no es HR Admin)
- `400` Faltan datos requeridos
- `404` Empleado no encontrado
- `500` Error al crear invitación

---

### POST /api/empleados/aceptar-invitacion

**Auth:** No requerida (usa token de invitación)

**Body:**
```json
{
  "token": "string (64 chars hex)",
  "password": "string (min 8 chars)"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Cuenta creada correctamente"
}
```

**Errors:**
- `400` Faltan datos / Password muy corta / Invitación inválida
- `500` Error al crear cuenta

### GET /api/empleados/[id]
**Auth:** HR Admin o propio empleado

**Respuesta:**
```json
{
  "id": "uuid",
  "nombre": "string",
  "apellidos": "string",
  "email": "string",
  "activo": boolean,
  "onboardingCompletado": boolean,
  "empleado": { ... }
}
```

### PATCH /api/empleados/[id]
**Auth:** HR Admin o propio empleado (limitado)

**Body:**
```json
{
  "nombre": "string",
  "apellidos": "string",
  "email": "string"
}
```

**Nota:** Solo HR puede modificar campos sensibles. Empleado solo puede modificar algunos datos personales.

### POST /api/empleados/[id]/avatar
**Auth:** HR Admin o propio empleado

**Body:** FormData con archivo imagen (JPG, PNG, WEBP, máx. 2MB)

**Respuesta:**
```json
{
  "success": true,
  "url": "string (URL del avatar)",
  "message": "Avatar actualizado correctamente"
}
```

**Nota:** Este endpoint actualiza solo `empleado.fotoUrl` como fuente única de verdad. El campo `usuario.avatar` está deprecado y no se actualiza. La sesión JWT copia el avatar desde `empleado.fotoUrl` al hacer login.

**Almacenamiento:**
- Las imágenes se suben a Hetzner Object Storage (o almacenamiento local en desarrollo)
- Se configuran con ACL `public-read` para acceso público
- Ruta: `avatars/{empresaId}/{empleadoId}/{timestamp}-{random}.{ext}`

**Frontend:**
- Usa el componente `EmployeeAvatar` de `@/components/shared/employee-avatar` para renderizar avatares de forma consistente
- El componente maneja automáticamente fallbacks con iniciales y colores consistentes usando `getAvatarStyle` y `getInitials`

---

## Seguridad

### Passwords
- **Hash:** bcrypt (salt rounds: 12)
- **Mínimo:** 8 caracteres
- **Nunca** se almacenan en texto plano
- **Verificación:** `bcrypt.compare()`

### Sesiones JWT
- **Secret:** `NEXTAUTH_SECRET` (env var)
- **Algoritmo:** HS256
- **Duración:** 7 días
- **Cookie:** `clousadmin-session`
- **Flags:** `httpOnly`, `secure` (prod), `sameSite: lax`

### Tokens de Invitación

#### Invitación de Signup (Empresa)
- **Generación:** `crypto.randomBytes(32).toString('hex')`
- **Longitud:** 64 caracteres hexadecimales
- **Único:** Index en DB
- **Expiración:** 7 días
- **Un solo uso:** `usada: true` al completar signup
- **Ubicación:** Tabla `invitaciones_signup`

#### Invitación de Empleado
- **Generación:** `crypto.randomBytes(32).toString('hex')`
- **Longitud:** 64 caracteres hexadecimales
- **Único:** Index en DB
- **Expiración:** 7 días
- **Un solo uso:** `aceptada: true` al aceptar
- **Ubicación:** Tabla `InvitacionEmpleado`

---

## Middleware de Protección

**Archivo:** `middleware.ts`

**Rutas públicas:**
- `/login`
- `/signup` (requiere token de invitación válido en URL)
- `/waitlist`
- `/onboarding/*`
- `/_next/*` (assets)
- Archivos estáticos

**Rutas protegidas:**
- `/hr/*` → Solo `hr_admin`
- `/manager/*` → Solo `manager`
- `/empleado/*` → Solo `empleado`

**Lógica:**
1. Verifica cookie `clousadmin-session`
2. Valida JWT
3. Si inválido → redirect `/login?callbackUrl=...`
4. Si válido → verifica rol para ruta
5. Si rol incorrecto → redirect a dashboard apropiado

---

## Troubleshooting

### "No tienes un empleado asignado"

**Causa:** `Usuario.empleadoId` es `null`

**Solución:**
```bash
npx tsx scripts/fix-usuarios-sin-empleado.ts
```

Este script vincula automáticamente usuarios con sus empleados asociados.

---

### Error al iniciar sesión

**Posibles causas:**
1. **Password incorrecta:** Verificar credenciales de prueba
2. **Usuario inactivo:** Verificar `usuario.activo === true` en DB
3. **Database desconectada:** Verificar `DATABASE_URL` en `.env.local`

**Debug:**
```javascript
// En app/(auth)/login/actions.ts
console.log('[loginAction] Usuario encontrado:', usuario)
console.log('[loginAction] Password válida:', isValid)
```

---

### Error al hacer signup: "Se requiere una invitación válida"

**Causas:**
1. **No hay token en URL:** La URL debe ser `/signup?token=...`
2. **Token inválido:** El token no existe o ha expirado
3. **Token ya usado:** La invitación ya fue utilizada
4. **Email no coincide:** El email del formulario debe coincidir con el de la invitación

**Solución:**
- Verificar que la URL tenga el parámetro `token`
- Verificar en la base de datos (`invitaciones_signup`) que el token existe y no está usado
- Si el token expiró, crear una nueva invitación desde `/api/admin/invitar-signup`

---

### La página de signup se ve igual que login

**Causa:** Cache del navegador o middleware bloqueando

**Solución:**
1. Verificar que `/signup` esté en `publicPaths` del middleware
2. Hacer hard refresh: `Ctrl+Shift+R` (Windows/Linux) o `Cmd+Shift+R` (Mac)
3. Verificar que la URL tenga `?token=...`

---

### Email no existe - Redirección a waitlist

**Comportamiento esperado:** Si intentas hacer login con un email que no existe, se muestra opción para ir a `/waitlist`.

**Si quieres crear una cuenta:**
1. Ir a `/waitlist`
2. Completar formulario
3. Esperar a que el administrador de plataforma te invite
4. O contactar directamente al administrador para obtener invitación

---

### Invitación expirada

**Duración:** 7 días desde creación

**Solución:** HR Admin debe reenviar invitación
1. Ir a perfil del empleado
2. Click "Reenviar invitación" (TODO: implementar UI)
3. O crear nueva desde API

---

### Google OAuth - troubleshooting

**Error: "redirect_uri_mismatch"**
- Verifica que `/api/auth/callback/google` esté registrado en Google Cloud Console
- La URI debe coincidir exactamente (incluyendo protocolo `http://` o `https://`)
- Asegúrate de que `NEXTAUTH_URL` coincida con tu dominio

**Error: "Google OAuth not configured"**
- Verifica que `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL` estén definidos
- Reinicia el servidor después de añadir las variables

**Otros errores comunes:**
📖 **Ver troubleshooting completo:** [`docs/SETUP_GOOGLE_OAUTH.md#troubleshooting`](../SETUP_GOOGLE_OAUTH.md#troubleshooting)

---

## Próximos Pasos

### Fase 1 (Actual) ✅
- [x] Login local con bcrypt
- [x] Invitaciones por email (empleados)
- [x] Invitaciones de signup (crear empresa)
- [x] Waitlist para usuarios sin invitación
- [x] Onboarding de empleados
- [x] Onboarding de empresa (signup)
- [x] Fix de empleadoId en seed
- [x] UI moderna para login/onboarding/signup

### Fase 2 (Completado) ✅
- [x] Google OAuth completamente funcional
- [x] Envío de emails de invitación (Resend) - Ver `docs/CONFIGURACION_RESEND.md`
- [x] Recuperación de contraseña
- [x] 2FA (Two-Factor Authentication)

### Fase 3 (Futuro)
- [ ] Botón "Reenviar invitación" en UI
- [ ] Microsoft Azure AD / Outlook OAuth
- [ ] SSO empresarial
- [ ] Audit log de sesiones
- [ ] Política de expiración de contraseñas
- [ ] Verificación de email adicional

---

## Referencias

- **Configuración inicial**: [`docs/SETUP.md`](../SETUP.md)
- **Invitaciones de signup**: [`docs/INVITAR_USUARIOS.md`](../INVITAR_USUARIOS.md)
- **Google OAuth**: [`docs/SETUP_GOOGLE_OAUTH.md`](../SETUP_GOOGLE_OAUTH.md)
- **Arquitectura**: [`docs/ARQUITECTURA.md`](../ARQUITECTURA.md#autenticación-y-autorización)

---

---

## 🔧 Troubleshooting - Onboarding

### Problema: Redirección automática a /hr/dashboard durante onboarding

**Síntoma:**
- Al hacer clic en "Anterior" durante el onboarding, el usuario es redirigido a `/hr/dashboard`
- El progreso del onboarding se pierde

**Causa:**
- El layout de HR (`app/(dashboard)/hr/layout.tsx`) redirige si `onboardingCompletado = false`
- El usuario tiene sesión activa pero el onboarding no está completado

**Solución implementada (2025-01-27):**
- El componente `SignupForm` ahora previene redirecciones automáticas con `useEffect`
- El `history.pushState` mantiene al usuario en la página de onboarding
- Solo al completar el paso 6 y llamar a `completarOnboardingAction()` se permite la redirección

### Problema: Timeouts al importar empleados (P2028)

**Síntoma:**
- Error: "Transaction API error: Unable to start a transaction in the given time"
- Error: "Transaction already closed: timeout exceeded"
- Solo algunos empleados se importan correctamente

**Causa:**
- Encriptación de datos sensibles (NIF, NSS, IBAN, salarios) consume tiempo
- Concurrencia alta (8 paralelos) satura la base de datos
- Timeout de 15s insuficiente para transacciones complejas

**Solución implementada (2025-01-27):**
- Timeout aumentado: 15s → 60s
- Concurrencia reducida: 8 → 3 empleados en paralelo
- Documentados nuevos límites en código y docs

**Resultado:**
- Importaciones de 20-50 empleados completan sin errores
- Mayor estabilidad en producción

---

**Última actualización:** 27 de enero 2025  
**Autor:** Clousadmin Dev Team






