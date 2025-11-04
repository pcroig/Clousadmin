# Clousadmin - Patrones de Diseño Unificados

Este documento define los patrones de diseño consistentes para toda la aplicación.

## 🎯 Principios de Diseño

1. **Consistencia**: Todos los componentes similares deben verse y comportarse igual
2. **Escalabilidad**: Componentes deben ser reutilizables sin duplicación
3. **Mantenibilidad**: Cambios en un patrón se aplican automáticamente en todos los lugares
4. **Accesibilidad**: Cumplir con WCAG AA como mínimo

---

## 📦 Patrones de Componentes

### 1. Widgets del Dashboard

**Componente Base**: `components/shared/widget-card.tsx`

Todos los widgets deben usar `WidgetCard` como contenedor base:

```tsx
import { WidgetCard } from '@/components/shared/widget-card';

<WidgetCard
  title="Título del Widget"
  href="/ruta-de-navegacion"
  height="h-[280px]" // o "h-[580px]" para widgets dobles
  titleIcon={<Icon />} // opcional
  badge={count} // opcional
  contentClassName="pb-4 overflow-y-auto" // personalizar contenido
>
  {/* Contenido del widget */}
</WidgetCard>
```

**Variantes de Altura**:
- `h-[280px]` - Widget normal (1 fila)
- `h-[580px]` - Widget doble (2 filas)

**Widgets Implementados**:
- ✅ `FichajeWidget` - Estados de fichaje
- ✅ `NotificacionesWidget` - Lista de notificaciones
- ✅ `AusenciasWidget` - Balance y ausencias
- ✅ `SolicitudesWidget` - Solicitudes pendientes
- ✅ `AutoCompletadoWidget` - Stats de auto-completado
- ✅ `PlantillaWidget` - Estadísticas de plantilla

---

### 2. Tablas de Datos

**Componente Base**: `components/shared/data-table.tsx`

Todas las tablas de datos usan `DataTable`:

```tsx
import { DataTable, Column, AvatarCell } from '@/components/shared/data-table';

const columns: Column<DataType>[] = [
  {
    id: 'nombre',
    header: 'Nombre',
    cell: (row) => <AvatarCell nombre={row.nombre} avatar={row.avatar} />,
    width: '25%',
  },
];

<DataTable
  columns={columns}
  data={data}
  onRowClick={(row) => handleClick(row)}
  getRowId={(row) => row.id}
  emptyMessage="No hay datos disponibles"
/>
```

**Componentes Auxiliares**:
- `TableHeader` - Título, tabs, botones de acción
- `TableFilters` - Filtros y navegación de fechas

---

### 3. Botones

**Componente**: `components/ui/button.tsx` (shadcn/ui)

Todos los botones usan el componente `Button` con variantes estándar:

```tsx
import { Button } from '@/components/ui/button';

// Botón Principal (Dark) - Acciones principales
<Button>Guardar</Button>

// Botón Outline (Secundario) - Acciones secundarias sin fondo
<Button variant="outline">Cancelar</Button>

// Botón Destructive (Rojo) - Acciones destructivas
<Button variant="destructive">Eliminar</Button>

// Botón Ghost - Minimalista transparente
<Button variant="ghost">Ver más</Button>

// Botón Link - Estilo link
<Button variant="link">Ir a...</Button>
```

**Variantes Disponibles**:
- `default` - Principal (gris oscuro)
- `outline` - Secundario con borde
- `destructive` - Acción destructiva (rojo)
- `ghost` - Transparente con hover
- `secondary` - Transparente
- `link` - Estilo link

**Tamaños**:
- `default` - 36px altura (8px border-radius)
- `sm` - 32px altura
- `lg` - 40px altura (10px border-radius)
- `icon`, `icon-sm`, `icon-lg` - Botones solo icono

**Animaciones**:
- **Principales**: Lift en hover (`-translate-y-0.5` + `shadow-md`)
- **Secundarios**: Solo cambio de borde y fondo (sin lift)
- **Active**: Reset de posición para botones principales
- **Transición**: `transition-all`

**Principios**:
1. Botones principales: Gris oscuro, animación lift, 8px border-radius
2. Botones secundarios: Sin fondo, borde gris, sin animación lift
3. Destructive: Rojo con animación lift
4. NO usar naranja en botones principales
5. NO usar azul/amarillo en botones estándar

---

### 4. Badges de Estado

**Componente**: `components/ui/badge.tsx` (shadcn/ui)

Todos los badges usan el componente `Badge` con variantes:

```tsx
import { Badge } from '@/components/ui/badge';

// Estado de éxito
<Badge variant="success">Aprobada</Badge>

// Estado de error
<Badge variant="destructive">Rechazada</Badge>

// Estado de advertencia
<Badge variant="warning">Pendiente</Badge>

// Estado de información
<Badge variant="info">Info</Badge>

// Estado secundario
<Badge variant="secondary">Secundario</Badge>

// Estado por defecto (accent)
<Badge>Default</Badge>
```

**Variantes Disponibles**:
- `default` - Accent color (primary)
- `secondary` - Secundario
- `destructive` - Error/Rojo
- `success` - Éxito/Verde
- `warning` - Advertencia/Naranja
- `info` - Información/Azul
- `outline` - Borde solo

---

### 5. Cards y Contenedores

**Componente**: `components/ui/card.tsx` (shadcn/ui)

Sistema unificado de Cards con spacing consistente:

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Título de la Card</CardTitle>
    <CardDescription>Descripción opcional</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Contenido principal */}
  </CardContent>
  <CardFooter>
    {/* Acciones opcionales */}
  </CardFooter>
</Card>
```

**Spacing Estándar** (definido en el componente base):
- `CardHeader`: `px-6 pt-6 pb-3`
- `CardContent`: `px-6 pb-6`
- `CardFooter`: `px-6 [.border-t]:pt-6`

**Principios**:
1. ✅ Usar componentes base (`Card`, `CardHeader`, `CardContent`, etc.)
2. ❌ NO sobrescribir padding con `className` personalizadas
3. ✅ Usar los valores por defecto para consistencia
4. ✅ Para ajustes específicos, usar `headerClassName`, `contentClassName`, etc. en componentes wrapper

**Cards Especializadas**:
- `WidgetCard` - Para widgets del dashboard (usa `Card` internamente)
- `KpiCard` - Para métricas simples (usa `Card` con `p-6` directo)

**Ajustes Comunes**:
- Para eliminar padding de un lado: usar `!pb-0` solo cuando sea necesario
- Para cards compactas: usar `CardHeader` sin padding personalizado (el por defecto es correcto)

---

### 6. Modales y Paneles

#### Modales de Acción (Dialog)

Para formularios, confirmaciones, inputs:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Título del Modal</DialogTitle>
    </DialogHeader>
    
    {/* Contenido */}
    
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancelar</Button>
      <Button onClick={onSubmit}>Guardar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Paneles de Detalles (DetailsPanel)

Para mostrar detalles de objetos (equipos, personas, puestos):

```tsx
import { DetailsPanel } from '@/components/shared/details-panel';

<DetailsPanel
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Detalles del Objeto"
>
  {/* Contenido del panel */}
</DetailsPanel>
```

**Diferencias**:
- **Dialog**: Centro de pantalla, para acciones
- **DetailsPanel**: Slide-over desde la derecha, para leer detalles

---

## 🎨 Patrones de Estilo

Para especificaciones completas de colores, tipografía, espaciado y tokens CSS, ver **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)**.

### Tipografía

**Tamaños Estándar**:
- `text-[30px]` - Títulos de página (h1)
- `text-[24px]` - Títulos grandes
- `text-[20px]` - Títulos de sección (h2)
- `text-[16px]` - Texto normal (body)
- `text-[14px]` - Texto pequeño
- `text-[13px]` - Texto de widgets
- `text-[12px]` - Captions
- `text-[11px]` - Labels muy pequeños

**Pesos**:
- `font-bold` - Títulos importantes
- `font-semibold` - Subtítulos
- `font-medium` - Enfasis
- `font-normal` - Texto normal

---

### Colores

**Siempre usar tokens del design system**:

```tsx
// ❌ MAL - Hardcoded
className="bg-gray-900 text-gray-500"

// ✅ BIEN - Design tokens
className="bg-text-primary text-text-secondary"
```

**Tokens Principales**:
- `text-primary` / `text-secondary` / `text-disabled`
- `bg-surface` / `bg-surface-secondary`
- `border-border` / `border-input`
- `accent`, `success`, `error`, `warning`, `info`

---

### Espaciado

**Sistema de múltiplos de 8px**:
- `gap-2` (8px) - Entre elementos pequeños
- `gap-3` (12px) - Entre elementos medianos
- `gap-4` (16px) - Dentro de cards
- `gap-6` (24px) - Entre cards/widgets
- `p-4` / `px-6` (16px / 24px) - Padding interno

---

## 🔄 Patrones de Layout

### Dashboard Grid

**Layout estándar 3x2**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-rows-2 gap-6">
  {/* Widget normal - 1 fila */}
  <div className="min-h-0">
    <Widget />
  </div>
  
  {/* Widget doble - 2 filas */}
  <div className="row-span-2 min-h-0">
    <Widget height="h-[580px]" />
  </div>
</div>
```

---

### Páginas con Tabla

**Estructura estándar**:
```tsx
<div className="h-full w-full flex flex-col">
  {/* Header */}
  <TableHeader
    title="Título"
    actionButton={{ label: '+ Crear', onClick: handleCreate }}
  />
  
  {/* Filtros */}
  <TableFilters
    showDateNavigation={true}
    onFilterClick={handleFilter}
  />
  
  {/* Tabla */}
  <div className="flex-1 min-h-0">
    <DataTable {...tableProps} />
  </div>
  
  {/* Panel de detalles (opcional) */}
  <DetailsPanel
    isOpen={!!selectedItem}
    onClose={() => setSelectedItem(null)}
    title="Detalles"
  >
    {/* Contenido */}
  </DetailsPanel>
</div>
```

---

## ✅ Checklist de Consistencia

Al crear un nuevo componente, verificar:

- [ ] ¿Usa el componente base correcto? (WidgetCard, DataTable, etc.)
- [ ] ¿Los badges usan el componente Badge?
- [ ] ¿Los colores usan tokens del design system?
- [ ] ¿El espaciado sigue el sistema de 8px?
- [ ] ¿Los tamaños de texto son consistentes?
- [ ] ¿La accesibilidad está implementada? (aria-labels, keyboard navigation)
- [ ] ¿El responsive funciona correctamente?

---

## 📝 Ejemplos Completos

Ver implementaciones de referencia en:

- **Dashboard**: `app/(dashboard)/hr/dashboard/page.tsx`
- **Tabla**: `app/(dashboard)/hr/organizacion/puestos/puestos-client.tsx`
- **Widget**: `components/shared/fichaje-widget.tsx`
- **Modal**: `components/empleado/solicitar-ausencia-modal.tsx`

---

**Versión**: 1.1.0  
**Última actualización**: 2025-01-27  
**Estado**: ✅ Implementado y en uso

## 📝 Changelog

### v1.1.0 (2025-01-27)
- ✅ Unificación completa de botones
- ✅ Eliminación de variantes azul/amarillo de botones principales
- ✅ Cambio de botones naranjas a gris oscuro
- ✅ Animaciones diferenciadas: lift en principales, sutil en secundarios
- ✅ Border-radius consistente (8px default, 10px lg)
- ✅ Corrección de botones faltantes (cuadrar fichajes, subir documentos)
- ✅ Documentación de sistema de botones

### v1.0.0 (2025-01-27)
- ✅ Implementación inicial de patrones de diseño
- ✅ Widgets, tablas, badges, modales

