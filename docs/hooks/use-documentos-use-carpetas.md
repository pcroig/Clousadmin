# Hooks de Gestión de Documentos

> **Última actualización:** 8 de diciembre de 2025

## Resumen

Sistema de gestión reactiva de documentos y carpetas usando **SWR** para actualizaciones automáticas, eliminando la necesidad de `router.refresh()` manual.

## ✨ Características

- ✅ **Actualizaciones automáticas** - Revalidación tras mutaciones
- ✅ **Optimistic updates** - UI instantánea con rollback automático
- ✅ **Cache compartido** - Sin duplicar requests entre componentes
- ✅ **Performance optimizada** - useMemo + useCallback
- ✅ **TypeScript completo** - Tipado estricto

---

## 📦 Hooks Disponibles

### `useDocumentos`

Hook para gestión reactiva de documentos con soporte para filtros y operaciones CRUD.

#### Ejemplo de uso

```tsx
import { useDocumentos } from '@/lib/hooks/use-documentos';

function DocumentList({ carpetaId }: { carpetaId: string }) {
  const {
    documentos,
    isLoading,
    error,
    deleteDocumento,
    updateDocumento,
    moveDocumento,
    mutate
  } = useDocumentos({ carpetaId });

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {documentos.map((doc) => (
        <div key={doc.id}>
          <span>{doc.nombre}</span>
          <button onClick={() => deleteDocumento(doc.id)}>
            Eliminar
          </button>
          <button onClick={() => updateDocumento(doc.id, { nombre: 'Nuevo nombre' })}>
            Renombrar
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### Parámetros

```typescript
interface UseDocumentosOptions {
  carpetaId?: string;      // Filtrar por carpeta
  empleadoId?: string;     // Filtrar por empleado
  tipoDocumento?: string;  // Filtrar por tipo
  enabled?: boolean;       // Habilitar/deshabilitar el fetching (default: true)
}
```

#### Retorno

```typescript
interface UseDocumentosReturn {
  documentos: Documento[];                           // Lista de documentos
  isLoading: boolean;                                // Estado de carga
  error: Error | null;                               // Error si existe
  mutate: KeyedMutator<DocumentosResponse>;         // Revalidar manualmente
  deleteDocumento: (id: string) => Promise<void>;   // Eliminar con optimistic update
  updateDocumento: (id: string, data) => Promise<void>; // Actualizar con optimistic update
  moveDocumento: (id: string, carpetaId: string) => Promise<void>; // Mover con optimistic update
}
```

---

### `useCarpetas`

Hook para gestión reactiva de carpetas con operaciones CRUD completas.

#### Ejemplo de uso

```tsx
import { useCarpetas } from '@/lib/hooks/use-carpetas';

function CarpetasList() {
  const {
    carpetas,
    isLoading,
    error,
    createCarpeta,
    updateCarpeta,
    deleteCarpeta
  } = useCarpetas();

  const handleCreate = async () => {
    await createCarpeta({
      nombre: 'Nueva Carpeta',
      compartida: true,
      asignadoA: 'todos',
    });
  };

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={handleCreate}>Crear Carpeta</button>
      {carpetas.map((carpeta) => (
        <div key={carpeta.id}>
          <span>{carpeta.nombre}</span>
          <button onClick={() => deleteCarpeta(carpeta.id)}>
            Eliminar
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### Parámetros

```typescript
interface UseCarpetasOptions {
  enabled?: boolean;  // Habilitar/deshabilitar el fetching (default: true)
}
```

#### Retorno

```typescript
interface UseCarpetasReturn {
  carpetas: Carpeta[];                                      // Lista de carpetas
  isLoading: boolean;                                       // Estado de carga
  error: Error | null;                                      // Error si existe
  mutate: KeyedMutator<CarpetasResponse>;                  // Revalidar manualmente
  createCarpeta: (data: CreateCarpetaData) => Promise<Carpeta>;  // Crear con optimistic update
  updateCarpeta: (id: string, data: UpdateCarpetaData) => Promise<void>; // Actualizar
  deleteCarpeta: (id: string) => Promise<void>;            // Eliminar con optimistic update
}
```

---

## 🔄 Revalidación Automática

### Sistema de Mutación Global

Los componentes usan `useSWRConfig` para revalidar automáticamente tras operaciones:

```tsx
import { useSWRConfig } from 'swr';

function MyComponent() {
  const { mutate } = useSWRConfig();

  const handleUpload = async () => {
    // ... subir documento

    // Revalidar automáticamente
    await mutate('/api/documentos?carpetaId=123');
    await mutate('/api/carpetas');
  };
}
```

### Componentes Actualizados

#### ✅ `DocumentUploadArea`
- Revalida automáticamente tras subir documentos
- Actualiza tanto documentos como carpetas
- No requiere `router.refresh()` manual

#### ✅ `SubirDocumentosModal`
- Revalida tras crear carpetas rápidas
- Sincroniza con sistema global de cache

#### ✅ `CrearCarpetaConDocumentosModal`
- Revalida tras crear carpeta y subir documentos
- Actualiza contadores automáticamente

#### ✅ `CarpetaDetailClient` (HR)
- Operaciones de eliminación, edición, mover con revalidación automática
- Actualiza múltiples cachés según la operación

---

## 🎯 Patrones de Uso

### Patrón 1: Optimistic Update Automático

```tsx
// ❌ ANTES - Manual y sin feedback inmediato
const handleDelete = async (id: string) => {
  await fetch(`/api/documentos/${id}`, { method: 'DELETE' });
  router.refresh(); // Recarga toda la página
};

// ✅ AHORA - Optimistic update con rollback
const { deleteDocumento } = useDocumentos({ carpetaId });

const handleDelete = async (id: string) => {
  // UI se actualiza instantáneamente
  // Rollback automático si falla
  await deleteDocumento(id);
};
```

### Patrón 2: Revalidación Después de Operaciones

```tsx
// ❌ ANTES
const handleUpload = async (files: File[]) => {
  await uploadFiles(files);
  router.refresh(); // Recarga toda la página
};

// ✅ AHORA
const { mutate } = useSWRConfig();

const handleUpload = async (files: File[]) => {
  await uploadFiles(files);
  // Revalida solo los datos necesarios
  await mutate(`/api/documentos?carpetaId=${carpetaId}`);
  await mutate('/api/carpetas');
};
```

### Patrón 3: Compartir Estado Entre Componentes

```tsx
// Ambos componentes usan el mismo cache automáticamente
function ComponenteA() {
  const { documentos } = useDocumentos({ carpetaId: '123' });
  // ...
}

function ComponenteB() {
  const { documentos } = useDocumentos({ carpetaId: '123' });
  // Mismo cache que ComponenteA, sin duplicar request
}
```

---

## 🚫 Migración: Eliminación de `router.refresh()`

### Archivos Refactorizados

- [document-upload-area.tsx](../../components/shared/document-upload-area.tsx) - Revalidación automática tras upload
- [carpeta-detail-client.tsx (HR)](../../app/(dashboard)/hr/documentos/[id]/carpeta-detail-client.tsx) - Operaciones CRUD reactivas
- [carpeta-detail-client.tsx (Empleado)](../../app/(dashboard)/empleado/mi-espacio/documentos/[id]/carpeta-detail-client.tsx) - Upload reactivo
- [subir-documentos-modal.tsx](../../components/hr/subir-documentos-modal.tsx) - Creación de carpetas reactiva
- [crear-carpeta-con-documentos-modal.tsx](../../components/hr/crear-carpeta-con-documentos-modal.tsx) - Creación con revalidación

### Impacto

- **Eliminado**: ~10 llamadas manuales a `router.refresh()`
- **Agregado**: Revalidación automática con SWR
- **Resultado**: UI reactiva sin recargas de página

---

## 📊 Beneficios

| Antes | Ahora |
|-------|-------|
| ❌ `router.refresh()` manual en cada operación | ✅ Revalidación automática |
| ❌ Recarga completa de página | ✅ Actualizaciones parciales optimizadas |
| ❌ Sin feedback inmediato al usuario | ✅ Optimistic updates instantáneos |
| ❌ Cache duplicado entre componentes | ✅ Cache compartido inteligente |
| ❌ Difícil rastrear qué se actualiza | ✅ Sistema centralizado y predecible |

---

## 🎓 Mejores Prácticas

1. **Usar hooks en lugar de fetch manual**
   ```tsx
   // ✅ Usar hook
   const { documentos } = useDocumentos({ carpetaId });

   // ❌ No hacer fetch manual
   const [documentos, setDocumentos] = useState([]);
   useEffect(() => {
     fetch('/api/documentos').then(/* ... */);
   }, []);
   ```

2. **Revalidar después de mutaciones**
   ```tsx
   const { mutate } = useSWRConfig();

   await crearDocumento(data);
   await mutate('/api/documentos'); // ✅ Revalidar
   ```

3. **Usar optimistic updates para UX instantánea**
   ```tsx
   // ✅ El hook maneja todo automáticamente
   await deleteDocumento(id);
   ```

4. **Compartir estado entre componentes**
   ```tsx
   // ✅ Ambos componentes comparten el mismo cache
   useDocumentos({ carpetaId: 'abc' }); // Componente A
   useDocumentos({ carpetaId: 'abc' }); // Componente B
   ```

---

## 📝 Notas de Migración

Si tienes componentes antiguos que usan `router.refresh()`:

1. Importa `useSWRConfig` o el hook correspondiente
2. Reemplaza `router.refresh()` con `mutate('/api/...')`
3. Considera usar los métodos CRUD del hook para optimistic updates
4. Elimina estados locales redundantes si el hook ya los provee

---

## 🐛 Troubleshooting

**Datos no se actualizan:**
- Verifica que la key de mutate coincida: `mutate('/api/documentos?carpetaId=123')`
- Revisa errores en consola del navegador

**Performance issues:**
- Los hooks ya usan `useMemo` y `useCallback` optimizados
- SWR deduplica requests automáticamente (2s)

---

## 📚 Referencias

- [API Documentos](../api/reference/documentos.md) - Endpoints y permisos
- [SWR Documentation](https://swr.vercel.app/) - Documentación oficial
