# Fix: Cuadrar Fichajes - Fichajes No Aparecían en el Modal

**Fecha**: 27 de enero de 2025  
**Estado**: ✅ **RESUELTO**  
**Prioridad**: 🔴 **CRÍTICA** - Funcionalidad core de fichajes

---

## 🐛 Problema Identificado

### Síntoma
Los fichajes pendientes de cuadrar **NO aparecían** en el modal de "Cuadrar fichajes" (HR Admin), aunque el CRON nocturno estaba ejecutándose correctamente y marcando fichajes como `pendiente`.

### Causa Raíz
**Desconexión entre CRON y API de revisión**:

1. **CRON nocturno** (`/app/api/cron/clasificar-fichajes/route.ts`):
   - ✅ Creaba fichajes con estado `pendiente` en la tabla `fichaje`
   - ✅ Marcaba fichajes `en_curso` incompletos como `pendiente`
   - ❌ **NO creaba registros en la tabla `autoCompletado`**

2. **API GET `/api/fichajes/revision`**:
   - ❌ Buscaba en la tabla `autoCompletado` con `tipo: 'fichaje_revision'`
   - ❌ Como el CRON no creaba registros ahí, **NO encontraba nada**
   - ❌ El modal aparecía **siempre vacío**

3. **API POST `/api/fichajes/cuadrar`**:
   - ✅ Buscaba correctamente en la tabla `fichaje` con estado `pendiente`
   - ✅ Funcionaba perfectamente, pero **nunca se llamaba** porque el modal estaba vacío

### Diagnóstico
La tabla `autoCompletado` está diseñada para **auditoría de acciones YA EJECUTADAS**, no para fichajes pendientes de acción. El CRON marca fichajes como `pendiente` en `fichaje`, pero el GET de revisión buscaba en `autoCompletado` (tabla incorrecta).

---

## ✅ Solución Implementada

### 1. Modificar API GET `/api/fichajes/revision`

**Archivo**: `/app/api/fichajes/revision/route.ts`

**Cambios**:
- ❌ **ANTES**: Buscaba en `autoCompletado` con `tipo: 'fichaje_revision'`
- ✅ **AHORA**: Busca **directamente** en `fichaje` con `estado: 'pendiente'`

**Lógica**:
```typescript
// ANTES (❌ NO FUNCIONABA)
const autoCompletados = await prisma.autoCompletado.findMany({
  where: {
    empresaId: session.user.empresaId,
    estado: 'pendiente',
    tipo: 'fichaje_revision', // ← El CRON no crea estos registros
  },
});

// AHORA (✅ FUNCIONA)
const fichajesPendientes = await prisma.fichaje.findMany({
  where: {
    empresaId: session.user.empresaId,
    estado: 'pendiente', // ← Busca directamente fichajes pendientes
    fecha: { lt: hoy }, // Solo días anteriores
  },
  include: {
    empleado: { ... },
    eventos: { ... },
  },
});
```

**Beneficios**:
- ✅ Busca en la tabla correcta (`fichaje`, no `autoCompletado`)
- ✅ Solo muestra fichajes de días anteriores (no el día actual)
- ✅ Incluye empleado y jornada para generar eventos propuestos
- ✅ Calcula razón de por qué está pendiente (eventos faltantes)

### 2. Actualizar API POST `/api/fichajes/revision`

**Archivo**: `/app/api/fichajes/revision/route.ts`

**Cambios**:
- ❌ **ANTES**: Usaba `autoCompletado.id` y reconstruía desde `datosOriginales`
- ✅ **AHORA**: Usa `fichajeId` directamente (más simple y directo)

**Simplificación**:
```typescript
// ANTES (❌ COMPLEJO)
const autoCompletado = await prisma.autoCompletado.findUnique({ where: { id } });
const fichajeId = autoCompletado.datosOriginales.fichajeId;

// AHORA (✅ SIMPLE)
const fichajeId = id; // El ID es directamente el fichajeId
```

### 3. Mejorar CRON para crear notificaciones

**Archivo**: `/app/api/cron/clasificar-fichajes/route.ts`

**Cambios**:
- ✅ **AÑADIDO**: Crear notificación al marcar fichaje como `pendiente`
- ✅ Notifica a HR Admin que hay fichajes que requieren revisión

**Código añadido**:
```typescript
// Crear notificación de fichaje pendiente
await crearNotificacionFichajeRequiereRevision(prisma, {
  fichajeId: fichaje.id,
  empresaId: empresa.id,
  empleadoId: empleado.id,
  empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
  fecha: fichaje.fecha,
  razon: 'No se registraron fichajes en el día',
});
```

---

## 📊 Resultado Final

### Flujo Completo Funcionando

1. **CRON nocturno (23:30 UTC)**:
   - ✅ Procesa día anterior (ayer)
   - ✅ Crea fichajes `pendiente` para empleados sin fichar
   - ✅ Marca fichajes `en_curso` incompletos como `pendiente`
   - ✅ **Crea notificación** para HR Admin

2. **HR Admin abre modal "Cuadrar fichajes"**:
   - ✅ GET `/api/fichajes/revision` busca fichajes con `estado: 'pendiente'`
   - ✅ **Muestra todos los fichajes pendientes** agrupados por empleado
   - ✅ Genera eventos propuestos según jornada del empleado

3. **HR Admin selecciona fichajes y cuadra**:
   - ✅ POST `/api/fichajes/cuadrar` con `fichajeIds`
   - ✅ Crea eventos faltantes según jornada (fija o flexible)
   - ✅ Considera ausencias de medio día
   - ✅ Actualiza cálculos de horas
   - ✅ Marca como `finalizado` con auditoría
   - ✅ Crea notificación de resolución para el empleado

---

## 🧪 Cómo Probar

### 1. Ejecutar CRON manualmente
```bash
curl -X POST http://localhost:3000/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

**Resultado esperado**:
- Debe procesar día anterior
- Crear fichajes `pendiente` para empleados sin fichar
- Mostrar en consola: `fichajesCreados`, `fichajesPendientes`, `fichajesFinalizados`

### 2. Verificar fichajes pendientes en BD
```sql
SELECT 
  f.id, 
  f.fecha, 
  f.estado, 
  e.nombre, 
  e.apellidos,
  COUNT(fe.id) as num_eventos
FROM fichaje f
INNER JOIN empleado e ON f.empleadoId = e.id
LEFT JOIN fichaje_evento fe ON f.id = fe.fichajeId
WHERE f.estado = 'pendiente'
GROUP BY f.id, f.fecha, f.estado, e.nombre, e.apellidos
ORDER BY f.fecha DESC;
```

**Resultado esperado**:
- Debe haber fichajes con estado `pendiente`
- De fechas anteriores a hoy

### 3. Abrir modal "Cuadrar fichajes" (HR Admin)
**Ruta**: `/hr/horario/fichajes` → Botón "Cuadrar fichajes"

**Resultado esperado**:
- ✅ Muestra fichajes pendientes agrupados por empleado
- ✅ Muestra eventos propuestos (azul) vs registrados
- ✅ Permite seleccionar múltiples fichajes
- ✅ Botón "Cuadrar (N)" con contador de seleccionados

### 4. Cuadrar fichajes
**Acciones**:
1. Seleccionar fichajes (checkbox)
2. Click en "Cuadrar (N)"

**Resultado esperado**:
- ✅ Toast de éxito con número de fichajes cuadrados
- ✅ Modal se cierra
- ✅ Fichajes marcados como `finalizado` en BD
- ✅ Eventos creados según jornada del empleado
- ✅ Notificaciones creadas para empleados

### 5. Verificar estado final en BD
```sql
SELECT 
  f.id, 
  f.fecha, 
  f.estado, 
  f.cuadradoMasivamente,
  f.cuadradoPor,
  f.cuadradoEn,
  e.nombre, 
  e.apellidos,
  COUNT(fe.id) as num_eventos
FROM fichaje f
INNER JOIN empleado e ON f.empleadoId = e.id
LEFT JOIN fichaje_evento fe ON f.id = fe.fichajeId
WHERE f.cuadradoMasivamente = true
GROUP BY f.id, f.fecha, f.estado, f.cuadradoMasivamente, f.cuadradoPor, f.cuadradoEn, e.nombre, e.apellidos
ORDER BY f.cuadradoEn DESC
LIMIT 20;
```

**Resultado esperado**:
- ✅ Estado = `finalizado`
- ✅ `cuadradoMasivamente` = `true`
- ✅ `cuadradoPor` = ID del HR Admin
- ✅ `cuadradoEn` = timestamp del cuadrado
- ✅ `num_eventos` ≥ 2 (al menos entrada + salida)

---

## 📝 Archivos Modificados

### 1. `/app/api/fichajes/revision/route.ts`
- **GET**: Busca directamente en tabla `fichaje` con estado `pendiente`
- **POST**: Usa `fichajeId` directamente (sin `autoCompletado`)

### 2. `/app/api/cron/clasificar-fichajes/route.ts`
- **Añadido**: Crear notificación al marcar fichaje como `pendiente`

---

## 🎯 Beneficios de la Solución

1. ✅ **Simplicidad**: Busca directamente en la tabla correcta (`fichaje`)
2. ✅ **Consistencia**: GET y POST usan la misma fuente de datos
3. ✅ **Auditoría**: Mantiene trazabilidad con campos de cuadrado masivo
4. ✅ **Notificaciones**: HR Admin es alertado de fichajes pendientes
5. ✅ **Performance**: Una query menos (no busca en `autoCompletado`)
6. ✅ **Mantenibilidad**: Lógica más directa y fácil de entender

---

## 🔍 Notas Adicionales

### ¿Por qué no usar `autoCompletado`?
La tabla `autoCompletado` está diseñada para **auditoría de acciones automáticas YA EJECUTADAS**:
- Ausencias auto-aprobadas
- Solicitudes auto-aprobadas
- Nóminas extraídas por IA

**NO** para fichajes que **requieren acción manual** (estado `pendiente`).

### ¿Cuándo se marca un fichaje como `pendiente`?
1. **Día sin fichar**: Empleado no fichó nada en un día laboral
2. **Fichaje incompleto**: Fichaje en curso al final del día pero faltan eventos (entrada/salida)

### ¿Qué hace el cuadrado masivo?
1. Valida eventos faltantes según jornada
2. Crea eventos según jornada (fija o flexible)
3. Considera ausencias de medio día
4. Actualiza cálculos de horas
5. Marca como `finalizado` con auditoría
6. Crea notificación para el empleado

---

## ✅ Conclusión

El problema estaba en que el CRON y la API de revisión usaban **fuentes de datos diferentes**:
- CRON escribía en `fichaje`
- API leía de `autoCompletado`

La solución fue **unificar la fuente de datos**: ambos ahora usan la tabla `fichaje` directamente.

**Funcionalidad CORE de fichajes ahora operativa al 100%** 🎉

---

**Autor**: AI Assistant  
**Revisado por**: Sofia Roig  
**Versión**: 1.0  





