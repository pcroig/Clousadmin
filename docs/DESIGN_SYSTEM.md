# Clousadmin Design System

## 🎨 Paleta de Colores

> Las variables canónicas viven en `app/globals.css` dentro del bloque `@theme inline` (Tailwind CSS 4). Usa siempre los tokens, nunca colores hardcodeados.

### Colores Base

```css
/* Backgrounds */
--background: #FAF9F5;           /* Fondo general de la app */
--surface: #FFFFFF;              /* Cards, componentes, modales */
--surface-secondary: #F6F3F2;    /* Backgrounds alternativos */

/* Borders */
--border: #EFEFED;               /* Bordes de cards y componentes */
--border-input: #E0DFD9;         /* Bordes de inputs (más visible) */

/* Text */
--text-primary: #3D3D3A;         /* Texto principal (títulos, cuerpo) */
--text-secondary: #6B6A64;       /* Texto secundario (descripciones, hints) */
--text-disabled: #B0AFA9;        /* Texto deshabilitado */

/* Brand - Accent */
--accent: #d97757;               /* Botones principales, iconos destacados */
--accent-hover: #c6613f;
--accent-active: #B84915;
--accent-light: #FFF4ED;
```

### Estados de Feedback

```css
/* Success */
--success: #16A34A;
--success-light: #DCFCE7;
--success-border: #86EFAC;

/* Error */
--error: #DC2626;
--error-light: #FEE2E2;
--error-border: #FCA5A5;

/* Warning */
--warning: #EA580C;
--warning-light: #FFEDD5;
--warning-border: #FDBA74;

/* Info */
--info: #0284C7;
--info-light: #E0F2FE;
--info-border: #7DD3FC;
```

### Contraste WCAG AA

| Color | Sobre Blanco | Sobre Background | Estado |
|-------|--------------|------------------|--------|
| `#3D3D3A` (text-primary) | 11.2:1 | 10.8:1 | ✅ AAA |
| `#6B6A64` (text-secondary) | 4.6:1 | 4.4:1 | ✅ AA |
| `#d97757` (accent) | 4.1:1 | 3.9:1 | ⚠️ Solo para UI |

### Reglas de uso

- Iconos por defecto en gris (`text-gray-600` / `text-gray-700`), **sin fondo de color**.
- Iconos destacados usan `text-[#d97757]`; el hover utiliza `hover:text-[#c6613f]`.
- No usar el color naranja antiguo `#f26c21`.
- Fondos y superficies se limitan a `bg-white`, `bg-gray-50`, `bg-gray-100`.
- Los únicos botones verdes/rojos permitidos son las acciones de aprobar/rechazar; el resto usa el acento.
- Badges y estados usan la paleta definida (`bg-green-100 text-green-700`, etc.).
- **IMPORTANTE**: Solo usar colores documentados en este sistema. No usar `bg-blue-*`, `bg-indigo-*`, `bg-cyan-*`, `bg-sky-*` u otros no especificados.
- **Estados hover**: Casi siempre deben ser grisáceos (`hover:bg-gray-50`, `hover:bg-gray-100`), NO usar color terciario/tierra (`hover:bg-stone-*`, `hover:bg-amber-*`).
- **Botones con solo icono**: NO deben tener fondo de color, solo el icono.
- **Dialogs**: NO incluir banners informativos dentro de dialogs. Usar alternatives:
  - Alerts o Sonners para notificaciones temporales
  - Tooltip con icono "i" al lado de títulos cuando se necesite contexto adicional
  - Descripciones de campos en los propios inputs

---

## 🧾 Guías de color aplicadas

### Iconos

```tsx
// ✅ Icono sin fondo
<CheckCircle2 className="w-5 h-5 text-gray-600" />

// ✅ Icono destacado
<Calendar className="w-5 h-5 text-[#d97757]" />

// ✅ Hover interactivo
<Edit className="w-5 h-5 text-gray-600 hover:text-[#c6613f] transition-colors" />

// ❌ Prohibido: icono con fondo
<div className="bg-green-50 border-green-200 p-2 rounded-lg">
  <CheckCircle2 className="w-5 h-5 text-green-600" />
</div>
```

### Notificaciones

```tsx
// ✅ Correcto
<div className="flex items-start gap-4">
  <CheckCircle2 className="w-5 h-5 text-gray-600 flex-shrink-0" />
  <div className="flex-1">
    <p className="text-sm font-semibold text-gray-900">Título</p>
    <p className="text-sm text-gray-600">Mensaje</p>
  </div>
</div>

// ❌ Incorrecto: icono con fondo
<div className="flex items-start gap-4">
  <div className="bg-green-50 border-green-200 p-2 rounded-lg">
    <CheckCircle2 className="w-5 h-5 text-green-600" />
  </div>
  ...
</div>
```

### Badges de estado

```tsx
<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
  Aprobada
</span>

<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
  Rechazada
</span>
```

### Botones de acción

```tsx
// Botón principal
<button className="bg-[#d97757] hover:bg-[#c6613f] text-white px-4 py-2 rounded">
  Guardar
</button>

// Botón aprobar (excepción verde permitida)
<button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
  Aprobar
</button>

// Botón rechazar (excepción roja permitida)
<button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
  Rechazar
</button>

// ✅ Botón con solo icono (sin fondo)
<Button variant="ghost" size="icon">
  <Settings className="h-4 w-4" />
</Button>

// ❌ Prohibido: Botón icono con fondo de color
<Button variant="outline" size="icon" className="bg-primary">
  <Settings className="h-4 w-4" />
</Button>
```

### Estados Hover

Los estados hover deben ser consistentes y usar colores grisáceos:

```tsx
// ✅ Hover grisáceo (CORRECTO)
<button className="hover:bg-gray-50 transition-colors">
  Elemento interactivo
</button>

<button className="hover:bg-gray-100 transition-colors">
  Elemento interactivo con más contraste
</button>

// ✅ Hover en sidebar/menú
<Link 
  href="/ruta" 
  className="text-gray-700 hover:bg-gray-100 hover:text-gray-900"
>
  Elemento de navegación
</Link>

// ❌ Prohibido: Hover con color terciario/tierra
<button className="hover:bg-stone-100">
  Incorrecto
</button>

<button className="hover:bg-amber-50">
  Incorrecto
</button>

<button className="hover:bg-[#d97757]">
  Incorrecto (solo usar accent para elementos destacados, no hovers generales)
</button>
```

**Excepciones de hover:**
- Botones principales con background accent pueden usar `hover:bg-[#c6613f]` (accent-hover)
- Enlaces/iconos destacados pueden usar `hover:text-[#c6613f]`

### Tooltips Informativos

Para proporcionar contexto adicional, usar tooltips con icono "i":

```tsx
import { InfoTooltip } from '@/components/shared/info-tooltip';

// ✅ Tooltip al lado de título
<div className="flex items-center gap-2">
  <h3 className="text-lg font-semibold">Configuración avanzada</h3>
  <InfoTooltip content="Esta configuración solo está disponible para administradores" />
</div>

// ✅ Tooltip en campo de formulario
<Label htmlFor="campo" className="flex items-center gap-2">
  Nombre del campo
  <InfoTooltip content="El nombre debe ser único en toda la organización" />
</Label>

// ❌ Prohibido: Banner dentro de dialog
<Dialog>
  <DialogContent>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <AlertCircle className="h-5 w-5 text-blue-600" />
      <p>Información importante</p>
    </div>
    {/* contenido del dialog */}
  </DialogContent>
</Dialog>
```

---

## 📐 Tipografía

### Font Family

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Importación:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Jerarquía Tipográfica

```css
/* H1 - Títulos de página */
.text-page-title {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

/* H2 - Títulos de sección */
.text-section-title {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

/* H3 - Subtítulos */
.text-subtitle {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
}

/* Body - Texto normal */
.text-body {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--text-primary);
}

/* Small - Texto pequeño */
.text-small {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--text-secondary);
}

/* Caption - Muy pequeño (labels, hints) */
.text-caption {
  font-size: 12px;
  font-weight: 400;
  line-height: 1.3;
  color: var(--text-secondary);
}
```

---

## 📦 Layout & Spacing

### Contenedores Principales

```css
.container-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
}

.container-content {
  max-width: 1200px;
  margin: 0 auto;
}

.container-narrow {
  max-width: 800px;
  margin: 0 auto;
}
```

### Sistema de Espaciado (múltiplos de 8px)

```css
--spacing-1: 4px;    /* Muy pequeño (entre iconos y texto) */
--spacing-2: 8px;    /* Pequeño (entre texto y elementos) */
--spacing-3: 12px;   /* Medio-pequeño */
--spacing-4: 16px;   /* Medio (dentro de cards) */
--spacing-5: 20px;   /* Medio-grande */
--spacing-6: 24px;   /* Grande (entre cards) */
--spacing-8: 32px;   /* Muy grande (entre secciones) */
--spacing-10: 40px;  /* Extra grande */
--spacing-12: 48px;  /* Mega (separadores principales) */
```

### Aplicación de Espaciado

```css
/* Entre secciones principales */
.section-spacing {
  margin-bottom: 32px;
}

/* Entre cards en grid */
.cards-grid {
  gap: 24px;
}

/* Padding interno de cards */
.card-padding {
  padding: 16px;
}

/* Entre texto y elementos (labels, inputs) */
.form-field-spacing {
  margin-bottom: 8px;
}
```

---

## 🔲 Bordes Redondeados

```css
/* Inputs, botones pequeños */
--radius-sm: 10px;

/* Cards, paneles */
--radius-md: 14px;

/* Modales, overlays */
--radius-lg: 18px;

/* Pills, badges */
--radius-full: 9999px;
```

### Aplicación

```css
/* Botones e inputs */
.button, .input {
  border-radius: var(--radius-sm);
}

/* Cards */
.card {
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

/* Modales */
.modal {
  border-radius: var(--radius-lg);
}

/* Badges */
.badge {
  border-radius: var(--radius-full);
}
```

---

## 🌑 Sombras

```css
/* Sutil - Cards en reposo */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);

/* Media - Cards hover, dropdowns */
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);

/* Grande - Modales, overlays */
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

/* Extra grande - Popovers, tooltips */
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
```

### Aplicación

```css
/* Cards por defecto */
.card {
  box-shadow: var(--shadow-sm);
}

/* Cards en hover */
.card:hover {
  box-shadow: var(--shadow-md);
}

/* Modales */
.modal {
  box-shadow: var(--shadow-lg);
}
```

---

## ⚡ Transiciones

```css
/* Transición estándar para todo */
--transition: 150ms ease-in-out;

/* Aplicación */
* {
  transition: all var(--transition);
}

/* Específicas */
.button {
  transition: background-color var(--transition),
              box-shadow var(--transition),
              transform var(--transition);
}

.card {
  transition: box-shadow var(--transition),
              border-color var(--transition);
}
```

---

## 🎛️ Componentes Base

### Botones

```css
/* Botón Primario (Accent) */
.button-primary {
  background-color: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.button-primary:hover {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.button-primary:active {
  background-color: var(--accent-active);
  transform: translateY(0);
}

.button-primary:disabled {
  background-color: var(--border);
  color: var(--text-disabled);
  cursor: not-allowed;
}

/* Botón Secundario (Outline) */
.button-secondary {
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.button-secondary:hover {
  background-color: var(--surface-secondary);
  border-color: var(--accent);
}

/* Botón Texto (Ghost) */
.button-ghost {
  background-color: transparent;
  color: var(--accent);
  border: none;
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.button-ghost:hover {
  background-color: var(--accent-light);
}
```

### Inputs

```css
.input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid var(--border-input);
  border-radius: var(--radius-sm);
  background-color: var(--surface);
  color: var(--text-primary);
  transition: all var(--transition);
}

.input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.1);
}

.input:disabled {
  background-color: var(--surface-secondary);
  color: var(--text-disabled);
  cursor: not-allowed;
}

.input::placeholder {
  color: var(--text-secondary);
}

/* Input con error */
.input-error {
  border-color: var(--error);
}

.input-error:focus {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}
```

### Cards

```css
.card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--accent);
}

/* Card con padding grande */
.card-lg {
  padding: 24px;
}

/* Card sin sombra */
.card-flat {
  box-shadow: none;
}
```

### Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
  background-color: var(--accent-light);
  color: var(--accent);
}

/* Badge secundario */
.badge-secondary {
  background-color: var(--surface-secondary);
  color: var(--text-secondary);
}

/* Badge success */
.badge-success {
  background-color: var(--success-light);
  color: var(--success);
}

/* Badge error */
.badge-error {
  background-color: var(--error-light);
  color: var(--error);
}
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile first approach */
--breakpoint-sm: 640px;   /* Tablets pequeñas */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Laptops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Pantallas grandes */
```

### Media Queries

```css
/* Mobile (default) */
.container {
  padding: 16px;
}

/* Tablet (md) */
@media (min-width: 768px) {
  .container {
    padding: 24px;
  }
}

/* Desktop (lg) */
@media (min-width: 1024px) {
  .container {
    padding: 32px;
  }
}
```

---

## 🎯 Estados Visuales

### Focus States

```css
/* Focus ring consistente */
*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Focus sutil para inputs */
.input:focus {
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.15);
}
```

### Disabled States

```css
/* Elementos deshabilitados */
:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Loading States

```css
/* Skeleton loader */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--border) 0%,
    var(--surface-secondary) 50%,
    var(--border) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### Componentes disponibles

- **Spinner** (`components/ui/spinner.tsx`): icono accesible (usa `aria-label="Loading"`) pensado para acciones breves o feedback inline. Ajusta tamaño con utilidades `size-*` y color con `text-*`.
- **LoadingButton** (`components/shared/loading-button.tsx`): botón reutilizable que integra `Spinner`, gestiona estados `disabled` y oculta iconos mientras está cargando.
- **Skeletons** (`components/shared/loading-skeletons.tsx`): patrones (`GridSkeleton`, `TableSkeleton`, `CardSkeleton`, `ListSkeleton`) para listas y vistas con carga perceptible.
- **EmptyState** (`components/shared/empty-state.tsx`): wrapper de shadcn para estados sin datos con variantes `primary` (CTA) y `secondary` (compacto).

#### Reglas rápidas

- Usa `Spinner` para feedback puntual (mutaciones, envíos de formularios o acciones dentro de tarjetas). Evita dejar iconos girando indefinidamente cuando hay alternativas de skeleton.
- Prefiere `Skeletons` cuando el usuario espera contenido estructurado (tablas, grids, tarjetas) y la carga puede tardar más de ~300 ms.
- `LoadingButton` debe ser el default para CTAs con estado de envío; no dupliques lógica de spinner manualmente.
- Los estados vacíos deben utilizar `EmptyState` para garantizar consistencia visual y copy en español. Añade `variant="secondary"` en celdas o paneles compactos.

---

## 🚀 Uso con Tailwind CSS 4

### Configuración en `app/globals.css`

Tailwind CSS 4 usa la nueva sintaxis `@theme inline` en lugar de `tailwind.config.js`:

```css
@import "tailwindcss";

@theme inline {
  /* Colores del Design System */
  --color-background: #FAF9F5;
  --color-surface: #FFFFFF;
  --color-surface-secondary: #F6F3F2;
  --color-border: #EFEFED;
  --color-border-input: #E0DFD9;
  --color-text-primary: #3D3D3A;
  --color-text-secondary: #6B6A64;
  --color-text-disabled: #B0AFA9;
  --color-accent: #d97757;
  --color-accent-hover: #c6613f;
  --color-accent-active: #B84915;
  --color-accent-light: #FFF4ED;
  /* ... más colores ... */
}
```

**Nota**: La configuración completa está en `app/globals.css`. No se usa `tailwind.config.js` en Tailwind CSS 4.

---

## 📦 Patrones de Componentes (React)

### Widgets del dashboard
- Usa `WidgetCard` (`components/shared/widget-card.tsx`) como contenedor estándar.
- Variantes de altura: `h-[280px]` (una fila) y `h-[580px]` (dos filas).
- Mantén `contentClassName` para personalizar scroll sin romper padding.

```tsx
<WidgetCard
  title="Solicitudes"
  href="/hr/solicitudes"
  height="h-[280px]"
  badge={pendingCount}
>
  <SolicitudesWidget />
</WidgetCard>
```

### Tablas de datos unificadas ⭐ ESTÁNDAR
- **Obligatorio**: Usa `DataTable` (`components/shared/data-table.tsx`) para todas las tablas del sistema.
- **Propósito**: Garantiza estilo consistente, responsive design y EmptyState de shadcn en todas las vistas.
- **AvatarCell**: Para columnas de empleados, usa el helper `AvatarCell` que integra avatar + nombre + puesto automáticamente.

```tsx
import { AvatarCell, DataTable, type Column } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { CalendarIcon } from 'lucide-react';

// Definir columnas tipadas
const columns: Column<Ausencia>[] = [
  {
    id: 'empleado',
    header: 'Empleado',
    cell: (row) => (
      <AvatarCell
        nombre={row.empleado.nombre}
        apellidos={row.empleado.apellidos}
        fotoUrl={row.empleado.fotoUrl}
        subtitle={row.empleado.puesto}
      />
    ),
    sticky: true, // Primera columna sticky en mobile
    priority: 'high', // Siempre visible
  },
  {
    id: 'fecha',
    header: 'Fechas',
    align: 'center', // Headers centrados con contenido
    cell: (row) => format(new Date(row.fechaInicio), 'dd MMM'),
  },
];

// Usar en componente
<DataTable
  columns={columns}
  data={ausencias}
  getRowId={(row) => row.id}
  onRowClick={(row) => handleOpenModal(row)}
  emptyContent={
    <EmptyState
      layout="table"
      icon={CalendarIcon}
      title="No hay ausencias registradas"
      description="Cambia el periodo o ajusta los filtros para ver registros."
    />
  }
/>
```

**Características del DataTable**:
- ✅ Header grisaceo (`bg-gray-50`) con títulos centrados cuando el contenido está centrado
- ✅ Filas ocupan todo el espacio con hover suave
- ✅ EmptyState integrado de shadcn (layout `table`)
- ✅ Responsive con columnas priorizadas (`priority: 'high' | 'medium' | 'low'`)
- ✅ Primera columna sticky opcional en mobile
- ✅ Scroll horizontal automático en mobile
- ✅ Filas clicables con cursor pointer

**AvatarCell**:
- Muestra avatar + nombre + puesto (opcional) en una sola celda
- Responsive: avatar más pequeño en mobile
- Integra `EmployeeAvatar` y formateo automático
- Usado en tablas de Ausencias, Fichajes, y otras vistas con empleados

**Reglas importantes**:
- ❌ **NO** uses `Table`, `TableRow`, `TableCell` de shadcn directamente en nuevas tablas
- ✅ **SÍ** usa `DataTable` para unificar estilo y centralizar código
- ✅ Todos los estados vacíos deben usar `EmptyState` de shadcn con layout `table`
- ✅ Headers deben estar centrados cuando el contenido de la columna está centrado

### Botones
- Usa `Button` de `components/ui/button.tsx`.
- Variantes válidas: `default` (gris oscuro), `outline`, `secondary`, `ghost`, `link`, `destructive`.
- Acciones de aprobar/rechazar usan verdes/rojos; el resto emplea el acento.

```tsx
<Button>Guardar</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="destructive">Eliminar</Button>
```

### Badges y estados
- Usa `Badge` (`components/ui/badge.tsx`) y aplica variantes `success`, `warning`, `info`, `destructive`.
- Los colores deben corresponder a la tabla de estados (verde/rojo/amarillo/azul).

### Cards y contenedores
- Usa `Card` (`components/ui/card.tsx`) con el spacing por defecto (`px-6` / `pt-6`).
- Para widgets reutiliza `WidgetCard`; para KPIs usa `KpiCard`.

### Modales y paneles
- Formularios/confirmaciones: `Dialog` (`components/ui/dialog.tsx`).
- Paneles de detalle: `DetailsPanel` (`components/shared/details-panel.tsx`).

### Hover Cards para Empleados
- Usa `EmpleadoHoverCard` (`components/empleado/empleado-hover-card.tsx`) para mostrar información contextual del empleado al hacer hover.
- **Información uniforme**: Muestra rol, equipo, email y estado opcional de forma consistente en toda la plataforma.
- **Uso en widgets y tablas**: Envuelve avatares o nombres de empleados para proporcionar contexto sin ocupar espacio.

```tsx
import { EmpleadoHoverCard } from '@/components/empleado/empleado-hover-card';
import { EmployeeAvatar } from '@/components/shared/employee-avatar';

// En widgets (con avatar)
<EmpleadoHoverCard
  empleado={{
    nombre: empleado.nombre,
    apellidos: empleado.apellidos,
    puesto: empleado.puesto,
    email: empleado.email,
    equipoNombre: empleado.equipoNombre,
    fotoUrl: empleado.fotoUrl,
  }}
  estado={{ label: 'Pendiente de aprobación' }}
  triggerClassName="flex-shrink-0"
>
  <EmployeeAvatar nombre={empleado.nombre} fotoUrl={empleado.fotoUrl} size="sm" />
</EmpleadoHoverCard>

// En tablas (con nombre)
<EmpleadoHoverCard
  empleado={{
    nombre: ausencia.empleado.nombre,
    apellidos: ausencia.empleado.apellidos,
    puesto: ausencia.empleado.puesto,
    email: ausencia.empleado.email,
    equipoNombre: ausencia.empleado.equipoNombre,
    fotoUrl: ausencia.empleado.fotoUrl,
  }}
  estado={{
    label: getAusenciaEstadoLabel(ausencia.estado),
    description: getTipoBadge(ausencia.tipo),
  }}
  triggerClassName="font-medium text-gray-900"
  side="right"
>
  {ausencia.empleado.nombre} {ausencia.empleado.apellidos}
</EmpleadoHoverCard>
```

**Reglas importantes:**
- El hover card muestra **siempre la misma información** (rol, equipo, email) independientemente del contexto.
- El `estado` es opcional y se muestra en un bloque separado cuando está presente.
- Usa `side="right"` en tablas para evitar que el card se salga de la pantalla.
- No cambia de color al hacer hover (mantiene el estilo del trigger).

**Componentes que usan hover cards:**
- ✅ `SolicitudesWidget` - avatares y nombres
- ✅ `PlantillaWidget` - avatares en categorías
- ✅ Tablas de Ausencias - nombres en mobile y desktop
- ✅ Tablas de Fichajes - nombres en mobile y desktop

---

## 📜 Scroll en Dialogs, Widgets y Tablas

### ⚠️ Causa Raíz del Problema de Scroll

**El problema fundamental**: ScrollArea de Radix UI es complejo y requiere configuración específica que puede fallar. La solución más simple y confiable es **usar scroll nativo del navegador** con estilos personalizados.

**Por qué fallaba ScrollArea**:
- Requiere altura explícita en el contenedor
- `flex-1` solo no proporciona altura resuelta
- Requiere configuración correcta del Viewport
- Más complejo de depurar y mantener

**La solución (scroll nativo)**:
```tsx
{/* ❌ NO FUNCIONA - ScrollArea complejo */}
<div className="flex-1 overflow-hidden">
  <ScrollArea className="h-full">
    {contenido}
  </ScrollArea>
</div>

{/* ✅ SÍ FUNCIONA - scroll nativo con estilos personalizados */}
<div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
  {contenido}
</div>
```

**Scrollbar personalizada embebida y auto-hide**:
- Solo 4px de ancho (ultra delgada)
- Track completamente transparente (sin fondo visible)
- **Auto-hide**: invisible por defecto, solo aparece al hacer hover/scroll
- Thumb pequeño (mínimo 40px) y semi-transparente
- Completamente embebida sin espacio separado

**Comportamiento**:
- **Por defecto**: Completamente invisible
- **Al hover del contenedor**: Aparece en gris claro (50% opacidad)
- **Al hover sobre la barra**: Gris más oscuro (70% opacidad)
- **Al arrastrar**: Más visible (90% opacidad)
- **Durante scroll**: Visible y responsiva

**Clases disponibles**:
- `scrollbar-thin` - scrollbar delgada de 6px con auto-hide
- `scrollbar-track-transparent` - track sin fondo (helper)
- `scrollbar-thumb-gray-300` - thumb color gris (helper)
- `hover:scrollbar-thumb-gray-400` - hover más oscuro (helper)

**Patrón aplicado en:**
- `DialogBody` - overflow-y-auto nativo con scrollbar delgada
- `DataTable` (con `scrollable`) - scroll nativo embebido

---

### Dialogs con Scroll Correcto

**Problema**: El scroll en modales debe mantener el header y footer fijos, permitiendo scroll solo en el contenido.

**Solución**: Usar `DialogScrollableContent` + `DialogBody`

```tsx
import {
  Dialog,
  DialogScrollableContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={onClose}>
  <DialogScrollableContent className="max-w-4xl">
    {/* Header fijo - NO hace scroll */}
    <DialogHeader>
      <DialogTitle>Título del Modal</DialogTitle>
    </DialogHeader>

    {/* Body con scroll automático */}
    <DialogBody>
      <div className="space-y-4">
        {/* Contenido largo que hará scroll */}
      </div>
    </DialogBody>

    {/* Footer fijo - NO hace scroll */}
    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button>Guardar</Button>
    </DialogFooter>
  </DialogScrollableContent>
</Dialog>
```

**Componentes disponibles:**

- `DialogContent` - Modal básico (con prop `scrollable` opcional)
- `DialogScrollableContent` - Modal con estructura fija header/footer
- `DialogBody` - Usa overflow-y-auto nativo con scrollbar delgada embebida
- `DialogHeader` - Header fijo
- `DialogFooter` - Footer fijo

**Implementación de DialogBody:**
```tsx
function DialogBody({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "flex-1 min-h-0 overflow-y-auto -mx-6 px-6",
        // Scrollbar embebida delgada
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

**Nota clave**: `min-h-0` es crítico para que `flex-1` permita el shrinking y active el scroll.

**Modales actualizados:**
- ✅ `add-persona-dialog.tsx` - con wrapper div para contenido de tabs
- ✅ `solicitar-firma-dialog.tsx`
- ✅ `fichaje-modal.tsx`
- ✅ `editar-jornada-modal.tsx`
- ✅ `gestionar-ausencias-modal.tsx` - footer fuera de DialogBody con condicional por tab
- ✅ `preferencias-vacaciones-modal.tsx` - footer movido fuera de DialogBody

**⚠️ IMPORTANTE**: El DialogFooter DEBE estar fuera de DialogBody, nunca dentro. Si tienes tabs con diferentes footers, usa renderizado condicional:

```tsx
<DialogBody>
  <Tabs value={tab}>
    <TabsContent value="tab1">...</TabsContent>
    <TabsContent value="tab2">...</TabsContent>
  </Tabs>
</DialogBody>

<DialogFooter>
  {tab === 'tab1' ? (
    <Button onClick={handleTab1}>Acción Tab 1</Button>
  ) : (
    <Button onClick={handleTab2}>Acción Tab 2</Button>
  )}
</DialogFooter>
```

### Widgets con Scroll

**Problema**: Los widgets de dashboard necesitan scroll cuando el contenido excede la altura disponible.

**Solución**: Usar prop `useScroll` en `WidgetCard`

```tsx
import { WidgetCard } from '@/components/shared/widget-card';

{/* Widget SIN scroll (contenido estático) */}
<WidgetCard
  title="Plantilla"
  href="/hr/organizacion/personas"
  height="h-[280px]"
>
  <div>Contenido estático</div>
</WidgetCard>

{/* Widget CON scroll (lista larga) */}
<WidgetCard
  title="Solicitudes"
  href="/hr/bandeja-entrada"
  height="h-[280px]"
  useScroll  // ← Activa ScrollArea automáticamente
  badge={count}
>
  <div className="space-y-2">
    {/* Lista de elementos que hará scroll */}
  </div>
</WidgetCard>
```

**Widgets actualizados:**
- ✅ `plantilla-widget.tsx`
- ✅ `solicitudes-widget.tsx`
- ✅ `notificaciones-widget.tsx`

**Notas técnicas:**
- `useScroll={true}` envuelve el contenido en `<ScrollArea>`
- El widget mantiene `height` fijo (ej: `h-[280px]`)
- El `CardContent` tiene `flex-1 min-h-0` para que el scroll funcione

### Tablas con Scroll

**Problema**: Las tablas necesitan scroll vertical cuando hay muchas filas y están dentro de un contenedor con altura fija.

**Solución**: Usar prop `scrollable` en `DataTable`

```tsx
import { DataTable } from '@/components/shared/data-table';

<ResponsiveContainer variant="page" className="h-full flex flex-col overflow-hidden">
  {/* Header and filters */}

  {/* Content with height constraint */}
  <div className="flex-1 min-h-0">
    <DataTable
      columns={columns}
      data={data}
      onRowClick={handleRowClick}
      getRowId={(row) => row.id}
      scrollable  // ← Activa overflow-y-auto y h-full
    />
  </div>
</ResponsiveContainer>
```

**Tablas actualizadas:**
- ✅ `personas-client.tsx` (org > personas)
- ✅ `equipos-client.tsx` (org > equipos)
- ✅ `puestos-client.tsx` (org > puestos)

**Notas técnicas:**
- `scrollable={true}` aplica `h-full overflow-y-auto` con scrollbar personalizada al contenedor interior
- El `thead` tiene `sticky top-0 z-20` para permanecer fijo mientras el tbody hace scroll
- La scrollbar es delgada (6px), con track transparente y thumb gris
- Esto crea un scroll "embebido" sin fondo visible, solo la barra
- El contenedor padre debe tener altura fija o `flex-1 min-h-0`
- La tabla mantiene `overflow-x-auto` para scroll horizontal en mobile

**Implementación:**
```tsx
{/* Contenedor exterior con bg-white */}
<div className="h-full flex flex-col bg-white rounded-xl border">
  {/* Wrapper que oculta el espacio de la scrollbar */}
  <div className="flex-1 min-h-0 overflow-hidden">
    {/* Scroll con padding trick: pr-4 -mr-4 */}
    <div className="h-full overflow-y-auto scrollbar-thin pr-4 -mr-4">
      <table className="w-full">
        <thead className="sticky top-0 z-20 bg-gray-50">...</thead>
        <tbody>...</tbody>
      </table>
    </div>
  </div>
</div>
```

**Por qué funciona el "padding trick":**
- `pr-4`: Padding-right de 16px empuja el contenido hacia la izquierda
- `-mr-4`: Margin-right negativo de -16px extiende el contenedor hacia la derecha
- `overflow-hidden` en el wrapper corta la scrollbar que queda fuera
- **Resultado**: La tabla ocupa todo el ancho, la scrollbar flota SOBRE el contenido
- Scrollbar delgada (8px) sin fondo visible, completamente embebida

---

### Filtros en Tablas

**Componente**: `DataFilters` (`components/shared/filters/data-filters.tsx`)

**Problema**: Los selectores de filtro cambiaban de tamaño según el contenido seleccionado.

**Solución**: Anchos fijos uniformes con `className="w-full"` en `SelectTrigger`

```tsx
<DataFilters
  searchQuery={busqueda}
  onSearchChange={setBusqueda}
  estadoValue={filtroEstado}
  onEstadoChange={setFiltroEstado}
  estadoOptions={ESTADO_OPTIONS}
  equipoValue={filtroEquipo}
  onEquipoChange={setFiltroEquipo}
  equipoOptions={equiposOptions}
/>
```

**Layout responsivo:**
- **Desktop**: `justify-between` - filtros a la izquierda, fechas a la derecha
- **Mobile**: Stacked verticalmente
- **Anchos**: Estado 180px, Equipo 200px (fijos en desktop)

**Archivos actualizados:**
- ✅ `fichajes-client.tsx`
- ✅ `ausencias-client.tsx`

### Layouts recurrentes
- Dashboards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.
- Páginas con tabla: header + filtros + tabla + panel de detalles.

---

## ✅ Checklist final

**Tokens y estilos**
- [ ] Se usan únicamente tokens (`text-primary`, `bg-surface`, `accent`, etc.).
- [ ] Iconos sin fondo; hovers utilizan `hover:text-[#c6613f]`.
- [ ] Espaciado alineado al sistema de 8px.
- [ ] Estados (focus/hover/disabled) implementan las reglas anteriores.

**Componentes React**
- [ ] Componentes base (`WidgetCard`, `DataTable`, `Button`, `Badge`, etc.) reutilizados.
- [ ] Sin duplicar estilos de shadcn/ui; usar props/variants existentes.
- [ ] Accesibilidad: `aria-*`, foco gestionado, teclado funcional.
- [ ] Responsive probado en `sm`, `md`, `lg`.

---

## 🔗 Referencias

- `app/globals.css` — Tokens Tailwind CSS 4 (`@theme inline`).
- `lib/design-system.ts` — Helpers (`iconClasses`, `accentColors`).
- `.cursorrules` — Principios y anti-patrones generales.
- Componentes clave:  
  - `components/shared/widget-card.tsx`  
  - `components/shared/data-table.tsx`  
  - `components/ui/button.tsx`  
  - `components/ui/badge.tsx`  
  - `components/shared/details-panel.tsx`

---

**Versión**: 1.5.4
**Última actualización**: 29 de noviembre 2025

**Cambios en v1.5.4:**
- ✅ **Scrollbar verdaderamente embebida**: Padding trick (pr-4 -mr-4) para overlay real
- ✅ Tabla ocupa 100% del ancho sin espacio reservado para scroll
- ✅ Scrollbar flota SOBRE el contenido, no al lado
- ✅ Estructura de 3 capas: contenedor → wrapper overflow-hidden → scroll con padding trick

**Cambios en v1.5.3:**
- ⚠️ REVERTIDO - Enfoque incorrecto con scrollbar-gutter

**Cambios en v1.5.2:**
- ✅ **Auto-hide scrollbar**: Invisible por defecto, solo aparece al hover/scroll
- ✅ Scrollbar semi-transparente para máxima discreción
- ✅ Sin fondo visible - solo la banda delgada
- ✅ Transiciones suaves entre estados (invisible → visible → hover)

**Cambios en v1.5.1:**
- ✅ Scroll del layout (main) con scrollbar delgada embebida
- ✅ Eliminado doble scroll en páginas con tabs (empleado-detail-client)
- ✅ DataTable con estructura de dos contenedores para scroll correcto
- ✅ Scroll de página pegado al lateral de la pantalla (no al área de contenido)

**Cambios en v1.5.0 - SCROLL NATIVO:**
- 🚀 **BREAKING**: Reemplazado ScrollArea de Radix UI por scroll nativo del navegador
- ✅ Scrollbar personalizada delgada (6px) y embebida sin fondo visible
- ✅ DialogBody usa overflow-y-auto + min-h-0 para scroll confiable
- ✅ DataTable usa scroll nativo con scrollbar delgada
- ✅ Estilos de scrollbar añadidos a globals.css (`.scrollbar-thin`, etc.)
- ✅ Eliminada dependencia de ScrollArea para dialogs y tablas

**Cambios en v1.4.2:**
- ✅ Scroll embebido en tablas con `thead` sticky (sin scrollbar separada visible)
- ✅ Corregidos 3 modales con DialogFooter dentro de DialogBody (ahora fuera)
- ✅ add-persona-dialog con wrapper div para que tabs funcionen con scroll
- ✅ Documentado patrón para footers condicionales en tabs

**Cambios en v1.4.1:**
- ✅ Documentada causa raíz del problema de scroll (ScrollArea requiere altura explícita)
- ✅ Añadida sección "Tablas con Scroll" con prop `scrollable` en DataTable
- ✅ Actualizadas 3 tablas: personas-client, equipos-client, puestos-client
