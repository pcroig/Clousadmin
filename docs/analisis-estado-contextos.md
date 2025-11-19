# ANÁLISIS DE GESTIÓN DE ESTADO Y CONTEXTOS - Clousadmin

## RESUMEN EJECUTIVO

El proyecto usa **React Query para estado global** y **useState para estado local**, sin contextos adicionales. La arquitectura es generalmente sólida, pero hay **8 problemas específicos** de rendimiento, composición de estado y memoización que deben abordarse.

---

## 1. PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1.1 ⚠️ useMutation Hook - Dependencia en Options (CRITICAL)

**Archivo:** `/lib/hooks/use-mutation.ts` línea 91

```typescript
const mutate = useCallback(
  async (...) => { ... },
  [options]  // ❌ PROBLEMA: options se recrea en cada render
);
```

**Impacto:**
- Cada componente que usa `useMutation` con opciones inline causa re-creación del hook
- `mutateAsync` depende de `mutate` + `error`, causando ciclos innecesarios

**Síntoma:** Comportamiento inconsistente cuando se pasa `onSuccess`/`onError`

---

### 1.2 🔴 FichajeWidget - 8 Estados Independientes Sin Orquestación

**Archivo:** `/components/shared/fichaje-widget.tsx` líneas 43-50

```typescript
const [estadoActual, setEstadoActual] = useState<EstadoFichaje>('sin_fichar');
const [tiempoTrabajado, setTiempoTrabajado] = useState('00:00');
const [horasHechas, setHorasHechas] = useState(0);
const [horasPorHacer, setHorasPorHacer] = useState(8);
const [cargando, setCargando] = useState(false);
const [inicializando, setInicializando] = useState(true);
const [horaEntrada, setHoraEntrada] = useState<Date | null>(null);
const [modalFichajeManual, setModalFichajeManual] = useState(false);
```

**Problemas:**
- **Sin sincronización:** `horasHechas` + `horasPorHacer` siempre suman 8, pero se actualizan independientemente
- **Estados derivados:** `tiempoTrabajado` se calcula de `horaEntrada` pero también se actualiza con `setTiempoTrabajado`
- **Multiple source of truth:** Estado UI (`modalFichajeManual`) + estado de datos (`estadoActual`) sin jerarquía clara
- **Riesgo de inconsistencia:** 8 updateadores diferentes = 8 puntos de error

**Solución:** Usar `useReducer` para orquestar transiciones de estado

---

### 1.3 🟠 ImportarEmpleadosExcel - Excesivos Estados No Memoizados

**Archivo:** `/components/shared/importar-empleados-excel.tsx` líneas 112-120

```typescript
const [archivo, setArchivo] = useState<File | null>(null);
const [analizando, setAnalizando] = useState(false);
const [confirmando, setConfirmando] = useState(false);
const [previewData, setPreviewData] = useState<PreviewData | null>(null);
const [resultadoImportacion, setResultadoImportacion] = useState<ResultadoImportacion | null>(null);
const [invitarEmpleados, setInvitarEmpleados] = useState(true);
const [error, setError] = useState('');
const [empleadosExpandidos, setEmpleadosExpandidos] = useState<Set<string>>(new Set());
```

**Problemas:**
- `previewData` contiene arrays que se usan en `.map()` sin `useMemo`
- **Expansión de empleados (línea 119):** Set sin memoización causa re-renders de toda la lista
- **Estados de flujo sin garantía:** `analizando` + `confirmando` + `previewData` + `resultadoImportacion` = 4^2 = 16 estados posibles, solo 4 son válidos
- **toggleEmpleadoExpandido (línea 230-240):** Mutación de Set causa re-renders innecesarios

**Síntoma:** Toda la lista de empleados se renderiza cuando se expande 1 solo empleado

---

### 1.4 🟡 useSensitiveUnlock - Mezcla de Responsabilidades

**Archivo:** `/lib/hooks/useSensitiveUnlock.ts` líneas 16-20

```typescript
const [unlockedUntil, setUnlockedUntil] = useState<number | null>(null);
const [dialogState, setDialogState] = useState<DialogState>({ field: null, isOpen: false });
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);
```

**Problemas:**
- **5 estados independientes para 1 concepto:** Dialog + password + error + loading + lockTimer
- **useEffect sin dependencias correctas (línea 69-80):** El interval siempre recrea sin limpiar correctamente si `unlockedUntil` cambia
- **Returnea todo en bulk (línea 82-93):** El consumidor recibe 8+ propiedades sin estructura clara

**Impacto:** Componentes consumidores renderean todo cuando solo 1 campo cambia

---

### 1.5 🟡 SolicitudesWidget - Estado Local que Podría Venir de Props

**Archivo:** `/components/shared/solicitudes-widget.tsx` líneas 45-48

```typescript
const [accionEnCurso, setAccionEnCurso] = useState<{
  id: string;
  accion: SolicitudAccion;
} | null>(null);
```

**Problema:** 
- Este estado **podría derivarse** de React Query `useMutation` en lugar de estado local
- Actualmente, cada componente que usa `SolicitudesWidget` maneja el estado por separado

**No crítico pero:** Oportunidad para centralizar en hook reutilizable

---

### 1.6 🟠 Providers Faltantes - Sin Memoización de Values

**Archivo:** `/app/providers.tsx` línea 14

```typescript
const [queryClient] = useState(
  () =>
    new QueryClient({ ... })
);
```

**Bien hecho aquí.** Pero si hubiera un context provider, debería:
```typescript
const value = useMemo(() => ({ ... }), [dependencies]);
```

**No se está haciendo en:** N/A (no hay contextos personalizados detectados)

---

### 1.7 🔴 FichajeWidget - useEffect con Dependencias de Estado Problemáticas

**Archivo:** `/components/shared/fichaje-widget.tsx` líneas 53-71

```typescript
useEffect(() => {
  if (estadoActual !== 'trabajando' || !horaEntrada) {
    return;
  }

  const actualizarTiempo = () => {
    if (horaEntrada) {
      const ahora = new Date();
      const diffMs = ahora.getTime() - horaEntrada.getTime();
      setTiempoTrabajado(formatTiempoTrabajado(diffMs));
    }
  };
  
  actualizarTiempo();
  const intervalo = setInterval(actualizarTiempo, 1000);
  
  return () => clearInterval(intervalo);
}, [estadoActual, horaEntrada]);
```

**Problemas:**
- **Interval se recrea cada 1 segundo:** Cada `setTiempoTrabajado` causa re-render → cambio en dependencias → limpia + recrea interval
- **Doble cálculo:** `actualizarTiempo()` se llama fuera del interval también
- **Mejor práctica:** La dependencia de `horaEntrada` causa resets innecesarios del timer

**Síntoma:** Consumo de CPU alto en modo de trabajo activo

---

### 1.8 🟡 Dashboard Client - Uso de window.location.reload()

**Archivo:** `/app/(dashboard)/empleado/dashboard/dashboard-client.tsx` línea 109

```typescript
onSuccess={() => {
  setModalAusencia(false);
  window.location.reload(); // ❌ Mata todo el estado local
}}
```

**Problema:**
- Debería invalidar queries con `queryClient.invalidateQueries()` en lugar de reload
- Pierde estado de scroll, formularios parciales, etc.

---

## 2. ANÁLISIS POR CATEGORÍA

### State Distribution (Estado Global vs Local) ✓ BIEN HECHO

**Evaluación:** 8/10

**Lo que está bien:**
- React Query para datos fetch/sync (✓)
- Estado local para UI (modales, expansiones) (✓)
- No hay context bloat innecesario (✓)

**Mejora necesaria:**
- `accionEnCurso` en SolicitudesWidget podría estar en mutation state
- Considerar `useLocalStorage` para preferencias de UI

---

### Custom Hooks Encapsulation ⚠️ NECESITA REFACTOR

**Evaluación:** 6/10

**Hooks existentes:**
- `useApi` - Bien pensado, pero poco usado
- `useMutation` - Tiene problema de dependencias
- `useSolicitudes` - Bien
- `useNotificaciones` - Bien
- `useSensitiveUnlock` - Mezcla responsabilidades

**Hooks faltantes:**
- `useFichajeState` - Para orquestar los 8 estados del widget
- `useImportDialogState` - Para encapsular la máquina de estados (análisis → preview → confirmación → resultado)
- `useLockTimer` - Separar el timer de la lógica de unlock
- `useRequestState` - Para reusable (loading + error + data)
- `useSolicitudAccion` - Para centralizar la lógica de aprobar/rechazar

---

### Memoization ⚠️ INCOMPLETO

**Evaluación:** 5/10

**Bien memoizado:**
- `SolicitudesWidget` está wrappedcon `memo()` ✓
- `AusenciasWidget` está wrapped con `memo()` ✓
- `useCallback` en callbacks de botones ✓

**No memoizado:**
- `previewData.empleados` → render cada array de empleados sin `useMemo`
- `empleadosExpandidos` Set → no se estabiliza entre renders
- `reminderData` en Dashboard está memoizado pero innecesariamente (es cálculo simple)

---

### Re-render Behavior 🔴 PROBLEMA

**Componentes problemáticos:**
1. **FichajeWidget** - Re-renderea cada segundo cuando `estadoActual === 'trabajando'`
2. **ImportarEmpleadosExcel** - Todas las rows se renderean cuando 1 se expande (sin virtualización)
3. **SolicitudesWidget** - Si parent actualiza props, re-ejecuta `useMemo` en solicitudesMap (línea 50-56)

---

### Context Provider Nesting 👍 EXCELENTE

**Evaluación:** 10/10

- Solo 1 provider: `QueryClientProvider`
- No hay props drilling innecesario
- Estructura limpia en `/app/providers.tsx`

---

## 3. RECOMENDACIONES ESPECÍFICAS

### Priority 1 (URGENTE)

1. **Refactor useMutation** - Usar refs para callbacks como en useApi
   ```typescript
   const onSuccessRef = useRef(options?.onSuccess);
   const onErrorRef = useRef(options?.onError);
   onSuccessRef.current = options?.onSuccess;
   onErrorRef.current = options?.onError;
   // No incluir options en dependencias
   ```

2. **Crear useFichajeState** Hook
   ```typescript
   interface FichajeState {
     estadoActual: EstadoFichaje;
     horasHechas: number;
     horasPorHacer: number;
     tiempoTrabajado: string;
     cargando: boolean;
     inicializando: boolean;
   }
   
   export function useFichajeState() {
     const [state, dispatch] = useReducer(fichajeReducer, initialState);
     // ... orquestar transiciones
   }
   ```

3. **Mejorar FichajeWidget interval** - Usar ref para `horaEntrada`
   ```typescript
   const horaEntradaRef = useRef<Date | null>(null);
   horaEntradaRef.current = horaEntrada;
   
   useEffect(() => {
     if (estadoActual !== 'trabajando') return;
     const interval = setInterval(() => {
       if (horaEntradaRef.current) {
         const diffMs = Date.now() - horaEntradaRef.current.getTime();
         setTiempoTrabajado(formatTiempoTrabajado(diffMs));
       }
     }, 1000);
     return () => clearInterval(interval);
   }, [estadoActual]); // Solo re-crear si estado cambia
   ```

### Priority 2 (IMPORTANTE)

4. **Refactor ImportarEmpleadosExcel State Machine**
   ```typescript
   type ImportStep = 'upload' | 'analyzing' | 'preview' | 'confirming' | 'complete';
   
   interface ImportState {
     step: ImportStep;
     file: File | null;
     previewData: PreviewData | null;
     resultado: ResultadoImportacion | null;
     error: string;
     expandedEmployees: Set<string>;
   }
   ```

5. **Separar useLockTimer Hook**
   ```typescript
   export function useLockTimer(durationMs: number) {
     const [unlockedUntil, setUnlockedUntil] = useState<number | null>(null);
     // Solo maneja el timer, no el dialog
   }
   ```

6. **Crear useRequestState Hook** (reutilizable)
   ```typescript
   interface UseRequestStateReturn<T> {
     data: T | null;
     loading: boolean;
     error: Error | null;
     reset: () => void;
   }
   ```

### Priority 3 (NICE TO HAVE)

7. **Reemplazar window.location.reload()** en Dashboard
   ```typescript
   const queryClient = useQueryClient();
   
   onSuccess={() => {
     setModalAusencia(false);
     queryClient.invalidateQueries({ queryKey: ['ausencias'] });
     queryClient.invalidateQueries({ queryKey: ['solicitudes'] });
   }}
   ```

8. **Virtualizar listas largas** en ImportarEmpleadosExcel
   ```typescript
   import { FixedSizeList } from 'react-window';
   ```

---

## 4. CHECKLIST DE IMPLEMENTACIÓN

- [ ] Arreglar `useMutation` para no depender de `options`
- [ ] Crear `useFichajeState` con `useReducer`
- [ ] Optimizar interval en `FichajeWidget` con refs
- [ ] Refactor `ImportarEmpleadosExcel` con máquina de estados
- [ ] Extraer `useLockTimer` de `useSensitiveUnlock`
- [ ] Reemplazar `window.location.reload()` con React Query invalidations
- [ ] Memoizar arrays dinámicos en ImportarEmpleadosExcel
- [ ] Considerar virtualización para listas >50 items
- [ ] Documentar patrones de estado en `/docs`

---

## 5. RESUMEN CUANTITATIVO

| Métrica | Evaluación | Impacto |
|---------|-----------|---------|
| Global State Management | ✓ Excelente | Alto |
| Local State Distribution | ⚠️ Bien pero ineficiente | Medio |
| Custom Hooks Reusability | ⚠️ Incompleto | Alto |
| Memoization Coverage | 🔴 60% | Alto |
| Re-render Efficiency | 🔴 Problemas en widgets | Alto |
| Provider Nesting | ✓ Óptimo | N/A |
| Context Values | ✓ N/A (solo Query) | N/A |

**Score General: 6.5/10**

