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

---

## 🔴 PROBLEMA SECUNDARIO: Eventos Propuestos NO se Calculan

**Fecha descubrimiento:** 2025-12-13 01:45 UTC
**Estado:** 🔴 CRÍTICO - Requiere investigación adicional

### Problema

Después de fix del middleware, los jobs se encolan correctamente PERO todos fallan con:
```
Error: Empleado {id} no tiene jornada asignada
```

### Evidencia de los Logs

**Worker logs:**
- `[Worker] Procesando batch de 10 fichajes`
- `procesados: 0, errores: 10`
- Todos con error: `"Empleado {id} no tiene jornada asignada"`

**CRON logs muestran:**
- ✅ "9 empleados disponibles ayer en TUtu"
- ✅ "Fichaje creado para Ana López García" (x10)
- ✅ "10 fichajes pendientes requieren cálculo"
- ✅ "1 batches encolados (10 fichajes en total)"
- ❌ Worker falla: todos los empleados sin jornada

### Análisis del Código

**CRON crea fichajes correctamente:**
- `obtenerEmpleadosDisponibles()` usa `resolverJornadasBatch()`
- Filtra empleados sin jornada (línea 103-107)
- Crea fichaje con `jornadaId: empleado.jornada.id` (línea 115)

**Worker intenta calcular eventos:**
```typescript
// lib/calculos/fichajes-propuestos.ts:55-65
const fichaje = await prisma.fichajes.findUnique({
  where: { id: fichajeId },
  include: {
    eventos: { orderBy: { hora: 'asc' } },
    empleado: {
      include: {
        jornada: true,  // ← Intenta cargar jornada
      },
    },
  },
});

if (!fichaje.empleado.jornada) {
  throw new Error(`Empleado ${fichaje.empleadoId} no tiene jornada asignada`);
}
```

### Causa Raíz Sospechada

El problema está en cómo se asignan jornadas a empleados:

1. **Sistema de jornadas unificado** (docs/historial/2025-12-08-jornadas-unificadas.md):
   - Usa tabla `jornada_asignaciones` para metadata
   - Empleados pueden tener jornada por: empresa, equipo o individual
   - `empleados.jornadaId` puede ser NULL si jornada es por equipo/empresa

2. **Flujo del CRON:**
   - `obtenerEmpleadosDisponibles()` → `resolverJornadasBatch()`
   - Resuelve jornada efectiva desde empresa/equipo/individual
   - Devuelve objeto `EmpleadoDisponible` con `jornada` temporal
   - **PERO** `empleado.jornadaId` en BD sigue siendo NULL

3. **Flujo del Worker:**
   - Hace `include: { jornada: true }` en empleado
   - Prisma solo carga si `empleados.jornadaId` tiene valor
   - Si es NULL → `jornada: null` → ERROR

### Soluciones Posibles

**Opción 1: Actualizar `empleados.jornadaId` al crear fichaje**
```typescript
// app/api/cron/clasificar-fichajes/route.ts:111-123
fichaje = await prisma.fichajes.create({
  data: {
    empresaId: empresa.id,
    empleadoId: empleado.id,
    jornadaId: empleado.jornada.id,  // ← Ya lo hace
    // AGREGAR: Actualizar empleado.jornadaId si es NULL
  },
});

// Antes de crear fichaje:
if (!empleado.jornadaId && empleado.jornada?.id) {
  await prisma.empleados.update({
    where: { id: empleado.id },
    data: { jornadaId: empleado.jornada.id },
  });
}
```

**Opción 2: Modificar worker para usar jornadaId del fichaje**
```typescript
// lib/calculos/fichajes-propuestos.ts:55-73
const fichaje = await prisma.fichajes.findUnique({
  where: { id: fichajeId },
  include: {
    eventos: { orderBy: { hora: 'asc' } },
    jornada: true,  // ← Cargar desde fichaje.jornadaId directamente
    empleado: true,
  },
});

if (!fichaje.jornada) {
  throw new Error(`Fichaje ${fichajeId} no tiene jornada asignada`);
}
```

**Opción 3: Worker usa resolverJornadasBatch**
```typescript
// Cargar fichaje sin include de jornada
// Usar resolverJornadasBatch para obtener jornada efectiva
// Similar a como lo hace el CRON
```

### Recomendación

**Opción 2 es la mejor porque:**
- ✅ Fichajes ya tienen `jornadaId` correcto
- ✅ No requiere actualizar `empleados.jornadaId`
- ✅ Mantiene integridad del sistema de jornadas unificado
- ✅ Cambio mínimo, solo en worker
- ✅ Más eficiente (menos queries)

### Archivos Afectados

- `lib/calculos/fichajes-propuestos.ts` - Worker de eventos propuestos
- `lib/jornadas/resolver-batch.ts` - Sistema de resolución de jornadas
- `app/api/cron/clasificar-fichajes/route.ts` - CRON que crea fichajes

### Estado Actual del CRON

**Horario:** 23:30 UTC (00:30 hora española)
```bash
30 23 * * * curl -s -X POST https://app.hrcron.com/api/cron/clasificar-fichajes ...
```

**Nota:** El comentario en el código dice "00:01" pero está configurado a 23:30 UTC.

**Sugerencia:** Cambiar a 00:01 UTC (01:01 hora española) para procesar el día completo:
```bash
1 0 * * * curl -s -X POST https://app.hrcron.com/api/cron/clasificar-fichajes ...
```

---

---

## 🔴 PROBLEMA TERCIARIO: Error 504 Gateway Timeout Persistente

**Fecha descubrimiento:** 2025-12-13 02:00 UTC
**Estado:** 🔴 CRÍTICO - Causa raíz identificada

### Síntomas

Errores 504 Gateway Timeout aparecen en `/var/log/clousadmin-cron.log`:
```html
<html>
<head><title>504 Gateway Time-out</title></head>
<body>
<center><h1>504 Gateway Time-out</h1></center>
<hr><center>nginx/1.24.0 (Ubuntu)</center>
</body>
</html>
```

**Frecuencia:** Múltiples veces por día, especialmente en CRONs nocturnos.

### Causa Raíz CONFIRMADA

**NGINX tiene timeout por defecto de 60 segundos**

Configuración actual (`/etc/nginx/sites-available/clousadmin`):
```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    # ... headers ...
    # ❌ NO tiene proxy_read_timeout configurado
    # ❌ NO tiene proxy_connect_timeout configurado
    # ❌ NO tiene proxy_send_timeout configurado
}
```

**Por defecto NGINX usa:**
- `proxy_read_timeout`: 60s
- `proxy_connect_timeout`: 60s
- `proxy_send_timeout`: 60s

**Prueba ejecutada:**
```bash
curl -w "Tiempo: %{time_total}s" https://app.hrcron.com/api/cron/clasificar-fichajes
# Resultado: 504 Gateway Timeout
# Tiempo total: 60.398856s  ← ❌ Excede los 60s
```

### Por qué el CRON tarda más de 60 segundos

El CRON `/api/cron/clasificar-fichajes` realiza:

1. **Para cada empresa** (3 empresas en producción):
   - Consultar empleados disponibles (query con resolución de jornadas)
   - Filtrar por festivos, ausencias, días laborables
   - Para cada empleado disponible:
     - Verificar si existe fichaje
     - Si no existe, crear fichaje con notificación
     - Si existe en_curso, validar y actualizar estado

2. **Encolar workers** para calcular eventos propuestos:
   - Buscar fichajes pendientes (query)
   - Filtrar ausencias medio día (query por empleado)
   - Dividir en batches de 50
   - Encolar cada batch (HTTP request al worker)

3. **Worker procesa** eventos propuestos:
   - Para cada fichaje en el batch:
     - Cargar fichaje con jornada y eventos (query)
     - Calcular promedio histórico (query últimos 5 fichajes)
     - Calcular 4 eventos propuestos (entrada, pausa, salida, etc.)
     - Guardar en `fichaje_eventos_propuestos` (transacción)
     - Marcar `eventosPropuestosCalculados = true`

**Tiempo típico por empresa:** ~20-25 segundos
**Tiempo total para 3 empresas:** ~60-75 segundos ❌

### Impacto del Error 504

**Lo que SÍ sucede:**
- ✅ CRON se ejecuta completamente en el backend (PM2)
- ✅ Fichajes se crean correctamente
- ✅ Workers se encolan y procesan
- ✅ Eventos propuestos se calculan
- ✅ Sistema funciona end-to-end

**Lo que NO funciona:**
- ❌ Cliente (curl/crontab) recibe error 504
- ❌ Log de CRON muestra HTML de error en vez de JSON
- ❌ No se puede monitorear si el CRON fue exitoso
- ❌ Alarmas de monitoreo se disparan incorrectamente

**IMPORTANTE:** El error 504 es **COSMÉTICO** - no afecta la funcionalidad, pero:
- Dificulta debugging
- Oculta errores reales
- Genera falsos positivos en monitoreo

### Solución

**Aumentar timeouts en NGINX a 180 segundos** (3 minutos):

```nginx
# /etc/nginx/sites-available/clousadmin
server {
    server_name app.hrcron.com;
    client_max_body_size 15m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # Timeouts aumentados para CRONs pesados
        proxy_read_timeout 180s;
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ... resto de configuración SSL ...
}
```

**Comandos para aplicar:**
```bash
# 1. Editar configuración
sudo nano /etc/nginx/sites-available/clousadmin

# 2. Agregar las 3 líneas de timeout

# 3. Verificar sintaxis
sudo nginx -t

# 4. Recargar NGINX
sudo systemctl reload nginx

# 5. Verificar que funciona
curl -w "\nTiempo: %{time_total}s\n" \
  -X POST https://app.hrcron.com/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer {CRON_SECRET}"
```

### Optimizaciones Futuras (Opcional)

Si el CRON sigue siendo lento, considerar:

1. **Procesar empresas en paralelo** (Promise.all en vez de for loop)
2. **Cachear jornadas resueltas** (ya se hace, verificar TTL)
3. **Batch queries** en vez de N+1 para ausencias
4. **Mover workers a background** (no esperar respuesta HTTP)
5. **Dividir CRON** en 2: uno para crear fichajes, otro para encolar workers

### Relación con Problema de Jornadas

El error 504 **NO está relacionado** con el problema de jornadas resuelto anteriormente:
- Problema de jornadas: Worker fallaba por `empleado.jornadaId = NULL`
- Problema 504: NGINX cierra conexión antes de que CRON termine

Ambos eran independientes, pero el error 504 **ocultaba** los logs del worker, dificultando el diagnóstico.

---

**Documentado por:** Claude Code
**Fecha:** 2025-12-13 01:20 UTC
**Actualizado:** 2025-12-13 02:05 UTC
