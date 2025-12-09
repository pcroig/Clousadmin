# Análisis: Discrepancia de Eventos entre Widget y Páginas de Fichajes

**Fecha:** 9 de diciembre de 2025
**Problema:** Los eventos no coinciden cuando se abre el modal de edición desde el widget de fichajes vs desde las páginas `/hr/horario/fichajes` o `/empleado/mi-espacio/fichajes`

---

## Síntomas Reportados

Usuario indica que:
> "Ahora mismo los eventos no coinciden desde el widget fichajes>editar y /hr/horario/fichajes o miespacio(fichajes) >Editar fichaje. Cuando debería coincidir! Aunque creo que ambos estan mal."

---

## Investigación Inicial

### 1. Flujo desde Widget de Fichajes

**Componente**: `components/shared/fichaje-widget.tsx`

**Carga de datos**:
- Línea 306: `fetch(/api/fichajes?fecha=${fechaLocal}&propios=1)`
- Línea 314: `extractArrayFromResponse<Fichaje>(payload, { key: 'fichajes' })`
- Línea 332-354: Guarda eventos en el estado

```typescript
const fichajeHoy = fichajes[0];
// ... cálculos ...
dispatch({
  type: 'SET_DATA',
  payload: {
    status: deriveEstadoDesdeFichaje(fichajeHoy),
    horaEntrada: horaEnCurso,
    horasAcumuladas,
    horaEntradaDia,
    horaSalidaDia,
    tipoFichaje: fichajeHoy.tipoFichaje ?? 'ordinario',
    fichajeId: fichajeHoy.id,
    eventos: fichajeHoy.eventos, // ← Guardar eventos
  },
});
```

**Apertura del modal**:
- Línea 789-799: Abre `FichajeModal` en modo `crear`
- **CRÍTICO**: El widget NO abre el modal en modo `editar`, solo en modo `crear`
- No se pasa `fichajeDiaId` al modal desde el widget

**Conclusión**: El widget **NO** permite editar fichajes existentes directamente. Solo permite crear nuevos fichajes/eventos mediante el modal en modo `crear`.

---

### 2. Flujo desde Páginas de Fichajes

**Componente**: `app/(dashboard)/hr/horario/fichajes/fichajes-client.tsx`

**Carga de datos**:
- Página carga lista de fichajes con eventos incluidos
- Línea 445-450: Al hacer clic en "Ver detalles", abre modal con `fichajeId`

```typescript
const handleVerDetalles = useCallback((fichajeId: string) => {
  setEditarFichajeModal({
    open: true,
    fichajeDiaId: fichajeId,
  });
}, []);
```

**Apertura del modal**:
- Línea 812-822: Abre `FichajeModal` en modo `editar`
- Pasa `fichajeDiaId` para que el modal cargue los datos

```typescript
<FichajeModal
  open={editarFichajeModal.open}
  fichajeDiaId={editarFichajeModal.fichajeDiaId ?? undefined}
  onClose={() => setEditarFichajeModal({ open: false, fichajeDiaId: null })}
  onSuccess={() => {
    setEditarFichajeModal({ open: false, fichajeDiaId: null });
    fetchFichajes();
  }}
  contexto="hr_admin"
  modo="editar" // ← Modo editar
/>
```

---

### 3. Carga de Datos en el Modal

**Componente**: `components/shared/fichajes/fichaje-modal.tsx`

**Líneas 128-191**: Efecto para cargar fichaje en modo editar

```typescript
useEffect(() => {
  async function cargarFichaje() {
    if (modo !== 'editar' || !fichajeDiaId || !open) return;

    setCargando(true);
    try {
      const res = await fetch(`/api/fichajes/${fichajeDiaId}`);
      // ...
      const data = await parseJson<{
        id: string;
        fecha: string;
        empleado?: { nombre: string; apellidos: string; puesto?: string };
        eventos?: Array<{ id: string; tipo: string; hora: string; editado?: boolean }>;
      }>(res);

      // Eventos registrados
      const eventosRegistrados = (data.eventos || []).map((e) => ({
        id: e.id,
        tipo: e.tipo as TipoEventoFichaje,
        hora: extraerHoraDeISO(e.hora) || '00:00',
        editado: e.editado,
        origen: 'registrado' as const,
      }));

      // ... eventos propuestos ...

      setEventos(todosEventos);
      setEventosOriginales(eventosRegistrados);
    }
  }

  cargarFichaje();
}, [modo, fichajeDiaId, open, eventosPropuestos, fechaFichaje, empleadoNombreProp]);
```

---

## Análisis de los Endpoints

### Endpoint 1: `GET /api/fichajes?fecha=X&propios=1`

**Archivo**: `app/api/fichajes/route.ts`

**Líneas 193-228**: Query a BD

```typescript
const [fichajes, total] = await Promise.all([
  prisma.fichajes.findMany({
    where,
    include: {
      empleado: { select: { ... } },
      eventos: {
        orderBy: { hora: 'asc' },
      },
    },
    orderBy: [{ fecha: 'desc' }],
    skip,
    take: limit,
  }),
  prisma.fichajes.count({ where }),
]);
```

**Devuelve**: Array de fichajes, cada uno con su array de `eventos` ordenados por hora ascendente.

---

### Endpoint 2: `GET /api/fichajes/[id]`

**Archivo**: `app/api/fichajes/[id]/route.ts`

**Líneas 55-74**: Query a BD

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
        hora: 'asc',
      },
    },
  },
});
```

**Devuelve**: Un fichaje con su array de `eventos` ordenados por hora ascendente.

---

## Hipótesis de Causa Raíz

### Hipótesis 1: Confusión sobre dónde se puede editar

**Problema**: El usuario cree que puede editar desde el widget, pero el widget solo permite **crear** fichajes nuevos, no editar existentes.

**Evidencia**:
- Widget abre modal en modo `crear` (línea 798 de `fichaje-widget.tsx`)
- Páginas de fichajes abren modal en modo `editar` (línea 821 de `fichajes-client.tsx`)

**Verificación necesaria**:
- ¿El widget debería tener un botón para editar el fichaje actual?
- ¿O el flujo actual (solo crear nuevos eventos) es el correcto?

---

### Hipótesis 2: Eventos corregidos/editados no se reflejan correctamente

**Problema**: Cuando HR edita eventos mediante el sistema de edición por lotes, los cambios podrían no reflejarse inmediatamente en todas las vistas.

**Posibles causas**:
1. **Cache del navegador**: El `fetch` podría estar usando cache
2. **Sincronización incompleta**: El evento `fichaje-updated` no dispara refresh en todos los componentes
3. **Datos obsoletos en estado**: El estado local del widget no se actualiza después de editar

**Verificación necesaria**:
- Comprobar si después de editar desde `/hr/horario/fichajes`, el widget muestra los cambios
- Comprobar si el evento `fichaje-updated` llega correctamente al widget

---

### Hipótesis 3: Eventos propuestos vs registrados

**Problema**: El modal distingue entre eventos `registrados` (de BD) y eventos `propuestos` (sugeridos automáticamente). Esta distinción podría causar confusión.

**Código relevante** (líneas 168-180 de `fichaje-modal.tsx`):

```typescript
// Eventos propuestos (pre-cargados desde cuadrar fichajes)
const eventosPropuestosFormateados: EventoFichaje[] = (eventosPropuestos || []).map((ep, idx) => ({
  id: `propuesto_${Date.now()}_${idx}`,
  tipo: ep.tipo as TipoEventoFichaje,
  hora: extraerHoraDeISO(ep.hora) || '00:00',
  isNew: true, // Marcar como nuevo para que se cree al guardar
  origen: 'propuesto' as const,
}));

// Combinar: primero registrados, luego propuestos
const todosEventos = [...eventosRegistrados, ...eventosPropuestosFormateados];
```

**Verificación necesaria**:
- ¿Se están pasando `eventosPropuestos` desde algún lugar donde no deberían?
- ¿El usuario ve eventos propuestos en el modal que no esperaba?

---

### Hipótesis 4: Transformación de datos incorrecta

**Problema**: La función `extraerHoraDeISO()` podría estar transformando las horas incorrectamente.

**Código** (línea 162 de `fichaje-modal.tsx`):

```typescript
hora: extraerHoraDeISO(e.hora) || '00:00',
```

**Verificación necesaria**:
- Revisar implementación de `extraerHoraDeISO`
- Comparar con la hora original en la BD
- Verificar zona horaria

---

## Plan de Acción

### Paso 1: Clarificar Expectativa del Usuario

**Preguntas para el usuario**:
1. ¿Desde dónde esperas editar los fichajes?
   - Opción A: Desde el widget de fichajes (actualmente solo permite crear)
   - Opción B: Desde las páginas de fichajes en `/hr/horario/fichajes`
   - Opción C: Ambos lugares

2. ¿Qué eventos ves incorrectamente?
   - ¿Eventos duplicados?
   - ¿Eventos con horas incorrectas?
   - ¿Eventos que faltan?
   - ¿Eventos que no deberían estar?

3. ¿Cuándo notas la discrepancia?
   - Inmediatamente al abrir el modal
   - Después de guardar cambios
   - Después de refrescar la página

---

### Paso 2: Reproducir el Problema

**Pasos para reproducir**:
1. Ir a `/hr/horario/fichajes`
2. Seleccionar un fichaje con eventos
3. Hacer clic en "Ver detalles" → Modal se abre con eventos
4. Anotar los eventos mostrados (id, tipo, hora)
5. Cerrar modal
6. Ir al widget de fichajes (dashboard)
7. Verificar si muestra los mismos eventos
8. Intentar "editar" desde el widget (¿hay botón?)

**Datos a recolectar**:
- IDs de los eventos en cada vista
- Horas mostradas en cada vista
- Tipos de eventos en cada vista
- Estado del fichaje
- Timestamp de cuándo se cargaron los datos

---

### Paso 3: Revisar Transformación de Datos

**Revisar función `extraerHoraDeISO`**:
```bash
grep -r "extraerHoraDeISO" lib/utils/formatters.ts
```

**Verificar**:
- ¿Maneja correctamente zona horaria?
- ¿Devuelve formato HH:mm correcto?
- ¿Considera horario de verano/invierno?

---

### Paso 4: Verificar Sincronización

**Revisar listeners del evento `fichaje-updated`**:

1. En `fichaje-widget.tsx`:
   ```typescript
   useEffect(() => {
     const handleFichajeUpdate = () => {
       obtenerEstadoActual();
     };
     window.addEventListener('fichaje-updated', handleFichajeUpdate);
     return () => window.removeEventListener('fichaje-updated', handleFichajeUpdate);
   }, []);
   ```

2. En `fichajes-client.tsx`:
   ```typescript
   useEffect(() => {
     const handleFichajeUpdate = () => {
       fetchFichajes();
     };
     window.addEventListener('fichaje-updated', handleFichajeUpdate);
     return () => window.removeEventListener('fichaje-updated', handleFichajeUpdate);
   }, []);
   ```

**Verificar**:
- ¿Ambos componentes escuchan correctamente?
- ¿Se dispara el evento después de editar?
- ¿El fetch tiene cache enabled?

---

### Paso 5: Añadir Logging para Debug

**Modificar temporalmente el modal**:

```typescript
// En fichaje-modal.tsx, línea 159
const eventosRegistrados = (data.eventos || []).map((e) => {
  console.log('[FichajeModal] Evento cargado:', {
    id: e.id,
    tipo: e.tipo,
    horaOriginal: e.hora,
    horaExtraida: extraerHoraDeISO(e.hora),
    editado: e.editado,
  });

  return {
    id: e.id,
    tipo: e.tipo as TipoEventoFichaje,
    hora: extraerHoraDeISO(e.hora) || '00:00',
    editado: e.editado,
    origen: 'registrado' as const,
  };
});
```

**Modificar temporalmente el widget**:

```typescript
// En fichaje-widget.tsx, línea 354
eventos: fichajeHoy.eventos, // Guardar eventos en el estado

// AÑADIR:
console.log('[FichajeWidget] Eventos cargados:', fichajeHoy.eventos.map(e => ({
  id: e.id,
  tipo: e.tipo,
  hora: e.hora,
})));
```

---

## Soluciones Posibles

### Solución 1: Añadir Botón "Editar" al Widget

Si el usuario espera poder editar desde el widget:

**Modificar `fichaje-widget.tsx`**:

```typescript
// Añadir estado para modal de edición
const [editarFichajeModal, setEditarFichajeModal] = useState(false);

// Añadir botón en el widget
<Button
  variant="outline"
  size="sm"
  onClick={() => setEditarFichajeModal(true)}
  disabled={!state.fichajeId}
>
  Editar fichaje
</Button>

// Añadir modal en modo editar
<FichajeModal
  open={editarFichajeModal}
  fichajeDiaId={state.fichajeId ?? undefined}
  onClose={() => setEditarFichajeModal(false)}
  onSuccess={() => {
    setEditarFichajeModal(false);
    obtenerEstadoActual();
    window.dispatchEvent(new CustomEvent('fichaje-updated'));
  }}
  contexto="empleado"
  modo="editar"
/>
```

---

### Solución 2: Desactivar Cache en Fetch

**Modificar `fichaje-modal.tsx` línea 135**:

```typescript
const res = await fetch(`/api/fichajes/${fichajeDiaId}`, {
  cache: 'no-store', // ← Añadir esto
  headers: {
    'Cache-Control': 'no-cache',
  },
});
```

---

### Solución 3: Forzar Refresh Después de Editar

**Modificar `fichaje-modal.tsx` línea 393**:

```typescript
// Después de guardar con éxito
// Disparar evento global para sincronizar todas las tablas
window.dispatchEvent(new CustomEvent('fichaje-updated'));

// Forzar reload del estado en todos los componentes
if (typeof window !== 'undefined') {
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('fichaje-updated'));
  }, 500);
}
```

---

## Siguiente Paso

**Solicitar al usuario**:
1. Descripción más específica de qué eventos no coinciden
2. Screenshots de ambas vistas (widget vs página)
3. Logs de la consola si están disponibles
4. Pasos exactos para reproducir

Con esta información podremos identificar la causa raíz exacta y aplicar la solución correcta.
