# Configuración de Seguridad - Clousadmin

**Fecha**: 2025-11-07  
**Estado**: En implementación (actualizado)

---

## 🔐 Encriptación de Datos Sensibles

### Variables de Entorno Requeridas

#### `ENCRYPTION_KEY` (CRÍTICO)

- **Descripción**: Clave maestra de encriptación AES-256-GCM para datos sensibles
- **Formato**: String hexadecimal de 64 caracteres (256 bits)
- **Uso**: Encriptar IBAN, NIF, NSS, salarios en la base de datos

**Para desarrollo local (`.env.local`)**:
```bash
ENCRYPTION_KEY=3f70cf35f9f2efeff971a06fb8b3f2440d9b30b0271fd6936c9b72bd183216df
```

**⚠️ IMPORTANTE**:
- **NUNCA** commitear este valor a Git
- **NUNCA** compartir esta key por canales inseguros
- **Cada empresa debe tener su propia key única**
- **En producción**: Usar gestores de secretos (Hetzner Cloud, HashiCorp Vault, o similar)
- **Backup**: Guardar de forma segura, sin la key no se pueden desencriptar los datos

### Generar Nueva Key

Para generar una nueva `ENCRYPTION_KEY`:

```bash
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔒 Campos Encriptados

Los siguientes campos se encriptan automáticamente en la aplicación:

### Empleado
- `iban` - Cuenta bancaria *(pendiente de aplicar en altas/updates)*
- `nif` - Identificación fiscal *(pendiente de aplicar en altas/updates)*
- `nss` - Número de Seguridad Social *(pendiente de aplicar en altas/updates)*
- `salarioBrutoAnual` - Salario anual *(futuro, requiere revisar ordenamientos)*
- `salarioBrutoMensual` - Salario mensual *(futuro)*

> **Estado actual**: Las utilidades `encryptEmpleadoData` / `decryptEmpleadoData` ya existen (`lib/empleado-crypto.ts`), pero los endpoints de creación/actualización aún no aplican el cifrado (nov 2025). Priorizar la adopción en `app/api/empleados`.

---

## 🛡️ Rate Limiting

### Configuración Actual

**Login**:
- 5 intentos por 10 segundos
- 20 intentos por hora

**APIs**:
- Lectura (GET): 100 requests/minuto
- Escritura (POST/PATCH/DELETE): 50 requests/minuto

### Storage

- **Desarrollo**: In-memory Map (implementado)
- **Producción**: pendiente migrar a Redis/Upstash para sincronización multi-instancia

---

## 📊 Sesiones Activas

### Tabla: `sesiones_activas`

- **Duración**: 7 días (evaluar reducción a 72 h)
- **Tracking**: IP, User Agent, último uso
- **Invalidación**: Automática al cambiar contraseña, desactivar usuario o iniciar sesión de nuevo
- **Limpieza**: Sesiones expiradas se eliminan automáticamente (`cleanupExpiredSessions`)

### Funciones Disponibles

```typescript
// Invalidar todas las sesiones de un usuario
invalidateAllUserSessions(usuarioId: string)

// Listar sesiones activas
getUserActiveSessions(usuarioId: string)

// Limpiar sesiones expiradas (ejecutar periódicamente)
cleanupExpiredSessions()
```

---

## 🔍 Auditoría de Accesos

**Estado**: Pendiente de implementación (Fase 5)

Se registrarán todos los accesos a datos sensibles:
- Quién accedió
- Qué datos
- Cuándo
- Desde dónde (IP)

---

## ✅ Checklist de Seguridad

### Completado
- [x] Rate limiting (login y APIs)
- [x] Sesiones activas con invalidación
- [x] Utilidades de encriptación AES-256-GCM
- [x] Verificación de usuario activo en cada request
- [x] Timing attack mitigation en login

### En Progreso
- [ ] Encriptación de campos sensibles en BD (APIs pendientes)
- [ ] Auditoría de accesos
- [ ] GDPR compliance (consentimientos, derecho al olvido, exportación)

### Pendiente
- [ ] Headers de seguridad completos (CSP, HSTS)
- [ ] File upload validation
- [ ] Sanitización de logs
- [ ] Tests de seguridad
- [ ] Configurar gestor de secretos en producción (Hetzner Cloud, Vault, etc.)
- [ ] Configuración de WAF (producción)

---

## 🚀 Migración a Producción

### Checklist Pre-Deploy

1. **Secrets**:
   - [ ] Migrar `ENCRYPTION_KEY` a gestor de secretos
   - [ ] Rotar `NEXTAUTH_SECRET`
   - [ ] Configurar credenciales de Hetzner con variables de entorno seguras

2. **Rate Limiting**:
   - [ ] Migrar de Map a Redis/Upstash
   - [ ] Configurar límites específicos por empresa

3. **Sesiones**:
   - [ ] Considerar reducir duración de sesión (7 días → 1-3 días)
   - [ ] Configurar renovación automática de sesión

4. **Encriptación**:
   - [ ] Aplicar cifrado en endpoints críticos (`/api/empleados`, onboarding)
   - [ ] Backup de `ENCRYPTION_KEY` en lugar seguro
   - [ ] Documentar procedimiento de recuperación

5. **Monitoreo**:
   - [ ] CloudWatch Logs para intentos de login fallidos
   - [ ] Alertas de rate limiting excedido
   - [ ] Dashboards de sesiones activas
   - [ ] Auditoría de accesos a datos sensibles

---

**Última actualización**: 7 de noviembre 2025








