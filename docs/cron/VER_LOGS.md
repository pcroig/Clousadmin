# 📋 Cómo Ver Logs y Estado de los CRONs

## 🔍 Métodos para Verificar CRONs

### 1. Script de Verificación (Recomendado)

**En el servidor Hetzner**:
```bash
cd /opt/clousadmin
./scripts/hetzner/test-crons.sh
```

**Localmente**:
```bash
npx tsx scripts/verificar-crons.ts
```

Muestra:
- Fichajes pendientes/auto-cuadrados recientes
- Solicitudes pendientes >48h y revisadas por IA
- Estado de variables (`CRON_SECRET`, `CRON_ALERT_WEBHOOK`, etc.)
- Recomendaciones si algo falta

### 2. Logs en Servidor Hetzner

```bash
# Ver logs en tiempo real
tail -f /var/log/clousadmin-cron.log

# Ver últimas 50 líneas
tail -50 /var/log/clousadmin-cron.log

# Buscar errores
grep -i error /var/log/clousadmin-cron.log
```

Formato típico:
```
{"success":true,"fecha":"2025-11-20","empresas":0,"fichajesCreados":0,"fichajesPendientes":0,"fichajesFinalizados":0,"errores":[]}
{"success":true,"timestamp":"2025-11-21T02:00:01.707Z","solicitudesRevisadas":0,"autoAprobadas":0,"requierenRevision":0,"errores":[]}
```

### 3. Verificar Crontab

```bash
# Ver crons instalados
crontab -l

# Deberías ver:
# 30 23 * * * curl -s -X POST https://app.hrcron.com/api/cron/clasificar-fichajes ...
# 0 2 * * * curl -s -X POST https://app.hrcron.com/api/cron/revisar-solicitudes ...
```

### 4. Pruebas Manuales

```bash
# Clasificar fichajes
curl -X POST https://app.tu-dominio.com/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"

# Revisar solicitudes
curl -X POST https://app.tu-dominio.com/api/cron/revisar-solicitudes \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

Respuesta esperada:
```json
{
  "success": true,
  "fecha": "2025-11-20",
  "empresas": 1,
  "fichajesCreados": 5,
  "fichajesPendientes": 3,
  "fichajesFinalizados": 2,
  "errores": []
}
```

### 5. Consultas en Base de Datos

```sql
-- Fichajes pendientes creados en 24h
SELECT f.id, f.fecha, f.estado, f.createdAt,
       e.nombre || ' ' || e.apellidos AS empleado
FROM fichaje f
JOIN empleado e ON e.id = f.empleadoId
WHERE f.estado = 'pendiente'
  AND f.fecha >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY f.createdAt DESC;

-- Solicitudes pendientes >48h
SELECT s.id, s.tipo, s.createdAt, s.revisadaPorIA,
       e.nombre || ' ' || e.apellidos AS empleado
FROM solicitudCambio s
JOIN empleado e ON e.id = s.empleadoId
WHERE s.estado = 'pendiente'
  AND s.revisadaPorIA = false
  AND s.createdAt <= NOW() - INTERVAL '48 hours'
ORDER BY s.createdAt ASC;
```

### 6. Webhook de Alertas (Opcional)

Configura `CRON_ALERT_WEBHOOK` con tu URL (Slack/Teams) para recibir POSTs cuando un cron falla.

Ejemplo de payload:
```json
{
  "cron": "Clasificar Fichajes",
  "success": false,
  "durationMs": 5000,
  "errors": ["Error procesando empleado ..."],
  "timestamp": "2025-11-18T23:30:05.000Z"
}
```

---

## Checklist Rápido

- [ ] `CRON_SECRET` configurado en `.env`
- [ ] `APP_URL` configurado en `.env`
- [ ] `crontab -l` muestra los crons instalados
- [ ] `./scripts/hetzner/test-crons.sh` sin errores
- [ ] Logs en `/var/log/clousadmin-cron.log` se actualizan

**Última actualización**: 21 de noviembre 2025
