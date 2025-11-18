# 📋 Cómo Ver Logs y Estado de los CRONs

## 🔍 Métodos para Verificar CRONs

### 1. Script de Verificación (Recomendado)

```bash
npx tsx scripts/verificar-crons.ts
```

Muestra:
- Fichajes pendientes/auto-cuadrados recientes
- Solicitudes pendientes >48 h y revisadas por IA
- Estado de variables (`CRON_SECRET`, `CRON_ALERT_WEBHOOK`, etc.)
- Recomendaciones si algo falta

### 2. Logs en Consola del Servidor

**Desarrollo local**
```bash
npm run dev
# Los logs aparecen en la terminal
```

**Producción (Hetzner/VPS)**
```bash
tail -f /var/log/clousadmin-cron.log
# o con systemd
journalctl -u clousadmin-cron -f
```

Formato típico:
```
[CRON Clasificar Fichajes] Inicio 2025-11-18T23:30:00.000Z
[CRON Clasificar Fichajes] Procesando día: 2025-11-17
[CRON Clasificar Fichajes] Finalizado en 1234ms { empresas: 1, fichajesCreados: 5 }
```

### 3. GitHub Actions

1. Abrir `https://github.com/<ORG>/<REPO>/actions`
2. Elegir el workflow **Cron - Revisar Solicitudes con IA** o **Cron - Clasificar Fichajes**
3. Revisar el último job:
   - `Status Code: 200` → OK
   - `Status Code: 401/500` → revisar secrets o servidor

### 4. Webhook de Alertas

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

-- Fichajes cuadrados masivamente
SELECT f.id, f.fecha, f.cuadradoEn, f.cuadradoPor,
       e.nombre || ' ' || e.apellidos AS empleado
FROM fichaje f
JOIN empleado e ON e.id = f.empleadoId
WHERE f.cuadradoMasivamente = true
  AND f.cuadradoEn >= NOW() - INTERVAL '1 day'
ORDER BY f.cuadradoEn DESC;
```

```sql
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

### 6. Pruebas Manuales

```bash
# Clasificar fichajes
curl -X POST https://tu-app.com/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer $CRON_SECRET"

# Revisar solicitudes
curl -X POST https://tu-app.com/api/cron/revisar-solicitudes \
  -H "Authorization: Bearer $CRON_SECRET"
```

Respuesta esperada:
```json
{
  "success": true,
  "fecha": "2025-11-17",
  "empresas": 1,
  "fichajesCreados": 5,
  "fichajesPendientes": 3,
  "fichajesFinalizados": 2,
  "errores": []
}
```

### 7. Script de Hetzner

En el servidor:
```bash
./scripts/hetzner/test-crons.sh
```
Valida:
- Respuesta HTTP de ambos endpoints
- Configuración de `crontab`
- Últimas líneas del log
- Script de backup (si hay variables)

---

## Checklist Rápido

- [ ] `CRON_SECRET` configurado (hosting + GitHub)
- [ ] `CRON_ALERT_WEBHOOK` (opcional) configurado
- [ ] `ENABLE_GITHUB_CRONS` según el runner usado
- [ ] `scripts/hetzner/setup-cron.sh` ejecutado (si usas Hetzner)
- [ ] `npx tsx scripts/verificar-crons.ts` sin errores

**Última actualización**: 18 de noviembre 2025

