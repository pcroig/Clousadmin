# 🎣 HOOKS REUTILIZABLES - DOCUMENTACIÓN

**Fecha**: 27 de enero 2025  
**Versión**: 1.0  
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




























