# Sistema de Fichajes con Workers - Documentación Completa

## 📋 Resumen Ejecutivo (Para No Técnicos)

### ¿Qué hace este sistema?

Imagina que cada noche, a las 00:01, un "ayudante automático" revisa todos los fichajes del día anterior:

1. **Cierra los fichajes del día anterior**:
   - Si un empleado no fichó → Crea un fichaje "pendiente" (para que RH lo cuadre)
   - Si un empleado fichó pero no terminó → Lo marca como "pendiente"
   - Si un empleado fichó completo → Lo marca como "finalizado"

2. **Calcula eventos propuestos** (en segundo plano):
   - Para cada fichaje pendiente, calcula qué horas faltan
   - Usa el historial del empleado (sus últimos 5 fichajes)
   - Si no hay historial, usa valores por defecto (09:00, 18:00, etc.)
   - Guarda estos cálculos en la base de datos

3. **RH abre "Cuadrar Fichajes" por la mañana**:
   - Los cálculos YA están listos (se hicieron durante la noche)
   - RH ve inmediatamente las horas propuestas
   - Puede aceptar, modificar o rechazar

### ¿Por qué es mejor que antes?

**ANTES**:
- RH abría "Cuadrar Fichajes" y esperaba 10-30 segundos mientras el sistema calculaba
- Con muchos empleados, la pantalla se quedaba "pensando"

**AHORA**:
- Los cálculos se hacen durante la noche (cuando nadie usa el sistema)
- RH abre "Cuadrar Fichajes" y TODO ya está listo
- Respuesta instantánea ⚡

---

## 🏗️ Arquitectura Técnica

### Componentes del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│ CRON: Cerrar Jornadas (00:01 diarias)                       │
│ (/app/api/cron/clasificar-fichajes/route.ts)                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ PASO 1: Cierra fichajes del día anterior
                   │ PASO 2: Encola jobs para calcular eventos
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Sistema de Colas (lib/queue.ts)                             │
│ - Modo 1: Vercel Queue (si está disponible)                 │
│ - Modo 2: HTTP directo (fallback/desarrollo)                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Divide en batches de 50 fichajes
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Worker: Calcular Eventos Propuestos                         │
│ (/app/api/workers/calcular-eventos-propuestos/route.ts)     │
│ - Procesa hasta 100 fichajes por llamada                    │
│ - Calcula eventos propuestos con sistema de prioridades     │
│ - Guarda resultados en: fichaje_eventos_propuestos          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Usa lógica de cálculo
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Lógica de Cálculo (lib/calculos/fichajes-propuestos.ts)     │
│                                                              │
│ Sistema de Prioridades (de mayor a menor):                  │
│ 1. Eventos existentes (SIEMPRE mantener originales)         │
│ 2. Promedio histórico (últimos 5 fichajes del empleado)     │
│ 3. Defaults genéricos (09:00, 18:00, 60%)                   │
└──────────────────────────────────────────────────────────────┘
```

### Base de Datos

**Nueva Tabla**: `fichaje_eventos_propuestos`
```sql
CREATE TABLE fichaje_eventos_propuestos (
  id         TEXT PRIMARY KEY,
  fichajeId  TEXT NOT NULL,
  tipo       TipoFichajeEvento NOT NULL,  -- 'entrada', 'pausa_inicio', 'pausa_fin', 'salida'
  hora       TIMESTAMPTZ NOT NULL,
  metodo     VARCHAR(50) NOT NULL,        -- 'historico', 'default', etc.
  createdAt  TIMESTAMP DEFAULT NOW()
);
```

**Campo Nuevo en `fichajes`**:
- `eventosPropuestosCalculados: Boolean` - Flag que indica si ya se calcularon eventos propuestos

---

## 🔧 Configuración para Producción (Hetzner)

### 1. Variables de Entorno Requeridas

Añade estas variables a tu archivo `.env` en el servidor de Hetzner:

```bash
# ========================================
# WORKERS & QUEUES
# ========================================

# Secret para autenticar llamadas a workers (OBLIGATORIO)
# Genera un string aleatorio seguro (32+ caracteres)
WORKER_SECRET="tu-secret-super-seguro-y-aleatorio-aqui"

# URL base de tu aplicación (OBLIGATORIO)
# Debe ser la URL pública de tu servidor Hetzner
NEXT_PUBLIC_APP_URL="https://tudominio.com"

# URL de Vercel Queue (OPCIONAL - NO aplica para Hetzner)
# Déjala vacía o no la incluyas
# VERCEL_QUEUE_URL=""
```

### 2. Cómo Generar el WORKER_SECRET

**Opción 1**: Usando Node.js (en tu terminal)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Opción 2**: Usando OpenSSL
```bash
openssl rand -hex 32
```

**Opción 3**: Usando un generador online (menos seguro)
- https://randomkeygen.com/
- Usa "CodeIgniter Encryption Keys" (256-bit)

### 3. Modo de Operación en Hetzner

Tu sistema usará **HTTP Directo** (no Vercel Queue):

```
CRON (00:01)
  ↓
Sistema de Colas detecta: NO hay VERCEL_QUEUE_URL
  ↓
Hace llamada HTTP a: https://tudominio.com/api/workers/calcular-eventos-propuestos
  ↓
Worker procesa el batch
```

**Ventajas**:
- ✅ No depende de servicios externos (Vercel)
- ✅ Funciona en cualquier servidor
- ✅ Más simple de configurar

**Desventajas**:
- ⚠️ Menos escalable para volúmenes MUY grandes (>10,000 empleados)
- ⚠️ No tiene retry automático si falla (pero el sistema reintenta al día siguiente)

---

## 🧪 Cómo Verificar que Funciona

### Paso 1: Verificar Variables de Entorno

```bash
# En tu servidor Hetzner, ejecuta:
echo $WORKER_SECRET
echo $NEXT_PUBLIC_APP_URL

# Deben mostrar los valores correctos
```

### Paso 2: Test Manual del Worker

Puedes probar el worker manualmente con `curl`:

```bash
curl -X POST https://tudominio.com/api/workers/calcular-eventos-propuestos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_WORKER_SECRET_AQUI" \
  -d '{
    "fichajeIds": ["ID_DE_UN_FICHAJE_PENDIENTE"]
  }'

# Respuesta esperada:
{
  "success": true,
  "procesados": 1,
  "errores": 0,
  "total": 1,
  "duration": "150ms"
}
```

### Paso 3: Verificar CRON en Producción

El CRON se ejecuta automáticamente a las 00:01. Para verificar:

1. **Revisar logs del servidor** (al día siguiente de desplegar):
```bash
# Buscar logs del CRON
grep "CRON Cerrar Jornadas" /path/to/logs/*.log

# Deberías ver:
[CRON Cerrar Jornadas] Procesando día: 2025-12-09
[CRON Cerrar Jornadas] X fichajes creados
[CRON Cerrar Jornadas] Y batches encolados
[CRON Cerrar Jornadas] Proceso completado
```

2. **Consultar base de datos**:
```sql
-- Ver fichajes cerrados ayer
SELECT COUNT(*)
FROM fichajes
WHERE fecha = CURRENT_DATE - INTERVAL '1 day'
AND estado IN ('pendiente', 'finalizado');

-- Ver eventos propuestos calculados
SELECT COUNT(*)
FROM fichaje_eventos_propuestos
WHERE DATE(createdAt) = CURRENT_DATE;
```

### Paso 4: Verificar desde el Frontend (RH)

1. Al día siguiente, RH abre "Cuadrar Fichajes"
2. Debe ver:
   - Lista de fichajes pendientes
   - Cada fichaje tiene eventos propuestos (con horas sugeridas)
   - Respuesta instantánea (sin esperas)

---

## 📊 Sistema de Prioridades para Eventos Propuestos

### 1. Eventos Existentes (Prioridad MÁXIMA)

**Regla**: Si el empleado YA fichó un evento, **NUNCA** se reemplaza.

**Ejemplo**:
```
Empleado fichó:
  - Entrada: 08:45 ✓
  - Pausa inicio: 13:30 ✓
  - (Falta pausa_fin y salida)

Sistema calcula:
  - Entrada: NO se propone (ya existe)
  - Pausa inicio: NO se propone (ya existe)
  - Pausa fin: SÍ se calcula (desde pausa_inicio + duración descanso)
  - Salida: SÍ se calcula (histórico o default)
```

### 2. Promedio Histórico (Prioridad ALTA)

**Regla**: Usa los últimos 5 fichajes finalizados del empleado.

**Detecta Automáticamente**:
- **1 pausa**: Si el empleado suele tomar 1 descanso
- **2 pausas**: Si el empleado suele tomar 2 descansos (ej: café + almuerzo)
- **Sin pausas**: Si nunca toma descanso (raro pero posible)

**Ejemplo con 1 pausa**:
```
Histórico del empleado (últimos 5 días):
  Día 1: 08:50 - 13:45/14:15 - 18:30
  Día 2: 08:55 - 13:50/14:20 - 18:35
  Día 3: 08:45 - 13:40/14:10 - 18:25
  Día 4: 08:52 - 13:48/14:18 - 18:32
  Día 5: 08:48 - 13:42/14:12 - 18:28

Promedio calculado:
  - Entrada: 08:50
  - Pausa inicio: 13:45
  - Pausa fin: 14:15
  - Salida: 18:30
```

**Ejemplo con 2 pausas**:
```
Histórico del empleado:
  Día 1: 08:50 - 11:00/11:15 - 14:00/14:30 - 18:30
  Día 2: 08:55 - 11:05/11:20 - 14:05/14:35 - 18:35
  ...

Promedio calculado:
  - Entrada: 08:52
  - Pausa 1 inicio: 11:02
  - Pausa 1 fin: 11:17
  - Pausa 2 inicio: 14:02
  - Pausa 2 fin: 14:32
  - Salida: 18:32
```

### 3. Defaults Genéricos (Prioridad BAJA)

**Regla**: Se usa solo si NO hay histórico (empleado nuevo o sin fichajes completos).

**Valores**:
- **Entrada**: 09:00
- **Salida**: Calculada desde entrada + horas jornada + descanso
  - Ejemplo: 09:00 + 8h + 30min = 17:30
- **Descanso**: Al 60% del tiempo entre entrada y salida
  - Ejemplo: Si trabaja de 09:00 a 17:30 (8.5h)
    - 60% = 5.1 horas desde entrada = 14:06
    - Descanso de 14:06 a 14:36 (30 min)

---

## 🚫 Casos Especiales: Ausencias

### Ausencias de Día Completo

**Regla**: NO se crea fichaje.

```
Empleado tiene ausencia de día completo el 09/12/2025
  ↓
CRON detecta: periodo = null (día completo)
  ↓
NO crea fichaje
  ↓
Empleado NO aparece en "Cuadrar Fichajes"
```

### Ausencias de Medio Día (mañana/tarde)

**Regla**: Se crea fichaje pendiente pero NO se calculan eventos automáticamente.

```
Empleado tiene ausencia de media jornada (tarde) el 09/12/2025
  ↓
CRON crea fichaje pendiente
  ↓
Sistema detecta: periodo = 'tarde'
  ↓
NO encola job de cálculo (se omite del cálculo automático)
  ↓
RH debe cuadrar MANUALMENTE (sistema no sabe qué horas trabajó)
```

**¿Por qué?**
Porque el sistema no puede saber:
- ¿Trabajó por la mañana de 08:00-14:00?
- ¿O de 09:00-15:00?
- ¿Tomó descanso o no?

RH conoce el contexto y debe decidir.

---

## 🔄 Flujo Completo: De CRON a Frontend

### Timeline del Sistema

```
AYER (Día laboral)
├─ 08:00-18:00: Empleados fichan (o no)
└─ 23:59: Día termina

HOY
├─ 00:01: CRON se ejecuta
│   ├─ PASO 1: Cierra fichajes de AYER
│   │   ├─ Crea fichajes pendientes (sin eventos)
│   │   ├─ Marca en_curso como pendiente/finalizado
│   │   └─ NO crea fichajes para ausencias día completo
│   │
│   └─ PASO 2: Encola jobs de cálculo
│       ├─ Filtra: solo ordinarios, pendientes, sin ausencia medio día
│       ├─ Divide en batches de 50
│       └─ Llama a /api/workers/calcular-eventos-propuestos
│
├─ 00:02-00:10: Workers procesan batches
│   ├─ Calcula eventos propuestos (prioridades: existente > histórico > default)
│   ├─ Guarda en fichaje_eventos_propuestos
│   └─ Marca eventosPropuestosCalculados = true
│
└─ 09:00: RH abre "Cuadrar Fichajes"
    ├─ GET /api/fichajes/cuadrar
    ├─ Retorna fichajes pendientes + eventos propuestos (YA calculados)
    └─ Respuesta instantánea ⚡
```

### Ejemplo Real

**Contexto**: Empresa con 100 empleados

**AYER (09/12/2025)**:
- 85 empleados ficharon completo → CRON los marca "finalizado"
- 10 empleados ficharon incompleto → CRON los marca "pendiente"
- 3 empleados no ficharon → CRON crea fichaje "pendiente"
- 2 empleados con ausencia día completo → CRON NO crea fichaje

**HOY (10/12/2025) - 00:01**:

CRON ejecuta:
```
[CRON] Procesando día: 2025-12-09
[CRON] 100 empleados disponibles
[CRON] Resultados:
  - Fichajes creados: 3
  - Fichajes pendientes: 13 (10 incompletos + 3 nuevos)
  - Fichajes finalizados: 85
[CRON] Encolando jobs para eventos propuestos...
[CRON] 13 fichajes requieren cálculo
[CRON] 1 batch encolado (13 fichajes)
```

**HOY - 00:02**:

Worker procesa:
```
[Worker] Procesando batch de 13 fichajes
[Worker] Fichaje abc123: 4 eventos propuestos (método: historico)
[Worker] Fichaje def456: 4 eventos propuestos (método: default)
...
[Worker] Batch completado: 13 procesados, 0 errores (2.3s)
```

**HOY - 09:00**:

RH abre "Cuadrar Fichajes":
```
GET /api/fichajes/cuadrar

Respuesta (instantánea):
{
  fichajes: [
    {
      id: "abc123",
      empleado: "Juan Pérez",
      fecha: "2025-12-09",
      estado: "pendiente",
      eventos: [
        { tipo: "entrada", hora: "08:45", fuente: "real" }
      ],
      eventosPropuestos: [
        { tipo: "pausa_inicio", hora: "13:30", metodo: "historico" },
        { tipo: "pausa_fin", hora: "14:00", metodo: "historico" },
        { tipo: "salida", hora: "18:15", metodo: "historico" }
      ]
    },
    // ... 12 fichajes más
  ]
}
```

---

## 🐛 Troubleshooting

### Problema 1: Worker retorna 401 Unauthorized

**Causa**: `WORKER_SECRET` no configurado o incorrecto.

**Solución**:
```bash
# Verificar en servidor
echo $WORKER_SECRET

# Debe retornar el secret configurado
# Si está vacío, añadirlo al .env y reiniciar la app
```

### Problema 2: CRON no encola jobs

**Síntomas**:
```
[CRON] 10 fichajes pendientes requieren cálculo
[CRON] 0 batches encolados (0 fichajes en total)
```

**Causa**: Todos los fichajes tienen ausencias de medio día.

**Solución**: Esto es comportamiento esperado. Verificar con:
```sql
SELECT f.id, a.periodo
FROM fichajes f
JOIN empleados e ON f.empleadoId = e.id
LEFT JOIN ausencias a ON a.empleadoId = e.id
  AND a.fechaInicio <= f.fecha
  AND a.fechaFin >= f.fecha
WHERE f.fecha = '2025-12-09'
AND f.estado = 'pendiente';
```

### Problema 3: Worker tarda mucho (>30s)

**Causa**: Batch demasiado grande.

**Solución**: Reducir tamaño de batch en CRON:
```typescript
// En app/api/cron/clasificar-fichajes/route.ts
const batches = chunk(fichajesParaCalcular, 25); // Cambiar de 50 a 25
```

### Problema 4: Eventos propuestos no aparecen en frontend

**Causa**: Frontend aún no implementado (FASE 7 pendiente).

**Verificación**: Consultar directamente la DB:
```sql
SELECT *
FROM fichaje_eventos_propuestos
WHERE fichajeId = 'ID_DEL_FICHAJE';
```

Si hay datos → El backend funciona, falta frontend.
Si NO hay datos → Revisar logs del worker.

---

## 📈 Métricas y Monitoreo

### Métricas del CRON

Cada ejecución retorna:
```json
{
  "success": true,
  "fechaAyer": "2025-12-09",
  "empresas": 1,
  "fichajesCreados": 3,
  "fichajesPendientes": 13,
  "fichajesFinalizados": 85,
  "jobsEncolados": 13,
  "batchesEncolados": 1,
  "errores": []
}
```

### Consultas Útiles

**Fichajes pendientes sin calcular**:
```sql
SELECT COUNT(*)
FROM fichajes
WHERE estado = 'pendiente'
AND eventosPropuestosCalculados = false;
```

**Eventos propuestos por método**:
```sql
SELECT metodo, COUNT(*) as total
FROM fichaje_eventos_propuestos
GROUP BY metodo;

-- Resultado esperado:
-- historico: ~70%
-- default: ~25%
-- calculado_desde_evento_existente: ~5%
```

**Performance del worker (últimos 7 días)**:
```sql
SELECT
  DATE(createdAt) as fecha,
  COUNT(*) as eventos_calculados
FROM fichaje_eventos_propuestos
WHERE createdAt >= NOW() - INTERVAL '7 days'
GROUP BY DATE(createdAt)
ORDER BY fecha DESC;
```

---

## ✅ Checklist de Despliegue

Antes de poner en producción, verificar:

- [ ] Migración de base de datos aplicada (`20251210000000_add_eventos_propuestos`)
- [ ] Variable `WORKER_SECRET` configurada en `.env`
- [ ] Variable `NEXT_PUBLIC_APP_URL` configurada correctamente
- [ ] CRON configurado para ejecutarse a las 00:01
- [ ] Test manual del worker ejecutado con éxito
- [ ] Logs del servidor configurados para capturar "[CRON Cerrar Jornadas]" y "[Worker]"
- [ ] Monitoreo de base de datos activo (consultas lentas, errores)
- [ ] RH informado de los cambios (eventos propuestos, ausencias medio día)

---

## 🔮 Próximas Fases (Pendientes)

### FASE 5: Refactorizar API Cuadrar Fichajes
- Incluir `eventos_propuestos` en GET /api/fichajes/cuadrar
- Actualizar POST para confirmar cuadrado

### FASE 6: Validaciones y UX
- Validación de ausencias medio día
- Diálogo de confirmación para "salida sin descanso"

### FASE 7: Frontend
- Modal de cuadrar fichajes con eventos propuestos
- UX para aceptar/modificar/rechazar propuestas

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisar logs** del servidor (buscar `[CRON]` y `[Worker]`)
2. **Consultar base de datos** (fichajes pendientes, eventos propuestos)
3. **Verificar variables de entorno** (WORKER_SECRET, NEXT_PUBLIC_APP_URL)
4. **Test manual** del worker con curl

---

**Última actualización**: 2025-12-10
**Versión del sistema**: 4.0 (Workers & Queues)
**Estado**: ✅ FASES 1-4 COMPLETADAS
