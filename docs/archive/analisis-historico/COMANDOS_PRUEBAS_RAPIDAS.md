# Comandos Rápidos para Pruebas Manuales

Guía de comandos copy-paste para probar el sistema de fichajes.

---

## 🚀 Setup Inicial

### 1. Crear datos de prueba

```bash
npx tsx scripts/setup-datos-prueba-manual.ts
```

Esto crea 4 fichajes:
- **Hace 3 días:** Fichaje completo (finalizado) - visible en /hr/horario/fichajes
- **Hace 2 días:** Fichaje incompleto con eventos propuestos - visible en /cuadrar
- **Ayer:** Fichaje sin eventos - para probar worker
- **Hoy:** Fichaje en curso - para probar CRON

---

## 📊 IDs de los Fichajes Creados

Después de ejecutar el setup, los IDs aparecen en la salida. Usa estos IDs en los comandos siguientes.

**Ejemplo de salida:**
```
3. 2025-12-09 - SIN EVENTOS (pendiente)
   ID: cmizy0f5v000l1ypyq8bp7wuw  ← COPIAR ESTE ID

4. 2025-12-10 - EN CURSO (hoy)
   ID: cmizy0f5v000n1ypymoh6emac  ← COPIAR ESTE ID
```

---

## 🔧 Probar Worker (Calcular Eventos Propuestos)

### Paso 1: Copiar el ID del fichaje "SIN EVENTOS" del paso anterior

### Paso 2: Ejecutar el worker

```bash
# Configura tu WORKER_SECRET
export WORKER_SECRET="tu-worker-secret-aqui"

# Reemplaza FICHAJE_ID con el ID real del fichaje #3 (ayer)
export FICHAJE_ID="cmizy0f5v000l1ypyq8bp7wuw"

# Ejecutar worker
curl -X POST http://localhost:3000/api/workers/calcular-eventos-propuestos \
  -H "Authorization: Bearer ${WORKER_SECRET}" \
  -H "Content-Type: application/json" \
  -d "{\"fichajeIds\": [\"${FICHAJE_ID}\"]}"
```

### Respuesta esperada:

```json
{
  "success": true,
  "procesados": 1,
  "errores": 0,
  "duracion": "123ms"
}
```

### Verificar en la UI:

1. Ve a: http://localhost:3000/hr/horario/fichajes/cuadrar
2. Busca el fichaje de "ayer"
3. ✅ Ahora debe tener 4 eventos propuestos

---

## ⏰ Probar CRON (Cerrar Jornadas)

### Método 1: Ejecutar CRON directamente (procesa día anterior)

```bash
# Configura tu CRON_SECRET
export CRON_SECRET="tu-cron-secret-aqui"

# Ejecutar CRON
curl -X POST http://localhost:3000/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

**IMPORTANTE:** El CRON procesa el día ANTERIOR, no HOY. Por defecto no hará nada con el fichaje de "hoy".

### Método 2: Modificar fichaje de "hoy" a "ayer" temporalmente

```bash
# 1. Abrir Prisma Studio
npx prisma studio

# 2. Ir a tabla "fichajes"

# 3. Buscar el fichaje con estado "en_curso" (el de hoy)

# 4. Cambiar la fecha a AYER:
#    - Restar 1 día a la fecha
#    - Ejemplo: Si hoy es 2025-12-10, cambiar a 2025-12-09

# 5. Guardar cambios

# 6. Ejecutar CRON
curl -X POST http://localhost:3000/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Respuesta esperada:

```json
{
  "success": true,
  "fichajesCreados": 0,
  "fichajesPendientes": 1,
  "fichajesFinalizados": 0,
  "duracion": "456ms"
}
```

### Verificar en la UI:

1. Ve a: http://localhost:3000/hr/horario/fichajes/cuadrar
2. El fichaje debería estar ahora en estado "pendiente"

---

## ✅ Cuadrar Fichajes desde la UI

### Paso 1: Ir a la interfaz de cuadrar

http://localhost:3000/hr/horario/fichajes/cuadrar

### Paso 2: Seleccionar fichajes pendientes

Deberías ver:
- ✅ Fichaje de hace 2 días (con eventos propuestos)
- ✅ Fichaje de ayer (con eventos propuestos tras ejecutar worker)
- ✅ Fichaje de hoy/ayer (tras ejecutar CRON)

### Paso 3: Cuadrar

1. Selecciona los fichajes con checkbox
2. Click en "Cuadrar seleccionados"
3. Confirmar en el modal

### Paso 4: Verificar

1. Ve a: http://localhost:3000/hr/horario/fichajes
2. ✅ Deberías ver ahora todos los fichajes en estado "Finalizado"
3. ✅ Cada uno con 4 eventos

---

## 🔍 Comandos de Diagnóstico

### Ver fichajes en la base de datos

```bash
# Usando Prisma Studio (interfaz gráfica)
npx prisma studio

# Usando psql
psql -d clousadmin -c "
SELECT
  id,
  fecha::date,
  estado,
  tipo_fichaje,
  (SELECT COUNT(*) FROM fichaje_eventos WHERE fichaje_id = fichajes.id) as eventos,
  (SELECT COUNT(*) FROM fichaje_eventos_propuestos WHERE fichaje_id = fichajes.id) as propuestos
FROM fichajes
WHERE empleado_id = 'cmizksjn600071yec9u20bhlb'
ORDER BY fecha DESC
LIMIT 10;
"
```

### Ver eventos de un fichaje específico

```bash
export FICHAJE_ID="tu-fichaje-id-aqui"

# Eventos reales
psql -d clousadmin -c "
SELECT tipo, hora, editado, motivo_edicion
FROM fichaje_eventos
WHERE fichaje_id = '${FICHAJE_ID}'
ORDER BY hora;
"

# Eventos propuestos
psql -d clousadmin -c "
SELECT tipo, hora, metodo
FROM fichaje_eventos_propuestos
WHERE fichaje_id = '${FICHAJE_ID}'
ORDER BY hora;
"
```

### Endpoint de debug (requiere autenticación)

```bash
# En el navegador con DevTools (F12):
fetch('/api/debug/fichajes')
  .then(r => r.json())
  .then(console.log);
```

### Ver fichajes en el endpoint de la API

```bash
# En el navegador con DevTools (F12):
fetch('/api/fichajes?fechaInicio=2025-12-01&fechaFin=2025-12-31')
  .then(r => r.json())
  .then(data => {
    console.log('Total fichajes:', data.data.length);
    console.table(data.data.map(f => ({
      fecha: f.fecha.substring(0, 10),
      empleado: f.empleado.nombre,
      estado: f.estado,
      eventos: f.eventos.length
    })));
  });
```

---

## 🧪 Scripts de Validación Automática

### Validación completa de producción

```bash
npx tsx scripts/validacion-produccion.ts
```

**Valida:**
- ✅ Creación de fichajes
- ✅ Cálculo de eventos propuestos
- ✅ Proceso de cuadrado
- ✅ Visualización en endpoints
- ✅ Agrupación correcta (empleado + fecha)
- ✅ Sin duplicados

### Test end-to-end

```bash
npx tsx scripts/test-e2e-flujo-completo.ts
```

**Simula el flujo completo:**
1. Crear fichaje pendiente
2. Calcular eventos propuestos
3. Verificar en /cuadrar
4. Cuadrar fichaje
5. Verificar en /fichajes
6. Validar agrupación

### Test de agrupación

```bash
npx tsx scripts/test-agrupacion-corregida.ts
```

**Verifica:**
- Agrupación por empleado+fecha funciona
- No se mezclan empleados del mismo día
- Relación 1:1 entre fichajes y jornadas

---

## 🩺 Solución de Problemas Comunes

### Problema: Worker devuelve 401 Unauthorized

**Solución:**
```bash
# Verificar que WORKER_SECRET está configurado en .env
cat .env | grep WORKER_SECRET

# Si no existe, añadirlo:
echo 'WORKER_SECRET=tu-secret-seguro' >> .env

# Reiniciar el servidor
# Ctrl+C y luego: npm run dev
```

### Problema: CRON devuelve 401 Unauthorized

**Solución:**
```bash
# Verificar que CRON_SECRET está configurado en .env
cat .env | grep CRON_SECRET

# Si no existe, añadirlo:
echo 'CRON_SECRET=tu-secret-seguro' >> .env

# Reiniciar el servidor
# Ctrl+C y luego: npm run dev
```

### Problema: No veo fichajes en la UI

**Diagnóstico:**

```bash
# 1. Verificar en base de datos
npx prisma studio
# Ir a tabla "fichajes" y verificar que existen

# 2. Verificar en el navegador (F12 → Console):
fetch('/api/fichajes?fechaInicio=2025-12-01&fechaFin=2025-12-31')
  .then(r => r.json())
  .then(console.log);

# 3. Verificar autenticación
# Asegúrate de estar logueado en la aplicación
```

### Problema: Eventos propuestos no se usan al cuadrar

**Diagnóstico:**

```bash
# Verificar que existen en la base de datos
export FICHAJE_ID="tu-fichaje-id"

psql -d clousadmin -c "
SELECT * FROM fichaje_eventos_propuestos
WHERE fichaje_id = '${FICHAJE_ID}';
"

# Si no hay resultados, ejecutar el worker primero
curl -X POST http://localhost:3000/api/workers/calcular-eventos-propuestos \
  -H "Authorization: Bearer ${WORKER_SECRET}" \
  -H "Content-Type: application/json" \
  -d "{\"fichajeIds\": [\"${FICHAJE_ID}\"]}"
```

---

## 🔄 Resetear y Empezar de Nuevo

```bash
# 1. Limpiar datos de prueba
npx tsx scripts/setup-datos-prueba-manual.ts

# 2. Esto automáticamente limpia datos anteriores y crea nuevos

# 3. Verificar en la UI
# - /hr/horario/fichajes (debe mostrar 1 fichaje completo)
# - /hr/horario/fichajes/cuadrar (debe mostrar 3 fichajes pendientes)
```

---

## 📋 Checklist de Prueba Rápida

```bash
# ✅ PASO 1: Setup
npx tsx scripts/setup-datos-prueba-manual.ts

# ✅ PASO 2: Configurar secrets
export WORKER_SECRET="tu-worker-secret"
export CRON_SECRET="tu-cron-secret"

# ✅ PASO 3: Copiar ID del fichaje #3 (ayer) de la salida del setup
export FICHAJE_ID_AYER="pegar-id-aqui"

# ✅ PASO 4: Ejecutar worker
curl -X POST http://localhost:3000/api/workers/calcular-eventos-propuestos \
  -H "Authorization: Bearer ${WORKER_SECRET}" \
  -H "Content-Type: application/json" \
  -d "{\"fichajeIds\": [\"${FICHAJE_ID_AYER}\"]}"

# ✅ PASO 5: Ejecutar CRON (opcional - modifica fichaje de hoy a ayer primero)
curl -X POST http://localhost:3000/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer ${CRON_SECRET}"

# ✅ PASO 6: Cuadrar en la UI
# - Ir a http://localhost:3000/hr/horario/fichajes/cuadrar
# - Seleccionar fichajes
# - Click en "Cuadrar"

# ✅ PASO 7: Verificar en la UI
# - Ir a http://localhost:3000/hr/horario/fichajes
# - Verificar que todos los fichajes aparecen

# ✅ PASO 8: Ejecutar validaciones
npx tsx scripts/validacion-produccion.ts
```

---

**Última actualización:** 2025-12-10
**Documentos relacionados:**
- [GUIA_PRUEBAS_MANUALES.md](./GUIA_PRUEBAS_MANUALES.md) - Guía detallada paso a paso
- [RESUMEN_CAMBIOS_FICHAJES_PRODUCCION.md](./RESUMEN_CAMBIOS_FICHAJES_PRODUCCION.md) - Resumen de cambios implementados
