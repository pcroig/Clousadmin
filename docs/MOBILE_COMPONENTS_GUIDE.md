# Guía de Componentes Mobile - Clousadmin

**Versión**: 1.0.0  
**Última actualización**: 2025-01-21

---

## 📋 Índice

1. [Sistema de Diseño Mobile](#sistema-de-diseño-mobile)
2. [Hooks Reutilizables](#hooks-reutilizables)
3. [Componentes Base Responsive](#componentes-base-responsive)
4. [Modales y Diálogos](#modales-y-diálogos)
5. [Tablas y Listas](#tablas-y-listas)
6. [Widgets de Dashboard](#widgets-de-dashboard)
7. [Patrones de Uso](#patrones-de-uso)
8. [Buenas Prácticas](#buenas-prácticas)

---

## Sistema de Diseño Mobile

### Constantes (`/lib/constants/mobile-design.ts`)

Todas las constantes de diseño mobile están centralizadas en este archivo.

#### Breakpoints

```typescript
export const BREAKPOINTS = {
  mobile: 640,    // < 640px
  tablet: 1024,   // 640px - 1024px
  desktop: 1280,  // >= 1024px
}
```

#### Texto

```typescript
MOBILE_DESIGN.text.pageTitle      // text-lg font-bold
MOBILE_DESIGN.text.widgetTitle    // text-sm font-semibold
MOBILE_DESIGN.text.display        // text-xl font-bold
MOBILE_DESIGN.text.body           // text-xs
MOBILE_DESIGN.text.caption        // text-[11px] text-gray-500
MOBILE_DESIGN.text.tiny           // text-[10px] text-gray-500
```

#### Botones (con touch targets mínimos de 44px)

```typescript
MOBILE_DESIGN.button.primary      // min-h-[44px] text-sm
MOBILE_DESIGN.button.secondary    // min-h-[40px] text-xs
MOBILE_DESIGN.button.compact      // min-h-[36px] text-[11px]
MOBILE_DESIGN.button.icon         // h-11 w-11 (44x44px touch target)
```

#### Espaciado

```typescript
MOBILE_DESIGN.spacing.page        // px-4 py-4
MOBILE_DESIGN.spacing.widget      // p-3
MOBILE_DESIGN.spacing.card        // p-2.5
MOBILE_DESIGN.spacing.gap         // gap-2
```

#### Componentes

```typescript
MOBILE_DESIGN.components.avatar.small   // h-6 w-6
MOBILE_DESIGN.components.avatar.medium  // h-8 w-8
MOBILE_DESIGN.components.badge.small    // text-[10px] px-1.5
MOBILE_DESIGN.components.icon.medium    // h-5 w-5
MOBILE_DESIGN.components.input.height   // min-h-[44px] (touch target)
```

---

## Hooks Reutilizables

### `useViewport` (desde ViewportContext)

Detecta el tamaño del viewport actual.

```typescript
import { useIsMobile, useIsTablet, useIsDesktop } from '@/lib/hooks/use-viewport';

function MyComponent() {
  const isMobile = useIsMobile();
  
  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
}
```

### `useBottomSheet`

Gestiona el estado y comportamiento de un bottom sheet con drag-to-close.

```typescript
import { useBottomSheet } from '@/lib/hooks/useBottomSheet';

function MyComponent() {
  const { isOpen, open, close, dragHandleProps } = useBottomSheet({
    dismissible: true,
    onClose: () => console.log('Closed'),
  });
  
  return (
    <>
      <button onClick={open}>Abrir</button>
      {isOpen && (
        <div className="bottom-sheet">
          <div {...dragHandleProps} className="drag-handle" />
          <button onClick={close}>Cerrar</button>
        </div>
      )}
    </>
  );
}
```

### `useTouchGestures`

Detecta gestos táctiles: swipe, long-press, tap.

```typescript
import { useTouchGestures } from '@/lib/hooks/useTouchGestures';

function MyComponent() {
  const { handlers } = useTouchGestures({
    onSwipe: ({ direction, distance }) => {
      if (direction === 'left') {
        // Acción para swipe izquierda
      }
    },
    onLongPress: () => {
      // Mostrar menú contextual
    },
  });
  
  return <div {...handlers}>Swipe me!</div>;
}
```

---

## Componentes Base Responsive

### ResponsiveContainer

Contenedor con padding adaptativo según viewport.

```typescript
import { ResponsiveContainer } from '@/components/adaptive/ResponsiveContainer';

// Contenedor de página
<ResponsiveContainer variant="page" maxWidth>
  <h1>Mi Página</h1>
</ResponsiveContainer>

// Widget compacto
<ResponsiveContainer variant="widget">
  <WidgetContent />
</ResponsiveContainer>
```

**Variantes**: `page`, `widget`, `card`, `compact`, `none`

### ResponsiveGrid

Grid que adapta columnas según breakpoint.

```typescript
import { ResponsiveGrid } from '@/components/adaptive/ResponsiveGrid';

// 3 columnas desktop, 2 tablet, 1 mobile
<ResponsiveGrid cols={3} tabletCols={2} mobileCols={1}>
  <Card />
  <Card />
  <Card />
</ResponsiveGrid>

// Grid para dashboards
<ResponsiveDashboardGrid>
  <Widget />
  <Widget />
  <Widget />
</ResponsiveDashboardGrid>
```

### MobilePageHeader

Header de página responsive.

```typescript
import { MobilePageHeader } from '@/components/adaptive/MobilePageHeader';

// Header simple
<MobilePageHeader title="Fichajes" />

// Header con saludo (solo desktop)
<MobilePageHeader 
  title="Dashboard"
  showGreeting
  userName="Sofia"
/>

// Header con botón volver
<MobilePageHeader 
  title="Editar Empleado"
  showBackButton
  actions={<Button>Guardar</Button>}
/>
```

---

## Modales y Diálogos

### ResponsiveDialog

Dialog que se adapta según complejidad y viewport.

```typescript
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';

// Bottom sheet en mobile (simple)
<ResponsiveDialog
  open={open}
  onOpenChange={setOpen}
  title="Confirmar acción"
  description="¿Estás seguro?"
  complexity="simple"
  footer={<Button>Confirmar</Button>}
>
  <p>Contenido</p>
</ResponsiveDialog>

// Full screen en mobile (complex)
<ResponsiveDialog
  open={open}
  onOpenChange={setOpen}
  title="Crear empleado"
  complexity="complex"
>
  <LongForm />
</ResponsiveDialog>
```

**Complejidades**:
- `simple`: Bottom sheet en mobile, dialog pequeño en desktop
- `medium`: Dialog centrado en ambos
- `complex`: Full screen en mobile, dialog grande en desktop

### Sheet (Bottom Sheet)

```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="bottom" showDragHandle>
    <SheetHeader>
      <SheetTitle>Título</SheetTitle>
    </SheetHeader>
    <div>Contenido</div>
  </SheetContent>
</Sheet>
```

**Sides**: `top`, `bottom`, `left`, `right`

---

## Tablas y Listas

### DataTable con Prioridades

```typescript
import { DataTable, type Column, type ColumnPriority } from '@/components/shared/data-table';

const columns: Column<Empleado>[] = [
  {
    id: 'nombre',
    header: 'Nombre',
    priority: 'high',    // Siempre visible
    sticky: true,        // Sticky en mobile
    cell: (row) => <AvatarCell nombre={row.nombre} avatar={row.avatar} />
  },
  {
    id: 'puesto',
    header: 'Puesto',
    priority: 'medium',  // Oculta en mobile, visible tablet+
    accessorKey: 'puesto',
  },
  {
    id: 'departamento',
    header: 'Departamento',
    priority: 'low',     // Solo desktop
    accessorKey: 'departamento',
  },
];

<DataTable
  columns={columns}
  data={empleados}
  onRowClick={(row) => handleClick(row)}
  compactMobile={true}
/>
```

**Prioridades de columnas**:
- `high`: Siempre visible (mobile + desktop)
- `medium`: Oculta en mobile (<640px), visible en tablet+ (>=640px)
- `low`: Solo desktop (>=1024px)

### AvatarCell Responsive

```typescript
import { AvatarCell } from '@/components/shared/data-table';

<AvatarCell 
  nombre="Sofia Roig"
  avatar="/avatar.jpg"
  subtitle="HR Manager"
  compact={true}
/>
```

---

## Widgets de Dashboard

### FichajeBarMobile

Barra horizontal compacta de fichaje para HR/Manager dashboard mobile.

```typescript
import { FichajeBarMobile } from '@/components/shared/fichaje-bar-mobile';

<FichajeBarMobile href="/hr/horario/fichajes" />
```

**Características**:
- Tiempo trabajado + botón en una línea
- Sin card, diseño minimalista
- Actualización en tiempo real

### PlantillaWidget

Widget de resumen de plantilla con variantes.

```typescript
import { PlantillaWidget } from '@/components/dashboard/plantilla-widget';

// Desktop: Con card
<PlantillaWidget
  trabajando={trabajando}
  ausentes={ausentes}
  sinFichar={sinFichar}
  rol="hr_admin"
  variant="card"
/>

// Mobile: Sin card, compacto
<PlantillaWidget
  trabajando={trabajando}
  ausentes={ausentes}
  sinFichar={sinFichar}
  variant="compact"
/>
```

---

## Patrones de Uso

### Dashboard Mobile vs Desktop

```typescript
export default function DashboardPage() {
  return (
    <>
      {/* Mobile Layout */}
      <div className="sm:hidden h-full w-full flex flex-col">
        <FichajeBarMobile />
        <PlantillaWidget variant="compact" />
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex h-full w-full flex-col">
        <h1>Buenos Días, {nombre}</h1>
        <ResponsiveDashboardGrid>
          <FichajeWidget />
          <SolicitudesWidget />
          <NotificacionesWidget />
        </ResponsiveDashboardGrid>
      </div>
    </>
  );
}
```

### Formulario Responsive

```typescript
function FormularioEmpleado() {
  const { isOpen, open, close } = useResponsiveDialog();
  
  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={close}
      title="Crear empleado"
      complexity="complex" // Full screen en mobile
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar</Button>
        </div>
      }
    >
      <form className="space-y-4">
        <Input placeholder="Nombre" className={MOBILE_DESIGN.components.input.height} />
        <Input placeholder="Email" className={MOBILE_DESIGN.components.input.height} />
        {/* Más campos... */}
      </form>
    </ResponsiveDialog>
  );
}
```

### Lista con Cards (Mobile) vs Tabla (Desktop)

```typescript
function ListaEmpleados() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <div className="space-y-2">
        {empleados.map(emp => (
          <Card key={emp.id} onClick={() => handleClick(emp)}>
            <AvatarCell nombre={emp.nombre} avatar={emp.avatar} />
          </Card>
        ))}
      </div>
    );
  }
  
  return <DataTable columns={columns} data={empleados} />;
}
```

---

## Buenas Prácticas

### 1. Touch Targets

✅ **Siempre usar mínimo 44x44px para elementos táctiles**

```typescript
// ✅ BIEN
<Button className={MOBILE_DESIGN.button.primary}>Guardar</Button>

// ❌ MAL
<Button className="h-8">Guardar</Button>
```

### 2. Clases Responsive

✅ **Usar clases de Tailwind responsive**

```typescript
// ✅ BIEN: Mobile primero, luego desktop
<div className="px-4 sm:px-8">

// ❌ MAL: Desktop primero
<div className="px-8 max-sm:px-4">
```

### 3. Componentes Responsive

✅ **Usar componentes adaptivos existentes**

```typescript
// ✅ BIEN
<ResponsiveContainer variant="page">

// ❌ MAL: Duplicar lógica
<div className="px-4 py-4 sm:px-8 sm:py-6">
```

### 4. Performance

✅ **Usar React.memo para componentes de lista**

```typescript
// ✅ BIEN
export const EmpleadoCard = React.memo(function EmpleadoCard({ empleado }) {
  return <Card>...</Card>;
});

// ✅ BIEN: useMemo para cálculos pesados
const saldoTotal = useMemo(() => 
  calcularSaldoComplejo(ausencias),
  [ausencias]
);
```

### 5. Prioridades de Columnas

✅ **Usar sistema de prioridades en tablas**

```typescript
const columns = [
  { id: 'nombre', header: 'Nombre', priority: 'high' },     // Siempre
  { id: 'email', header: 'Email', priority: 'medium' },     // Tablet+
  { id: 'telefono', header: 'Teléfono', priority: 'low' },  // Desktop
];
```

### 6. Modales según Complejidad

✅ **Elegir complejidad correcta**

- `simple`: Confirmaciones, selección simple → Bottom sheet
- `medium`: Formularios 3-5 campos → Dialog normal
- `complex`: Formularios >5 campos → Full screen mobile

---

## Checklist de Adaptación Mobile

Cuando adaptes un componente o página a mobile, verifica:

- [ ] Touch targets mínimos de 44x44px
- [ ] Padding responsive con constantes de `MOBILE_DESIGN`
- [ ] Tablas con prioridades de columnas
- [ ] Modales con complejidad adecuada
- [ ] Texto legible (mínimo 12px / 0.75rem)
- [ ] Imágenes con `next/image` y sizes responsive
- [ ] Estados de loading para acciones async
- [ ] Feedback visual en interacciones (active states)
- [ ] Testing en iOS Safari y Android Chrome
- [ ] Accesibilidad (aria-labels, contraste)

---

**¿Preguntas o sugerencias?**  
Contacta al equipo de desarrollo o abre un issue en el repositorio.


