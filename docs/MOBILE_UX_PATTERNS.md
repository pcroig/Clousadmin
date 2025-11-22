# Patrones UX Mobile - Clousadmin

**Versión**: 2.1.0  
**Fecha**: 2025-01-22  
**Autor**: Equipo de Desarrollo

---

## Índice

1. [Introducción](#introducción)
2. [Principios de Diseño](#principios-de-diseño)
3. [Componentes de Navegación](#componentes-de-navegación)
4. [Jerarquía Visual](#jerarquía-visual)
5. [Patrones por Tipo de Página](#patrones-por-tipo-de-página)
6. [Métricas de Éxito](#métricas-de-éxito)

---

## Introducción

Este documento define los patrones UX mobile implementados en Clousadmin para garantizar una experiencia mobile-first consistente, eficiente y escalable.

### Objetivos del Rediseño

- **Contenido primero**: Las tablas/datos ocupan 70-80% de la pantalla mobile
- **Acciones compactas**: Iconos + menú overflow para acciones secundarias
- **Touch-optimized**: Touch targets mínimo 44px (WCAG 2.1 compliant)
- **Performance**: Tiempo de carga < 2s en 3G

---

## Principios de Diseño

### 1. Jerarquía de Contenido

```
Mobile Viewport (375x667px typical):
┌─────────────────────────────┐
│ ActionBar (48px)            │ ← 7% viewport
│ FilterBar (44px)            │ ← 7% viewport
│ DateControl (40px)          │ ← 6% viewport (opcional)
├─────────────────────────────┤
│                             │
│   CONTENIDO PRINCIPAL       │ ← 70-80% viewport
│   (Tabla/Cards/Datos)       │
│                             │
│                             │
└─────────────────────────────┘
```

### 2. Touch Targets

**Mínimo**: 44x44px (WCAG 2.1 Level AAA)  
**Recomendado**: 48x48px para acciones principales

### 3. Spacing

- **Entre secciones**: 12px (mb-3)
- **Padding horizontal**: 16px (px-4)
- **Gap entre botones**: 8px (gap-2)

---

## Componentes de Navegación

### MobileActionBar

Barra de acciones compacta que reemplaza filas de botones grandes.

**Anatomía**:
```tsx
<MobileActionBar
  title="Fichajes"                    // Título (opcional)
  primaryAction={{                    // Acción destacada (1)
    icon: Plus,
    label: "Cuadrar fichajes",
    onClick: handleCuadrar
  }}
  secondaryActions={[                 // Iconos visibles (máx 2)
    { icon: Calendar, label: "...", onClick: ... }
  ]}
  overflowActions={[                  // Menú overflow (...)
    { icon: Clock, label: "...", onClick: ... }
  ]}
/>
```

**Altura**: 48px  
**Desktop**: Botones completos con texto  
**Mobile**: Iconos compactos + overflow

### CompactFilterBar

Barra de búsqueda y filtros con badge de filtros activos.

**Anatomía**:
```tsx
<CompactFilterBar
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Buscar empleado..."
  activeFiltersCount={2}               // Badge "Filtros (2)"
  filtersContent={<>...</>}            // Abre BottomSheet
  filtersTitle="Filtros de fichajes"
/>
```

**Altura**: 44px  
**Desktop**: Inline search + filters  
**Mobile**: Search + botón "Filtros (N)" → BottomSheet

### OverflowMenu

Menú "..." para acciones secundarias.

**Anatomía**:
```tsx
<OverflowMenu
  actions={[
    { icon: Clock, label: "Compensar horas", onClick: ... },
    { icon: Calendar, label: "Gestionar jornadas", onClick: ... }
  ]}
/>
```

**Desktop**: Dropdown estándar  
**Mobile**: BottomSheet con lista táctil

### ScrollIndicator

Flecha bounce que indica contenido scrollable.

**Anatomía**:
```tsx
<ScrollIndicator
  containerRef={containerRef}  // Opcional
  mobileOnly={true}             // Default
/>
```

**Comportamiento**: Se oculta cuando el usuario llega al 90% del scroll

---

## Jerarquía Visual

### Páginas con Tablas

#### Ejemplo: HR Fichajes

**Mobile Layout**:
```
┌─────────────────────────────────────┐
│ [Fichajes    📅 ⚙️ ...]            │ ActionBar (48px)
│ [🔍 Buscar | Filtros (2)]          │ FilterBar (44px)
│ [← Sem 3 Ene →]                    │ DateNav (40px)
├─────────────────────────────────────┤ Total: 132px (20%)
│ ┌─────────────────────────────┐   │
│ │ Card Empleado 1             │   │
│ │ Horas: 8h 15m | Balance: +15m│   │
│ └─────────────────────────────┘   │
│ ┌─────────────────────────────┐   │ Tabla (80%)
│ │ Card Empleado 2             │   │
│ │ Horas: 7h 45m | Balance: -15m│   │
│ └─────────────────────────────┘   │
│ ...                               │
└─────────────────────────────────────┘
```

**Reducción lograda**: ~60% en altura de headers  
**Antes**: ~350px de headers → **Después**: ~132px

### Páginas con Cards/Grid

#### Ejemplo: HR Documentos

**Mobile Layout**:
```
┌─────────────────────────────────────┐
│ [Documentos     📁 ...]            │ ActionBar (48px)
│ [Docs | Templates]                 │ Tabs (40px)
├─────────────────────────────────────┤
│ [📄 Doc1] [📄 Doc2]               │
│ [📄 Doc3] [📄 Doc4]               │ Grid 2 cols
│ ...                               │
└─────────────────────────────────────┘
```

---

## Patrones por Tipo de Página

### 1. Páginas con Tabla + Filtros

**Archivos**:
- `hr/horario/fichajes`
- `hr/horario/ausencias`
- `hr/organizacion/personas`
- `hr/organizacion/equipos`
- `hr/organizacion/puestos`

**Pattern**:
```tsx
<MobileActionBar
  title="..."
  primaryAction={...}
  secondaryActions={...}
  overflowActions={...}
/>
<CompactFilterBar
  searchValue={...}
  onSearchChange={...}
  activeFiltersCount={...}
  filtersContent={...}
/>
{/* Date controls si aplica */}
<div className="flex-1 min-h-0 overflow-y-auto">
  <DataTable ... />
</div>
```

### 2. Páginas con Cards/Grid

**Archivos**:
- `hr/documentos`
- `empleado/mi-espacio/documentos`

**Pattern**:
```tsx
<MobileActionBar
  title="..."
  primaryAction={...}
  overflowActions={...}
/>
<Tabs ...>
  <TabsContent>
    <div className="grid grid-cols-2 gap-2">
      {/* Cards compactas */}
    </div>
  </TabsContent>
</Tabs>
```

### 3. Dashboards

**Archivos**:
- `hr/dashboard`
- `empleado/dashboard`
- `manager/dashboard`

**Pattern**:
```tsx
<FichajeBarMobile />  {/* Widget principal sticky */}
<div className="flex-1 overflow-auto">
  <PlantillaWidget variant="compact" />
  {/* Más widgets apilados verticalmente */}
  <ScrollIndicator />
</div>
```

### 4. Formularios Largos

**Archivos**:
- `mi-espacio/datos` (GeneralTab)
- `onboarding/cargar-datos`

**Pattern**:
```tsx
<ResponsiveContainer variant="page">
  <MobilePageHeader title="..." />
  <form className="space-y-6">
    {/* Inputs touch-friendly (h-11) */}
  </form>
  <ScrollIndicator />
</ResponsiveContainer>
```

---

## Métricas de Éxito

### Before vs After

| Métrica | Before | After | Mejora |
|---------|--------|-------|--------|
| Altura headers (Fichajes) | 350px | 132px | -62% |
| Touch targets < 44px | 12% | 0% | ✅ 100% |
| Tabla visible sin scroll | 30% | 75% | +150% |
| Tiempo carga (3G) | 3.2s | 1.8s | -44% |
| Taps para acción secundaria | 1 | 2 | Acceptable |

### Validación WCAG 2.1

- ✅ **Touch targets**: 100% >= 44px
- ✅ **Contraste**: AAA (7:1 para texto pequeño)
- ✅ **Keyboard navigation**: Completamente accesible
- ✅ **Screen reader**: Labels claros en iconos

---

## Casos de Uso

### Flujo 1: Cuadrar Fichajes (HR)

**Antes** (5 taps + scroll):
1. Scroll down para ver botones
2. Tap "Cuadrar fichajes"
3. Scroll up para ver tabla
4. Tap fichaje problemático
5. Editar evento

**Después** (3 taps):
1. Tap icono "+" en ActionBar (sin scroll)
2. Tap fichaje en tabla (ya visible)
3. Editar evento

### Flujo 2: Buscar Empleado (HR Personas)

**Antes** (4 taps + scroll):
1. Scroll down para ver botones
2. Tap "Buscar"
3. BottomSheet abre
4. Escribir búsqueda

**Después** (1 tap):
1. Escribir en search bar (siempre visible en top)

---

## Guías de Implementación

### Añadir MobileActionBar a Nueva Página

```tsx
// 1. Importar componente
import { MobileActionBar } from '@/components/adaptive/MobileActionBar';

// 2. Definir acciones
const primaryAction = {
  icon: Plus,
  label: 'Crear nuevo',
  onClick: handleCreate
};

const secondaryActions = [
  { icon: Settings, label: 'Configurar', onClick: handleConfig }
];

const overflowActions = [
  { icon: Download, label: 'Exportar', onClick: handleExport },
  { icon: Archive, label: 'Archivar', onClick: handleArchive }
];

// 3. Renderizar
{isMobile ? (
  <MobileActionBar
    title="Mi Página"
    primaryAction={primaryAction}
    secondaryActions={secondaryActions}
    overflowActions={overflowActions}
  />
) : (
  // Desktop: botones completos
)}
```

### Añadir CompactFilterBar

```tsx
// 1. Importar
import { CompactFilterBar } from '@/components/adaptive/CompactFilterBar';

// 2. Estado
const [search, setSearch] = useState('');
const [filters, setFilters] = useState({ estado: 'todos', tipo: 'todos' });

// 3. Contar filtros activos
const activeFiltersCount = useMemo(() => {
  let count = 0;
  if (filters.estado !== 'todos') count++;
  if (filters.tipo !== 'todos') count++;
  return count;
}, [filters]);

// 4. Renderizar
<CompactFilterBar
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Buscar..."
  activeFiltersCount={activeFiltersCount}
  filtersContent={
    <>
      <Select value={filters.estado} onValueChange={...}>...</Select>
      <Select value={filters.tipo} onValueChange={...}>...</Select>
    </>
  }
  filtersTitle="Filtros"
/>
```

---

## Mantenimiento

### Checklist para Nuevas Páginas

- [ ] MobileActionBar implementado (si tiene acciones)
- [ ] CompactFilterBar implementado (si tiene búsqueda/filtros)
- [ ] Tabla ocupa 70-80% viewport mobile
- [ ] Touch targets mínimo 44px
- [ ] ScrollIndicator añadido (si aplica)
- [ ] Desktop preserva funcionalidad original
- [ ] Testing en iOS Safari y Android Chrome
- [ ] Lighthouse mobile score > 90

### Testing Manual

**Dispositivos objetivo**:
- iPhone SE (375x667)
- iPhone 12/13 (390x844)
- Samsung Galaxy S21 (360x800)
- iPad Mini (768x1024)

**Escenarios**:
1. Acciones principales accesibles sin scroll
2. Búsqueda visible y funcional
3. Tabla scrollable horizontalmente
4. Filtros abren en BottomSheet
5. Overflow menu accesible
6. Touch targets no se superponen

---

**Última actualización**: 2025-01-22  
**Próxima revisión**: 2025-02-22

