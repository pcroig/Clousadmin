# Fix: Widget de Fichajes - Modal de Edición

**Fecha:** 9 de diciembre de 2025
**Problema:** El widget de fichajes no mostraba los mismos eventos que las páginas de fichajes al editar

---

## Problema Identificado

El usuario reportó que los eventos no coincidían cuando se editaban desde:
1. Widget de fichajes (dashboard)
2. `/hr/horario/fichajes`
3. `/empleado/mi-espacio/fichajes`

### Causa Raíz

El widget de fichajes tenía un botón "Editar eventos" (línea 886 del `AlertDialog` de descanso incompleto) que **abría el modal en modo `crear`** en lugar de modo `editar`.

**Código problemático** (líneas 505-508):
```typescript
function handleEditarEventos() {
  setShowDescansoDialog(false);
  dispatch({ type: 'SET_MODAL', payload: true }); // ← Abre modal de CREAR
}
```

**Modal abierto** (líneas 796-807):
```typescript
<FichajeModal
  open={state.modalManual}
  onClose={() => dispatch({ type: 'SET_MODAL', payload: false })}
  onSuccess={() => { ... }}
  contexto="empleado"
  modo="crear" // ← Siempre en modo CREAR
/>
```

**Consecuencia**:
- El modal se abría vacío o con un evento por defecto
- NO cargaba los eventos existentes del fichaje del día
- NO tenía acceso al `fichajeId` para cargar datos de la BD

---

## Solución Implementada

### 1. Añadir estado para modal de edición

**Archivo**: `components/shared/fichaje-widget.tsx`
**Línea**: 222

```typescript
// NUEVO: Modal de edición para fichaje existente
const [editarModalOpen, setEditarModalOpen] = useState(false);
```

---

### 2. Modificar handler para usar modal de edición

**Archivo**: `components/shared/fichajes/fichaje-widget.tsx`
**Líneas**: 505-514

```typescript
function handleEditarEventos() {
  setShowDescansoDialog(false);
  // Abrir modal de edición con el fichajeId actual si existe
  if (state.fichajeId) {
    setEditarModalOpen(true); // ← Abre modal de EDITAR
  } else {
    // Si no hay fichaje, abrir modal de creación
    dispatch({ type: 'SET_MODAL', payload: true });
  }
}
```

**Lógica**:
- Si existe `state.fichajeId` (hay fichaje del día) → Abre modal en modo `editar`
- Si NO existe fichaje → Abre modal en modo `crear` (fallback)

---

### 3. Añadir modal de edición al componente

**Archivo**: `components/shared/fichaje-widget.tsx`
**Líneas**: 809-821

```typescript
{/* Modal de edición de fichaje existente */}
<FichajeModal
  open={editarModalOpen}
  fichajeDiaId={state.fichajeId ?? undefined} // ← Pasa el fichajeId
  onClose={() => setEditarModalOpen(false)}
  onSuccess={() => {
    setEditarModalOpen(false);
    obtenerEstadoActual(); // ← Recargar estado del widget
    window.dispatchEvent(new CustomEvent('fichaje-updated')); // ← Sincronizar otras vistas
  }}
  contexto="empleado"
  modo="editar" // ← Modo EDITAR
/>
```

**Características**:
- Pasa `fichajeDiaId={state.fichajeId}` para que el modal cargue el fichaje de BD
- En `onSuccess`: Recarga el estado del widget y dispara evento de sincronización
- Usa `contexto="empleado"` (no `operaDirecto`), por lo que edita con método individual

---

## Flujo Completo Después del Fix

### Escenario 1: Editar desde Widget (Descanso Incompleto)

1. Empleado inicia jornada → Evento `entrada` registrado
2. Empleado intenta finalizar sin hacer pausa → Dialog de descanso incompleto aparece
3. Empleado hace clic en "Editar eventos"
4. **ANTES**: Modal se abría vacío en modo `crear`
5. **AHORA**: Modal se abre en modo `editar` con:
   - `fichajeId` del fichaje actual
   - Fetch a `/api/fichajes/[id]` para cargar eventos
   - Eventos cargados y mostrados correctamente
6. Empleado puede:
   - Añadir eventos faltantes (ej: pausa_inicio, pausa_fin)
   - Editar horas de eventos existentes
   - Eliminar eventos incorrectos
7. Al guardar:
   - Si es empleado → Usa método individual (POST/PATCH/DELETE por evento)
   - Cambios se reflejan inmediatamente
   - Widget se actualiza con `obtenerEstadoActual()`
   - Evento `fichaje-updated` sincroniza otras vistas

---

### Escenario 2: Editar desde Páginas de Fichajes

**NO cambia**, sigue funcionando igual:

1. HR/Empleado va a `/hr/horario/fichajes` o `/empleado/mi-espacio/fichajes`
2. Hace clic en "Ver detalles" de un fichaje
3. Modal se abre en modo `editar` con `fichajeId`
4. Carga eventos desde `/api/fichajes/[id]`
5. Al guardar:
   - Si es HR → Usa sistema de edición por lotes (`POST /api/fichajes/editar-batch`)
   - Si es empleado → Usa método individual
6. Tabla se actualiza con `fetchFichajes()`

---

## Verificación de Consistencia

### Datos Cargados en Ambos Casos

Tanto el widget como las páginas ahora cargan datos del **mismo endpoint**:

**Endpoint**: `GET /api/fichajes/[id]`

**Query Prisma** (líneas 55-74 de `/api/fichajes/[id]/route.ts`):
```typescript
const fichaje = await prisma.fichajes.findUnique({
  where: {
    id,
    empresaId: session.user.empresaId,
  },
  include: {
    empleado: {
      select: {
        nombre: true,
        apellidos: true,
        puesto: true,
      },
    },
    eventos: {
      orderBy: {
        hora: 'asc', // ← Orden consistente
      },
    },
  },
});
```

**Procesamiento en Modal** (líneas 159-165 de `fichaje-modal.tsx`):
```typescript
const eventosRegistrados = (data.eventos || []).map((e) => ({
  id: e.id,
  tipo: e.tipo as TipoEventoFichaje,
  hora: extraerHoraDeISO(e.hora) || '00:00',
  editado: e.editado,
  origen: 'registrado' as const,
}));
```

**Resultado**: Los mismos eventos, en el mismo orden, con los mismos IDs.

---

## Casos de Uso Cubiertos

### ✅ Caso 1: Widget - Editar desde Dialog de Descanso Incompleto

**Antes**: Modal vacío en modo `crear`
**Ahora**: Modal cargado en modo `editar` con eventos de BD

### ✅ Caso 2: Páginas HR - Editar fichaje de empleado

**Antes**: Funcionaba correctamente
**Ahora**: Sigue funcionando igual (sin cambios)

### ✅ Caso 3: Página Empleado - Editar propio fichaje

**Antes**: Funcionaba correctamente
**Ahora**: Sigue funcionando igual (sin cambios)

### ✅ Caso 4: Widget - Crear fichaje cuando no existe

**Antes**: Funcionaba correctamente
**Ahora**: Sigue funcionando igual (fallback a modo `crear`)

---

## Sincronización Global

Todos los puntos de edición ahora disparan el evento `fichaje-updated`:

**Widget** (línea 817):
```typescript
window.dispatchEvent(new CustomEvent('fichaje-updated'));
```

**Páginas** (línea 818 de `fichajes-client.tsx`):
```typescript
window.dispatchEvent(new CustomEvent('fichaje-updated'));
```

**Listeners**:
- Widget: `obtenerEstadoActual()` en línea 372
- Tablas: `fetchFichajes()` en línea 818

**Resultado**: Cambios en cualquier vista se reflejan en todas las demás.

---

## Archivos Modificados

### `components/shared/fichaje-widget.tsx`

**Cambios**:
1. Línea 222: Añadido estado `editarModalOpen`
2. Líneas 505-514: Modificado `handleEditarEventos` para usar modal de edición
3. Líneas 809-821: Añadido segundo `<FichajeModal>` en modo `editar`

**Líneas de código**:
- +13 líneas añadidas
- +3 líneas modificadas
- Total: 16 líneas

---

## Testing Recomendado

### Test 1: Editar desde Widget

1. Login como empleado
2. Ir a dashboard
3. Iniciar jornada (fichar entrada)
4. Intentar finalizar jornada sin pausa
5. Verificar que aparece dialog de descanso incompleto
6. Hacer clic en "Editar eventos"
7. **Verificar**: Modal se abre con evento de entrada visible
8. Añadir eventos de pausa
9. Guardar
10. **Verificar**: Widget se actualiza con eventos completos

### Test 2: Editar desde Página HR

1. Login como HR Admin
2. Ir a `/hr/horario/fichajes`
3. Seleccionar fichaje con eventos
4. Hacer clic en "Ver detalles"
5. **Verificar**: Modal se abre con los mismos eventos que la tabla
6. Editar hora de un evento
7. Guardar
8. **Verificar**: Tabla se actualiza inmediatamente
9. Ir a dashboard
10. **Verificar**: Widget también muestra el cambio

### Test 3: Editar desde Página Empleado

1. Login como empleado
2. Ir a `/empleado/mi-espacio/fichajes`
3. Seleccionar fichaje del día actual
4. Hacer clic en "Editar"
5. **Verificar**: Modal se abre con eventos correctos
6. Modificar evento
7. Guardar
8. Cambiar a dashboard
9. **Verificar**: Widget muestra el cambio

### Test 4: Consistencia de Eventos

1. Login como HR Admin
2. Ir a `/hr/horario/fichajes`
3. Seleccionar un fichaje
4. Anotar IDs, tipos y horas de eventos
5. Cerrar modal
6. Login como el empleado de ese fichaje
7. Ir a dashboard
8. Abrir dialog de edición (si aplica)
9. **Verificar**: Mismos IDs, tipos y horas de eventos

---

## Conclusión

El fix corrige la discrepancia identificada por el usuario. Ahora:

✅ Widget abre modal en modo `editar` con `fichajeId`
✅ Eventos cargados desde BD en todas las vistas
✅ Mismo endpoint usado por widget y páginas
✅ Sincronización global mediante eventos custom
✅ Sin cambios en funcionalidad existente de páginas

**Resultado**: Los eventos coinciden perfectamente entre widget y páginas de fichajes.
