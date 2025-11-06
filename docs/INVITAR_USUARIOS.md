# Cómo Invitar Usuarios al Signup

Esta guía explica cómo invitar usuarios para que creen su cuenta y empresa en Clousadmin.

---

## 📋 Configuración Inicial

### 1. Variables de Entorno

Agrega estas variables a tu `.env.local` (desarrollo) o a tu servidor de producción:

```env
# Clave secreta para invitar usuarios (genera una clave segura de al menos 32 caracteres)
PLATFORM_ADMIN_SECRET_KEY=tu-clave-super-secreta-de-al-menos-32-caracteres-aqui

# Email del administrador de la plataforma (opcional, para registro de quién invita)
PLATFORM_ADMIN_EMAIL=tu-email@plataforma.com
```

**Generar una clave segura:**
```bash
# Opción 1: Usando OpenSSL
openssl rand -hex 32

# Opción 2: Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚀 Uso de la API

### Opción 1: Usando curl (Recomendado)

**Desarrollo:**
```bash
curl -X POST http://localhost:3000/api/admin/invitar-signup \
  -H "Content-Type: application/json" \
  -H "x-admin-key: TU_CLAVE_SECRETA" \
  -d '{"email":"nuevo@empresa.com"}'
```

**Producción:**
```bash
curl -X POST https://tu-dominio.com/api/admin/invitar-signup \
  -H "Content-Type: application/json" \
  -H "x-admin-key: TU_CLAVE_SECRETA" \
  -d '{"email":"nuevo@empresa.com"}'
```

### Opción 2: Usando query parameter (alternativa)

```bash
curl -X POST "https://tu-dominio.com/api/admin/invitar-signup?key=TU_CLAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{"email":"nuevo@empresa.com"}'
```

### Opción 3: Desde código JavaScript/TypeScript

```typescript
const response = await fetch('https://tu-dominio.com/api/admin/invitar-signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-key': process.env.PLATFORM_ADMIN_SECRET_KEY!,
  },
  body: JSON.stringify({
    email: 'nuevo@empresa.com',
  }),
});

const result = await response.json();
console.log(result);
```

---

## ✅ Respuesta Exitosa

```json
{
  "success": true,
  "message": "Invitación enviada correctamente",
  "url": "https://tu-dominio.com/signup?token=abc123..."
}
```

La URL es el enlace que el usuario recibirá por email. También puedes compartirlo manualmente si es necesario.

---

## ❌ Errores Comunes

### Error 403: No autorizado
- Verifica que la clave secreta sea correcta
- Verifica que `PLATFORM_ADMIN_SECRET_KEY` esté configurada en el servidor

### Error 400: Email inválido
- Verifica el formato del email
- Verifica que el email no tenga espacios

### Error 500: Configuración incorrecta
- Verifica que `PLATFORM_ADMIN_SECRET_KEY` esté configurada en el servidor

---

## 📧 Proceso del Usuario Invitado

1. **Recibe email** con enlace de invitación
2. **Hace clic** en el enlace → `https://tu-dominio.com/signup?token=...`
3. **Verificación automática**: El sistema valida el token
4. **Completa formulario**: Nombre de empresa, sus datos personales, contraseña
5. **Cuenta creada**: Se crea empresa + usuario HR admin + empleado
6. **Login automático**: Es redirigido al onboarding

---

## 🔒 Seguridad

- ✅ La clave secreta **nunca** debe estar en el código fuente
- ✅ Usa variables de entorno en producción
- ✅ Genera una clave aleatoria y segura (mínimo 32 caracteres)
- ✅ No compartas la clave públicamente
- ✅ Si la clave se compromete, cámbiala inmediatamente

---

## 🧪 Pruebas

### Desarrollo Local

1. Configura `.env.local`:
```env
PLATFORM_ADMIN_SECRET_KEY=dev-key-para-pruebas-12345678901234567890
PLATFORM_ADMIN_EMAIL=admin@localhost.com
```

2. Inicia el servidor:
```bash
npm run dev
```

3. Invita un usuario:
```bash
curl -X POST http://localhost:3000/api/admin/invitar-signup \
  -H "Content-Type: application/json" \
  -H "x-admin-key: dev-key-para-pruebas-12345678901234567890" \
  -d '{"email":"test@empresa.com"}'
```

4. Verifica que el email se haya enviado (si SES está configurado) o copia la URL del response

---

## 📝 Notas Importantes

- Cada email solo puede tener **una invitación activa** a la vez
- Si se envía una nueva invitación a un email que ya tiene una activa, se regenera el token
- Las invitaciones **expiran después de 7 días**
- Si un usuario ya tiene cuenta, recibirá un error al intentar usar la invitación
- El email del usuario invitado **debe coincidir** exactamente con el de la invitación

---

## 🔄 Revocar Invitaciones

Si necesitas revocar una invitación (por ejemplo, se envió por error):

1. **Opción manual**: Elimina el registro de `invitaciones_signup` en la base de datos
2. **Opción automática**: Las invitaciones expiran automáticamente después de 7 días

Para eliminar manualmente desde Prisma Studio:
```bash
npx prisma studio
# Ir a la tabla "invitaciones_signup" y eliminar el registro
```

---

**Última actualización**: 2025-01-27








