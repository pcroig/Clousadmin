# Clousadmin Design System

## 🎨 Paleta de Colores

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
--accent: #F26C21;               /* Color principal (botones, links, badges) */
--accent-hover: #D45A1B;         /* Hover en elementos accent */
--accent-active: #B84915;        /* Active/pressed en elementos accent */
--accent-light: #FFF4ED;         /* Background suave para badges/tags */
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
| `#F26C21` (accent) | 3.6:1 | 3.5:1 | ⚠️ Solo para UI |

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
  box-shadow: 0 0 0 3px rgba(242, 108, 33, 0.1);
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
  box-shadow: 0 0 0 3px rgba(242, 108, 33, 0.15);
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

---

## 🚀 Uso con Tailwind CSS

### Configuración en `tailwind.config.js`

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        background: '#FAF9F5',
        surface: '#FFFFFF',
        'surface-secondary': '#F6F3F2',
        border: '#EFEFED',
        'border-input': '#E0DFD9',
        'text-primary': '#3D3D3A',
        'text-secondary': '#6B6A64',
        'text-disabled': '#B0AFA9',
        accent: {
          DEFAULT: '#F26C21',
          hover: '#D45A1B',
          active: '#B84915',
          light: '#FFF4ED',
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
          border: '#86EFAC',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          border: '#FCA5A5',
        },
        warning: {
          DEFAULT: '#EA580C',
          light: '#FFEDD5',
          border: '#FDBA74',
        },
        info: {
          DEFAULT: '#0284C7',
          light: '#E0F2FE',
          border: '#7DD3FC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['30px', { lineHeight: '1.2', fontWeight: '700' }],
        'section-title': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
      },
      borderRadius: {
        'sm': '10px',
        'md': '14px',
        'lg': '18px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'modal': '0 10px 15px rgba(0, 0, 0, 0.1)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease-in-out',
      },
    },
  },
};
```

---

## 📚 Referencia de Componentes UI

Para patrones de uso y ejemplos prácticos de componentes, ver **[DESIGN_PATTERNS.md](./DESIGN_PATTERNS.md)**.

### Componente CalendarioLaboral

Componente estándar para selección de fechas y visualización de días especiales (ausencias, festivos, no laborables).

**Ubicación**: `components/shared/calendario-laboral.tsx`  
**Base**: shadcn/ui Calendar

#### Props
```typescript
interface CalendarioLaboralProps {
  mode?: 'single' | 'range' | 'multiple';
  selected?: Date | DateRange | Date[];
  onSelect?: (date: Date | DateRange | Date[] | undefined) => void;
  marcadores?: CalendarioMarcador[];
  numberOfMonths?: number;
  className?: string;
  disabled?: (date: Date) => boolean;
}

interface CalendarioMarcador {
  fecha: Date;
  tipo: 'ausencia' | 'festivo' | 'no_laborable' | 'custom';
  label?: string;
}
```

#### Ejemplo de uso
```tsx
import { CalendarioLaboral } from '@/components/shared/calendario-laboral';

// Modo range para filtros
<CalendarioLaboral
  mode="range"
  selected={rangoFechas}
  onSelect={setRangoFechas}
  numberOfMonths={2}
/>

// Con marcadores de días especiales
<CalendarioLaboral
  mode="single"
  marcadores={[
    { fecha: new Date(2025, 11, 25), tipo: 'festivo', label: 'Navidad' },
    { fecha: new Date(2025, 11, 26), tipo: 'no_laborable' },
  ]}
  numberOfMonths={1}
/>
```

#### Estilos de marcadores
- **Festivos**: `bg-red-100 text-red-900` (días festivos nacionales/autonómicos)
- **Ausencias**: `bg-blue-100 text-blue-900` (ausencias de empleados)
- **No laborables**: `bg-gray-100 text-gray-500` (días personalizados por empresa)

---

## 🔗 Documentación Relacionada

- **[DESIGN_PATTERNS.md](./DESIGN_PATTERNS.md)** - Patrones de diseño y uso de componentes
- **[PATRONES_CODIGO.md](./PATRONES_CODIGO.md)** - Patrones específicos de código TypeScript/Next.js

---

**Versión**: 1.1.0
**Última actualización**: 2025-01-27
