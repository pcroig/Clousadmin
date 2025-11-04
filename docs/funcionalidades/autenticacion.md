# Autenticación y Onboarding

## Visión General

Sistema de autenticación robusto que soporta login local (bcrypt) y prepara para Google OAuth. 

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
   - Redirige a `/onboarding/cargar-datos`

**Server Action:** `signupEmpresaAction` en `app/(auth)/signup/actions.ts`

---

### 2. Waitlist (Lista de Espera)

**Para usuarios que quieren crear cuenta pero no tienen invitación.**

#### Acceso a waitlist

1. Desde `/login`: Si un email no existe, se muestra opción "Únete a la waitlist"
2. Directamente: `/waitlist`

#### Formulario

- Email *
- Nombre (opcional)
- Nombre de empresa (opcional)
- Mensaje adicional (opcional)

#### Proceso

1. Usuario completa formulario
2. Entrada guardada en tabla `Waitlist`
3. Administrador de plataforma puede revisar y convertir a invitación
4. Usuario recibe invitación por email

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

### 5. Google OAuth (Preparado para futuro)

**Estado:** Placeholder implementado

**Configuración necesaria:**
1. Crear proyecto en Google Cloud Console
2. Habilitar Google+ API
3. Crear credenciales OAuth 2.0
4. Configurar en `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=tu-client-secret
   ```
5. Instalar dependencias:
   ```bash
   npm install next-auth @auth/prisma-adapter
   ```
6. Configurar adaptador NextAuth (ver `/lib/auth-config.ts`)
7. Ejecutar migración para modelos NextAuth

**Actualmente:** Botón "Continuar con Google" muestra alert informativo.

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
  cognitoId       String?  @unique // Para futuro AWS Cognito
  rol             String   @default("empleado") // 'hr_admin', 'manager', 'empleado'
  nombre          String
  apellidos       String
  avatar          String?
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

**Body:** FormData con archivo imagen

**Respuesta:**
```json
{
  "avatarUrl": "string (URL del avatar)"
}
```

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

### Google OAuth no funciona

**Estado actual:** Placeholder, no implementado

**Pasos para activar:**
1. Instalar `next-auth @auth/prisma-adapter`
2. Configurar Google Cloud Console
3. Añadir variables de entorno
4. Ejecutar migración NextAuth
5. Descomentar lógica en `login-form.tsx`

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

### Fase 2 (Pendiente)
- [ ] Google OAuth completamente funcional
- [ ] Envío de emails de invitación (AWS SES o Resend)
- [ ] Botón "Reenviar invitación" en UI
- [ ] Recuperación de contraseña
- [ ] Verificación de email adicional

### Fase 3 (Futuro)
- [ ] Microsoft Azure AD / Outlook OAuth
- [ ] 2FA (Two-Factor Authentication)
- [ ] SSO empresarial
- [ ] Audit log de sesiones
- [ ] Política de expiración de contraseñas

---

**Última actualización:** 27 de enero 2025  
**Autor:** Clousadmin Dev Team






