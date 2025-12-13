# QA del Sistema de Fichajes - Guía Rápida

## 🎯 Objetivo

Validar que la funcionalidad de **cuadrar fichajes** está lista para producción, incluyendo:

- ✅ Cálculo de eventos propuestos
- ✅ Edición de fichajes
- ✅ Cuadrar fichajes masivamente
- ✅ Casos edge (ausencias, extraordinarios, múltiples pausas)

---

## 📦 Archivos Generados

He creado los siguientes recursos para facilitar el QA:

1. **[scripts/seed-fichajes-qa.ts](../../scripts/seed-fichajes-qa.ts)**
   - Script para crear datos de prueba realistas
   - 10 casos edge documentados
   - Histórico de fichajes para promedios

2. **[GUIA_QA_FICHAJES.md](./GUIA_QA_FICHAJES.md)**
   - Checklist exhaustivo de validación
   - Tests paso a paso
   - Queries SQL útiles
   - Métricas de performance

3. **[ISSUES_CONOCIDOS.md](./ISSUES_CONOCIDOS.md)**
   - 10 issues identificados durante desarrollo
   - Priorización (Críticos, Importantes, Menores)
   - Plan de corrección en 3 sprints (24h total)
   - Estado de cada issue

---

## 🚀 Pasos para Ejecutar el QA

### Paso 1: Configurar IDs en el Script

**Tiempo:** 5 minutos

Edita [scripts/seed-fichajes-qa.ts](../../scripts/seed-fichajes-qa.ts) y reemplaza los siguientes valores:

```typescript
// Línea ~14
const EMPRESA_ID = 'REEMPLAZAR_CON_EMPRESA_ID';
const JORNADA_FIJA_ID = 'REEMPLAZAR_CON_JORNADA_FIJA_ID';
const JORNADA_FLEXIBLE_ID = 'REEMPLAZAR_CON_JORNADA_FLEXIBLE_ID';

// Línea ~300 (caso 7 - ausencia medio día)
tipoAusenciaId: 'REEMPLAZAR_CON_TIPO_AUSENCIA_ID'
```

**Obtener IDs de tu BD:**

```bash
# Empresa
psql -d tu_database -c "SELECT id, nombre FROM empresas LIMIT 1;"

# Jornadas
psql -d tu_database -c "SELECT id, nombre FROM jornadas WHERE tipo = 'fija' LIMIT 1;"
psql -d tu_database -c "SELECT id, nombre FROM jornadas WHERE tipo = 'flexible' LIMIT 1;"

# Tipo de ausencia
psql -d tu_database -c "SELECT id, nombre FROM tipos_ausencia LIMIT 1;"
```

---

### Paso 2: Ejecutar Script de Seed

**Tiempo:** 2 minutos

```bash
npx tsx scripts/seed-fichajes-qa.ts
```

**Resultado esperado:**

```
✅ Seed completado exitosamente!

📋 Resumen de casos de prueba:
   1. Fichaje vacío (sin eventos)
   2. Solo entrada
   3. Entrada + Pausa inicio (sin fin)
   4. Entrada + Salida sin descanso
   5. Múltiples pausas sin salida
   6. Fichaje extraordinario
   7. Ausencia medio día mañana
   8. Horarios tempranos (flexible)
   9. Jornada reducida viernes
   10. Evento editado con motivo

📊 Histórico: 10 fichajes finalizados por empleado
```

---

### Paso 3: Ejecutar Worker de Eventos Propuestos

**Tiempo:** 1 minuto

**Opción A:** Via CRON (recomendado)

```bash
curl -X GET http://localhost:3000/api/cron/clasificar-fichajes
```

**Opción B:** Via Worker Directo

```bash
curl -X POST http://localhost:3000/api/workers/calcular-eventos-propuestos \
  -H "Content-Type: application/json" \
  -d '{"fichajeIds": ["all"]}'
```

**Validar en BD:**

```sql
-- Verificar que se crearon eventos propuestos
SELECT COUNT(*) FROM fichaje_eventos_propuestos;
-- Esperado: ~30-40 eventos propuestos (3-4 eventos por cada uno de los 10 casos)
```

---

### Paso 4: Abrir Interfaz de Cuadrar Fichajes

**Tiempo:** 30 segundos

Navega a: http://localhost:3000/hr/horario/fichajes/cuadrar

**Validación visual:**

- [ ] Página carga en <2 segundos
- [ ] Se muestran ~10 fichajes pendientes
- [ ] Cada fichaje tiene:
  - [ ] Eventos registrados (si los hay)
  - [ ] Eventos propuestos (badge azul/morado)
  - [ ] Checkbox de selección
  - [ ] Botón "Editar"

---

### Paso 5: Validar Casos Críticos

**Tiempo:** 20 minutos

Sigue la tabla de validación en [GUIA_QA_FICHAJES.md - Fase 2.2](./GUIA_QA_FICHAJES.md#paso-22-validar-carga-de-datos)

**Casos críticos a revisar:**

1. **Caso 1 (Vacío):** ¿Los eventos propuestos coinciden con el promedio histórico (~09:05, 14:10-15:10, 18:05)?

2. **Caso 3 (Pausa inicio sin fin):** ¿La pausa_fin propuesta se calcula desde la pausa_inicio existente (14:00 + 60min)?

3. **Caso 4 (Sin pausas):** ¿El sistema PROPONE pausas aunque ya tenga entrada/salida?

4. **Caso 6 (Extraordinario):** ¿NO tiene eventos propuestos? (debe cuadrarse manualmente)

5. **Caso 7 (Medio día):** ¿NO tiene eventos propuestos? O si los tiene, ¿requiere entrada + salida (no solo uno)?

---

### Paso 6: Probar Edición de Fichajes

**Tiempo:** 15 minutos

Para el **Caso 4** (Entrada + Salida sin descanso):

1. Hacer clic en "Editar"
2. Intentar guardar sin añadir pausas
3. **Validar:**
   - [ ] ¿Muestra dialog de confirmación?
   - [ ] ¿Opciones: [Confirmar] [Editar]?
   - [ ] Si Confirmar → ¿Fichaje se guarda y marca como finalizado?
   - [ ] Si Editar → ¿Vuelve al modal?

Para el **Caso 10** (Evento editado):

1. Abrir modal editar
2. Intentar cambiar el tipo de evento (entrada → salida)
3. **Validar:**
   - [ ] ¿El tipo es read-only? (no se puede cambiar)
   - [ ] ¿Solo se puede editar la hora?

---

### Paso 7: Cuadrar Masivamente

**Tiempo:** 10 minutos

1. Seleccionar 5 fichajes (evitar extraordinarios y medio día)
2. Hacer clic en "Cuadrar (5)"
3. **Validar:**
   - [ ] Loading indicator visible
   - [ ] Toast de éxito muestra "5 fichajes cuadrados"
   - [ ] Fichajes desaparecen de la lista
   - [ ] Estado en BD cambia a `finalizado`

**Verificar en BD:**

```sql
-- Ver fichajes cuadrados
SELECT
  f.id,
  f.fecha,
  f.estado,
  f.horasTrabajadas,
  f.horasEnPausa,
  COUNT(fe.id) as num_eventos
FROM fichajes f
LEFT JOIN fichaje_eventos fe ON f.fichajeId = fe.fichajeId
WHERE f.estado = 'finalizado'
  AND f.fecha >= CURRENT_DATE - INTERVAL '10 days'
GROUP BY f.id
ORDER BY f.fecha DESC;
```

**Esperado:**

- [ ] `estado = 'finalizado'`
- [ ] `horasTrabajadas > 0` (excepto descartados)
- [ ] `num_eventos >= 2` (mínimo entrada + salida)

---

## ⚠️ Issues Críticos a Validar

Durante el QA, prestar **especial atención** a estos 4 issues críticos identificados:

### 1. Ausencias Medio Día (Issue #1)

**Test:**

Caso 7 (ausencia medio día mañana):

- [ ] ¿Requiere entrada?
- [ ] ¿Requiere salida?
- [ ] ¿NO requiere pausas?
- [ ] ¿Horas trabajadas = 4h (no 0h)?

**Si falla:** Ver [ISSUES_CONOCIDOS.md - Issue #1](./ISSUES_CONOCIDOS.md#1-ausencias-medio-día---lógica-incorrecta-de-eventos-requeridos)

---

### 2. Cálculo de Descanso Dinámico (Issue #2)

**Test:**

Caso 8 (entrada temprana 07:30):

- [ ] ¿La pausa propuesta está al ~60% del tiempo? (NO a las 14:00)
- [ ] Ejemplo: 07:30 → 16:30 (9h)
  - Esperado: Pausa ~11:54-12:54
  - Incorrecto: Pausa 14:00-15:00

**Si falla:** Ver [ISSUES_CONOCIDOS.md - Issue #2](./ISSUES_CONOCIDOS.md#2-cálculo-de-descanso---usa-horarios-fijos-en-vez-de-duración-dinámica)

---

### 3. Promedio Histórico (Issue #3)

**Test:**

Revisar logs del worker:

```bash
# Ejecutar worker con logs
DEBUG="prisma:query" npm run dev

# En otra terminal, ejecutar worker
curl -X POST http://localhost:3000/api/workers/calcular-eventos-propuestos
```

**Validar en logs:**

- [ ] ¿Query NO filtra por `dayOfWeek`?
- [ ] ¿Query ordena por `fecha DESC` y toma últimos 5?

**Si falla:** Ver [ISSUES_CONOCIDOS.md - Issue #3](./ISSUES_CONOCIDOS.md#3-promedio-histórico---filtra-por-día-de-semana)

---

### 4. Extraordinarios Sin Propuestas (Issue #4)

**Test:**

Caso 6 (fichaje extraordinario sábado/domingo):

```sql
-- Verificar que NO tiene eventos propuestos
SELECT COUNT(*) FROM fichaje_eventos_propuestos
WHERE fichajeId = 'CASO_6_ID';
-- Esperado: 0
```

- [ ] ¿Cuenta = 0?
- [ ] ¿En la UI NO aparece con eventos propuestos?
- [ ] ¿Solo se puede cuadrar manualmente?

**Si falla:** Ver [ISSUES_CONOCIDOS.md - Issue #4](./ISSUES_CONOCIDOS.md#4-fichajes-extraordinarios---worker-calcula-eventos-propuestos)

---

## 📊 Checklist Final

Antes de dar OK para producción:

### Funcionalidad Core

- [ ] Eventos propuestos se calculan correctamente para 10 casos
- [ ] Edición de fichajes valida secuencias imposibles
- [ ] Cuadrar masivamente procesa 5+ fichajes sin errores
- [ ] Fichajes extraordinarios NO tienen propuestas automáticas
- [ ] Ausencias medio día requieren entrada + salida (no solo uno)

### Performance

- [ ] Carga inicial <2s
- [ ] Cuadrar 5 fichajes <5s
- [ ] Worker procesa batch sin errores de timeout

### UX

- [ ] Mensajes de error claros
- [ ] Loading states visibles
- [ ] Confirmaciones antes de acciones destructivas
- [ ] Eventos propuestos claramente diferenciados de reales

### Seguridad

- [ ] Solo HR Admin puede cuadrar
- [ ] Eventos originales nunca se eliminan
- [ ] Auditoría completa (`editado`, `motivoEdicion`)

---

## 📝 Reportar Hallazgos

### Si encuentras un issue:

1. Documenta:
   - Screenshot del error
   - ID del fichaje afectado
   - Eventos esperados vs obtenidos
   - Logs relevantes

2. Crear archivo `docs/qa/issues/ISSUE-XXX.md` (usa template en [ISSUES_CONOCIDOS.md](./ISSUES_CONOCIDOS.md#-cómo-reportar-un-nuevo-issue))

3. Añadir referencia a `ISSUES_CONOCIDOS.md`

4. Notificar al equipo de desarrollo

---

## 🔄 Limpiar Datos de Prueba

Después del QA:

```sql
-- Eliminar fichajes de prueba
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

O re-ejecutar el script (que limpia automáticamente):

```bash
npx tsx scripts/seed-fichajes-qa.ts
```

---

## 📚 Recursos Adicionales

- **Guía Detallada:** [GUIA_QA_FICHAJES.md](./GUIA_QA_FICHAJES.md)
- **Issues Conocidos:** [ISSUES_CONOCIDOS.md](./ISSUES_CONOCIDOS.md)
- **Plan de Corrección:** [PLAN_CORRECCION_COMPLETA.md](../../PLAN_CORRECCION_COMPLETA.md)
- **Arquitectura del Sistema:** [DOCS_SISTEMA_FICHAJES_WORKERS.md](../../DOCS_SISTEMA_FICHAJES_WORKERS.md)

---

## 🎯 Tiempo Total Estimado

- **Setup:** 10 minutos
- **Validación básica:** 30 minutos
- **Tests exhaustivos:** 1-2 horas (siguiendo GUIA_QA_FICHAJES.md)

**Total:** ~2.5 horas para QA completo

---

## ✅ Resultado Esperado

Al finalizar este QA, deberías tener:

1. ✅ Confirmación de que los 10 casos edge funcionan correctamente
2. ✅ Lista de issues encontrados (si los hay) documentados
3. ✅ Validación de los 4 issues críticos conocidos
4. ✅ Confianza para desplegar a producción (o lista de blockers)

---

**Última actualización:** 10 Dic 2024
**Versión:** 1.0
**Próxima revisión:** Tras correcciones del Sprint 1
