# ANÁLISIS Y SOLUCIÓN: CRONs no procesan fichajes correctamente

**Fecha:** 13 de diciembre de 2025
**Severidad:** 🔴 CRÍTICA
**Estado:** ⚠️ IDENTIFICADO - Requiere acción inmediata

---

## 🚨 PROBLEMA

Los CRONs se están ejecutando **pero NO están procesando los fichajes del día anterior** porque:

1. El CRON de `clasificar-fichajes` se ejecuta correctamente a las **23:30 UTC** (00:30 hora española)
2. El CRON **sí crea los fichajes pendientes** (creó 10 fichajes el día 12)
3. **PERO** falla al encolar los jobs para calcular eventos propuestos
4. Sin eventos propuestos, los fichajes NO se pueden cuadrar automáticamente

---

## 🔍 CAUSA RAÍZ

### Error detectado en logs:
```json
{
  "success": false,
  "fechaAyer": "2025-12-11",
  "empresas": 3,
  "fichajesCreados": 4,
  "fichajesPendientes": 4,
  "fichajesFinalizados": 0,
  "jobsEncolados": 0,
  "batchesEncolados": 0,
  "errores": [
    "Error encolando batch de 4 fichajes: Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"
  ]
}
```

### Análisis técnico:

1. **El middleware bloquea `/api/workers/*`**
   - El middleware permite `/api/cron/*` (línea 50 de middleware.ts)
   - Pero NO permite `/api/workers/*`
   - Cuando `enqueueJob()` intenta llamar a `/api/workers/calcular-eventos-propuestos`, el middleware redirige a `/login`

2. **La función `enqueueJob()` recibe HTML en lugar de JSON**
   - Archivo: `lib/queue.ts`
   - Línea 79: hace fetch a `${baseUrl}/api/workers/${jobType}`
   - Recibe respuesta HTML de redirección a login
   - Línea 93: intenta parsear HTML como JSON → **CRASH**

3. **Flujo del error:**
   ```
   CRON clasificar-fichajes (23:30 UTC)
   → Crea fichajes pendientes ✅
   → Llama a enqueueJob() ✅
   → fetch('/api/workers/calcular-eventos-propuestos') ✅
   → Middleware intercepta ❌
   → Redirige a /login ❌
   → enqueueJob recibe HTML ❌
   → Intenta parsear como JSON ❌
   → ERROR: "Unexpected token '<'" ❌
   → Fichajes quedan sin eventos propuestos ❌
   → NO se pueden cuadrar automáticamente ❌
   ```

---

## 📊 IMPACTO

### Fichajes afectados:
- **12 de diciembre:** 10 fichajes creados, 0 procesados
- **11 de diciembre:** 4 fichajes creados, 0 procesados
- **Días anteriores:** Posiblemente afectados desde el último deploy

### Consecuencias:
1. ❌ Fichajes NO se cuadran automáticamente
2. ❌ Eventos propuestos NO se calculan
3. ❌ HR debe cuadrar manualmente cada fichaje
4. ⚠️ Acumulación de trabajo pendiente
5. ⚠️ Posible pérdida de datos si el usuario no cuadra manualmente

---

## ✅ SOLUCIÓN

### Opción 1: Agregar `/api/workers/*` al middleware (RECOMENDADO)

**Archivo:** `middleware.ts`

**Cambio necesario:**
```typescript
// Línea 50 - ANTES:
pathname.startsWith('/api/cron') || // Rutas de cron usan CRON_SECRET, no cookies

// Línea 50 - DESPUÉS:
pathname.startsWith('/api/cron') || // Rutas de cron usan CRON_SECRET, no cookies
pathname.startsWith('/api/workers') || // Workers usan WORKER_SECRET, no cookies
```

**Justificación:**
- Los endpoints `/api/workers/*` tienen su propia autenticación vía `WORKER_SECRET`
- Ver `app/api/workers/calcular-eventos-propuestos/route.ts` líneas 31-41
- No necesitan autenticación de usuario (cookies)
- Similar a `/api/cron/*` que ya está excluido

### Opción 2: Cambiar el sistema de colas (NO RECOMENDADO)

En lugar de usar HTTP directo, implementar:
- Vercel Queue
- Redis Queue
- BullMQ

**Por qué NO:**
- Requiere infraestructura adicional
- Mayor complejidad
- El problema es más simple (middleware)

---

## 🔧 PASOS PARA IMPLEMENTAR

### 1. Modificar middleware
```bash
# Editar archivo
nano middleware.ts

# Agregar línea en las rutas públicas (línea 51):
pathname.startsWith('/api/workers') || // Workers usan WORKER_SECRET, no cookies
```

### 2. Verificar en local
```bash
# Probar endpoint del worker
curl -X POST http://localhost:3000/api/workers/calcular-eventos-propuestos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-secret" \
  -d '{"fichajeIds":["test-id"]}'

# Debería retornar JSON, NO redirigir a /login
```

### 3. Deploy a producción
```bash
git add middleware.ts
git commit -m "fix: permitir acceso a /api/workers en middleware

PROBLEMA:
- CRONs no podían encolar jobs porque middleware bloqueaba /api/workers/*
- Error: 'Unexpected token <' al recibir HTML de login en lugar de JSON

SOLUCIÓN:
- Agregar /api/workers a rutas excluidas del middleware
- Los workers tienen su propia autenticación (WORKER_SECRET)

IMPACTO:
- Fichajes se procesarán automáticamente
- Eventos propuestos se calcularán correctamente
- HR no tendrá que cuadrar manualmente cada fichaje"

git push origin main
```

### 4. Verificar en producción
```bash
# SSH al servidor
ssh root@46.224.70.156

# Pull y rebuild
cd /opt/clousadmin
git pull origin main
NODE_OPTIONS='--max-old-space-size=8192' npm run build
pm2 restart clousadmin

# Probar manualmente el CRON
curl -s -X POST https://app.hrcron.com/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer 5l0K6WWOVcl8vcEvg/kn6XqK8T++n4nKunHHvOuMY5s=" | jq

# Verificar que:
# - jobsEncolados > 0
# - batchesEncolados > 0
# - errores = []
```

### 5. Reprocesar fichajes pendientes (opcional)

Si hay fichajes acumulados sin procesar:

```bash
# Conectar a DB
psql -d clousadmin

# Verificar fichajes pendientes sin eventos propuestos
SELECT COUNT(*)
FROM fichajes
WHERE estado = 'pendiente'
  AND "eventosPropuestosCalculados" = false
  AND "tipoFichaje" = 'ordinario';

# Marcarlos para reprocesamiento
UPDATE fichajes
SET "eventosPropuestosCalculados" = false
WHERE estado = 'pendiente'
  AND "tipoFichaje" = 'ordinario'
  AND fecha >= '2025-12-10';

# Ejecutar CRON manualmente (procesará todos los pendientes)
curl -s -X POST https://app.hrcron.com/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer 5l0K6WWOVcl8vcEvg/kn6XqK8T++n4nKunHHvOuMY5s="
```

---

## 📋 CONFIGURACIÓN ACTUAL DE CRONS

```bash
# Crontab en servidor Hetzner
30 23 * * * curl -s -X POST https://app.hrcron.com/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer 5l0K6WWOVcl8vcEvg/kn6XqK8T++n4nKunHHvOuMY5s=" \
  >> /var/log/clousadmin-cron.log 2>&1

0 2 * * * curl -s -X POST https://app.hrcron.com/api/cron/revisar-solicitudes \
  -H "Authorization: Bearer 5l0K6WWOVcl8vcEvg/kn6XqK8T++n4nKunHHvOuMY5s=" \
  >> /var/log/clousadmin-cron.log 2>&1

10 0 1 1 * curl -s -X POST https://app.hrcron.com/api/cron/renovar-saldo-horas \
  -H "Authorization: Bearer 5l0K6WWOVcl8vcEvg/kn6XqK8T++n4nKunHHvOuMY5s=" \
  >> /var/log/clousadmin-cron.log 2>&1
```

**Horarios:**
- `clasificar-fichajes`: 23:30 UTC (00:30 hora española) ✅
- `revisar-solicitudes`: 02:00 UTC (03:00 hora española) ✅
- `renovar-saldo-horas`: 1 de enero, 00:10 UTC ✅

---

## 🎯 VERIFICACIÓN POST-FIX

Después de implementar el fix, verificar:

### ✅ Checklist de validación:

1. **Middleware permite workers:**
   ```bash
   curl -I https://app.hrcron.com/api/workers/calcular-eventos-propuestos
   # NO debe redirigir a /login
   ```

2. **Worker procesa correctamente:**
   ```bash
   curl -X POST https://app.hrcron.com/api/workers/calcular-eventos-propuestos \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer 76ebf6463124ed738ef41d9cd5f1cbd0c54623205775947f2c128f9a53664efd" \
     -d '{"fichajeIds":["test"]}'
   # Debe retornar JSON con success: true/false
   ```

3. **CRON ejecuta sin errores:**
   ```bash
   # Verificar en /var/log/clousadmin-cron.log
   tail -f /var/log/clousadmin-cron.log

   # Debe mostrar:
   # - jobsEncolados > 0
   # - batchesEncolados > 0
   # - errores: []
   ```

4. **Fichajes se procesan:**
   ```sql
   -- Verificar que los eventos propuestos se calculan
   SELECT
     f.id,
     f.fecha,
     f.estado,
     f."eventosPropuestosCalculados",
     COUNT(ep.id) as eventos_propuestos
   FROM fichajes f
   LEFT JOIN fichaje_eventos_propuestos ep ON ep."fichajeId" = f.id
   WHERE f.fecha >= CURRENT_DATE - INTERVAL '3 days'
     AND f."tipoFichaje" = 'ordinario'
     AND f.estado = 'pendiente'
   GROUP BY f.id
   ORDER BY f.fecha DESC;
   ```

5. **Monitoreo 24-48h:**
   - Revisar logs diarios
   - Verificar que fichajes se cuadran automáticamente
   - Confirmar que no hay acumulación de pendientes

---

## 📝 NOTAS ADICIONALES

### Problema secundario detectado: Timeouts 504

En el log también aparecen múltiples errores `504 Gateway Time-out`:

```html
<html>
<head><title>504 Gateway Time-out</title></head>
<body>
<center><h1>504 Gateway Time-out</h1></center>
<hr><center>nginx/1.24.0 (Ubuntu)</center>
</body>
</html>
```

**Causa probable:**
- NGINX timeout configurado muy bajo
- El CRON o worker tarda más de 60s en responder
- NGINX cierra la conexión antes de recibir respuesta

**Solución:**
Ver documento separado: `SOLUCION-504-TIMEOUT-DIC-13-2025.md`

### Otros problemas detectados:

1. **Backup de Object Storage falla:**
   ```
   ❌ Error subiendo backup: The specified bucket does not exist.
   ```
   - Bucket no configurado correctamente en Hetzner
   - No crítico para funcionamiento de la app
   - Revisar configuración de S3

---

## 🔗 ARCHIVOS RELACIONADOS

- `middleware.ts` - Configuración de rutas protegidas
- `lib/queue.ts` - Sistema de colas
- `app/api/workers/calcular-eventos-propuestos/route.ts` - Worker de eventos
- `app/api/cron/clasificar-fichajes/route.ts` - CRON principal
- `/var/log/clousadmin-cron.log` - Logs de CRONs en servidor

---

**Documentado por:** Claude Code
**Fecha:** 2025-12-13 01:20 UTC
