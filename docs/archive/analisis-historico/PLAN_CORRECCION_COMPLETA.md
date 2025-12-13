# Plan de Corrección Completa - Sistema de Fichajes

## 📋 Resumen de Cambios Requeridos

Basado en los requerimientos completos, se identifican los siguientes cambios críticos:

---

## 🔴 CAMBIOS CRÍTICOS (Prioridad Alta)

### 1. CRON: Cambiar Timing y Comportamiento

**Problema Actual**:
- CRON corre a las 23:30
- Procesa día anterior Y día actual

**Solución Requerida**:
- ✅ CRON a las 00:01
- ✅ Solo procesa día ANTERIOR (ya vencido)
- ✅ Marca fichajes `en_curso` → `pendiente`
- ✅ Crear fichajes faltantes como `pendiente` (solo si es día laboral)
- ✅ NO descartar días, directamente NO crear fichajes para ausencias día completo

**Archivos Afectados**:
- `app/api/cron/clasificar-fichajes/route.ts`
- `vercel.json` (timing del CRON)

---

### 2. Workers: Trigger Automático Post-CRON

**Problema Actual**:
- Workers se ejecutan cuando RH entra a cuadrar

**Solución Requerida**:
- ✅ CRON encola jobs INMEDIATAMENTE tras marcar pendientes
- ✅ Workers calculan eventos propuestos en background
- ✅ Cuando RH abre cuadrar, eventos YA están calculados

**Archivos Afectados**:
- `app/api/cron/clasificar-fichajes/route.ts` (ya hace esto ✅)

---

### 3. Eliminar Funciones Obsoletas

**Funciones a Eliminar**:
- ❌ `debeCerrarseAutomaticamente()`
- ❌ `cerrarFichajeAutomaticamente()`

**Razón**: Widget solo muestra fichajes del día actual (sin crear, en_curso, finalizado). NUNCA muestra pendientes.

**Archivos Afectados**:
- `lib/calculos/fichajes.ts`
- Cualquier componente que las use

---

### 4. Ausencias Medio Día: Corrección Lógica

**Problema Actual**:
```typescript
// INCORRECTO:
if (ausencia.medioDia === 'manana') {
  // NO requiere entrada ❌
}
```

**Solución Requerida**:
```typescript
// CORRECTO:
if (ausencia.medioDia === 'manana') {
  // SÍ requiere entrada ✅
  // SÍ requiere salida ✅
  // NO requiere descanso ✅
}
if (ausencia.medioDia === 'tarde') {
  // SÍ requiere entrada ✅
  // SÍ requiere salida ✅
  // NO requiere descanso ✅
}
```

**Archivos Afectados**:
- `app/api/fichajes/cuadrar/route.ts` (líneas 476-481, 487-488)
- `app/api/workers/calcular-eventos-propuestos/route.ts`

---

### 5. Cálculo de Descanso: Usar Duración, No Horario Fijo

**Problema Actual**:
```typescript
// Usa horarios fijos:
configDia.pausa_inicio // "14:00"
configDia.pausa_fin    // "15:00"
```

**Solución Requerida**:
```typescript
// Usar duración en minutos:
config.descanso.duracion // 30 (minutos)

// Calcular posición dinámica (60% del tiempo entre entrada-salida)
```

**Archivos Afectados**:
- `app/api/workers/calcular-eventos-propuestos/route.ts`
- `lib/calculos/fichajes-historico.ts` (si existe)

---

### 6. Promedio Histórico: Sin Filtro de Día de Semana

**Problema Actual**:
```typescript
// Busca últimos 5 fichajes del MISMO día de semana
where: {
  fecha: { dayOfWeek: nombreDia }
}
```

**Solución Requerida**:
```typescript
// Busca últimos 5 fichajes finalizados (cualquier día)
where: {
  estado: 'finalizado'
}
orderBy: {
  fecha: 'desc'
}
take: 5
```

**Archivos Afectados**:
- `lib/calculos/fichajes-historico.ts` (función `obtenerPromedioEventosHistoricos`)

---

### 7. Jornada Fija vs Flexible: Simplificar Lógica

**Problema Actual**:
- Lógica separada para fija y flexible
- Usa `configDia.entrada`, `configDia.salida` para eventos propuestos

**Solución Requerida**:
- ✅ Jornada Fija: SOLO usar horarios para validación de completitud
- ✅ Jornada Flexible: Usar últimos 5 fichajes para eventos propuestos
- ✅ AMBAS: Prioridad 1 = Eventos existentes, Prioridad 2 = Histórico, Prioridad 3 = Defaults

**Prioridades Unificadas**:
1. **Eventos existentes** → Mantener, calcular solo faltantes
2. **Promedio histórico** (últimos 5 finalizados) → Usar comportamiento real
3. **Defaults genéricos** → 09:00, 18:00, pausa al 60%

**Archivos Afectados**:
- `app/api/workers/calcular-eventos-propuestos/route.ts`
- `app/api/fichajes/cuadrar/route.ts`

---

### 8. Eliminar Campos Innecesarios

**Campos a NO Usar**:
- ❌ `cuadradoPor` (usar `editado` en eventos)
- ❌ `cuadradoEn` (usar `editado` en eventos)
- 🤷 `cuadradoMasivamente` (revisar si es necesario)

**Archivos Afectados**:
- `app/api/fichajes/cuadrar/route.ts` (líneas 623-625, 829-831)

---

## 🟡 CAMBIOS IMPORTANTES (Prioridad Media)

### 9. Descartar Días: Eliminar Fichajes en vez de Finalizar

**Problema Actual**:
```typescript
// Marca como finalizado con 0 horas
await prisma.fichajes.update({
  where: { id },
  data: {
    estado: 'finalizado',
    horasTrabajadas: 0
  }
});
```

**Solución Requerida**:
```typescript
// Opción A: Eliminar fichaje directamente
await prisma.fichajes.delete({
  where: { id }
});

// Opción B: No crear fichaje en CRON si es ausencia día completo
// (ya implementado ✅)
```

**Archivos Afectados**:
- `app/api/fichajes/cuadrar/route.ts` (líneas 305-318)
- `app/api/cron/clasificar-fichajes/route.ts` (líneas 83-96 ✅)

---

### 10. Fichajes Extraordinarios y Ausencias Medio Día

**Problema Actual**:
- Se calculan eventos propuestos para TODOS los fichajes pendientes

**Solución Requerida**:
```typescript
// En workers, NO calcular eventos propuestos para:
// 1. Fichajes extraordinarios (tipoFichaje !== 'ordinario')
// 2. Fichajes con ausencia medio día

// Estos se cuadran MANUALMENTE por HR
```

**Archivos Afectados**:
- `app/api/cron/clasificar-fichajes/route.ts` (filtrar antes de encolar)
- `app/api/workers/calcular-eventos-propuestos/route.ts` (validación adicional)

---

### 11. Editar Fichaje: Validaciones Críticas

**Validaciones Requeridas**:

```typescript
// ❌ Configuraciones imposibles:
// - Dos entradas
// - Dos salidas
// - Salida sin entrada
// - Pausa_fin sin pausa_inicio

// ✅ Configuraciones válidas:
// - Entrada → Salida (sin pausas)
// - Entrada → Pausa_inicio (sin pausa_fin ni salida) → EN CURSO
// - Entrada → Pausa_inicio → Pausa_fin (sin salida) → EN CURSO
// - Múltiples pausas (pausa_inicio → pausa_fin puede repetirse)
```

**Cambios UI**:
- ✅ Al AÑADIR evento → usuario elige tipo
- ✅ Al EDITAR evento → tipo es read-only
- ✅ Mostrar "Horas trabajadas vs esperadas" (en tiempo real)
- ✅ Mostrar si está completo o faltan eventos
- ✅ Fecha al lado del título (no debajo)
- ✅ Motivo plegado por defecto
- ❌ Bloquear guardar si configuración imposible

**Archivos Afectados**:
- `components/shared/fichajes/fichaje-modal.tsx`
- `app/api/fichajes/editar-batch/route.ts`

---

### 12. Confirmación de Salida sin Descanso

**Flujo Requerido**:

```typescript
// Cuando empleado hace "Salida" desde widget:

if (requiereDescanso && !tieneDescanso) {
  // Mostrar dialog:
  // "Estás saliendo sin descanso o con pausa sin reanudar"
  // [Confirmar] [Editar]

  if (confirmar) {
    // Fichaje → FINALIZADO ✅
  } else {
    // Abrir modal editar fichaje
  }
}
```

**Mismo Flujo en Editar Fichaje**:
- Si se guarda con entrada+salida sin descanso → Dialog de confirmación
- Si confirma → Fichaje FINALIZADO
- Si edita → Vuelve al modal

**Archivos Afectados**:
- `components/empleado/fichaje-widget.tsx`
- `components/shared/fichajes/fichaje-modal.tsx`

---

### 13. Notificaciones y Solicitudes

**Cuando HR Edita Fichaje**:
```typescript
// Crear notificación al empleado
// Empleado puede RECHAZAR la edición
// Si rechaza → fichaje vuelve a eventos originales
// Estado → "Rechazado" (no se puede editar más)
```

**Cuando Empleado Edita Fichaje**:
```typescript
// Crear solicitud de edición
// Manager o HR Admin aprueba/rechaza
// Si nadie responde → Auto-aprobar tras X días
// Si rechaza → Estado "Rechazado"
```

**Archivos Afectados**:
- `app/api/fichajes/editar-batch/route.ts`
- `lib/notificaciones.ts`
- Nuevo: `app/api/fichajes/solicitudes/route.ts` (?)

---

### 14. Eventos Originales vs Editados

**Base de Datos**:
```typescript
// Tabla fichaje_eventos
{
  id: string;
  fichajeId: string;
  tipo: 'entrada' | 'pausa_inicio' | 'pausa_fin' | 'salida';
  hora: Date;
  editado: boolean;        // ✅ Mantener
  motivoEdicion: string?;  // ✅ Mantener
  horaOriginal: Date?;     // ✅ NUEVO: Si editado=true, guardar hora original
}
```

**NUNCA**:
- ❌ Eliminar eventos originales
- ❌ Modificar hora original directamente

**SIEMPRE**:
- ✅ Marcar `editado: true`
- ✅ Guardar `horaOriginal` (si es primera edición)
- ✅ Actualizar `hora` con nueva hora
- ✅ Registrar `motivoEdicion`

**Archivos Afectados**:
- Migration: Añadir campo `horaOriginal`
- `app/api/fichajes/editar-batch/route.ts`
- `app/api/fichajes/cuadrar/route.ts`

---

## 📊 Arquitectura Actualizada

```
┌─────────────────────────────────────────────────────────────┐
│ CRON (00:01) - Solo DÍA ANTERIOR                           │
│ 1. Marca fichajes: en_curso → pendiente                    │
│ 2. Crea fichajes faltantes → pendiente (si día laboral)    │
│ 3. NO crea fichajes si ausencia día completo               │
│ 4. Encola jobs: calcular eventos propuestos (batches 50)   │
│    - Excluye extraordinarios                                 │
│    - Excluye ausencias medio día                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ WORKERS (Background) - Inmediatamente después del CRON     │
│ - Procesan batches en paralelo                              │
│ - Para CADA fichaje pendiente:                              │
│   1. Mantener eventos existentes (PRIORIDAD 1)             │
│   2. Calcular faltantes desde histórico (últimos 5)        │
│   3. Si no hay histórico → defaults (09:00, 18:00, 60%)    │
│ - Guardan en fichaje_eventos_propuestos                    │
│ - Marcan fichaje.eventosPropuestosCalculados = true        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ HR ABRE CUADRAR FICHAJES (09:00)                           │
│ GET /api/fichajes/cuadrar?page=1&limit=20                   │
│ - Carga 20 fichajes paginados                               │
│ - Con eventos propuestos YA CALCULADOS ⚡                   │
│ - Tiempo de carga: <100ms                                   │
│ - Fichajes extraordinarios: SIN eventos propuestos         │
│ - Fichajes ausencia medio día: SIN eventos propuestos      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ HR REVISA Y CUADRA                                          │
│ - Opción 1: Cuadrar directo (acepta propuestas)            │
│ - Opción 2: Editar eventos propuestos → Guardar            │
│ - Opción 3: Cuadrar manualmente (extraordinarios/medio día)│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ POST /api/fichajes/cuadrar                                  │
│ - Crea eventos REALES en fichaje_eventos (editado: true)   │
│ - Guarda horaOriginal si no existía                        │
│ - Marca fichaje como FINALIZADO                             │
│ - Crea notificación al empleado                            │
│ - ELIMINA eventos de fichaje_eventos_propuestos            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Plan de Ejecución (Orden de Prioridad)

### Fase A: Correcciones Críticas de Lógica (2-3 horas)

1. **Ausencias Medio Día** (30 min)
   - Corregir lógica en cuadrar/route.ts
   - Corregir lógica en workers
   - SÍ requieren entrada/salida, NO requieren descanso

2. **Promedio Histórico sin Día de Semana** (30 min)
   - Modificar `obtenerPromedioEventosHistoricos`
   - Quitar filtro de día de semana
   - Últimos 5 finalizados de cualquier día

3. **Cálculo Descanso con Duración** (1 hora)
   - Eliminar uso de `configDia.pausa_inicio/fin`
   - Usar `config.descanso.duracion`
   - Implementar cálculo al 60% entre entrada-salida

4. **Eliminar Funciones Obsoletas** (30 min)
   - Buscar y eliminar `debeCerrarseAutomaticamente()`
   - Buscar y eliminar `cerrarFichajeAutomaticamente()`
   - Actualizar componentes que las usaban

5. **Descartar Días** (15 min)
   - Cambiar finalizar → eliminar
   - O simplemente no hacer nada (CRON ya no crea si ausencia)

---

### Fase B: Eventos Propuestos con Prioridades (2-3 horas)

6. **Refactorizar Workers** (2 horas)
   - Implementar lógica unificada de prioridades:
     1. Mantener eventos existentes
     2. Calcular faltantes desde histórico (últimos 5)
     3. Defaults si no hay histórico
   - Detectar múltiples pausas (1 o 2)
   - Calcular pausa_fin desde pausa_inicio existente

7. **Excluir Extraordinarios y Medio Día** (30 min)
   - CRON no encola jobs para extraordinarios
   - CRON no encola jobs para ausencias medio día
   - Estos se cuadran MANUALMENTE

---

### Fase C: Editar Fichaje (3-4 horas)

8. **Validaciones de Edición** (1.5 horas)
   - Implementar validación de configuración imposible
   - Bloquear guardar si inválido
   - Mostrar errores claros

9. **UI de Editar Fichaje** (1.5 horas)
   - Tipo editable solo al AÑADIR
   - Tipo read-only al EDITAR
   - Mostrar horas trabajadas vs esperadas (en tiempo real)
   - Mostrar completitud
   - Fecha al lado del título
   - Motivo plegado

10. **Confirmación Salida sin Descanso** (1 hour)
    - Dialog en widget
    - Dialog en modal editar
    - Flujo [Confirmar] → FINALIZADO, [Editar] → Modal

---

### Fase D: Notificaciones y Auditoría (2-3 horas)

11. **Campo horaOriginal** (30 min)
    - Migration: añadir `horaOriginal` nullable
    - Lógica: guardar hora original en primera edición

12. **Notificaciones HR → Empleado** (1 hora)
    - Crear notificación cuando HR edita
    - Empleado puede rechazar
    - Si rechaza → estado "Rechazado"

13. **Solicitudes Empleado → Manager/HR** (1.5 horas)
    - Crear solicitud cuando empleado edita
    - Aprobar/Rechazar
    - Auto-aprobar tras X días

---

### Fase E: Testing y Documentación (1-2 horas)

14. **Testing Manual** (1 hora)
    - CRON a las 00:01
    - Cálculo eventos propuestos correcto
    - Editar fichaje validaciones
    - Cuadrar fichajes flujo completo

15. **Actualizar Documentación** (1 hora)
    - Actualizar FASE5, FASE6, FASE7
    - Crear documento de validaciones
    - Crear guía de testing

---

## 📝 Archivos a Modificar (Lista Completa)

### Backend - API Routes

1. `app/api/cron/clasificar-fichajes/route.ts`
   - Cambiar timing comentarios
   - Excluir extraordinarios y medio día de encolado
   - Eliminar procesamiento día actual

2. `app/api/fichajes/cuadrar/route.ts`
   - Corregir lógica ausencias medio día
   - Eliminar campos cuadradoPor/cuadradoEn
   - Actualizar lógica descanso

3. `app/api/workers/calcular-eventos-propuestos/route.ts`
   - Refactorizar con prioridades unificadas
   - Eliminar uso de configDia fijo
   - Implementar detección múltiples pausas

4. `app/api/fichajes/editar-batch/route.ts`
   - Guardar horaOriginal
   - Validar configuración imposible
   - Crear notificaciones

### Backend - Librerías

5. `lib/calculos/fichajes.ts`
   - Eliminar debeCerrarseAutomaticamente()
   - Eliminar cerrarFichajeAutomaticamente()

6. `lib/calculos/fichajes-historico.ts`
   - Modificar obtenerPromedioEventosHistoricos
   - Quitar filtro día de semana
   - Implementar detección múltiples pausas

7. `lib/notificaciones.ts`
   - Añadir notificación edición por HR
   - Añadir notificación rechazo empleado

### Frontend - Components

8. `components/shared/fichajes/fichaje-modal.tsx`
   - Tipo editable al añadir, read-only al editar
   - Mostrar horas trabajadas vs esperadas
   - Validar configuración antes de guardar
   - UI: fecha al lado título, motivo plegado

9. `components/empleado/fichaje-widget.tsx`
   - Dialog confirmación salida sin descanso
   - Integrar con modal editar

### Database

10. `prisma/schema.prisma`
    - Añadir campo `horaOriginal` a fichaje_eventos

11. Migration
    - `20XX-XX-XX-add-hora-original.sql`

### Config

12. `vercel.json` (o similar)
    - Actualizar timing CRON a 00:01

---

## ✅ Checklist Final de Validación

### CRON y Workers
- [ ] CRON corre a las 00:01
- [ ] CRON solo procesa día ANTERIOR
- [ ] CRON no crea fichajes si ausencia día completo
- [ ] CRON encola jobs excluyendo extraordinarios
- [ ] CRON encola jobs excluyendo ausencias medio día
- [ ] Workers calculan eventos propuestos inmediatamente
- [ ] Eventos propuestos usan prioridades (existentes → histórico → defaults)
- [ ] Histórico usa últimos 5 finalizados (sin filtro día semana)
- [ ] Descanso calculado con duración + posición 60%

### Cuadrar Fichajes
- [ ] Ausencias medio día SÍ requieren entrada/salida
- [ ] Ausencias medio día NO requieren descanso
- [ ] Fichajes extraordinarios SIN eventos propuestos (manual)
- [ ] Fichajes medio día SIN eventos propuestos (manual)
- [ ] Descartar día elimina fichaje (no finaliza con 0h)

### Editar Fichaje
- [ ] Al añadir evento → tipo seleccionable
- [ ] Al editar evento → tipo read-only
- [ ] Muestra horas trabajadas vs esperadas
- [ ] Muestra completitud
- [ ] Bloquea guardar si configuración imposible
- [ ] ❌ Dos entradas → Error
- [ ] ❌ Dos salidas → Error
- [ ] ❌ Salida sin entrada → Error
- [ ] ❌ Pausa_fin sin pausa_inicio → Error
- [ ] ✅ Pausa_inicio sin pausa_fin → Válido (en curso)
- [ ] ✅ Entrada → Salida sin pausas → Válido

### Confirmación Salida sin Descanso
- [ ] Dialog en widget si salida sin descanso
- [ ] [Confirmar] → FINALIZADO
- [ ] [Editar] → Abre modal editar
- [ ] Dialog en modal editar si guarda sin descanso

### Eventos Originales
- [ ] Campo horaOriginal existe en BD
- [ ] Al editar evento: guarda horaOriginal (primera vez)
- [ ] NUNCA elimina eventos originales
- [ ] Marca editado: true
- [ ] Registra motivoEdicion

### Notificaciones
- [ ] HR edita → notificación a empleado
- [ ] Empleado puede rechazar → vuelve a originales
- [ ] Estado "Rechazado" no editable
- [ ] Empleado edita → solicitud a manager/HR
- [ ] Auto-aprobar tras X días

---

**Total Estimado**: 10-15 horas de desarrollo + 2-3 horas testing

**Orden Sugerido**: Fase A → Fase B → Fase C → Fase D → Fase E

**Prioridad Máxima**: Fase A (correcciones críticas de lógica)
