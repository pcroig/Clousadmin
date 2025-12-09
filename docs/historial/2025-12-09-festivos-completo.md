# Sistema de Festivos - Implementación Completa

**Fecha**: 9 Diciembre 2025
**Versión**: 2.1
**Estado**: ✅ Completado y Operativo

---

## 📋 Resumen Ejecutivo

Este documento consolida toda la información sobre el sistema de festivos, incluyendo:
- ✅ Gestión de festivos por año
- ✅ Modal unificado de importación
- ✅ Sincronización automática entre componentes
- ✅ Unificación onboarding y gestión HR

---

## 🎯 Problema Inicial y Solución

### Problema Identificado

**Situación**: Los festivos se importaban para múltiples años (2025, 2026, 2027) pero no había forma clara de gestionarlos por año. El toggle activo/inactivo era global por fecha, lo que causaba confusión.

**Ejemplo del problema**:
- Usuario desactiva "Año Nuevo 2025" → Solo 2025-01-01 se desactiva
- "Año Nuevo 2026" (2026-01-01) seguía activo
- No había forma visual de ver qué año se estaba gestionando
- No había proceso claro para importar festivos de años futuros

### Solución Implementada

**Opción 1 (Recomendada)**: Filtro de año con gestión independiente

1. **Selector de año** integrado en tabla
2. **Modal unificado** de importación con dos opciones
3. **Alertas** cuando faltan festivos
4. **Sincronización** total entre onboarding y gestión HR

---

## 🏗️ Arquitectura Implementada

### 1. Hook Centralizado de Sincronización

**Archivo**: `lib/hooks/use-festivos.ts`

**Funcionalidad**:
```typescript
export function useFestivos(options?: UseFestivosOptions): UseFestivosReturn {
  // Polling cada 60 segundos
  // Event listeners para window.dispatchEvent
  // localStorage sync para cross-tab
  // Combina festivos de empresa + personalizados del empleado
}

export function notifyFestivosUpdated(): void {
  // Notifica a todos los componentes que usan useFestivos
  window.dispatchEvent(new CustomEvent('festivos:updated'));
  localStorage.setItem('festivos:lastUpdate', Date.now().toString());
}
```

**Beneficios**:
- 📡 Sincronización automática cada 60 segundos
- 🔄 Actualización inmediata vía events
- 🌐 Sincronización cross-tab vía localStorage
- 🧹 Eliminación de ~35 líneas de código duplicado por componente

**Uso**:
```typescript
// En cualquier componente
const { festivos, loading, refetch } = useFestivos({
  empleadoId: 'opcional', // Para incluir festivos personalizados
  revalidateInterval: 60000, // Opcional (default 60s)
});

// Después de crear/editar/eliminar festivo
notifyFestivosUpdated();
```

---

### 2. Componente de Lista con Gestión por Año

**Archivo**: `components/hr/lista-festivos.tsx`

**Cambios principales**:

#### Eliminaciones ❌
- Botón standalone "Importar {año}"
- Badges de resumen (totales, nacionales, activos)
- Selector de año del header superior

#### Adiciones ✅
- **Selector de año en TableHead "Fecha"**:
  ```tsx
  <TableHead className="w-[140px]">
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500">Año:</span>
      <Select
        value={añoSeleccionado.toString()}
        onValueChange={(value) => setAñoSeleccionado(parseInt(value))}
      >
        <SelectTrigger className="h-7 w-[90px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {añosDisponibles.map((año) => (
            <SelectItem key={año} value={año.toString()}>
              {año}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </TableHead>
  ```

- **Visualización tipo calendario**:
  ```tsx
  <FechaCalendar date={parseFechaString(festivo.fecha)} className="scale-75" />
  ```

- **Alerta de festivos faltantes**:
  ```tsx
  {faltanFestivos && (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
      <p>Solo {festivosNacionales.length} festivos nacionales para {añoSeleccionado}</p>
      <button onClick={() => onImportRequest(añoSeleccionado)}>
        Importar festivos nacionales
      </button>
    </div>
  )}
  ```

- **Función de limpieza**:
  ```typescript
  function handleCancelar() {
    setFormFecha('');
    setFormNombre('');
    setFormActivo(true);
    onEditorClose();
  }
  ```

- **Prop de callback**:
  ```typescript
  interface ListaFestivosProps {
    // ... otros props
    onImportRequest?: (año?: number) => void; // Nuevo
  }
  ```

---

### 3. Modal Unificado de Importación

**Archivo**: `components/hr/importar-festivos-modal.tsx` (NUEVO)

**Características**:
- Modal con dos opciones claramente diferenciadas
- Navegación con botón "Atrás"
- Preview de archivos
- Lista detallada de festivos nacionales

**Estructura**:
```typescript
interface ImportarFestivosModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  añoSeleccionado?: number;
}

type ImportMode = 'archivo' | 'nacionales' | null;
```

**Flujo de UI**:
1. **Vista inicial**: Dos cards clickeables
   - "Desde archivo" (icono FileUp)
   - "Festivos nacionales" (icono CalendarRange)

2. **Modo archivo**:
   - Input de archivo (.ics/.csv)
   - Preview: nombre y tamaño
   - Botón "Importar archivo"

3. **Modo nacionales**:
   - Info box azul con lista de 10 festivos
   - Año seleccionado destacado
   - Nota sobre duplicados
   - Confirmación antes de importar
   - Botón "Importar festivos"

**Implementación**:
```typescript
const handleImportarNacionales = async () => {
  if (!confirm(`¿Importar festivos nacionales de España para el año ${año}?`)) {
    return;
  }

  const response = await fetch(
    `/api/festivos/importar-nacionales?añoInicio=${año}&añoFin=${año}`,
    { method: 'POST' }
  );

  if (response.ok) {
    toast.success(`Festivos importados: ${data.importados} nuevos`);
    onSuccess();
    handleClose();
  }
};
```

---

### 4. Integración en Componentes Padre

#### gestionar-ausencias-modal.tsx

**Cambios**:
```typescript
// Estado
const [importarModalOpen, setImportarModalOpen] = useState(false);
const [añoSeleccionadoImportar, setAñoSeleccionadoImportar] = useState<number>();

// Handler
const handleOpenImportarModal = (año?: number) => {
  setAñoSeleccionadoImportar(año);
  setImportarModalOpen(true);
};

// Botón
<Button onClick={() => handleOpenImportarModal()}>Importar</Button>

// Prop a ListaFestivos
<ListaFestivos
  onImportRequest={(año) => handleOpenImportarModal(año)}
  // ... otros props
/>

// Modal
<ImportarFestivosModal
  open={importarModalOpen}
  onClose={() => setImportarModalOpen(false)}
  onSuccess={handleImportSuccess}
  añoSeleccionado={añoSeleccionadoImportar}
/>
```

**Eliminaciones**:
- ❌ Estado `processingFestivos`
- ❌ Ref `fileInputRef`
- ❌ Función `handleArchivoFestivosChange`
- ❌ Input file oculto

**Resultado**: ~40 líneas de código eliminadas

#### calendario-step.tsx (Onboarding)

**Mismos cambios** que gestionar-ausencias-modal.tsx

**Adición extra**:
```typescript
// Importación automática al montar
useEffect(() => {
  let importado = false;
  async function ensureFestivosNacionales() {
    if (importado) return;
    importado = true;
    await fetch('/api/festivos/importar-nacionales', { method: 'POST' });
  }
  void ensureFestivosNacionales();
}, []);
```

**Resultado**: ~40 líneas de código eliminadas, sincronización total con HR Admin

---

## 📊 Resumen de Cambios

### Archivos Nuevos (1)
- `components/hr/importar-festivos-modal.tsx` (252 líneas)
- `lib/hooks/use-festivos.ts` (ya existía, documentado ahora)

### Archivos Modificados (3)
1. **components/hr/lista-festivos.tsx**
   - Selector de año en TableHead
   - Eliminación de badges
   - Alerta de festivos faltantes
   - Limpieza de formulario
   - Prop `onImportRequest`

2. **app/(dashboard)/hr/horario/ausencias/gestionar-ausencias-modal.tsx**
   - Modal unificado integrado
   - Eliminación de código duplicado (~40 líneas)
   - Handler para abrir modal con año

3. **components/onboarding/calendario-step.tsx**
   - Modal unificado integrado
   - Eliminación de código duplicado (~40 líneas)
   - Importación automática de festivos nacionales
   - Sincronización total con HR Admin

### Código Eliminado
- **~80 líneas** de código duplicado (gestionar-ausencias + onboarding)
- **~35 líneas** por componente que usa `useFestivos` en lugar de lógica manual

**Total eliminado**: ~115+ líneas de código duplicado

---

## 🎨 Mejoras de UX

### Antes
- ❌ No había forma de filtrar por año
- ❌ Botón "Importar" abría directamente input de archivo
- ❌ No había alerta de festivos faltantes
- ❌ Badges mostraban números sin contexto
- ❌ Selector de año en header (separado de la tabla)
- ❌ Formulario no se limpiaba al cancelar

### Después
- ✅ Selector de año integrado en columna "Fecha"
- ✅ Modal con 2 opciones claramente diferenciadas
- ✅ Alerta con link directo a importación
- ✅ Visualización tipo calendario para fechas
- ✅ Limpieza automática del formulario
- ✅ Preview de archivos antes de importar
- ✅ Lista detallada de festivos nacionales
- ✅ Sincronización automática entre todos los componentes

---

## 🔧 Mejoras Técnicas

### Hook Centralizado
- Polling automático (60s)
- Event-driven updates
- Cross-tab sync vía localStorage
- Combina festivos de empresa + personalizados

### Componentes Reutilizables
- `ImportarFestivosModal` usado en 2 lugares
- `ListaFestivos` con props flexibles
- `FechaCalendar` para visualización consistente

### Eliminación de Duplicación
- Un solo modal de importación
- Código compartido entre onboarding y HR Admin
- Lógica de festivos centralizada en hook

### API Preparada
- `GET /api/festivos?año={año}` ya existía
- `POST /api/festivos/importar-nacionales?añoInicio={año}&añoFin={año}` ya existía
- Solo fue necesario mejorar la UI

---

## 📚 Documentación Actualizada

### Archivos Actualizados
1. **docs/funcionalidades/festivos.md**
   - Sección de componentes actualizada
   - Nuevo componente `ImportarFestivosModal` documentado
   - Hook `useFestivos` documentado
   - Flujos de uso actualizados
   - Resumen de cambios v2.1

2. **docs/funcionalidades/onboarding-empresa.md**
   - Paso 4 completamente reescrito
   - Modal de importación documentado
   - Límites de fichaje documentados
   - Sincronización con HR Admin explicada

### Archivos de Historial Consolidados
Este documento (`2025-12-09-festivos-completo.md`) reemplaza:
- `2025-12-09-solucion-sincronizacion-festivos.md`
- `2025-12-09-gestion-festivos-por-año.md`
- `2025-12-09-unificacion-importar-festivos.md`
- `ANALISIS-GESTION-FESTIVOS-POR-AÑO.md` (movido a contexto)

---

## ✅ Testing Checklist

### Funcionalidad Básica
- [x] Selector de año filtra festivos correctamente
- [x] Alerta aparece cuando < 10 festivos nacionales
- [x] Link de alerta abre modal con año seleccionado
- [x] Botón "Importar" abre modal unificado
- [x] Modal muestra dos opciones claramente

### Importar desde Archivo
- [x] Seleccionar archivo muestra preview
- [x] Importar .ics funciona
- [x] Importar .csv funciona
- [x] Errores se muestran correctamente
- [x] Lista se actualiza después de importar

### Importar Festivos Nacionales
- [x] Modal muestra lista de 10 festivos
- [x] Año seleccionado se muestra correctamente
- [x] Confirmación aparece antes de importar
- [x] Festivos duplicados no se crean (upsert)
- [x] Mensaje de éxito muestra cantidad importada/omitida

### Sincronización
- [x] Cambios en festivos actualizan automáticamente todos los componentes
- [x] Cross-tab sync funciona (abrir en dos pestañas)
- [x] Polling actualiza lista cada 60s
- [x] Onboarding y HR Admin usan mismo modal

### Formulario de Crear
- [x] Cancelar limpia formulario
- [x] Guardar crea festivo
- [x] Fila inline aparece en tabla

---

## 🚀 Próximos Pasos (Opcional)

### Mejoras Futuras Sugeridas
1. **Importar múltiples años a la vez**
   - Checkbox "Importar para 2025, 2026, 2027"
   - Bulk import en un solo click

2. **Festivos regionales**
   - Selector de comunidad autónoma
   - Plantillas por región
   - Importación automática de festivos autonómicos

3. **Exportar festivos**
   - Exportar a .ics para usar en Google Calendar
   - Exportar a .csv para backup

4. **Gestión masiva**
   - Activar/desactivar todos los festivos de un año
   - Copiar festivos de un año a otro
   - Eliminar todos los festivos de un año

5. **Notificaciones**
   - Recordatorio cuando se acerca un festivo
   - Alerta cuando faltan festivos del año siguiente (noviembre/diciembre)

---

## 📖 Referencias

### Documentación Principal
- [Sistema de Festivos - Funcionalidad](../funcionalidades/festivos.md)
- [Onboarding de Empresa](../funcionalidades/onboarding-empresa.md)
- [Hooks Reutilizables](../HOOKS_REUTILIZABLES.md)

### Código Clave
- `lib/hooks/use-festivos.ts` - Hook de sincronización
- `components/hr/importar-festivos-modal.tsx` - Modal unificado
- `components/hr/lista-festivos.tsx` - Lista con gestión por año
- `lib/festivos/importar-nacionales.ts` - Lógica de importación

### API Endpoints
- `GET /api/festivos?año={año}&activo=true`
- `POST /api/festivos/importar-nacionales?añoInicio={año}&añoFin={año}`
- `POST /api/festivos` - Crear festivo
- `PATCH /api/festivos/[id]` - Editar festivo
- `DELETE /api/festivos/[id]` - Eliminar festivo

---

**Última actualización**: 9 Diciembre 2025
**Estado**: ✅ Sistema completo y operativo
**Versión**: 2.1
**Autor**: Clousadmin Dev Team
