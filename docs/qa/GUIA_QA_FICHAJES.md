# Guía de QA - Sistema de Fichajes

## 📋 Preparación del Entorno

### 1. Configurar IDs en el Script de Seed

Antes de ejecutar el script de seed, necesitas configurar los siguientes IDs reales de tu base de datos:

```bash
# 1. Obtener ID de empresa
psql -d tu_database -c "SELECT id, nombre FROM empresas LIMIT 1;"

# 2. Obtener o crear jornadas
psql -d tu_database -c "SELECT id, nombre, config FROM jornadas WHERE tipo = 'fija' LIMIT 1;"
psql -d tu_database -c "SELECT id, nombre, config FROM jornadas WHERE tipo = 'flexible' LIMIT 1;"

# 3. Obtener ID de tipo de ausencia (para caso 7)
psql -d tu_database -c "SELECT id, nombre FROM tipos_ausencia LIMIT 1;"
```

Edita [scripts/seed-fichajes-qa.ts](../../scripts/seed-fichajes-qa.ts) con los IDs obtenidos:

```typescript
const EMPRESA_ID = 'tu-empresa-id';
const JORNADA_FIJA_ID = 'tu-jornada-fija-id';
const JORNADA_FLEXIBLE_ID = 'tu-jornada-flexible-id';
```

En la línea ~300 (caso 7), actualiza:
```typescript
tipoAusenciaId: 'tu-tipo-ausencia-id'
```

### 2. Ejecutar el Script de Seed

```bash
npx tsx scripts/seed-fichajes-qa.ts
```

Esto creará:
- ✅ 2 empleados de prueba (Ana García - Fija, Carlos López - Flexible)
- ✅ 10 fichajes históricos por empleado (patrón consistente)
- ✅ 10 casos edge de fichajes pendientes

---

## 🔍 Plan de Pruebas

### Fase 1: Validar Cálculo de Eventos Propuestos

#### Paso 1.1: Ejecutar Worker Manualmente

```bash
# Opción A: Via API (si tienes un endpoint de trigger manual)
curl -X POST http://localhost:3000/api/workers/calcular-eventos-propuestos \
  -H "Content-Type: application/json" \
  -d '{"fichajeIds": ["all"]}'

# Opción B: Ejecutar el CRON manualmente
curl -X GET http://localhost:3000/api/cron/clasificar-fichajes
```

**Esperado:**
- ✅ Worker procesa todos los fichajes pendientes
- ✅ Crea registros en `fichaje_eventos_propuestos`
- ✅ Marca fichajes con eventos propuestos calculados

#### Paso 1.2: Verificar Eventos Propuestos en BD

```sql
-- Ver eventos propuestos por fichaje
SELECT
  f.id,
  f.fecha,
  e.nombre || ' ' || e.apellidos as empleado,
  (SELECT COUNT(*) FROM fichaje_eventos WHERE fichajeId = f.id) as eventos_reales,
  (SELECT COUNT(*) FROM fichaje_eventos_propuestos WHERE fichajeId = f.id) as eventos_propuestos
FROM fichajes f
JOIN empleados e ON f.empleadoId = e.id
WHERE f.estado = 'pendiente'
  AND f.fecha >= CURRENT_DATE - INTERVAL '10 days'
ORDER BY f.fecha DESC;

-- Detalles de un fichaje específico
SELECT
  tipo,
  hora,
  metodo
FROM fichaje_eventos_propuestos
WHERE fichajeId = 'FICHAJE_ID'
ORDER BY hora ASC;
```

---

### Fase 2: Validar UI de Cuadrar Fichajes

#### Paso 2.1: Abrir Interfaz

Navega a: [/hr/horario/fichajes/cuadrar](http://localhost:3000/hr/horario/fichajes/cuadrar)

#### Paso 2.2: Validar Carga de Datos

**Checklist Visual:**

- [ ] La página carga en <2 segundos
- [ ] Se muestran ~10 fichajes pendientes
- [ ] Cada fichaje muestra:
  - [ ] Nombre del empleado
  - [ ] Fecha del fichaje
  - [ ] Eventos registrados (si los hay)
  - [ ] Eventos propuestos (calculados por worker)
  - [ ] Botón "Editar"
  - [ ] Checkbox de selección

**Validar por Caso:**

| Caso | Eventos Registrados | Eventos Propuestos Esperados | Observaciones |
|------|---------------------|------------------------------|---------------|
| 1. Vacío | Ninguno | 4: entrada, pausa_inicio, pausa_fin, salida | Debe usar promedio histórico (09:05, 14:10-15:10, 18:05) |
| 2. Solo entrada | Entrada 08:55 | 3: pausa_inicio, pausa_fin, salida | Mantiene entrada original, propone resto desde histórico |
| 3. Entrada + Pausa inicio | Entrada 09:00, Pausa inicio 14:00 | 2: pausa_fin, salida | Debe calcular pausa_fin desde pausa_inicio existente (14:00 + 60min = 15:00) |
| 4. Sin pausas | Entrada 09:10, Salida 18:10 | 2: pausa_inicio, pausa_fin | **CRÍTICO**: Debe proponer pausas aunque ya tenga entrada/salida |
| 5. Múltiples pausas | 2 pausas completas | 1: salida | Mantiene todas las pausas, solo propone salida |
| 6. Extraordinario | Entrada 10:00 | **Ninguno** | Fichajes extraordinarios NO deben tener eventos propuestos |
| 7. Medio día | Entrada 14:00 | **Ninguno o manual** | Ausencias medio día requieren cuadre manual |
| 8. Flexible temprano | Entrada 07:30, pausas | 1: salida | Propone salida basada en 8h + descanso |
| 9. Viernes | Entrada 09:00 | 1: salida | Debe proponer salida a las 14:00 (jornada reducida) |
| 10. Editado | Entrada editada, pausas | 1: salida | Respeta evento editado, propone faltantes |

---

### Fase 3: Validar Edición de Fichajes

#### Paso 3.1: Editar Fichaje Individual

Para cada caso, haz clic en "Editar" y verifica:

**Checklist UI:**

- [ ] Modal se abre mostrando:
  - [ ] Fecha del fichaje en el título (ej: "Editar fichaje - 10 Dic 2024")
  - [ ] Nombre del empleado
  - [ ] Lista de eventos ordenados cronológicamente
  - [ ] Eventos propuestos visibles (color diferente, ej: badge azul)
  - [ ] Botón "Añadir evento"

**Funcionalidad:**

- [ ] **Añadir evento**:
  - [ ] Al hacer clic, permite seleccionar tipo (entrada, pausa_inicio, pausa_fin, salida)
  - [ ] Permite seleccionar hora
  - [ ] Permite añadir motivo (opcional)

- [ ] **Editar evento existente**:
  - [ ] El tipo es read-only (no se puede cambiar)
  - [ ] Se puede editar la hora
  - [ ] Se puede editar el motivo

- [ ] **Eliminar evento**:
  - [ ] Permite eliminar eventos propuestos (no guardados aún)
  - [ ] **NO** permite eliminar eventos reales sin motivo

- [ ] **Validaciones**:
  - [ ] Bloquea guardar si hay configuración imposible:
    - [ ] ❌ Dos entradas
    - [ ] ❌ Dos salidas sin pausa intermedia
    - [ ] ❌ Salida sin entrada
    - [ ] ❌ Pausa_fin sin pausa_inicio
  - [ ] Permite configuraciones válidas:
    - [ ] ✅ Solo entrada (fichaje en curso)
    - [ ] ✅ Entrada + Pausa_inicio (en pausa)
    - [ ] ✅ Entrada + Salida sin pausas (con advertencia si requiere descanso)
    - [ ] ✅ Múltiples pausas (varias parejas pausa_inicio/fin)

**Cálculos en Tiempo Real:**

- [ ] Muestra "Horas trabajadas" calculadas en tiempo real
- [ ] Muestra "Horas esperadas" según jornada
- [ ] Indica si el fichaje está completo o faltan eventos

#### Paso 3.2: Guardar Fichaje Sin Descanso (Caso 4)

Para el Caso 4 (entrada + salida sin pausas):

1. Abrir modal editar
2. Guardar sin añadir pausas
3. **Esperado:**
   - [ ] Dialog de confirmación: "Estás guardando un fichaje sin descanso obligatorio"
   - [ ] Opciones: [Confirmar] [Editar]
   - [ ] Si Confirmar → Fichaje se guarda y marca como finalizado
   - [ ] Si Editar → Vuelve al modal

---

### Fase 4: Validar Cuadrar Masivamente

#### Paso 4.1: Seleccionar Fichajes

- [ ] Checkbox "Seleccionar todos" funciona
- [ ] Checkboxes individuales funcionan
- [ ] Contador de seleccionados se actualiza
- [ ] Botón "Cuadrar (N)" muestra cantidad correcta

#### Paso 4.2: Cuadrar Seleccionados

Selecciona 5 fichajes y haz clic en "Cuadrar (5)":

**Checklist:**

- [ ] Loading indicator se muestra
- [ ] Request a `/api/fichajes/cuadrar` se ejecuta
- [ ] Response muestra:
  - [ ] Cantidad de fichajes cuadrados
  - [ ] Lista de errores (si los hay)
- [ ] Toast de éxito/error se muestra
- [ ] Tabla se actualiza automáticamente
- [ ] Fichajes cuadrados desaparecen de la lista

**Validar en BD:**

```sql
-- Verificar fichajes cuadrados
SELECT
  f.id,
  f.fecha,
  f.estado,
  f.horasTrabajadas,
  f.horasEnPausa,
  f.cuadradoMasivamente,
  f.cuadradoEn
FROM fichajes f
WHERE f.id IN ('id1', 'id2', 'id3')
ORDER BY f.fecha DESC;

-- Verificar eventos creados
SELECT
  fe.tipo,
  fe.hora,
  fe.editado,
  fe.motivoEdicion
FROM fichaje_eventos fe
WHERE fe.fichajeId IN ('id1', 'id2', 'id3')
ORDER BY fe.fichajeId, fe.hora ASC;
```

**Esperado:**

- [ ] Estado cambia a `finalizado`
- [ ] `horasTrabajadas` calculadas correctamente
- [ ] `horasEnPausa` calculadas correctamente
- [ ] Eventos propuestos se convirtieron en eventos reales
- [ ] Eventos tienen `editado: true` y `motivoEdicion` apropiado
- [ ] Registros de `fichaje_eventos_propuestos` eliminados

---

### Fase 5: Validar Casos Edge Específicos

#### 5.1 Fichaje Extraordinario (Caso 6)

**Validaciones:**

- [ ] NO aparece en la vista de cuadrar masivamente
  - O si aparece, NO tiene eventos propuestos
- [ ] Solo se puede cuadrar manualmente desde editar
- [ ] Al editar, permite añadir salida libremente
- [ ] Al guardar, marca como finalizado

#### 5.2 Ausencia Medio Día (Caso 7)

**Validaciones:**

- [ ] Badge visible indicando "Ausencia mañana" o "Ausencia tarde"
- [ ] NO tiene eventos propuestos automáticos
- [ ] Al editar:
  - [ ] Permite añadir entrada (si ausencia mañana)
  - [ ] Permite añadir salida (si ausencia tarde)
  - [ ] NO requiere pausas
- [ ] Al cuadrar:
  - [ ] Calcula horas trabajadas proporcionalmente (ej: 4h en vez de 8h)

#### 5.3 Múltiples Pausas (Caso 5)

**Validaciones:**

- [ ] Eventos propuestos respetan las 2 pausas existentes
- [ ] Solo propone salida
- [ ] Al guardar, calcula correctamente:
  - [ ] Horas trabajadas (entrada → salida - todas las pausas)
  - [ ] Horas en pausa (suma de todas las pausas)

```sql
-- Validar cálculo de pausas múltiples
SELECT
  f.horasTrabajadas,
  f.horasEnPausa,
  -- Eventos
  (SELECT hora FROM fichaje_eventos WHERE fichajeId = f.id AND tipo = 'entrada') as entrada,
  (SELECT hora FROM fichaje_eventos WHERE fichajeId = f.id AND tipo = 'salida') as salida,
  (SELECT COUNT(*) FROM fichaje_eventos WHERE fichajeId = f.id AND tipo = 'pausa_inicio') as num_pausas
FROM fichajes f
WHERE f.id = 'CASO_5_ID';
```

**Cálculo esperado:**

Ejemplo: Entrada 08:00, Pausas: 11:00-11:15 (15min) y 14:30-15:30 (60min), Salida 17:00

- Tiempo total: 08:00 a 17:00 = 9 horas
- Tiempo en pausa: 15min + 60min = 1.25 horas
- **Horas trabajadas**: 9 - 1.25 = **7.75 horas** ✅

#### 5.4 Promedio Histórico

**Validar que el sistema usa histórico correctamente:**

Para el Caso 1 (vacío), verificar que los eventos propuestos coinciden con el patrón histórico:

```sql
-- Ver patrón histórico del empleado
SELECT
  f.fecha,
  fe.tipo,
  EXTRACT(HOUR FROM fe.hora)::TEXT || ':' || LPAD(EXTRACT(MINUTE FROM fe.hora)::TEXT, 2, '0') as hora_str
FROM fichajes f
JOIN fichaje_eventos fe ON f.fichajeId = fe.fichajeId
WHERE f.empleadoId = 'EMPLEADO_ID'
  AND f.estado = 'finalizado'
ORDER BY f.fecha DESC, fe.hora ASC
LIMIT 20; -- Ver últimos 5 fichajes x 4 eventos = 20 registros

-- Calcular promedio
SELECT
  fe.tipo,
  AVG(EXTRACT(HOUR FROM fe.hora) * 60 + EXTRACT(MINUTE FROM fe.hora)) as minutos_promedio
FROM fichajes f
JOIN fichaje_eventos fe ON f.fichajeId = fe.fichajeId
WHERE f.empleadoId = 'EMPLEADO_ID'
  AND f.estado = 'finalizado'
GROUP BY fe.tipo;
```

**Esperado:**

- [ ] Eventos propuestos del Caso 1 deben tener horas muy cercanas al promedio calculado
- [ ] Ejemplo: Si el promedio de entrada es 09:05, el evento propuesto debe ser ~09:05

---

## 🐛 Issues Conocidos y Validaciones Críticas

### 1. Ausencias Medio Día

**Issue:** Sistema podría NO requerir entrada/salida para ausencias medio día

**Validación:**

```typescript
// app/api/fichajes/cuadrar/route.ts líneas 476-481
// INCORRECTO:
if (ausenciaMedioDia.medioDia === 'manana') {
  // NO requiere entrada ❌
}

// CORRECTO:
if (ausenciaMedioDia.medioDia === 'manana') {
  // SÍ requiere entrada ✅
  // SÍ requiere salida ✅
  // NO requiere descanso ✅
}
```

**Test:**
- [ ] Caso 7 (ausencia mañana) requiere entrada + salida
- [ ] Caso 7 NO requiere pausas
- [ ] Horas trabajadas ~4h (medio día)

### 2. Cálculo de Descanso

**Issue:** Sistema usa horarios fijos en vez de duración dinámica

**Validación:**

```typescript
// INCORRECTO: Usar configDia.pausa_inicio/pausa_fin
const pausaInicio = configDia.pausa_inicio; // "14:00"

// CORRECTO: Usar config.descanso.duracion + posición 60%
const duracionPausa = config.descanso.duracion; // 60 minutos
const posicionPausa = 0.6; // 60% del tiempo entre entrada y salida
```

**Test:**
- [ ] Caso 8 (entrada 07:30, salida esperada ~16:30)
- [ ] Pausa propuesta debe estar al 60% del tiempo (~11:30-12:30)
- [ ] NO debe estar a las 14:00-15:00 (horario fijo)

### 3. Promedio Histórico Sin Filtro de Día

**Issue:** Sistema podría filtrar por día de la semana (lunes, martes, etc.)

**Validación:**

```typescript
// lib/calculos/fichajes-historico.ts
// INCORRECTO:
where: {
  fecha: { dayOfWeek: nombreDia } // Filtrar por día de semana
}

// CORRECTO:
where: {
  estado: 'finalizado'
}
orderBy: {
  fecha: 'desc'
}
take: 5 // Últimos 5 fichajes de CUALQUIER día
```

**Test:**
- [ ] Caso 1 (lunes vacío) debe usar promedio de últimos 5 fichajes finalizados
- [ ] NO importa si esos fichajes fueron lunes, martes, etc.
- [ ] Verificar en logs del worker que NO filtra por día de semana

### 4. Eventos Extraordinarios

**Issue:** Worker podría calcular eventos propuestos para extraordinarios

**Validación:**

```typescript
// app/api/cron/clasificar-fichajes/route.ts
// Antes de encolar jobs, filtrar:
const fichajesPendientes = await prisma.fichajes.findMany({
  where: {
    estado: 'pendiente',
    tipoFichaje: 'ordinario' // ✅ Excluir extraordinarios
  }
});
```

**Test:**
- [ ] Caso 6 (extraordinario) NO debe tener eventos en `fichaje_eventos_propuestos`
- [ ] Caso 6 solo se puede cuadrar manualmente

---

## 📊 Métricas de Performance

### Carga Inicial

**Test:**

```bash
time curl http://localhost:3000/api/fichajes/cuadrar?limit=20
```

**Esperado:**
- [ ] Tiempo de respuesta: <500ms
- [ ] Query count: <10 queries
- [ ] Tamaño de respuesta: <100KB

### Cuadrar Masivamente

**Test:**

```bash
time curl -X POST http://localhost:3000/api/fichajes/cuadrar \
  -H "Content-Type: application/json" \
  -d '{"fichajeIds": ["id1", "id2", "id3", "id4", "id5"]}'
```

**Esperado:**
- [ ] Tiempo de respuesta: <3s para 5 fichajes
- [ ] Transacción completa (todo o nada)
- [ ] Sin errores de timeout

### Worker de Eventos Propuestos

**Test:**

```bash
time curl -X POST http://localhost:3000/api/workers/calcular-eventos-propuestos
```

**Esperado:**
- [ ] Procesa 50 fichajes en <10s
- [ ] Sin errors de memoria
- [ ] Logs claros del progreso

---

## ✅ Checklist Final de Producción

Antes de desplegar a producción, validar:

### Datos

- [ ] Script de seed ejecutado correctamente
- [ ] 10 casos edge creados
- [ ] Histórico de fichajes generado

### Funcionalidad

- [ ] Todos los casos edge muestran eventos propuestos correctos
- [ ] Edición de fichajes valida correctamente
- [ ] Cuadrar masivamente funciona sin errores
- [ ] Fichajes extraordinarios requieren cuadre manual
- [ ] Ausencias medio día calculan correctamente

### Performance

- [ ] Carga de lista <500ms
- [ ] Cuadrar 5 fichajes <3s
- [ ] Worker procesa batch en <10s

### UX

- [ ] Mensajes de error claros
- [ ] Loading states visibles
- [ ] Confirmaciones antes de acciones destructivas
- [ ] Tooltips explicativos donde sea necesario

### Seguridad

- [ ] Solo HR Admin puede cuadrar
- [ ] Empleados pueden ver sus fichajes
- [ ] Eventos originales nunca se eliminan
- [ ] Auditoría completa (quién, cuándo, por qué)

---

## 🔧 Comandos Útiles

### Ver Logs del Worker

```bash
# Vercel Logs (producción)
vercel logs --follow

# Logs locales
tail -f .next/trace

# Logs de Prisma
DEBUG="prisma:query" npm run dev
```

### Limpiar Datos de Prueba

```sql
-- Eliminar fichajes de los últimos 30 días
DELETE FROM fichaje_eventos_propuestos
WHERE fichajeId IN (
  SELECT id FROM fichajes
  WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
    AND empresaId = 'TU_EMPRESA_ID'
);

DELETE FROM fichaje_eventos
WHERE fichajeId IN (
  SELECT id FROM fichajes
  WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
    AND empresaId = 'TU_EMPRESA_ID'
);

DELETE FROM fichajes
WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
  AND empresaId = 'TU_EMPRESA_ID';

-- Eliminar empleados de prueba
DELETE FROM empleados
WHERE email LIKE '%@test.com';
```

### Regenerar Eventos Propuestos

```sql
-- Borrar eventos propuestos existentes
DELETE FROM fichaje_eventos_propuestos;

-- Marcar todos los fichajes pendientes para re-cálculo
UPDATE fichajes
SET eventosPropuestosCalculados = false
WHERE estado = 'pendiente';
```

Luego ejecutar el worker manualmente.

---

## 📞 Soporte

Si encuentras issues durante el QA:

1. Documenta el caso en [docs/qa/issues/](../issues/)
2. Incluye:
   - Screenshot del error
   - IDs de fichaje afectado
   - Eventos esperados vs obtenidos
   - Logs relevantes
3. Crea un ticket en el sistema de tracking

---

**Última actualización:** 10 Dic 2024
**Versión:** 1.0
**Responsable QA:** [Tu nombre]
