# Análisis Exhaustivo del Sistema de Guardado de Eventos

**Fecha:** 9 de diciembre de 2025
**Contexto:** Revisión completa del flujo de guardado de eventos en fichajes tras correcciones de UX

---

## Correcciones Aplicadas

### 1. ✅ Validaciones Solo al Intentar Guardar

**Problema anterior:**
- Las validaciones de secuencia y completitud se ejecutaban en un `useEffect` cada vez que cambiaba el array `eventos`
- Esto causaba que los banners de error/advertencia aparecieran mientras el usuario estaba editando
- UX confusa y molesta

**Solución aplicada:**
- Convertí el `useEffect` en una función auxiliar `validarEventos()` que NO se ejecuta automáticamente
- La función solo se llama dentro de `handleGuardar()` cuando el usuario hace clic en "Guardar"
- Los estados `errorSecuencia` y `advertenciaIncompletitud` se setean únicamente al intentar guardar
- Los banners siguen apareciendo, pero solo después de intentar guardar

**Código modificado:** [`components/shared/fichajes/fichaje-modal.tsx:252-329`](components/shared/fichajes/fichaje-modal.tsx#L252-L329)

```typescript
// ANTES (useEffect - se ejecutaba automáticamente)
useEffect(() => {
  // ... validación
  setErrorSecuencia(errorEncontrado);
  setAdvertenciaIncompletitud(advertencia);
}, [eventos]);

// AHORA (función - solo se ejecuta al guardar)
function validarEventos(): { errorSecuencia: string | null; advertenciaIncompletitud: string | null } {
  // ... misma lógica de validación
  return { errorSecuencia: errorEncontrado, advertenciaIncompletitud: advertencia };
}

async function handleGuardar() {
  // Ejecutar validación SOLO al intentar guardar
  const validacion = validarEventos();
  setErrorSecuencia(validacion.errorSecuencia);
  setAdvertenciaIncompletitud(validacion.advertenciaIncompletitud);

  if (validacion.errorSecuencia) {
    toast.error(validacion.errorSecuencia);
    return; // BLOQUEAR guardado
  }
  // ... continuar si válido
}
```

---

### 2. ✅ Motivo Opcional para Todos

**Problema anterior:**
- El label mostraba `"Motivo (obligatorio para HR)"` sugiriendo que era requerido
- Había validación de mínimo 10 caracteres (línea 459-461)

**Solución aplicada:**
- Label cambiado a `"Motivo (opcional)"` para todos los usuarios
- Eliminada validación de longitud mínima
- Si no hay motivo, se usa `'Corrección de fichaje'` por defecto

**Código modificado:**
- **Label:** [`components/shared/fichajes/fichaje-modal.tsx:782`](components/shared/fichajes/fichaje-modal.tsx#L782)
- **Validación eliminada:** líneas 455-456

```typescript
// ANTES
<FieldLabel>Motivo {operaDirecto && modo === 'editar' ? '(obligatorio para HR)' : '(opcional)'}</FieldLabel>
// ...
if (motivoFinal.length < 10) {
  throw new Error('El motivo debe tener al menos 10 caracteres');
}

// AHORA
<FieldLabel>Motivo (opcional)</FieldLabel>
// ...
const motivoFinal = motivo || 'Corrección de fichaje';
```

---

### 3. ✅ Error de Hidratación en AlertDialog

**Problema:**
- `AlertDialogDescription` renderiza un `<p>` tag por defecto
- Contenía `<p>` anidados en líneas 840 y 853 de `fichaje-widget.tsx`
- Error: `<p> cannot contain a nested <p>`

**Solución aplicada:**
- Reemplazados todos los `<p>` dentro de `AlertDialogDescription` con `<div>`

**Código modificado:** [`components/shared/fichaje-widget.tsx:840-853`](components/shared/fichaje-widget.tsx#L840-L853)

```typescript
// ANTES
<AlertDialogDescription className="space-y-3">
  <p>Tu jornada requiere descanso pero...</p>
  <div className="mt-4 p-3 bg-gray-50 rounded-md">
    <p className="text-sm font-medium text-gray-700 mb-2">Eventos registrados:</p>
  </div>
</AlertDialogDescription>

// AHORA
<AlertDialogDescription className="space-y-3">
  <div>Tu jornada requiere descanso pero...</div>
  <div className="mt-4 p-3 bg-gray-50 rounded-md">
    <div className="text-sm font-medium text-gray-700 mb-2">Eventos registrados:</div>
  </div>
</AlertDialogDescription>
```

---

## Análisis Exhaustivo del Sistema de Guardado

### Arquitectura General

El modal de fichajes soporta **2 modos** y **2 tipos de usuario**:

**Modos:**
1. `'crear'` - Añadir nuevo fichaje
2. `'editar'` - Modificar fichaje existente

**Tipos de usuario:**
1. `operaDirecto = true` - HR Admin (edita directamente)
2. `operaDirecto = false` - Empleado (crea solicitudes)

---

### Flujo 1: CREAR Fichaje (HR Admin)

**Trigger:** `modo === 'crear' && operaDirecto === true`

**Función:** `guardarCreacion()` → rama `operaDirecto` (líneas 516-580)

**Pasos:**

1. **Verificar fichaje existente:**
   ```typescript
   const resFichajes = await fetch(`/api/fichajes?fecha=${fecha}&empleadoId=${targetEmpleadoId}`);
   const fichajes = dataFichajes?.data || [];
   let fichajeId = fichajes[0]?.id;
   ```

2. **Si NO existe fichaje del día:**
   - Crear fichaje con el primer evento usando `POST /api/fichajes`
   ```typescript
   const primerEvento = eventos[0];
   await fetch('/api/fichajes', {
     method: 'POST',
     body: JSON.stringify({
       fecha,
       tipo: primerEvento.tipo,
       hora: new Date(`${fecha}T${primerEvento.hora}:00`).toISOString(),
       empleadoId: targetEmpleadoId,
     }),
   });
   ```
   - Extrae `fichajeId` de la respuesta

3. **Añadir eventos restantes:**
   ```typescript
   const eventosParaAñadir = fichajeId && fichajes.length > 0 ? eventos : eventos.slice(1);
   for (const ev of eventosParaAñadir) {
     await fetch('/api/fichajes/eventos', {
       method: 'POST',
       body: JSON.stringify({
         fichajeId,
         tipo: ev.tipo,
         hora: new Date(`${fecha}T${ev.hora}:00`).toISOString(),
         motivoEdicion: motivo || undefined,
         esEdicionManual: true,
       }),
     });
   }
   ```

**Resultado:**
- Fichaje creado con todos los eventos
- Marcados como `esEdicionManual = true`
- Estado se calcula automáticamente en el backend

---

### Flujo 2: CREAR Solicitud (Empleado)

**Trigger:** `modo === 'crear' && operaDirecto === false`

**Función:** `guardarCreacion()` → rama `else` (líneas 582-600)

**Pasos:**

1. **Crear solicitud formal:**
   ```typescript
   const primerEvento = eventos[0];
   await fetch('/api/solicitudes', {
     method: 'POST',
     body: JSON.stringify({
       tipo: 'fichaje_manual',
       camposCambiados: {
         fecha,
         tipo: primerEvento.tipo,
         hora: new Date(`${fecha}T${primerEvento.hora}:00`).toISOString(),
         motivo: motivo || 'Fichaje manual',
       },
       motivo: motivo || 'Fichaje manual',
     }),
   });
   ```

**Limitaciones actuales:**
- Solo soporta 1 evento por solicitud
- Si HR aprueba, se crea el fichaje con ese único evento

**Resultado:**
- Solicitud pendiente de aprobación
- NO se modifica la base de datos de fichajes hasta aprobación

---

### Flujo 3: EDITAR Fichaje (HR Admin) - Sistema de Lotes

**Trigger:** `modo === 'editar' && operaDirecto === true`

**Función:** `guardarEdicion()` → rama `esHRAdmin` (líneas 412-472)

**Pasos:**

1. **Detectar cambios (crear, editar, eliminar):**
   ```typescript
   const cambios: any[] = [];

   // 1. Eventos eliminados
   for (const eventoId of eventosEliminados) {
     cambios.push({ accion: 'eliminar', eventoId });
   }

   // 2. Eventos nuevos
   for (const ev of eventos.filter(e => e.isNew)) {
     cambios.push({
       accion: 'crear',
       tipo: ev.tipo,
       hora: new Date(`${fecha}T${ev.hora}:00`).toISOString(),
     });
   }

   // 3. Eventos modificados
   for (const ev of eventos.filter(e => !e.isNew)) {
     const original = eventosOriginales.find(o => o.id === ev.id);
     if (original.tipo !== ev.tipo || original.hora !== ev.hora) {
       cambios.push({
         accion: 'editar',
         eventoId: ev.id,
         tipo: ev.tipo !== original.tipo ? ev.tipo : undefined,
         hora: ev.hora !== original.hora ? new Date(`${fecha}T${ev.hora}:00`).toISOString() : undefined,
       });
     }
   }
   ```

2. **Validar que hay cambios:**
   ```typescript
   if (cambios.length === 0) {
     throw new Error('No hay cambios que guardar');
   }
   ```

3. **Enviar todos los cambios en UNA SOLA llamada:**
   ```typescript
   await fetch('/api/fichajes/editar-batch', {
     method: 'POST',
     body: JSON.stringify({
       fichajeId: fichajeDiaId,
       cambios,
       motivo: motivoFinal,
     }),
   });
   ```

**Backend (editar-batch):**
- Aplica todos los cambios en una transacción
- Recalcula horas trabajadas y estado
- Crea UNA notificación con botón "Rechazar edición"
- Crea registro en `ediciones_fichaje_pendientes` con expira en 48h
- Empleado puede rechazar (revierte TODO) o ignorar (se aprueba automáticamente)

**Resultado:**
- Cambios aplicados optimísticamente
- Fichaje actualizado inmediatamente
- Empleado tiene 48h para rechazar

---

### Flujo 4: EDITAR Fichaje (Empleado) - Método Individual

**Trigger:** `modo === 'editar' && operaDirecto === false`

**Función:** `guardarEdicion()` → rama `else` (líneas 474-512)

**Pasos:**

1. **Eliminar eventos:**
   ```typescript
   for (const eventoId of eventosEliminados) {
     await fetch(`/api/fichajes/eventos/${eventoId}`, { method: 'DELETE' });
   }
   ```

2. **Crear eventos nuevos:**
   ```typescript
   for (const ev of eventos.filter(e => e.isNew)) {
     await fetch('/api/fichajes/eventos', {
       method: 'POST',
       body: JSON.stringify({
         fichajeId: fichajeDiaId,
         tipo: ev.tipo,
         hora: new Date(`${fecha}T${ev.hora}:00`).toISOString(),
         motivoEdicion: motivo || undefined,
         esEdicionManual: true,
       }),
     });
   }
   ```

3. **Actualizar eventos modificados:**
   ```typescript
   for (const ev of eventos.filter(e => !e.isNew)) {
     const original = eventosOriginales.find(o => o.id === ev.id);
     if (original.tipo !== ev.tipo || original.hora !== ev.hora) {
       await fetch(`/api/fichajes/eventos/${ev.id}`, {
         method: 'PATCH',
         body: JSON.stringify({
           tipo: ev.tipo,
           hora: new Date(`${fecha}T${ev.hora}:00`).toISOString(),
           motivoEdicion: motivo || undefined,
         }),
       });
     }
   }
   ```

**Resultado:**
- Cambios aplicados de forma individual (múltiples llamadas)
- Cada operación puede crear notificaciones separadas
- NO hay sistema de rechazo optimista (cambios permanentes)

**⚠️ Inconsistencia detectada:** Este flujo NO usa el sistema de ediciones pendientes. Los empleados editan directamente sus propios fichajes sin posibilidad de rechazo.

---

## Sincronización Global

Después de guardar (en todos los flujos), se dispara:

```typescript
window.dispatchEvent(new CustomEvent('fichaje-updated'));
onClose();
onSuccess?.();
```

**Componentes que escuchan este evento:**
- Tablas de fichajes en `/hr/horario/fichajes`
- Tablas de fichajes en `/empleado/horario/fichajes`
- Widget de fichaje en dashboard
- Ausencias widget (indirectamente)

**Cómo escuchan:**
```typescript
useEffect(() => {
  const handleFichajeUpdate = () => {
    router.refresh();
    // o refetch() si usan React Query
  };
  window.addEventListener('fichaje-updated', handleFichajeUpdate);
  return () => window.removeEventListener('fichaje-updated', handleFichajeUpdate);
}, []);
```

---

## Validaciones Críticas

### 1. Secuencia de Eventos (BLOQUEA guardado)

**Estados válidos:**
```
sin_fichar → entrada → trabajando → pausa_inicio → en_pausa → pausa_fin → trabajando → salida → finalizado
```

**Validaciones:**
- No puede haber `entrada` si ya hay una activa
- No puede haber `pausa_inicio` sin `entrada` previa
- No puede haber `pausa_fin` sin `pausa_inicio`
- No puede haber `salida` sin jornada iniciada
- **PERMITIDO:** `salida` desde `en_pausa` (se reanuda implícitamente)
- Cada evento debe tener hora posterior al anterior

**Implementación:** [`fichaje-modal.tsx:280-310`](components/shared/fichajes/fichaje-modal.tsx#L280-L310)

### 2. Completitud (NO bloquea, solo advierte)

**Requisitos para fichaje completo:**
- Debe tener evento `entrada`
- Debe tener evento `salida`

**Si faltan:**
- Muestra banner amarillo de advertencia
- Permite guardar de todos modos
- Fichaje queda en estado `en_curso` o `pendiente`

**Implementación:** [`fichaje-modal.tsx:315-326`](components/shared/fichajes/fichaje-modal.tsx#L315-L326)

### 3. Fechas Futuras (BLOQUEA guardado)

```typescript
// Bloquear fechas futuras
const fechaSeleccionada = new Date(fecha);
const hoy = new Date();
fechaSeleccionada.setHours(0, 0, 0, 0);
hoy.setHours(0, 0, 0, 0);

if (fechaSeleccionada > hoy) {
  toast.error('No puedes registrar fichajes en fechas futuras');
  return;
}

// Bloquear horas futuras
for (const ev of eventos) {
  const fechaHora = new Date(`${fecha}T${ev.hora}:00`);
  if (fechaHora > new Date()) {
    toast.error('No puedes registrar eventos en el futuro');
    return;
  }
}
```

**Implementación:** [`fichaje-modal.tsx:349-372`](components/shared/fichajes/fichaje-modal.tsx#L349-L372)

---

## Edge Cases Cubiertos

### 1. ✅ Eliminación de Evento Original

**Escenario:** HR elimina un evento original (no creado en esta sesión)

**Flujo:**
1. Usuario hace clic en eliminar → `handleEliminarEvento(id)`
2. Si `!ev.isNew` → se añade a `eventosEliminados`
3. Se elimina del array `eventos`
4. Al guardar → `cambios.push({ accion: 'eliminar', eventoId })`
5. Backend ejecuta `DELETE` en transacción
6. Backend recalcula horas y estado

**Protección en backend:**
- Al revertir edición, se recrea el evento con sus datos originales guardados en `cambio.eventoEliminado`

### 2. ✅ Ediciones Concurrentes Bloqueadas

**Escenario:** HR intenta editar un fichaje que ya tiene edición pendiente

**Flujo:**
1. Endpoint `/api/fichajes/editar-batch` verifica:
   ```typescript
   const edicionPendiente = await prisma.ediciones_fichaje_pendientes.findFirst({
     where: { fichajeId, estado: 'pendiente' },
   });
   if (edicionPendiente) {
     return badRequestResponse('Este fichaje ya tiene una edición pendiente...');
   }
   ```
2. Bloquea nueva edición hasta que se apruebe/rechace/expire la anterior

### 3. ✅ Validación Consistente Frontend/Backend

**Frontend:** `validarEventos()` en modal
**Backend:** `validarSecuenciaEventos()` y `simularCambios()` en `/api/fichajes/editar-batch`

Ambos implementan la misma máquina de estados, asegurando que:
- Si pasa validación en frontend, también pasará en backend
- Si falla en backend (edge case), error se muestra al usuario

### 4. ✅ Estado Auto-Actualizado al Completar

**Escenario:** Fichaje en `en_curso`, HR añade evento `salida` faltante

**Flujo:**
1. Backend recalcula después de aplicar cambios:
   ```typescript
   const validacionCompleto = await validarFichajeCompleto(fichajeId);
   let nuevoEstado = fichaje.estado;
   if (validacionCompleto.completo) {
     nuevoEstado = 'finalizado';
   }
   await tx.fichajes.update({ where: { id: fichajeId }, data: { estado: nuevoEstado } });
   ```
2. Fichaje pasa automáticamente a `finalizado`
3. NO necesita pasar por "cuadrar fichajes"

---

## Posibles Mejoras Futuras

### 1. ⚠️ Ediciones de Empleados Sin Sistema Optimista

**Problema actual:**
- Cuando empleado edita su propio fichaje (flujo 4), los cambios son permanentes
- NO hay sistema de rechazo ni aprobación

**Propuesta:**
- Extender sistema de `ediciones_fichaje_pendientes` a empleados
- HR recibe notificación cuando empleado edita
- HR puede rechazar edición (revierte cambios)

### 2. ⚠️ Solicitudes Solo Soportan 1 Evento

**Problema actual:**
- En flujo 2, empleado crea solicitud pero solo con el primer evento
- Si añadió múltiples eventos, se pierden

**Propuesta:**
- Cambiar modelo `solicitudes` para soportar array de eventos
- O cambiar UX para que empleados creen fichajes directos con sistema optimista

### 3. 📊 Auditoría Más Granular

**Propuesta:**
- Guardar snapshot del fichaje antes de editar
- Permitir ver historial completo de ediciones
- Mostrar quién editó cada evento específico

---

## Resumen de Estado Actual

| Flujo | Usuario | Modo | Sistema | Notificaciones | Reversible |
|-------|---------|------|---------|----------------|------------|
| 1 | HR Admin | Crear | Directo | No | No |
| 2 | Empleado | Crear | Solicitud | Sí (aprobación HR) | Sí (antes de aprobar) |
| 3 | HR Admin | Editar | Optimista por lotes | Sí (1 por fichaje) | Sí (48h) |
| 4 | Empleado | Editar | Individual directo | No | No |

**Conclusión:**
- ✅ Sistema de edición por lotes (flujo 3) es robusto y completo
- ✅ Validaciones funcionan correctamente y de forma consistente
- ✅ Sincronización global mediante eventos custom
- ⚠️ Flujo 4 (empleado edita) necesita sistema optimista
- ⚠️ Flujo 2 (solicitudes) limita a 1 evento
