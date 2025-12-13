# Issues Conocidos - Sistema de Fichajes

Este documento lista los issues conocidos identificados durante el desarrollo y su estado de corrección.

---

## 🔴 CRÍTICOS (Bloquean funcionalidad core)

### 1. Ausencias Medio Día - Lógica Incorrecta de Eventos Requeridos

**Estado:** 🔍 A VALIDAR

**Descripción:**

El sistema actualmente **NO** requiere entrada/salida para ausencias de medio día, cuando debería requerirlas.

**Comportamiento Actual (Incorrecto):**

```typescript
// app/api/fichajes/cuadrar/route.ts líneas ~476-488
if (ausenciaMedioDia.medioDia === 'manana') {
  // NO requiere entrada ❌ ERROR
  eventosRequeridos.push('salida'); // Solo salida
}

if (ausenciaMedioDia.medioDia === 'tarde') {
  // NO requiere salida ❌ ERROR
  eventosRequeridos.push('entrada'); // Solo entrada
}
```

**Comportamiento Esperado (Correcto):**

```typescript
// Ausencia medio día SÍ requiere entrada y salida
if (ausenciaMedioDia.medioDia === 'manana' || ausenciaMedioDia.medioDia === 'tarde') {
  eventosRequeridos.push('entrada');  // ✅
  eventosRequeridos.push('salida');   // ✅
  // NO requiere descanso ✅
}
```

**Impacto:**

- Fichajes con ausencia medio día se marcan como completos sin eventos necesarios
- Horas trabajadas incorrectas (0h en vez de 4h)
- RH no puede validar asistencia real

**Archivos Afectados:**

- [app/api/fichajes/cuadrar/route.ts](../../app/api/fichajes/cuadrar/route.ts) líneas 476-488
- `lib/calculos/fichajes.ts` función `validarFichajeCompleto`

**Test de Validación:**

1. Crear ausencia medio día mañana para empleado
2. Crear fichaje con entrada 14:00 y salida 18:00
3. Validar que el sistema **requiere** ambos eventos
4. Validar que NO requiere pausas
5. Validar horas trabajadas = 4h (no 0h)

---

### 2. Cálculo de Descanso - Usa Horarios Fijos en vez de Duración Dinámica

**Estado:** 🔍 A VALIDAR

**Descripción:**

El sistema usa `configDia.pausa_inicio` y `configDia.pausa_fin` (horarios fijos) en vez de `config.descanso.duracion` (duración en minutos) + posición dinámica.

**Comportamiento Actual (Incorrecto):**

```typescript
// Usa horarios fijos de la jornada
const pausaInicio = configDia.pausa_inicio; // "14:00" ❌
const pausaFin = configDia.pausa_fin;       // "15:00" ❌

// Resultado: SIEMPRE propone pausa 14:00-15:00
// Incluso si el empleado entra a las 07:00
```

**Comportamiento Esperado (Correcto):**

```typescript
// Usar duración + posición dinámica (60% del tiempo)
const duracionPausa = config.descanso.duracion; // 60 minutos ✅
const posicion = 0.6; // 60% del tiempo entre entrada y salida

// Ejemplo: Entrada 07:00, Salida 16:00
// Tiempo total: 9h = 540 min
// Posición pausa: 540 * 0.6 = 324 min después de entrada
// Pausa inicio: 07:00 + 324 min = 12:24 ✅
// Pausa fin: 12:24 + 60 min = 13:24 ✅
```

**Impacto:**

- Pausas propuestas no son realistas para jornadas flexibles
- Empleados que entran temprano ven pausas a horas incorrectas
- No respeta patrones reales de trabajo

**Archivos Afectados:**

- `lib/calculos/fichajes-propuestos.ts` función `calcularPosicionDescanso`
- [app/api/workers/calcular-eventos-propuestos/route.ts](../../app/api/workers/calcular-eventos-propuestos/route.ts)

**Test de Validación:**

1. Crear fichaje con entrada 07:30
2. Verificar que la pausa propuesta está al 60% del tiempo (NO a las 14:00)
3. Ejemplo esperado: 07:30 → 16:30 (9h)
   - Pausa inicio: ~11:54 (60% de 9h desde 07:30)
   - Pausa fin: ~12:54 (11:54 + 60min)

---

### 3. Promedio Histórico - Filtra por Día de Semana

**Estado:** 🔍 A VALIDAR

**Descripción:**

El sistema podría estar filtrando el promedio histórico por día de la semana (lunes, martes, etc.) en vez de usar los últimos 5 fichajes finalizados de cualquier día.

**Comportamiento Actual (Incorrecto - SI existe este filtro):**

```typescript
// lib/calculos/fichajes-historico.ts
const promedioHistorico = await prisma.fichajes.findMany({
  where: {
    empleadoId,
    estado: 'finalizado',
    fecha: {
      dayOfWeek: obtenerNombreDia(fecha) // ❌ Filtro por día de semana
    }
  },
  take: 5
});
```

**Comportamiento Esperado (Correcto):**

```typescript
// Últimos 5 fichajes finalizados, SIN importar el día de semana
const promedioHistorico = await prisma.fichajes.findMany({
  where: {
    empleadoId,
    estado: 'finalizado'
    // ✅ Sin filtro de día de semana
  },
  orderBy: {
    fecha: 'desc'
  },
  take: 5
});
```

**Impacto:**

- Empleados con patrones irregulares tienen menos datos históricos
- Lunes sin histórico no pueden usar datos de martes/miércoles
- Eventos propuestos menos precisos

**Archivos Afectados:**

- [lib/calculos/fichajes-historico.ts](../../lib/calculos/fichajes-historico.ts) función `obtenerPromedioEventosHistoricos`

**Test de Validación:**

1. Revisar código de `obtenerPromedioEventosHistoricos`
2. Verificar que NO filtra por `dayOfWeek` o `obtenerNombreDia`
3. Crear fichaje lunes vacío
4. Verificar que usa histórico de martes/miércoles/etc.
5. Verificar en logs que carga últimos 5 finalizados (cualquier día)

---

## 🟠 IMPORTANTES (Afectan UX/Performance)

### 4. Fichajes Extraordinarios - Worker Calcula Eventos Propuestos

**Estado:** 🔍 A VALIDAR

**Descripción:**

El worker podría estar calculando eventos propuestos para fichajes extraordinarios, cuando estos deben cuadrarse manualmente.

**Comportamiento Esperado:**

```typescript
// app/api/cron/clasificar-fichajes/route.ts
// ANTES de encolar jobs, filtrar extraordinarios:

const fichajesPendientes = await prisma.fichajes.findMany({
  where: {
    estado: 'pendiente',
    tipoFichaje: 'ordinario' // ✅ SOLO ordinarios
    // Excluir 'extraordinario' ✅
  }
});

// Encolar solo ordinarios
for (const fichaje of fichajesPendientes) {
  await enqueue({ fichajeId: fichaje.id });
}
```

**Impacto:**

- Eventos propuestos incorrectos para fichajes en días no laborales
- Confusión en RH al ver propuestas para extraordinarios
- Desperdicio de recursos del worker

**Archivos Afectados:**

- [app/api/cron/clasificar-fichajes/route.ts](../../app/api/cron/clasificar-fichajes/route.ts) línea ~170
- [app/api/workers/calcular-eventos-propuestos/route.ts](../../app/api/workers/calcular-eventos-propuestos/route.ts) (validación adicional)

**Test de Validación:**

1. Crear fichaje extraordinario (sábado/domingo)
2. Ejecutar CRON manualmente
3. Verificar que el fichaje NO está en la cola de workers
4. Verificar que `fichaje_eventos_propuestos` está vacío para ese fichaje

---

### 5. Editar Fichaje - Validaciones de Secuencia Incompletas

**Estado:** 🔍 A VALIDAR

**Descripción:**

El modal de editar fichaje podría no validar todas las secuencias imposibles antes de guardar.

**Validaciones Requeridas:**

```typescript
// Configuraciones IMPOSIBLES (bloquear guardar):
❌ Dos entradas sin salida intermedia
❌ Dos salidas sin entrada intermedia
❌ Salida sin entrada previa
❌ Pausa_fin sin pausa_inicio previa
❌ Pausa_inicio después de salida

// Configuraciones VÁLIDAS (permitir):
✅ Solo entrada (fichaje en curso)
✅ Entrada + Pausa_inicio (en pausa, sin fin ni salida)
✅ Entrada + Pausa_inicio + Pausa_fin (sin salida)
✅ Entrada + Salida (sin pausas, con advertencia si requiere descanso)
✅ Múltiples pausas (pausa_inicio → pausa_fin puede repetirse)
```

**Impacto:**

- RH puede crear fichajes inválidos
- Cálculos de horas incorrectos
- Errores en nómina

**Archivos Afectados:**

- [components/shared/fichajes/fichaje-modal.tsx](../../components/shared/fichajes/fichaje-modal.tsx)
- [app/api/fichajes/editar-batch/route.ts](../../app/api/fichajes/editar-batch/route.ts)

**Test de Validación:**

1. Abrir modal editar fichaje
2. Intentar crear dos entradas → Debe bloquear guardar
3. Intentar crear salida sin entrada → Debe bloquear guardar
4. Intentar crear pausa_fin sin pausa_inicio → Debe bloquear guardar
5. Crear entrada + salida sin pausas → Debe mostrar advertencia
6. Crear entrada + pausa_inicio (sin más eventos) → Debe permitir guardar (en curso)

---

### 6. Confirmación de Salida sin Descanso - Dialog Falta

**Estado:** ⚠️ FALTA IMPLEMENTAR

**Descripción:**

Cuando un empleado ficha salida sin descanso (o sin reanudar pausa), el sistema debería mostrar un dialog de confirmación.

**Flujo Esperado:**

```typescript
// components/empleado/fichaje-widget.tsx
// Al hacer clic en "Salida"

if (requiereDescanso && !tieneDescansoCompleto) {
  // Mostrar dialog:
  // "Estás saliendo sin descanso o con pausa sin reanudar"
  // [Confirmar] [Editar]

  if (confirmar) {
    // Guardar salida → Fichaje FINALIZADO
    await registrarEvento('salida');
  } else {
    // Abrir modal editar fichaje
    abrirModalEditar();
  }
}
```

**Mismo Flujo en Modal Editar:**

- Si se guarda con entrada + salida sin descanso
- Mostrar dialog de confirmación
- Si confirma → Guardar
- Si edita → Volver al modal

**Impacto:**

- Empleados finalizan jornada sin descanso sin darse cuenta
- Incumplimiento de normativa laboral
- Issues legales para la empresa

**Archivos Afectados:**

- [components/empleado/fichaje-widget.tsx](../../components/empleado/fichaje-widget.tsx)
- [components/shared/fichajes/fichaje-modal.tsx](../../components/shared/fichajes/fichaje-modal.tsx)
- Nueva función: `validarDescansoAntesDeSalida()`

**Test de Validación:**

1. Empleado ficha entrada 09:00
2. Empleado intenta fichar salida 18:00 (sin pausas)
3. **Esperado:** Dialog de confirmación
4. Si confirma → Fichaje finalizado
5. Si edita → Abre modal para añadir pausas

---

## 🟡 MENORES (Mejoras UX/Optimización)

### 7. Campo `cuadradoPor` / `cuadradoEn` - Redundantes

**Estado:** ℹ️ REVISIÓN PENDIENTE

**Descripción:**

Los campos `cuadradoPor` y `cuadradoEn` en la tabla `fichajes` son redundantes, ya que la información de auditoría está en los eventos individuales (`editado`, `motivoEdicion`).

**Recomendación:**

- **Opción A:** Eliminar campos (preferido)
- **Opción B:** Mantener solo para estadísticas (cuántos fichajes se cuadraron masivamente vs manual)

**Campo `cuadradoMasivamente`:**

- Útil para diferenciar cuadre masivo vs individual
- Mantener ✅

**Impacto:**

- Limpieza de esquema de BD
- Menos confusión sobre fuente de verdad de auditoría

**Archivos Afectados:**

- `prisma/schema.prisma`
- [app/api/fichajes/cuadrar/route.ts](../../app/api/fichajes/cuadrar/route.ts) líneas ~629, ~836
- Migration para eliminar campos

---

### 8. Descartar Días - Marca como Finalizado en vez de Eliminar

**Estado:** 🔍 A VALIDAR

**Descripción:**

Cuando RH descarta un día sin fichajes, el sistema marca el fichaje como `finalizado` con `horasTrabajadas: 0` en vez de eliminarlo.

**Comportamiento Actual (Incorrecto):**

```typescript
// app/api/fichajes/cuadrar/route.ts líneas ~305-318
await prisma.fichajes.update({
  where: { id: fichajeId },
  data: {
    estado: 'finalizado',
    horasTrabajadas: 0,
    horasEnPausa: 0
  }
});
```

**Comportamiento Esperado (Correcto):**

```typescript
// Opción A: Eliminar fichaje
await prisma.fichajes.delete({
  where: { id: fichajeId }
});

// Opción B: CRON no crea fichajes si ausencia día completo (ya implementado ✅)
```

**Impacto:**

- Fichajes con 0h aparecen en reportes de nómina
- Confusión entre ausencia día completo y día trabajado 0h
- Datos sucios en analytics

**Archivos Afectados:**

- [app/api/fichajes/cuadrar/route.ts](../../app/api/fichajes/cuadrar/route.ts) líneas ~305-318

**Test de Validación:**

1. Crear fichaje vacío (sin eventos)
2. RH hace clic en "Descartar días vacíos"
3. **Esperado:** Fichaje eliminado de BD (no marcado como finalizado)
4. Verificar que NO aparece en reportes de horas

---

### 9. Campo `horaOriginal` - Falta en Schema

**Estado:** ⚠️ FALTA IMPLEMENTAR

**Descripción:**

El schema de `fichaje_eventos` no tiene el campo `horaOriginal` para guardar la hora original antes de ediciones.

**Schema Actual:**

```prisma
model fichaje_eventos {
  id              String   @id @default(cuid())
  fichajeId       String
  tipo            String
  hora            DateTime
  editado         Boolean  @default(false)
  motivoEdicion   String?
  // ❌ Falta horaOriginal
}
```

**Schema Esperado:**

```prisma
model fichaje_eventos {
  id              String   @id @default(cuid())
  fichajeId       String
  tipo            String
  hora            DateTime
  horaOriginal    DateTime? // ✅ NUEVO
  editado         Boolean  @default(false)
  motivoEdicion   String?
}
```

**Lógica de Uso:**

```typescript
// Al editar un evento por primera vez
if (!evento.editado) {
  await prisma.fichaje_eventos.update({
    where: { id: evento.id },
    data: {
      horaOriginal: evento.hora, // Guardar hora original
      hora: nuevaHora,
      editado: true,
      motivoEdicion: motivo
    }
  });
}

// En ediciones posteriores
else {
  await prisma.fichaje_eventos.update({
    where: { id: evento.id },
    data: {
      hora: nuevaHora,
      // horaOriginal NO cambia ✅
      motivoEdicion: motivo
    }
  });
}
```

**Impacto:**

- Pérdida de auditoría completa
- No se puede revertir ediciones a valores originales
- Problemas legales/compliance

**Archivos Afectados:**

- `prisma/schema.prisma`
- Migration `add-hora-original.sql`
- [app/api/fichajes/editar-batch/route.ts](../../app/api/fichajes/editar-batch/route.ts)
- [app/api/fichajes/cuadrar/route.ts](../../app/api/fichajes/cuadrar/route.ts)

**Migration Necesaria:**

```sql
-- Añadir campo horaOriginal
ALTER TABLE fichaje_eventos
ADD COLUMN "horaOriginal" TIMESTAMP;

-- Poblar con hora actual para eventos ya editados
UPDATE fichaje_eventos
SET "horaOriginal" = hora
WHERE editado = true AND "horaOriginal" IS NULL;
```

---

### 10. Notificaciones - Falta Implementar

**Estado:** ⚠️ FALTA IMPLEMENTAR

**Descripción:**

El sistema no envía notificaciones cuando:
- RH edita fichaje → Empleado debería ser notificado
- Empleado edita fichaje → Manager/RH deberían aprobar

**Flujos Esperados:**

**A. RH Edita Fichaje:**

```typescript
// app/api/fichajes/editar-batch/route.ts
// Después de guardar cambios

if (session.user.rol === 'hr_admin') {
  await crearNotificacion({
    tipo: 'fichaje_editado_por_rh',
    destinatarioId: empleadoId,
    mensaje: `RH ha editado tu fichaje del ${fecha}`,
    accionable: true, // Empleado puede rechazar
    metadata: {
      fichajeId,
      eventosOriginales, // Para revertir si rechaza
      eventosNuevos
    }
  });
}
```

**B. Empleado Edita Fichaje:**

```typescript
// app/api/fichajes/editar-batch/route.ts

if (session.user.rol === 'empleado') {
  await crearSolicitudAprobacion({
    tipo: 'edicion_fichaje',
    solicitanteId: empleadoId,
    aprobadoresPosibles: [managerId, ...hrAdmins],
    autoAprobarEn: sumarDias(new Date(), 7), // Auto-aprobar en 7 días
    metadata: {
      fichajeId,
      cambios: diff(eventosOriginales, eventosNuevos)
    }
  });
}
```

**Impacto:**

- Empleados no saben que su fichaje fue editado
- No hay flujo de aprobación para ediciones de empleados
- Falta de transparencia

**Archivos Afectados:**

- `lib/notificaciones.ts` (nuevas funciones)
- [app/api/fichajes/editar-batch/route.ts](../../app/api/fichajes/editar-batch/route.ts)
- Nuevo endpoint: `app/api/fichajes/solicitudes/aprobar/route.ts`
- UI: Modal de notificación en header
- UI: Vista de solicitudes pendientes para RH

---

## 📝 Priorización de Correcciones

### Sprint 1 (Críticos - 2-3 días)

1. ✅ **Ausencias Medio Día** (Issue #1) - 2h
2. ✅ **Cálculo Descanso Dinámico** (Issue #2) - 3h
3. ✅ **Promedio Histórico Sin Filtro** (Issue #3) - 1h
4. ✅ **Extraordinarios Sin Propuestas** (Issue #4) - 1h

**Total Sprint 1:** 7 horas

### Sprint 2 (Importantes - 2-3 días)

5. ✅ **Validaciones Edición** (Issue #5) - 4h
6. ✅ **Dialog Salida sin Descanso** (Issue #6) - 3h
7. ✅ **Campo horaOriginal** (Issue #9) - 2h
   - Migration
   - Lógica de guardado

**Total Sprint 2:** 9 horas

### Sprint 3 (Mejoras - 2-3 días)

8. ✅ **Descartar Días** (Issue #8) - 1h
9. ✅ **Campos Redundantes** (Issue #7) - 1h (revisión)
10. ✅ **Notificaciones** (Issue #10) - 6h
    - Notificación RH → Empleado
    - Solicitudes Empleado → Manager/RH
    - UI de aprobación

**Total Sprint 3:** 8 horas

---

**TOTAL ESTIMADO:** 24 horas (3 sprints)

---

## 🔬 Cómo Reportar un Nuevo Issue

1. Crear archivo en `docs/qa/issues/ISSUE-XXX.md`
2. Template:

```markdown
# ISSUE-XXX: [Título Descriptivo]

**Prioridad:** 🔴 Crítico / 🟠 Importante / 🟡 Menor

**Estado:** ⚠️ Abierto / 🔍 En Validación / ✅ Resuelto

**Reportado por:** [Nombre]
**Fecha:** [YYYY-MM-DD]

## Descripción

[Descripción detallada del issue]

## Comportamiento Actual

[Código/screenshots del comportamiento incorrecto]

## Comportamiento Esperado

[Código/screenshots del comportamiento correcto]

## Pasos para Reproducir

1. ...
2. ...
3. ...

## Impacto

[Qué funcionalidad afecta y cómo]

## Archivos Afectados

- `path/to/file1.ts` línea X
- `path/to/file2.ts`

## Solución Propuesta

[Código de la solución]

## Test de Validación

[Cómo verificar que está corregido]

## Estimación

[Horas estimadas de corrección]
```

3. Añadir referencia a este archivo
4. Actualizar estado cuando se corrija

---

**Última actualización:** 10 Dic 2024
**Próxima revisión:** Tras completar Sprint 1
