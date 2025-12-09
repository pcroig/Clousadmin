# Análisis de Edge Cases - Sistema de Edición de Fichajes

**Fecha**: 2025-12-09
**Sistema**: Edición por lotes con aprobación optimista

---

## 1. Eliminación de Eventos Originales

### Flujo Actual

Cuando HR Admin elimina un evento "original" (ya existente en BD):

```typescript
// En el modal
function handleEliminarEvento(id: string) {
  const evento = eventos.find((e) => e.id === id);
  if (!evento) return;

  if (evento.isNew) {
    // Evento nuevo (temporal): Solo se quita de la UI
    setEventos((prev) => prev.filter((e) => e.id !== id));
  } else {
    // Evento original (BD): Se quita de UI Y se marca para eliminar
    setEventos((prev) => prev.filter((e) => e.id !== id));
    setEventosEliminados((prev) => [...prev, id]);
  }
}

// Al guardar
async function guardarEdicion() {
  // ...
  // 1. Eventos eliminados
  for (const eventoId of eventosEliminados) {
    cambios.push({
      accion: 'eliminar',
      eventoId,
    });
  }
  // ...
}
```

### En el Backend (editar-batch)

```typescript
case 'eliminar': {
  const eventoEliminado = await tx.fichaje_eventos.findUnique({
    where: { id: cambio.eventoId },
  });

  if (!eventoEliminado) {
    throw new Error(`Evento ${cambio.eventoId} no encontrado`);
  }

  await tx.fichaje_eventos.delete({
    where: { id: cambio.eventoId },
  });

  // GUARDAMOS TODO EL EVENTO para poder restaurarlo
  cambiosAplicados.push({
    accion: 'eliminar',
    eventoId: cambio.eventoId,
    eventoEliminado: {
      tipo: eventoEliminado.tipo,
      hora: eventoEliminado.hora.toISOString(),
      editado: eventoEliminado.editado,
      motivoEdicion: eventoEliminado.motivoEdicion,
      horaOriginal: eventoEliminado.horaOriginal?.toISOString(),
    }
  });
}
```

### Al Rechazar Edición

```typescript
case 'eliminar':
  // RECREAMOS el evento eliminado con TODOS sus datos
  await tx.fichaje_eventos.create({
    data: {
      fichajeId: edicion.fichajeId,
      tipo: cambio.eventoEliminado.tipo,
      hora: new Date(cambio.eventoEliminado.hora),
      editado: cambio.eventoEliminado.editado || false,
      motivoEdicion: cambio.eventoEliminado.motivoEdicion || null,
      horaOriginal: cambio.eventoEliminado.horaOriginal
        ? new Date(cambio.eventoEliminado.horaOriginal)
        : null,
    },
  });
  break;
```

---

## 2. Edge Cases Críticos Identificados

### ⚠️ EDGE CASE 1: Eliminar evento original y el empleado rechaza

**Escenario**:
1. Fichaje original tiene: `entrada(09:00)`, `salida(18:00)`
2. HR elimina `salida(18:00)`
3. Empleado rechaza la edición

**Flujo**:
- ✅ **Backend guarda**: `eventoEliminado = { tipo: 'salida', hora: '18:00', editado: false }`
- ✅ **Al rechazar**: Se recrea el evento con todos sus campos originales
- ✅ **Resultado**: El evento `salida(18:00)` vuelve exactamente como estaba

**Estado**: ✅ **FUNCIONA CORRECTAMENTE**

---

### ⚠️ EDGE CASE 2: Editar evento ya editado previamente

**Escenario**:
1. Fichaje tiene: `entrada(09:00, editado=true, horaOriginal=08:50)`
2. HR lo edita a `entrada(09:15)`
3. Empleado rechaza

**Flujo actual**:
```typescript
// En editar
const eventoOriginal = await tx.fichaje_eventos.findUnique({
  where: { id: cambio.eventoId }
});
await tx.fichaje_eventos.update({
  where: { id: cambio.eventoId },
  data: {
    hora: cambio.hora ? new Date(cambio.hora) : eventoOriginal.hora,
    editado: true,
    motivoEdicion: motivo,
    horaOriginal: eventoOriginal.horaOriginal ?? eventoOriginal.hora, // ⚠️ MANTIENE horaOriginal
  }
});

// Guardamos
cambiosAplicados.push({
  accion: 'editar',
  camposAnteriores: {
    hora: eventoOriginal.hora,  // 09:00
    tipo: eventoOriginal.tipo,  // entrada
    editado: eventoOriginal.editado,  // true
    motivoEdicion: eventoOriginal.motivoEdicion,
    horaOriginal: eventoOriginal.horaOriginal,  // 08:50
  },
  camposNuevos: {
    hora: cambio.hora,  // 09:15
  }
});

// Al rechazar
await tx.fichaje_eventos.update({
  where: { id: cambio.eventoId },
  data: {
    hora: new Date(cambio.camposAnteriores.hora),  // VUELVE A 09:00
    tipo: cambio.camposAnteriores.tipo,
    editado: cambio.camposAnteriores.editado || false,  // VUELVE A true ✅
    motivoEdicion: cambio.camposAnteriores.motivoEdicion || null,
    horaOriginal: cambio.camposAnteriores.horaOriginal
      ? new Date(cambio.camposAnteriores.horaOriginal)
      : null,  // VUELVE A 08:50 ✅
  }
});
```

**Estado**: ✅ **FUNCIONA CORRECTAMENTE** - Preserva el estado anterior completo

---

### ⚠️ EDGE CASE 3: Múltiples ediciones antes de aprobar/rechazar

**Escenario**:
1. HR edita fichaje → Crea edición_pendiente_1
2. Empleado NO rechaza (aún en ventana de 48h)
3. HR vuelve a editar el mismo fichaje → ¿Qué pasa?

**Problema actual**: 🔴 **NO GESTIONADO**

El endpoint `editar-batch` NO verifica si ya existe una edición pendiente para ese fichaje.

**Consecuencia**:
- Se crearía `edicion_pendiente_2` con cambios sobre el estado YA modificado por `edicion_pendiente_1`
- Si el empleado rechaza `edicion_pendiente_2`, revierte a un estado intermedio
- Si rechaza `edicion_pendiente_1` después, intenta revertir eventos que ya no existen

**Solución recomendada**:
```typescript
// En POST /api/fichajes/editar-batch
// ANTES de aplicar cambios
const edicionExistente = await prisma.ediciones_fichaje_pendientes.findFirst({
  where: {
    fichajeId,
    estado: 'pendiente',
  },
});

if (edicionExistente) {
  return badRequestResponse(
    'Este fichaje ya tiene una edición pendiente de aprobación. ' +
    'Espera a que el empleado la apruebe o rechace antes de editarlo nuevamente.'
  );
}
```

---

### ⚠️ EDGE CASE 4: HR edita, empleado rechaza, HR vuelve a editar lo mismo

**Escenario**:
1. HR cambia `entrada` de 09:00 a 09:15
2. Empleado rechaza → Vuelve a 09:00
3. HR vuelve a cambiar a 09:15

**Estado actual**: ✅ **FUNCIONA**
- Se crea nueva edición pendiente
- Empleado puede rechazar de nuevo o aprobar

**Problema potencial**: UX - El empleado puede sentirse acosado si HR insiste continuamente

**Solución recomendada**:
- Limitar número de ediciones pendientes por fichaje por día
- O bloquear nueva edición hasta que se resuelva la anterior

---

### ⚠️ EDGE CASE 5: Cron job auto-aprueba mientras empleado está rechazando

**Escenario**:
1. Edición expira en 2 minutos
2. Cron job ejecuta → Marca como `aprobado`
3. **SIMULTÁNEAMENTE** empleado hace click en "Rechazar"

**Problema**: Race condition

**Flujo actual**:
```typescript
// Cron
await prisma.ediciones_fichaje_pendientes.update({
  where: { id: edicion.id },
  data: { estado: 'aprobado', aprobadoEn: ahora }
});

// Empleado rechaza (casi simultáneo)
const edicion = notificacion.ediciones_fichaje_pendiente;
if (edicion.estado !== 'pendiente') {  // ✅ DETECTA QUE YA NO ES PENDIENTE
  return badRequestResponse('Esta edición ya fue procesada');
}
```

**Estado**: ✅ **PROTEGIDO** - La validación de estado lo previene

---

### ⚠️ EDGE CASE 6: HR elimina TODOS los eventos

**Escenario**:
1. Fichaje tiene: `entrada(09:00)`, `salida(18:00)`
2. HR elimina ambos eventos
3. Sistema intenta calcular estado

**Flujo actual**:
```typescript
// Después de eliminar
const fichajeActualizado = await tx.fichajes.findUnique({
  where: { id: fichajeId },
  include: { eventos: { orderBy: { hora: 'asc' } } }
});

const horasTrabajadas = calcularHorasTrabajadas(fichajeActualizado.eventos) ?? 0;  // 0
const horasEnPausa = calcularTiempoEnPausa(fichajeActualizado.eventos);  // 0

// Determinar nuevo estado
let nuevoEstado = fichaje.estado;
if (validacionCompleto.completo) {
  nuevoEstado = 'finalizado';
} else if (fichajeActualizado.eventos.length === 0) {
  nuevoEstado = 'pendiente';  // ✅ CAMBIA A PENDIENTE
}
```

**Estado**: ✅ **FUNCIONA CORRECTAMENTE**
- Fichaje queda con 0 eventos
- Estado → `pendiente`
- Horas → 0

**Al rechazar**:
- Se recrean todos los eventos
- Estado vuelve a calcularse correctamente

---

### ⚠️ EDGE CASE 7: Validación de secuencia con eventos parciales

**Escenario**:
1. Fichaje completo: `entrada → pausa_inicio → pausa_fin → salida`
2. HR elimina `pausa_fin`
3. Modal valida secuencia

**Validación actual**:
```typescript
// Validar secuencia
let estadoEsperado = 'sin_fichar';
let errorEncontrado: string | null = null;

for (let i = 0; i < eventosOrdenados.length; i++) {
  const evento = eventosOrdenados[i];

  switch (evento.tipo) {
    case 'entrada':
      estadoEsperado = 'trabajando';
      break;
    case 'pausa_inicio':
      if (estadoEsperado !== 'trabajando') {
        errorEncontrado = 'Debe haber una entrada antes de iniciar pausa';
      }
      estadoEsperado = 'en_pausa';
      break;
    case 'salida':
      if (estadoEsperado === 'sin_fichar' || estadoEsperado === 'finalizado') {
        errorEncontrado = 'No hay jornada iniciada para finalizar';
      }
      estadoEsperado = 'finalizado';
      break;
  }
}

// Con eventos: entrada → pausa_inicio → salida
// Estado tras entrada: 'trabajando'
// Estado tras pausa_inicio: 'en_pausa'
// Estado tras salida: 'finalizado' pero estaba en 'en_pausa' ❌
```

**Problema**: 🔴 **VALIDACIÓN INCOMPLETA**

La validación NO detecta que `salida` viene después de `pausa_inicio` sin `pausa_fin`.

**Solución recomendada**:
```typescript
case 'salida':
  if (estadoEsperado === 'sin_fichar' || estadoEsperado === 'finalizado') {
    errorEncontrado = 'No hay jornada iniciada para finalizar';
  } else if (estadoEsperado === 'en_pausa') {
    // PERMITIR salida desde pausa (se considera que reanuda implícitamente)
    // O BLOQUEAR: errorEncontrado = 'Debes reanudar la pausa antes de finalizar';
  }
  estadoEsperado = 'finalizado';
  break;
```

Según el código backend existente:
```typescript
// En lib/calculos/fichajes.ts línea 455
case 'salida':
  if (estadoActual === 'sin_fichar' || estadoActual === 'finalizado') {
    return { valido: false, error: 'No tienes una jornada iniciada' };
  }
  // ✅ Permite finalizar desde pausa
  break;
```

**Estado**: ⚠️ **INCONSISTENCIA ENTRE VALIDACIÓN MODAL Y BACKEND**
- Backend PERMITE `salida` desde `en_pausa`
- Modal NO valida este caso correctamente

---

### ⚠️ EDGE CASE 8: Fichaje con jornada asignada vs sin jornada

**Escenario**:
1. Empleado tiene jornada asignada 09:00-18:00
2. HR edita eventos fuera del rango de la jornada

**Validación actual**: 🔴 **NO SE VALIDA**

El sistema NO verifica:
- Límites de horario de jornada
- Horas máximas permitidas
- Días laborables vs no laborables

**Consecuencia**: HR puede crear fichajes imposibles según la jornada

---

### ⚠️ EDGE CASE 9: Notificación sin usuario asociado

**Escenario**:
1. HR edita fichaje de empleado
2. Empleado se elimina ANTES de que expire la edición

**Flujo actual**:
```typescript
// En editar-batch
const usuarioEmpleado = await tx.usuarios.findUnique({
  where: { empleadoId: fichaje.empleadoId },
  select: { id: true },
});

if (!usuarioEmpleado) {
  throw new Error('Usuario del empleado no encontrado');  // ✅ DETECTA
}
```

**Estado**: ✅ **PROTEGIDO** - La transacción fallaría y no se aplicarían cambios

---

### ⚠️ EDGE CASE 10: Empleado ve fichaje mientras HR está editando

**Escenario**:
1. Empleado abre modal de fichaje
2. **SIMULTÁNEAMENTE** HR aplica edición por lotes
3. Empleado ve datos obsoletos

**Problema**: 🔴 **NO HAY SINCRONIZACIÓN EN TIEMPO REAL**

**Solución actual**: Evento global `fichaje-updated`
```typescript
window.dispatchEvent(new CustomEvent('fichaje-updated'));
```

**Limitación**: Solo funciona si ambos usuarios están en la misma página al mismo tiempo

---

## 3. Recomendaciones de Mejora

### Prioridad ALTA

1. **Bloquear ediciones concurrentes**
   ```typescript
   // Validar que no haya edición pendiente
   const edicionPendiente = await prisma.ediciones_fichaje_pendientes.findFirst({
     where: { fichajeId, estado: 'pendiente' }
   });
   if (edicionPendiente) {
     return badRequestResponse('Edición pendiente de aprobación');
   }
   ```

2. **Corregir validación de salida desde pausa**
   ```typescript
   case 'salida':
     if (estadoEsperado === 'sin_fichar' || estadoEsperado === 'finalizado') {
       errorEncontrado = 'No hay jornada iniciada';
     }
     // PERMITIR desde en_pausa (se reanuda implícitamente)
     estadoEsperado = 'finalizado';
     break;
   ```

### Prioridad MEDIA

3. **Validar límites de jornada**
   - Verificar horarios contra jornada asignada
   - Advertir (no bloquear) si excede límites

4. **Limitar ediciones repetidas**
   ```typescript
   // Contar ediciones del último día
   const edicionesRecientes = await prisma.ediciones_fichaje_pendientes.count({
     where: {
       fichajeId,
       createdAt: { gte: hace24Horas },
     }
   });
   if (edicionesRecientes >= 3) {
     return badRequestResponse('Máximo 3 ediciones por fichaje por día');
   }
   ```

### Prioridad BAJA

5. **WebSocket para sincronización en tiempo real**
   - Notificar a empleado cuando HR está editando
   - Bloquear edición simultánea

---

## 4. Matriz de Riesgos

| Edge Case | Riesgo | Estado Actual | Prioridad |
|-----------|--------|---------------|-----------|
| Eliminar evento original | Bajo | ✅ Protegido | - |
| Editar evento ya editado | Bajo | ✅ Funciona | - |
| Ediciones concurrentes | **ALTO** | 🔴 No protegido | **ALTA** |
| Race condition cron | Medio | ✅ Protegido | - |
| Eliminar todos eventos | Bajo | ✅ Funciona | - |
| Validación salida desde pausa | **MEDIO** | ⚠️ Inconsistente | **ALTA** |
| Validar límites jornada | Medio | 🔴 No validado | MEDIA |
| Empleado eliminado | Bajo | ✅ Protegido | - |
| Edición simultánea | Bajo | ⚠️ Parcial | BAJA |
| Ediciones repetidas | Bajo | 🔴 No limitado | MEDIA |

---

## 5. Conclusión

El sistema de edición por lotes funciona correctamente en la mayoría de casos, pero tiene **2 vulnerabilidades críticas**:

1. **Ediciones concurrentes no bloqueadas**: HR puede editar múltiples veces antes de que el empleado apruebe/rechace
2. **Validación inconsistente**: Modal y backend tienen lógicas diferentes para `salida` desde `en_pausa`

**Recomendación**: Implementar las mejoras de prioridad ALTA antes de producción.
