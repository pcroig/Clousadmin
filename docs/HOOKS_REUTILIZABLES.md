# 🎣 HOOKS REUTILIZABLES - DOCUMENTACIÓN

**Fecha**: 9 de diciembre 2025
**Versión**: 1.1
**Estado**: ✅ Implementado

---

## 📋 Resumen

Se han creado hooks reutilizables para centralizar el manejo de llamadas API desde componentes client, eliminando código duplicado y mejorando la consistencia.

---

## 🎯 Objetivo

Eliminar el patrón repetitivo de `useState` + `useEffect` + `fetch` + manejo de errores que aparece en **22 archivos** del proyecto, reduciendo ~300-400 líneas de código duplicado.

---

## 📚 Hooks Disponibles

### 1. `useApi<T>` - Para llamadas GET

Hook para fetch con estados de loading, error y data.

**Ubicación**: `lib/hooks/use-api.ts`

**Uso básico**:
```tsx
import { useApi } from '@/lib/hooks';

function MiComponente() {
  const { data, loading, error, execute } = useApi<Ausencia[]>();

  useEffect(() => {
    execute('/api/ausencias');
  }, [execute]);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{data?.map(...)}</div>;
}
```

**Uso con callbacks**:
```tsx
const { data, loading, execute } = useApi<Ausencia[]>({
  onSuccess: (data) => {
    console.log('Datos cargados:', data);
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

**Props**:
- `data: T | null` - Datos de la respuesta
- `loading: boolean` - Estado de carga
- `error: Error | null` - Error si ocurre
- `execute(url, options?)` - Función para ejecutar la petición
- `reset()` - Limpiar estado

---

### 2. `useMutation<TData, TVariables>` - Para POST/PATCH/DELETE

Hook especializado para mutaciones.

**Ubicación**: `lib/hooks/use-mutation.ts`

**Uso básico**:
```tsx
import { useMutation } from '@/lib/hooks';

function CrearAusencia() {
  const { mutate, loading, error } = useMutation<Ausencia, CreateAusenciaData>();

  const handleSubmit = async () => {
    const result = await mutate('/api/ausencias', {
      tipo: 'vacaciones',
      fechaInicio: '2025-02-01',
      fechaFin: '2025-02-05',
    });

    if (result) {
      toast.success('Ausencia creada');
    }
  };

  return (
    <Button onClick={handleSubmit} disabled={loading}>
      {loading ? 'Creando...' : 'Crear Ausencia'}
    </Button>
  );
}
```

**Uso con mutateAsync (lanza errores)**:
```tsx
const { mutateAsync, loading } = useMutation<Ausencia, CreateAusenciaData>({
  onSuccess: (data) => {
    toast.success('Ausencia creada');
    router.refresh();
  },
});

const handleSubmit = async () => {
  try {
    await mutateAsync('/api/ausencias', {
      tipo: 'vacaciones',
      fechaInicio: '2025-02-01',
    });
  } catch (error) {
    // Error ya manejado en onError
  }
};
```

**Props**:
- `mutate(url, variables, options?)` - Función para ejecutar mutación (retorna `TData | null`)
- `mutateAsync(url, variables, options?)` - Función que retorna `Promise<TData>` (lanza errores)
- `loading: boolean` - Estado de carga
- `error: Error | null` - Error si ocurre
- `reset()` - Limpiar estado

---

### 3. `useFileUpload` - Para Uploads de Archivos Avanzados

Hook especializado para subida de archivos con cola, progreso, reintentos y cancelación.

**Ubicación**: `lib/hooks/use-file-upload.ts`

**Características**:
- ✅ Cola de uploads secuenciales
- ✅ Tracking de progreso en tiempo real
- ✅ Reintentos automáticos (configurable)
- ✅ Cancelación de uploads en progreso
- ✅ Validación de tipo, tamaño y magic numbers
- ✅ Previsualización de imágenes
- ✅ Drag & drop nativo

**Uso básico**:
```tsx
import { useFileUpload, type UploadHandler } from '@/lib/hooks/use-file-upload';
import { FileUploadAdvanced } from '@/components/shared/file-upload-advanced';

function SubirDocumentos() {
  const router = useRouter();

  const handleUpload: UploadHandler = useCallback(
    ({ file, signal, onProgress }) =>
      new Promise((resolve) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('carpetaId', carpetaId);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/documentos');
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress?.(event.loaded, event.total);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            router.refresh();
            resolve({ success: true });
          } else {
            resolve({ success: false, error: 'Error al subir' });
          }
        };
        xhr.onerror = () => resolve({ success: false, error: 'Error de red' });
        
        if (signal.aborted) {
          xhr.abort();
        } else {
          signal.addEventListener('abort', () => xhr.abort());
        }
        xhr.send(formData);
      }),
    [carpetaId, router]
  );

  return (
    <FileUploadAdvanced
      onUpload={handleUpload}
      acceptedTypes={['application/pdf', 'image/jpeg', 'image/png']}
      maxSizeMB={10}
      maxFiles={10}
      allowMultiple
      autoUpload
    />
  );
}
```

**Props del hook**:
- `items: UploadItem[]` - Lista de archivos en cola con estado y progreso
- `queueProgress: number` - Progreso total de la cola (0-100)
- `isUploading: boolean` - Si hay uploads en progreso
- `addFiles(files: FileList | File[])` - Agregar archivos a la cola
- `removeFile(id: string)` - Quitar archivo de la cola
- `retryFile(id: string)` - Reintentar upload fallido
- `cancelUpload(id: string)` - Cancelar upload en progreso
- `clearCompleted()` - Limpiar archivos completados/cancelados
- `startUploads()` - Iniciar uploads manualmente (si `autoUpload: false`)

**Opciones**:
- `onUpload: UploadHandler` - Función que ejecuta el upload (requerido)
- `acceptedTypes?: string[]` - Tipos MIME permitidos
- `maxSizeMB?: number` - Tamaño máximo por archivo (default: 5MB)
- `maxFiles?: number` - Máximo de archivos en cola (default: 10)
- `allowMultiple?: boolean` - Permitir múltiples archivos (default: true)
- `autoUpload?: boolean` - Subir automáticamente al agregar (default: true)
- `maxRetries?: number` - Reintentos automáticos (default: 3)

**Ejemplo completo con componente**:
```tsx
import { FileUploadAdvanced } from '@/components/shared/file-upload-advanced';
import { useFileUpload, type UploadHandler } from '@/lib/hooks/use-file-upload';

function CarpetaDetailClient({ carpetaId }: { carpetaId: string }) {
  const handleUpload: UploadHandler = useCallback(
    ({ file, signal, onProgress }) => {
      // Implementación con XMLHttpRequest para tracking de progreso
      // Ver ejemplo completo arriba
    },
    [carpetaId]
  );

  return (
    <FileUploadAdvanced
      onUpload={handleUpload}
      acceptedTypes={['application/pdf', 'image/jpeg', 'image/png']}
      maxSizeMB={10}
      allowMultiple
      autoUpload
      buttonText="Seleccionar documentos"
    />
  );
}
```

**Integración**:
- ✅ HR Documentos: `app/(dashboard)/hr/documentos/[id]/carpeta-detail-client.tsx`
- ✅ Empleado Documentos: `app/(dashboard)/empleado/mi-espacio/documentos/[id]/carpeta-detail-client.tsx`
- ✅ Onboarding Individual: `components/documentos/subir-documento-individual.tsx`

**Componentes relacionados**:
- `components/shared/file-upload-advanced.tsx` - Componente principal con drag & drop
- `components/ui/file-preview.tsx` - Previsualización de archivos con estado
- `components/ui/upload-progress.tsx` - Barra de progreso con ETA y velocidad
- `components/ui/upload-error-alert.tsx` - Alertas de error con retry

---

### 4. `useFestivos` - Para Gestión de Festivos con Sincronización

Hook centralizado para cargar festivos activos con sincronización automática entre componentes y pestañas.

**Ubicación**: `lib/hooks/use-festivos.ts`

**Características**:
- ✅ Carga de festivos activos de empresa
- ✅ Carga de festivos personalizados por empleado
- ✅ Polling automático configurable (default: 60s)
- ✅ Event listeners para sincronización instantánea
- ✅ Sincronización cross-tab con localStorage
- ✅ Invalidación automática de caché

**Uso básico**:
```tsx
import { useFestivos } from '@/lib/hooks/use-festivos';

function CalendarioAusencias({ empleadoId }: { empleadoId: string }) {
  const { festivos, isLoading, error } = useFestivos({
    empleadoId,
    revalidateInterval: 60000, // Revalidar cada 60 segundos
  });

  const esFestivo = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return festivos.some((f) => f.fecha === dateStr);
  };

  return <Calendar modifiers={{ festivo: esFestivo }} />;
}
```

**Notificar cambios manualmente**:
```tsx
import { notifyFestivosUpdated } from '@/lib/hooks/use-festivos';

async function handleToggleActivo(festivo: Festivo) {
  await fetch(`/api/festivos/${festivo.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ activo: !festivo.activo }),
  });

  notifyFestivosUpdated(); // ← Todos los calendarios se actualizan automáticamente
}
```

**Props**:
- `festivos: Festivo[]` - Lista de festivos activos
- `isLoading: boolean` - Estado de carga inicial
- `error: Error | null` - Error si ocurre
- `refetch(): Promise<void>` - Forzar recarga manual

**Opciones**:
- `empleadoId?: string` - ID del empleado para festivos personalizados
- `revalidateInterval?: number` - Intervalo de polling en ms (default: 60000)
- `enabled?: boolean` - Habilitar/deshabilitar hook (default: true)

**Integración**:
- ✅ `components/shared/mi-espacio/ausencias-tab.tsx` - Calendario de ausencias
- ✅ `app/(dashboard)/hr/organizacion/personas/[id]/empleado-detail-client.tsx` - Vista de empleado
- ✅ `components/hr/lista-festivos.tsx` - Gestión de festivos (notifica cambios)

**Sincronización automática**:
1. **Polling**: Recarga cada 60s automáticamente
2. **Window events**: Sincronización instantánea en la misma pestaña
3. **LocalStorage**: Sincronización entre pestañas del navegador

**Documentación completa**: [docs/historial/2025-12-09-festivos-completo.md](historial/2025-12-09-festivos-completo.md)

---

## 📊 Comparación Antes/Después

### ❌ Antes (15-20 líneas duplicadas por archivo):

```tsx
const [ausencias, setAusencias] = useState<Ausencia[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  fetchAusencias();
}, []);

async function fetchAusencias() {
  setLoading(true);
  try {
    const response = await fetch('/api/ausencias');
    if (!response.ok) {
      throw new Error('Error al cargar');
    }
    const data = await response.json();
    setAusencias(data);
  } catch (error) {
    console.error('Error:', error);
    setError(error instanceof Error ? error : new Error('Error desconocido'));
  } finally {
    setLoading(false);
  }
}
```

### ✅ Después (2-3 líneas):

```tsx
const { data: ausencias = [], loading, error, execute } = useApi<Ausencia[]>();

useEffect(() => {
  execute('/api/ausencias');
}, [execute]);
```

**Beneficios**:
- ✅ **-15 líneas** por archivo
- ✅ Manejo de errores consistente
- ✅ TypeScript types seguros
- ✅ Loading states automáticos

---

## 🔄 Migración de Archivos Existentes

### Archivos a Migrar (22 archivos identificados):

1. `app/(dashboard)/hr/horario/ausencias/ausencias-client.tsx` ✅ Ejemplo
2. `app/(dashboard)/empleado/horario/ausencias/ausencias-empleado-client.tsx` ✅ Refactorizado
3. `app/(dashboard)/hr/horario/fichajes/fichajes-client.tsx`
4. `app/(dashboard)/empleado/horario/fichajes/fichajes-empleado-client.tsx`
5. `app/(dashboard)/hr/horario/jornadas/jornadas-client.tsx`
6. `app/(dashboard)/hr/analytics/analytics-client.tsx`
7. `app/(dashboard)/hr/informes/analytics-client.tsx`
8. `app/(dashboard)/hr/mi-espacio/tabs/*.tsx` (múltiples)
9. `app/(dashboard)/empleado/mi-espacio/tabs/*.tsx` (múltiples)
10. Y más...

### Pasos para Migrar:

1. **Importar hook**:
```tsx
import { useApi, useMutation } from '@/lib/hooks';
```

2. **Reemplazar useState + useEffect + fetch**:
```tsx
// Antes
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetch('/api/endpoint').then(r => r.json()).then(setData);
}, []);

// Después
const { data = [], loading, execute } = useApi<Type[]>();
useEffect(() => {
  execute('/api/endpoint');
}, [execute]);
```

3. **Reemplazar mutaciones**:
```tsx
// Antes
const [loading, setLoading] = useState(false);
const handleSubmit = async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // ...
  } finally {
    setLoading(false);
  }
};

// Después
const { mutate, loading } = useMutation<ResponseType, RequestType>();
const handleSubmit = () => mutate('/api/endpoint', data);
```

---

## 🎨 Ejemplos de Uso Completo

### Ejemplo 1: Lista con Filtros

```tsx
function AusenciasLista() {
  const [filtro, setFiltro] = useState('todas');
  const { data: ausencias = [], loading, execute } = useApi<Ausencia[]>();

  useEffect(() => {
    const params = new URLSearchParams();
    if (filtro !== 'todas') {
      params.append('estado', filtro);
    }
    execute(`/api/ausencias?${params}`);
  }, [filtro, execute]);

  if (loading) return <Spinner />;
  
  return <Table data={ausencias} />;
}
```

### Ejemplo 2: Crear con Refetch

```tsx
function CrearAusencia() {
  const { mutate, loading } = useMutation<Ausencia, CreateData>({
    onSuccess: () => {
      toast.success('Creada');
    },
  });
  const { execute: refetch } = useApi<Ausencia[]>();

  const handleSubmit = async (data: CreateData) => {
    const result = await mutate('/api/ausencias', data);
    if (result) {
      refetch('/api/ausencias'); // Refetch lista
    }
  };

  return <Form onSubmit={handleSubmit} />;
}
```

### Ejemplo 3: Actualizar con Optimistic Update

```tsx
function EditarAusencia({ id }: { id: string }) {
  const { data: ausencia, execute: refetch } = useApi<Ausencia>();
  const { mutate, loading } = useMutation<Ausencia, UpdateData>();

  useEffect(() => {
    refetch(`/api/ausencias/${id}`);
  }, [id, refetch]);

  const handleUpdate = async (data: UpdateData) => {
    await mutate(`/api/ausencias/${id}`, data, { method: 'PATCH' });
    refetch(`/api/ausencias/${id}`); // Refetch después de actualizar
  };

  return <Form data={ausencia} onSubmit={handleUpdate} />;
}
```

---

## 🔍 Ventajas

### 1. **Código Más Limpio**
- Eliminación de ~15-20 líneas por archivo
- Menos boilerplate
- Más legible

### 2. **Consistencia**
- Mismo manejo de errores en todo el proyecto
- Mismos estados de loading
- Misma estructura de código

### 3. **Mantenibilidad**
- Cambios en un solo lugar
- Fácil agregar features (retry, cache, etc.)
- TypeScript types seguros

### 4. **Testing**
- Hooks más fáciles de testear
- Menos lógica en componentes
- Mock más simple

---

## 📝 Notas Técnicas

### Manejo de Errores

Los hooks manejan errores automáticamente y los exponen en el estado `error`. Si no se proporciona `onError`, se hace `console.error` automático.

```tsx
const { error } = useApi();
if (error) {
  // Manejar error manualmente
}
```

### TypeScript

Los hooks están completamente tipados:

```tsx
const { data } = useApi<Ausencia[]>(); // data es Ausencia[] | null
const { mutate } = useMutation<Response, Request>(); // Tipado completo
```

### AbortController (Futuro)

En futuras versiones se puede agregar soporte para cancelar requests:

```tsx
const { execute, abort } = useApi();
useEffect(() => {
  execute('/api/data');
  return () => abort(); // Cancelar al desmontar
}, []);
```

---

## 🚀 Próximos Pasos

1. **Migrar todos los archivos** (22 archivos restantes)
2. **Agregar soporte para abort/cancel**
3. **Agregar cache básico** (opcional)
4. **Agregar retry automático** (opcional)

---

**Última actualización**: 27 de enero 2025  
**Mantenido por**: Equipo de Desarrollo Clousadmin
































