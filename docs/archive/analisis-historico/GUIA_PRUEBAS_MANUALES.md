# Guía de Pruebas Manuales - Sistema de Fichajes

Esta guía te ayudará a probar manualmente todo el sistema de fichajes, incluyendo crons y workers.

---

## 📋 Requisitos Previos

1. **Servidor Next.js corriendo:**
   ```bash
   npm run dev
   ```

2. **Variables de entorno configuradas en `.env`:**
   ```bash
   CRON_SECRET=tu-cron-secret
   WORKER_SECRET=tu-worker-secret
   ```

3. **Base de datos con datos de prueba:**
   ```bash
   npx tsx scripts/setup-datos-prueba-manual.ts
   ```

---

## 🎯 Escenarios de Prueba

### Escenario 1: Ver Fichajes Completos en la UI

**Objetivo:** Verificar que los fichajes finalizados aparecen correctamente.

1. **Abrir la UI:**
   - Ve a: http://localhost:3000/hr/horario/fichajes

2. **Verificar:**
   - ✅ Deberías ver al menos 1 fichaje completo (el de hace 3 días)
   - ✅ El fichaje debe mostrar 4 eventos (entrada, pausa_inicio, pausa_fin, salida)
   - ✅ Estado: "Finalizado"
   - ✅ Horas trabajadas: 8h

3. **Datos esperados:**
   - Empleado: Juan sd
   - Fecha: [hace 3 días]
   - Horario entrada: 09:00
   - Horario salida: 18:00

---

### Escenario 2: Ver Fichajes Pendientes de Cuadrar

**Objetivo:** Verificar que los fichajes pendientes aparecen en la sección de cuadrar.

1. **Abrir la UI:**
   - Ve a: http://localhost:3000/hr/horario/fichajes/cuadrar

2. **Verificar:**
   - ✅ Deberías ver 3 fichajes pendientes:
     1. Hace 2 días: con 2 eventos reales + 2 eventos propuestos
     2. Ayer: sin eventos reales, sin eventos propuestos
     3. Hoy: con 1 evento (entrada), estado "en_curso"

3. **Para cada fichaje, verificar:**
   - ✅ Columna "Eventos" muestra los eventos reales
   - ✅ Si hay eventos propuestos, aparecen en la columna "Propuestos"
   - ✅ Estado del fichaje (pendiente o en_curso)

---

### Escenario 3: Calcular Eventos Propuestos (Worker)

**Objetivo:** Probar que el worker calcula eventos propuestos correctamente.

#### Paso 1: Identificar fichaje sin eventos

En /hr/horario/fichajes/cuadrar, copia el ID del fichaje de "ayer" (sin eventos).

#### Paso 2: Ejecutar el worker

```bash
# Reemplaza FICHAJE_ID con el ID real del fichaje
export WORKER_SECRET="tu-worker-secret"
export FICHAJE_ID="cxxxxxxxxxxxxxxxx"

curl -X POST http://localhost:3000/api/workers/calcular-eventos-propuestos \
  -H "Authorization: Bearer ${WORKER_SECRET}" \
  -H "Content-Type: application/json" \
  -d "{\"fichajeIds\": [\"${FICHAJE_ID}\"]}"
```

#### Paso 3: Verificar respuesta

```json
{
  "success": true,
  "procesados": 1,
  "errores": 0,
  "duracion": "123ms"
}
```

#### Paso 4: Verificar en la UI

1. Recargar /hr/horario/fichajes/cuadrar
2. ✅ El fichaje de "ayer" ahora debe tener eventos propuestos
3. ✅ Deberías ver 4 eventos propuestos: entrada, pausa_inicio, pausa_fin, salida

---

### Escenario 4: Cerrar Jornadas (CRON)

**Objetivo:** Probar que el CRON cierra fichajes "en_curso" correctamente.

#### Paso 1: Verificar estado inicial

En /hr/horario/fichajes/cuadrar:
- ✅ Fichaje de "hoy" debe estar en estado "en_curso"
- ✅ Debe tener solo 1 evento (entrada)

#### Paso 2: Ejecutar el CRON

```bash
export CRON_SECRET="tu-cron-secret"

curl -X POST http://localhost:3000/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

**IMPORTANTE:** El CRON procesa el día ANTERIOR, no hoy. Para probarlo:

**Opción A:** Esperar hasta mañana y ejecutar el CRON
**Opción B:** Modificar temporalmente la fecha del fichaje a "ayer"

```bash
# En psql o prisma studio
UPDATE fichajes
SET fecha = CURRENT_DATE - INTERVAL '1 day'
WHERE id = 'FICHAJE_ID_HOY';

# Luego ejecutar el CRON
curl -X POST http://localhost:3000/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

#### Paso 3: Verificar respuesta

```json
{
  "success": true,
  "fichajesCreados": 0,
  "fichajesPendientes": 1,
  "fichajesFinalizados": 0,
  "duracion": "456ms"
}
```

#### Paso 4: Verificar en la UI

1. Recargar /hr/horario/fichajes/cuadrar
2. ✅ El fichaje debería cambiar de "en_curso" a "pendiente"
3. ✅ Sigue teniendo solo 1 evento (entrada)
4. ✅ Está listo para cuadrar

---

### Escenario 5: Cuadrar Fichajes Manualmente

**Objetivo:** Probar el flujo completo de cuadrado desde la UI.

#### Paso 1: Ir a la sección de cuadrar

http://localhost:3000/hr/horario/fichajes/cuadrar

#### Paso 2: Seleccionar fichajes

- ✅ Selecciona el fichaje de "hace 2 días" (tiene eventos propuestos)
- ✅ Selecciona el fichaje de "ayer" (ahora debería tener eventos propuestos tras ejecutar el worker)

#### Paso 3: Cuadrar

1. Click en el botón "Cuadrar seleccionados" (o similar)
2. ✅ Deberías ver un mensaje de éxito
3. ✅ Los fichajes deberían desaparecer de /cuadrar

#### Paso 4: Verificar en visualización

1. Ve a: http://localhost:3000/hr/horario/fichajes
2. ✅ Deberías ver ahora 3 fichajes en total:
   - Hace 3 días: completo (ya estaba)
   - Hace 2 días: recién cuadrado
   - Ayer: recién cuadrado
3. ✅ Todos deben estar en estado "Finalizado"
4. ✅ Todos deben tener 4 eventos

#### Paso 5: Verificar eventos

Para cada fichaje cuadrado:
- ✅ Click en la fila para expandir detalles
- ✅ Debe mostrar: entrada, pausa_inicio, pausa_fin, salida
- ✅ Las horas deben ser coherentes
- ✅ Flag "Editado" debe estar marcado para eventos propuestos

---

## 🔍 Verificaciones Adicionales

### Verificar Agrupación Correcta

**Problema anterior:** Múltiples empleados del mismo día se mezclaban en una sola fila.

**Cómo verificar que está corregido:**

1. Si tienes empleados TEST de 2025-12-08:
   ```bash
   # Ver en DB cuántos hay
   SELECT empleado_id, fecha, COUNT(*)
   FROM fichajes
   WHERE fecha = '2025-12-08'
   GROUP BY empleado_id, fecha;
   ```

2. En la UI (/hr/horario/fichajes):
   - ✅ Deberías ver UNA fila por cada empleado+fecha
   - ✅ NO deberían mezclarse fichajes de diferentes empleados
   - ✅ Cada fila debe tener el nombre del empleado correcto

3. Verificar en consola del navegador:
   ```javascript
   // Abrir DevTools (F12)
   fetch('/api/fichajes?fechaInicio=2025-12-08&fechaFin=2025-12-08')
     .then(r => r.json())
     .then(data => {
       console.log('Total fichajes:', data.data.length);
       console.log('Empleados únicos:', new Set(data.data.map(f => f.empleado.id)).size);
     });
   ```

---

## 🧪 Scripts de Validación

### Script 1: Validación completa

```bash
npx tsx scripts/validacion-produccion.ts
```

Ejecuta las 9 validaciones automáticas:
- ✅ Creación de fichajes
- ✅ Eventos propuestos
- ✅ Proceso de cuadrado
- ✅ Visualización
- ✅ Agrupación correcta

### Script 2: Test E2E

```bash
npx tsx scripts/test-e2e-flujo-completo.ts
```

Simula el flujo completo:
- Crear fichaje pendiente
- Calcular eventos propuestos
- Cuadrar fichaje
- Verificar en UI

### Script 3: Test de agrupación

```bash
npx tsx scripts/test-agrupacion-corregida.ts
```

Verifica que la agrupación por empleado+fecha funciona correctamente.

---

## 🩺 Diagnóstico de Problemas

### Problema: No veo fichajes en la UI

**Diagnóstico:**

```bash
# 1. Verificar en base de datos
psql -d tu_database -c "SELECT id, fecha, estado, empleado_id FROM fichajes ORDER BY fecha DESC LIMIT 10;"

# 2. Verificar endpoint con autenticación
curl http://localhost:3000/api/debug/fichajes \
  -H "Cookie: tu-cookie-de-sesion"

# 3. Verificar en consola del navegador
# DevTools (F12) → Console
fetch('/api/fichajes?fechaInicio=2025-12-01&fechaFin=2025-12-31')
  .then(r => r.json())
  .then(console.log);
```

**Posibles causas:**
- ❌ No estás autenticado
- ❌ Los fichajes son de otra empresa
- ❌ El rango de fechas no incluye tus fichajes
- ❌ Hay un filtro activo (estado, equipo, búsqueda)

### Problema: Worker falla

**Diagnóstico:**

```bash
# Ver logs del worker
curl -X POST http://localhost:3000/api/workers/calcular-eventos-propuestos \
  -H "Authorization: Bearer ${WORKER_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"fichajeIds": ["FICHAJE_ID"]}' \
  -v
```

**Verificar:**
- ✅ WORKER_SECRET está configurado
- ✅ El fichaje existe y es válido
- ✅ El empleado tiene jornada asignada
- ✅ Hay datos históricos para calcular

### Problema: CRON no hace nada

**Diagnóstico:**

```bash
# Ver logs del CRON
curl -X POST http://localhost:3000/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -v
```

**Verificar:**
- ✅ CRON_SECRET está configurado
- ✅ Hay fichajes del día ANTERIOR (no de hoy)
- ✅ Los fichajes están en estado "en_curso"
- ✅ Los empleados tienen jornada asignada

### Problema: Eventos propuestos no se usan al cuadrar

**Diagnóstico:**

1. Verificar en DB:
   ```sql
   SELECT * FROM fichaje_eventos_propuestos WHERE fichaje_id = 'FICHAJE_ID';
   ```

2. Verificar en endpoint de cuadrar:
   ```bash
   # En la respuesta, buscar "eventos_propuestos"
   curl http://localhost:3000/api/fichajes/cuadrar \
     -H "Cookie: tu-cookie"
   ```

3. Verificar logs al cuadrar:
   - Abrir DevTools (F12) → Network
   - Cuadrar fichaje
   - Ver request a POST /api/fichajes/cuadrar
   - Verificar que incluye los eventos propuestos

---

## ✅ Checklist de Pruebas

- [ ] Setup: Ejecutar script de datos de prueba
- [ ] Escenario 1: Ver fichajes completos en UI
- [ ] Escenario 2: Ver fichajes pendientes en /cuadrar
- [ ] Escenario 3: Ejecutar worker y verificar eventos propuestos
- [ ] Escenario 4: Ejecutar CRON y verificar cierre de jornadas
- [ ] Escenario 5: Cuadrar fichajes desde UI
- [ ] Verificar: Agrupación correcta (empleado + fecha)
- [ ] Verificar: No hay mezcla de empleados
- [ ] Verificar: Eventos se crean correctamente
- [ ] Verificar: Estados cambian correctamente
- [ ] Scripts: Ejecutar validacion-produccion.ts
- [ ] Scripts: Ejecutar test-e2e-flujo-completo.ts
- [ ] Scripts: Ejecutar test-agrupacion-corregida.ts

---

## 📞 Soporte

Si encuentras algún problema durante las pruebas:

1. **Logs del servidor:**
   ```bash
   # Ver logs de Next.js
   # En la terminal donde ejecutaste npm run dev
   ```

2. **Logs del navegador:**
   ```
   DevTools (F12) → Console
   Buscar errores en rojo
   ```

3. **Base de datos:**
   ```bash
   # Prisma Studio
   npx prisma studio

   # O psql
   psql -d tu_database
   ```

4. **Endpoint de debug:**
   ```
   http://localhost:3000/api/debug/fichajes
   ```

---

**Última actualización:** 2025-12-10
**Autor:** Claude Code
