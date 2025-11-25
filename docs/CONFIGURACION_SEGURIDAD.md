# Configuración de Seguridad - Clousadmin

**Fecha**: 2025-11-07  
**Última actualización**: 27 de enero de 2025  
**Estado**: ✅ Implementación completa

> **Nota**: Este documento cubre la configuración práctica de seguridad. Para más información:
> - [`AUDITORIA_SEGURIDAD.md`](AUDITORIA_SEGURIDAD.md) - Auditoría completa y hallazgos
> - [`RESUMEN_SEGURIDAD_IMPLEMENTADA.md`](RESUMEN_SEGURIDAD_IMPLEMENTADA.md) - Resumen ejecutivo de implementación

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
- `iban` - Cuenta bancaria ✅ cifrado en altas/updates e importaciones (POST/PATCH `/api/empleados`, onboarding, importación Excel)
- `nif` - Identificación fiscal ✅ cifrado en altas/updates e importaciones
- `nss` - Número de Seguridad Social ✅ cifrado en altas/updates e importaciones
- `salarioBrutoAnual` - **no se cifra** (requisito confirmado: no es necesario para este release)
- `salarioBrutoMensual` - **no se cifra**

> **Migración histórica**: usa `tsx scripts/encrypt-empleados.ts --confirm-backup --dry-run` para detectar registros legacy y vuelve a ejecutar sin `--dry-run` para cifrarlos. Procedimiento documentado en `docs/migraciones/2025-11-16-encriptar-empleados.md`.

### Cobertura actual

- Altas HR (`app/api/empleados/route.ts`) → cifrado de `nif`, `nss`, `iban` antes de `create`.
- Ediciones HR (`app/api/empleados/[id]/route.ts`) → `encryptEmpleadoData` justo antes del `update`.
- Importaciones desde Excel (`app/api/empleados/importar-excel/confirmar/route.ts`).
- Onboarding automático (`lib/onboarding.ts`).
- Aprobación de solicitudes de cambios (`lib/solicitudes/aplicar-cambios.ts`).

El 17/11/2025 se ejecutó el script `scripts/encrypt-empleados.ts` (ver registro en `docs/migraciones/2025-11-16-encriptar-empleados.md`) con resultado:

```
Registros procesados  : 6
Registros actualizados: 6
Registros sin cambios : 0
NIF sin cifrar        : 0 (SELECT COUNT(*) ... NOT LIKE '%:%:%:%')
```

### Rotación y backup de claves

1. Ejecutar `scripts/backup-db.sh` + backup de storage y documentar la hora.
2. Generar nuevas claves:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" # ENCRYPTION_KEY
   openssl rand -base64 32                                                  # NEXTAUTH_SECRET
   ```
3. Actualizar los secretos del entorno (Hetzner Secrets, `.env.production`, etc.) sin commitearlos.
4. Reiniciar procesos (`pm2 restart clousadmin && pm2 restart clousadmin-worker`).
5. Ejecutar `tsx scripts/encrypt-empleados.ts --confirm-backup --dry-run` para verificar que no quedan campos pendientes.
6. Registrar el resultado en `docs/migraciones/2025-11-16-encriptar-empleados.md`.

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

**Estado**: Implementado (Fase 5 completa)

- Registro exhaustivo desde `lib/auditoria.ts` e integración en endpoints de empleados, documentos y nóminas.
- API `app/api/auditoria/empleados/[id]/route.ts` para consultas por HR.
- Vista para HR en `app/(dashboard)/hr/auditoria/page.tsx`.

---

## 📊 Monitoring (Sentry)

**Estado**: ✅ Implementado y operativo

- Error tracking en cliente, servidor y edge runtime.
- Performance monitoring (10% sample rate en producción).
- Integración con BullMQ worker para tracking de jobs fallidos.
- Sanitización automática de headers sensibles (cookies, authorization).
- Variables de entorno: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`.
- Endpoint de prueba: `/api/test-sentry?action=error`

---

## ⚖️ Derechos GDPR mínimos (versión 1)

### Exportación de datos personales (Artículo 15)
- **UI**: Página `HR > Organización > Personas > Detalle` → botón `Exportar datos`.
- **API**: `GET /api/empleados/[id]/export`
  - Requiere HR Admin autenticado.
  - Devuelve un JSON con: ficha del empleado (campos desencriptados), usuario asociado, equipos, ausencias, fichajes recientes, contratos, documentos y los últimos 50 registros de auditoría.
  - El endpoint registra la acción con `logAccesoSensibles` (`accion: 'exportacion'`).

### Derecho al olvido / anonimización (Artículo 17)
- **UI**: Mismo detalle de empleado → botón `Derecho al olvido`.
- **API**: `POST /api/empleados/[id]/anonymize`
  - Limpia datos personales, bancarios y de contacto.
  - Desactiva la cuenta (`usuarios`, `empleados`) y elimina consentimientos/equipos asociados.
  - Mantiene relaciones históricas (ausencias, fichajes, nóminas) sin información identificativa.
  - Registra la acción en auditoría con `accion: 'eliminacion'`.
- **Precauciones**:
  1. La acción es irreversible → el empleado pierde acceso a la plataforma.
  2. Se recomienda exportar los datos antes de anonimizar si el empleado lo solicita.

---

## ✅ Checklist de Seguridad

### Completado
- [x] Rate limiting (login y APIs)
- [x] Sesiones activas con invalidación
- [x] Utilidades de encriptación AES-256-GCM
- [x] Verificación de usuario activo en cada request
- [x] Timing attack mitigation en login
- [x] Encriptación de campos sensibles en BD (APIs + migración legacy)
- [x] Auditoría de accesos operativa (API + UI)
- [x] Headers de seguridad completos (CSP actualizado para Sentry)
- [x] Monitoring con Sentry (error tracking + performance)

### En Progreso
- [ ] GDPR compliance (consentimientos, derecho al olvido, exportación)

### Pendiente
- [ ] File upload validation
- [ ] Sanitización de logs
- [ ] Tests de seguridad
- [ ] Configurar gestor de secretos en producción (Hetzner Cloud, Vault, etc.)
- [ ] Configuración de WAF (producción)

## 🧱 Headers de Seguridad

### Content-Security-Policy (24/11/2025)
- `script-src` permite `https://browser.sentry-cdn.com` para cargar el SDK de Sentry sin relajar otras fuentes.
- `connect-src` habilita `https://*.sentry.io` para el envío de errores y trazas hacia la plataforma de monitoreo.
- Mantener estos dominios sincronizados con `next.config.ts` antes de cada despliegue para evitar bloqueos en producción.

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

## 📚 Referencias
- `docs/SEGURIDAD_SECRETS.md` para gestión de secrets en GitHub y Hetzner

---

**Última actualización**: 7 de noviembre 2025








