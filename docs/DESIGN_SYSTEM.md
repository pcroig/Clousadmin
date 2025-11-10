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
- Fondos y superficies se limitan a `bg-white`, `bg-gray-50`, `bg-gray-100`, `bg-stone-100`.
- Los únicos botones verdes/rojos permitidos son las acciones de aprobar/rechazar; el resto usa el acento.
- Badges y estados usan la paleta definida (`bg-green-100 text-green-700`, etc.).

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

### Tablas de datos
- Usa `DataTable` (`components/shared/data-table.tsx`) con columnas tipadas.
- Encabeza con `TableHeader` y filtros con `TableFilters`.

```tsx
<TableHeader title="Personas" actionButton={{ label: '+ Añadir', onClick: openModal }} />
<TableFilters showDateNavigation onFilterClick={handleFilter} />
<DataTable columns={columns} data={data} getRowId={(row) => row.id} />
```

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

**Versión**: 1.3.0  
**Última actualización**: 7 de noviembre 2025
