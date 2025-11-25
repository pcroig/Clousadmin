# ⏰ Configuración de Cron Jobs

## 📋 Descripción

El sistema utiliza cron jobs automatizados para:
- **Revisar solicitudes con IA**: Revisa solicitudes pendientes tras 48 horas (configurable)
- **Clasificar fichajes**: Cierra jornadas del día anterior y valida fichajes incompletos

**Configuración actual**: Los cron jobs se ejecutan desde el servidor Hetzner usando `crontab`.

---

## 🚀 Configuración en Hetzner (Recomendado)

### 1. Variables de Entorno

Asegúrate de tener estas variables en `/opt/clousadmin/.env`:

```bash
CRON_SECRET="tu-secret-generado"  # Generar con: openssl rand -base64 32
APP_URL="https://app.tu-dominio.com"  # URL de tu aplicación (sin / final)
SOLICITUDES_PERIODO_REVISION_HORAS=48  # Opcional, default 48
```

### 2. Instalar Crons

```bash
cd /opt/clousadmin
CRON_SECRET="tu-secret" APP_URL="https://app.tu-dominio.com" \
  ./scripts/hetzner/setup-cron.sh
```

El script instala automáticamente:
- Clasificar fichajes: 23:30 UTC
- Revisar solicitudes: 02:00 UTC
- Backup DB: 02:00 UTC (si las variables están configuradas)

### 3. Verificar Instalación

```bash
# Ver crons instalados
crontab -l

# Probar manualmente
./scripts/hetzner/test-crons.sh

# Ver logs
tail -f /var/log/clousadmin-cron.log
```

---

## 🔄 GitHub Actions (Respaldo Manual)

Los workflows de GitHub Actions están disponibles como respaldo o para ejecución manual.

### Configuración

1. **Generar CRON_SECRET**:
   ```bash
   openssl rand -base64 32
   ```

2. **Configurar Secrets en GitHub**:
   - `CRON_SECRET`: El secret generado
   - `APP_URL`: URL de tu aplicación (ej: `https://app.hrcron.com`)

3. **Desactivar ejecución automática** (si usas Hetzner):
   - Ve a Settings → Secrets and variables → Actions → Variables
   - Crea `ENABLE_GITHUB_CRONS` con valor `false`

### Ejecución Manual

1. Ve a Actions → "Cron - Revisar Solicitudes con IA"
2. Click en "Run workflow" → "Run workflow"

---

## 📊 Endpoints

### `/api/cron/revisar-solicitudes`
- **Método**: POST
- **Autenticación**: `Authorization: Bearer ${CRON_SECRET}`
- **Funcionalidad**: 
  - Busca solicitudes pendientes con más de 48h
  - Clasifica con IA (auto-aprobable vs revisión manual)
  - Auto-aprueba o marca para revisión
  - Crea notificaciones automáticas

### `/api/cron/clasificar-fichajes`
- **Método**: POST
- **Autenticación**: `Authorization: Bearer ${CRON_SECRET}`
- **Funcionalidad**:
  - Procesa fichajes del día anterior
  - Crea fichajes pendientes si faltan
  - Valida fichajes en curso
  - Marca como finalizado o pendiente según corresponda

---

## 🧪 Testing

### Probar desde el servidor

```bash
curl -X POST https://app.tu-dominio.com/api/cron/revisar-solicitudes \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Respuesta esperada

```json
{
  "success": true,
  "timestamp": "2025-11-21T02:00:00.000Z",
  "solicitudesRevisadas": 5,
  "autoAprobadas": 3,
  "requierenRevision": 2,
  "errores": []
}
```

---

## 🔒 Seguridad

### ¿Por qué usar CRON_SECRET?

Sin protección, cualquiera podría llamar a los endpoints y:
- ❌ Sobrecargar el servidor
- ❌ Consumir APIs de IA innecesariamente
- ❌ Posibles race conditions

Con `CRON_SECRET`:
- ✅ Solo quien tenga el secret puede ejecutarlo
- ✅ El endpoint verifica: `Authorization: Bearer ${CRON_SECRET}`
- ✅ Si no coincide, retorna 401 Unauthorized

### Rotar el CRON_SECRET

Si crees que el secret se comprometió:

1. Genera uno nuevo:
   ```bash
   openssl rand -base64 32
   ```

2. Actualiza en Hetzner (`.env`)
3. Actualiza en GitHub (si usas GitHub Actions)
4. Actualiza `crontab` con el nuevo secret:
   ```bash
   CRON_SECRET="nuevo-secret" APP_URL="https://app.tu-dominio.com" \
     ./scripts/hetzner/setup-cron.sh
   ```

---

## 🐛 Troubleshooting

### El cron no se ejecuta

**Verificar**:
1. `crontab -l` muestra las entradas
2. Los logs en `/var/log/clousadmin-cron.log` tienen entradas recientes
3. Las variables `CRON_SECRET` y `APP_URL` están configuradas

### Error 401 Unauthorized

**Solución**:
1. Verifica que `CRON_SECRET` en `.env` coincida con el usado en `crontab`
2. Verifica que el header sea exactamente `Bearer ${CRON_SECRET}`

### Error 404 Not Found

**Solución**:
1. Verifica que `APP_URL` sea correcta
2. Verifica que la aplicación esté desplegada y accesible
3. Verifica que el endpoint `/api/cron/*` exista

---

## 📚 Referencias

- [Ver logs de crons](./cron/VER_LOGS.md)
- [Inventario de crons](./cron/INVENTARIO.md)
- [Guía de migración a Hetzner](../MIGRACION_HETZNER.md)

**Última actualización**: 21 de noviembre 2025  
**Estado**: ✅ Configurado en Hetzner
