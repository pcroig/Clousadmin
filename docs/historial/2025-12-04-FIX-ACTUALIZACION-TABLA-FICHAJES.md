# Fix: Actualización en Tiempo Real de Tablas de Fichajes

**Fecha**: 4 de diciembre de 2025  
**Tipo**: Bug Fix  
**Prioridad**: Alta  
**Estado**: ✅ Resuelto

---

## 📋 Problema Reportado

La tabla de fichajes/horario no mostraba datos actualizados en tiempo real:
- **Columnas afectadas**: Horas trabajadas, horario (entrada/salida) y balance
- **Comportamiento observado**: Los datos quedaban desactualizados hasta recargar la página
- **Excepción**: Al hacer clic en una fila, los eventos SÍ se mostraban actualizados

---

## 🔍 Análisis de Causa Raíz

### El Sistema de Eventos Personalizados

Clousadmin implementa un sistema de actualización en tiempo real mediante eventos personalizados del navegador:

```typescript
// Cuando hay cambios en fichajes
window.dispatchEvent(new CustomEvent('fichaje-updated'));

// Los componentes escuchan este evento
window.addEventListener('fichaje-updated', handleRealtimeUpdate);
```

### ¿Dónde se dispara el evento?

El evento `fichaje-updated` se dispara en:
- `components/shared/fichaje-widget.tsx` (líneas 385, 672)
  - Al crear un nuevo fichaje
  - Al aprobar solicitudes manuales
  - Al editar eventos

### Componentes que SÍ escuchaban el evento ✅

1. **Vista principal de fichajes HR**: `/app/(dashboard)/hr/horario/fichajes/fichajes-client.tsx`
2. **Widget de fichaje**: `components/shared/fichaje-widget.tsx`
3. **Tab de fichajes compartido**: `components/shared/mi-espacio/fichajes-tab.tsx`

### Componentes que NO escuchaban el evento ❌

1. **Tab de fichajes HR Mi Espacio**: `/app/(dashboard)/hr/mi-espacio/tabs/fichajes-tab.tsx`
2. **Vista de fichajes empleado**: `/app/(dashboard)/empleado/horario/fichajes/fichajes-empleado-client.tsx`
3. **Tab de fichajes empleado Mi Espacio**: `/app/(dashboard)/empleado/mi-espacio/tabs/fichajes-tab.tsx`

### ¿Por qué los eventos se veían actualizados al hacer clic?

Cuando el usuario hace clic en una fila:
1. Se abre `FichajeModal`
2. El modal hace una **llamada fresca a la API** para obtener el fichaje específico
3. Por eso los eventos dentro del modal SÍ están actualizados

Pero la tabla principal no se actualizaba porque no escuchaba el evento `fichaje-updated`.

---

## 🔧 Solución Implementada

Se agregó el listener del evento `fichaje-updated` a los tres componentes afectados.

### 1. HR Mi Espacio - Tab de Fichajes

**Archivo**: `app/(dashboard)/hr/mi-espacio/tabs/fichajes-tab.tsx`

```typescript
// Listener para refrescar en tiempo real
useEffect(() => {
  function handleRealtimeUpdate() {
    fetchFichajes();
  }
  window.addEventListener('fichaje-updated', handleRealtimeUpdate);
  return () => window.removeEventListener('fichaje-updated', handleRealtimeUpdate);
}, [fetchFichajes]);
```

### 2. Empleado - Vista de Fichajes

**Archivo**: `app/(dashboard)/empleado/horario/fichajes/fichajes-empleado-client.tsx`

```typescript
// Listener para refrescar en tiempo real
useEffect(() => {
  function handleRealtimeUpdate() {
    fetchFichajes();
  }
  window.addEventListener('fichaje-updated', handleRealtimeUpdate);
  return () => window.removeEventListener('fichaje-updated', handleRealtimeUpdate);
}, [fetchFichajes]);
```

### 3. Empleado Mi Espacio - Tab de Fichajes

**Archivo**: `app/(dashboard)/empleado/mi-espacio/tabs/fichajes-tab.tsx`

```typescript
// Listener para refrescar en tiempo real
useEffect(() => {
  function handleRealtimeUpdate() {
    if (empleadoId) {
      refetchFichajes(`/api/fichajes?empleadoId=${empleadoId}&propios=1`);
    }
  }
  window.addEventListener('fichaje-updated', handleRealtimeUpdate);
  return () => window.removeEventListener('fichaje-updated', handleRealtimeUpdate);
}, [empleadoId, refetchFichajes]);
```

**Nota**: Este componente usa el hook `useApi` en lugar de `fetchFichajes` directamente, por lo que la implementación es ligeramente diferente.

---

## ✅ Resultado

Ahora **todos los componentes de tablas de fichajes**:
- Se actualizan automáticamente cuando hay cambios
- Escuchan el evento `fichaje-updated`
- Mantienen consistencia de datos en toda la aplicación
- No requieren recargar la página manualmente

---

## 🧪 Pruebas Sugeridas

Para verificar que el problema está resuelto:

1. **HR Mi Espacio**:
   - Ir a `/hr/mi-espacio` → Tab "Fichajes"
   - Crear un fichaje nuevo desde el widget
   - Verificar que la tabla se actualiza automáticamente

2. **Empleado Horario**:
   - Ir a `/empleado/horario/fichajes`
   - Crear/editar un fichaje
   - Verificar que la tabla se actualiza sin recargar

3. **Empleado Mi Espacio**:
   - Ir a `/empleado/mi-espacio` → Tab "Fichajes"
   - Fichar entrada/salida desde el widget
   - Verificar actualización en tiempo real

4. **Edición de eventos**:
   - Hacer clic en una fila para abrir el modal
   - Editar un evento (cambiar hora, tipo, etc.)
   - Cerrar el modal
   - Verificar que la tabla refleja los cambios inmediatamente

---

## 📚 Referencias

- **Documentación de fichajes**: `docs/funcionalidades/fichajes.md`
- **Evento personalizado**: Líneas 385, 672 en `components/shared/fichaje-widget.tsx`
- **Implementación de referencia**: `app/(dashboard)/hr/horario/fichajes/fichajes-client.tsx` líneas 322-329

---

## 🎓 Lecciones Aprendidas

1. **Consistencia en patrones**: Cuando se implementa un sistema de eventos personalizados, todos los componentes relacionados deben seguir el mismo patrón.

2. **Testing de actualización en tiempo real**: Es importante probar no solo la funcionalidad inicial, sino también cómo los componentes responden a cambios en los datos.

3. **Documentación de eventos**: Los eventos personalizados deben estar documentados centralmente para que todos los desarrolladores sepan cuándo usarlos.

4. **Code review checklist**: Agregar punto de verificación: "¿Este componente necesita escuchar eventos de actualización?"

---

## 👤 Autor

**Desarrollado por**: Claude Code (Anthropic)  
**Revisado por**: Sofia Roig  
**Empresa**: Clousadmin

---

## 📝 Notas Adicionales

Este fix es parte de un sistema más amplio de actualización en tiempo real. Si en el futuro se crean nuevos componentes que muestren fichajes, deben incluir el listener `fichaje-updated` para mantener la consistencia.

### Patrón recomendado:

```typescript
// Cargar datos inicial
useEffect(() => {
  fetchData();
}, [fetchData]);

// Actualización en tiempo real
useEffect(() => {
  function handleRealtimeUpdate() {
    fetchData();
  }
  window.addEventListener('fichaje-updated', handleRealtimeUpdate);
  return () => window.removeEventListener('fichaje-updated', handleRealtimeUpdate);
}, [fetchData]);
```

Este patrón garantiza:
- Limpieza automática del listener al desmontar el componente
- Dependencias correctas para evitar stale closures
- Actualización consistente en toda la aplicación


