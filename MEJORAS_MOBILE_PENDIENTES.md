# Mejoras Mobile - Plan de Implementación

**Fecha**: 2025-11-10
**Estado**: Build exitoso ✅ - Mejoras de calidad pendientes
**Versión actual**: Funcional y deployable

---

## 📋 Resumen Ejecutivo

La implementación mobile está **completa y funcionando correctamente**. Este documento detalla mejoras de **calidad, mantenibilidad y escalabilidad** identificadas en la revisión de código.

**Puntuación actual**: 7.4/10
**Puntuación objetivo**: 9.0/10

---

## 🎯 Prioridad 1: Centralización (Implementar primero)

### 1.1 Crear Design Tokens

**Problema**: Color `#d97757` hardcodeado en 5+ ubicaciones.

**Crear archivo**: `/lib/constants/design-tokens.ts`

```typescript
/**
 * Design Tokens - Fuente única de verdad para valores de diseño
 * Basado en MOBILE_DESIGN_SYSTEM.md
 */

export const DESIGN_TOKENS = {
  /**
   * Paleta de colores del sistema
   */
  colors: {
    primary: '#d97757',
    accent: '#d97757',
    background: {
      main: '#FAF9F5',
      white: '#FFFFFF',
    },
    gray: {
      50: '#FAF9F5',
      100: '#EFEFED',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },

  /**
   * Breakpoints responsive
   * Mobile-first: los valores son el punto donde CAMBIA a desktop
   */
  breakpoints: {
    mobile: 640,  // < 640px es mobile
    tablet: 768,  // >= 768px
    desktop: 1024, // >= 1024px
    wide: 1280,   // >= 1280px
  },

  /**
   * Touch targets para mobile (WCAG AAA)
   */
  touchTarget: {
    minHeight: 44,
    minWidth: 44,
  },

  /**
   * Z-index hierarchy
   */
  zIndex: {
    bottomNav: 50,
    modal: 50,
    toast: 100,
  },
} as const;

/**
 * Clases Tailwind reutilizables para responsive design
 */
export const RESPONSIVE_CLASSES = {
  // Visibilidad
  hideOnMobile: 'hidden sm:flex',
  showOnMobile: 'sm:hidden',
  hideOnDesktop: 'flex sm:hidden',
  showOnDesktop: 'hidden sm:flex',

  // Layout
  mobileBottomPadding: 'pb-16 sm:pb-0',
  mobilePadding: 'px-4 py-4 sm:px-8 sm:py-6',

  // Tipografía
  text: {
    pageHeading: 'text-xl sm:text-2xl',
    sectionHeading: 'text-lg sm:text-xl',
    widgetTitle: 'text-base sm:text-lg',
    body: 'text-sm sm:text-base',
    caption: 'text-xs sm:text-sm',
    tiny: 'text-[10px] sm:text-xs',
  },

  // Spacing
  gap: {
    small: 'gap-2 sm:gap-3',
    medium: 'gap-4 sm:gap-6',
    large: 'gap-6 sm:gap-8',
  },

  // Grid
  dashboardGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6',
} as const;
```

---

### 1.2 Crear Widget Dimensions

**Problema**: Magic numbers (58, 480px, pb-20) sin explicación.

**Crear archivo**: `/lib/constants/widget-dimensions.ts`

```typescript
/**
 * Dimensiones y constantes de widgets
 * Centraliza todos los valores hardcodeados de tamaños
 */

export const WIDGET_DIMENSIONS = {
  /**
   * Reloj circular del FichajeWidget
   */
  clock: {
    // Tamaños del contenedor
    sizeMobile: 'w-28 h-28',      // 112px
    sizeDesktop: 'w-32 h-32',     // 128px

    // Radios para cálculos SVG
    radiusMobile: 56,              // 28px * 2
    radiusDesktop: 64,             // 32px * 2
    strokeRadius: 58,              // Radio del path del SVG (64 - 6px stroke)
    strokeWidth: 8,                // Grosor de línea
  },

  /**
   * Alturas de widgets
   */
  heights: {
    standard: 'h-[280px]',
    fichaje: 'h-[280px]',
    ausencias: 'h-[480px] sm:h-[580px]',
    notificaciones: 'h-[280px]',
    double: 'h-[580px]',
  },

  /**
   * Padding para bottom navigation
   * Mobile necesita espacio para el bottom nav (64px)
   */
  bottomPadding: {
    mobile: 16,        // pb-16 (64px)
    desktop: 0,        // pb-0
    mobileClass: 'pb-16 sm:pb-0',
  },

  /**
   * Padding de contenido de widgets
   */
  contentPadding: {
    default: 'px-4 sm:px-6 pb-4 sm:pb-20',
    compact: 'px-4 sm:px-6 pb-4',
    scrollable: 'overflow-y-auto px-4 sm:px-6 pb-4',
  },

  /**
   * Touch targets mínimos
   */
  touchTarget: {
    minHeight: 'min-h-[44px]',
    minWidth: 'min-w-[44px]',
    size: 'min-h-[44px] min-w-[44px]',
  },
} as const;

/**
 * Helper para calcular circumferencia del círculo de progreso
 */
export function getCircleCircumference(radius: number = WIDGET_DIMENSIONS.clock.strokeRadius): number {
  return 2 * Math.PI * radius;
}

/**
 * Helper para calcular porcentaje de progreso seguro (evita división por cero)
 */
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, (completed / total) * 100));
}
```

---

### 1.3 Actualizar Tailwind Config

**Archivo**: `/tailwind.config.ts`

**Cambios**:

```typescript
import type { Config } from "tailwindcss";
import { DESIGN_TOKENS } from "./lib/constants/design-tokens";

const config: Config = {
  // ... contenido existente ...

  theme: {
    extend: {
      colors: {
        // Agregar color primary del design system
        primary: DESIGN_TOKENS.colors.primary,
        accent: DESIGN_TOKENS.colors.accent,

        // Colores existentes...
        background: "var(--background)",
        foreground: "var(--foreground)",
        // ... resto de colores ...
      },

      // Agregar z-index del design system
      zIndex: {
        'bottom-nav': DESIGN_TOKENS.zIndex.bottomNav.toString(),
        'modal': DESIGN_TOKENS.zIndex.modal.toString(),
        'toast': DESIGN_TOKENS.zIndex.toast.toString(),
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### 1.4 Actualizar Bottom Navigation

**Archivo**: `/components/layout/bottom-navigation.tsx`

**Cambios**:

```typescript
import { RESPONSIVE_CLASSES } from '@/lib/constants/design-tokens';

// Línea 129: Reemplazar color hardcodeado
// ANTES:
active ? 'text-[#d97757]' : 'text-gray-500 hover:text-gray-700'

// DESPUÉS:
active ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
```

---

### 1.5 Actualizar Fichaje Widget

**Archivo**: `/components/shared/fichaje-widget.tsx`

**Cambios**:

```typescript
import { WIDGET_DIMENSIONS, getCircleCircumference, calculateProgress } from '@/lib/constants/widget-dimensions';

// Línea 264-265: Reemplazar cálculos manuales
// ANTES:
const porcentajeProgreso = (horasHechas / (horasHechas + horasPorHacer)) * 100;
const circumference = 2 * Math.PI * 58;

// DESPUÉS:
const porcentajeProgreso = calculateProgress(horasHechas, horasHechas + horasPorHacer);
const circumference = getCircleCircumference();

// Línea 278: Reemplazar padding hardcodeado
// ANTES:
contentClassName="px-4 sm:px-6 pb-4 sm:pb-20"

// DESPUÉS:
import { WIDGET_DIMENSIONS } from '@/lib/constants/widget-dimensions';
contentClassName={WIDGET_DIMENSIONS.contentPadding.default}

// Línea 353: Reemplazar tamaño del reloj
// ANTES:
<div className="relative w-28 h-28 sm:w-32 sm:h-32">

// DESPUÉS:
<div className={cn("relative", WIDGET_DIMENSIONS.clock.sizeMobile, WIDGET_DIMENSIONS.clock.sizeDesktop)}>

// Línea 374: Reemplazar color hardcodeado
// ANTES:
stroke="#d97757"

// DESPUÉS:
className="text-primary" stroke="currentColor"
```

---

### 1.6 Actualizar Widget Card

**Archivo**: `/components/shared/widget-card.tsx`

**Cambios**:

```typescript
import { WIDGET_DIMENSIONS } from '@/lib/constants/widget-dimensions';

// Línea 58: Mejorar touch target del botón
// ANTES:
className="flex items-center justify-center w-8 h-8 sm:w-6 sm:h-6 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"

// DESPUÉS:
className={cn(
  "flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors",
  WIDGET_DIMENSIONS.touchTarget.size,
  "sm:w-6 sm:h-6"
)}
```

---

### 1.7 Actualizar Dashboard Layout

**Archivo**: `/app/(dashboard)/layout.tsx`

**Cambios**:

```typescript
import { RESPONSIVE_CLASSES } from '@/lib/constants/design-tokens';

// Línea 24: Reemplazar clase de visibilidad
// ANTES:
<div className="hidden sm:flex">

// DESPUÉS:
<div className={RESPONSIVE_CLASSES.hideOnMobile}>

// Línea 37: Reemplazar padding
// ANTES:
<main className="flex-1 overflow-y-auto pb-16 sm:pb-0">

// DESPUÉS:
<main className={cn("flex-1 overflow-y-auto", RESPONSIVE_CLASSES.mobileBottomPadding)}>

// Línea 38: Reemplazar padding horizontal
// ANTES:
<div className="h-full max-w-[1800px] mx-auto px-4 py-4 sm:px-8 sm:py-6">

// DESPUÉS:
<div className={cn("h-full max-w-[1800px] mx-auto", RESPONSIVE_CLASSES.mobilePadding)}>
```

---

## 🚀 Prioridad 2: Reducir Duplicación (Siguiente semana)

### 2.1 Extraer Configuración de Navegación

**Crear archivo**: `/lib/config/navigation.ts`

```typescript
import { Home, Clock, Inbox, User, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavigationItem {
  name: string;
  path: string;
  icon: LucideIcon;
  matchPattern: RegExp | string;
}

interface NavigationConfig {
  baseRoute: string;
  items: NavigationItem[];
}

export const NAVIGATION_CONFIG: Record<'empleado' | 'manager' | 'hr_admin', NavigationConfig> = {
  empleado: {
    baseRoute: '/empleado',
    items: [
      {
        name: 'Dashboard',
        path: 'dashboard',
        icon: Home,
        matchPattern: /^\/empleado\/dashboard$/
      },
      {
        name: 'Horario',
        path: 'mi-espacio?tab=fichajes',
        icon: Clock,
        matchPattern: /\/empleado\/mi-espacio/
      },
      {
        name: 'Bandeja',
        path: 'bandeja-entrada',
        icon: Inbox,
        matchPattern: /\/empleado\/bandeja-entrada/
      },
      {
        name: 'Perfil',
        path: 'settings',
        icon: User,
        matchPattern: /\/empleado\/settings/
      },
    ],
  },
  manager: {
    baseRoute: '/manager',
    items: [
      { name: 'Dashboard', path: 'dashboard', icon: Home, matchPattern: /^\/manager\/dashboard$/ },
      { name: 'Horario', path: 'horario/fichajes', icon: Clock, matchPattern: /\/manager\/horario/ },
      { name: 'Bandeja', path: 'bandeja-entrada', icon: Inbox, matchPattern: /\/manager\/bandeja-entrada/ },
      { name: 'Perfil', path: 'settings', icon: User, matchPattern: /\/manager\/settings/ },
    ],
  },
  hr_admin: {
    baseRoute: '/hr',
    items: [
      { name: 'Dashboard', path: 'dashboard', icon: Home, matchPattern: /^\/hr\/dashboard$/ },
      { name: 'Horario', path: 'horario/fichajes', icon: Clock, matchPattern: /\/hr\/horario/ },
      { name: 'Bandeja', path: 'bandeja-entrada', icon: Inbox, matchPattern: /\/hr\/bandeja-entrada/ },
      { name: 'Ajustes', path: 'settings', icon: Settings, matchPattern: /\/hr\/settings/ },
    ],
  },
};

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

/**
 * Construye los items de navegación a partir de la configuración
 *
 * @param config - Configuración de navegación para un rol específico
 * @returns Array de items listos para renderizar
 */
export function buildNavigation(config: NavigationConfig): NavItem[] {
  return config.items.map(item => ({
    name: item.name,
    href: `${config.baseRoute}/${item.path}`,
    icon: item.icon,
    isActive: (path: string) => {
      if (typeof item.matchPattern === 'string') {
        return path === item.matchPattern;
      }
      return item.matchPattern.test(path);
    },
  }));
}
```

**Actualizar**: `/components/layout/bottom-navigation.tsx`

```typescript
// ANTES: 80 líneas de configuraciones repetidas

// DESPUÉS:
import { NAVIGATION_CONFIG, buildNavigation } from '@/lib/config/navigation';

export function BottomNavigation({ rol }: BottomNavigationProps) {
  const pathname = usePathname();
  const navigation = buildNavigation(NAVIGATION_CONFIG[rol]);

  // ... resto del componente sin cambios
}
```

---

### 2.2 Añadir Memoización en Fichaje Widget

**Archivo**: `/components/shared/fichaje-widget.tsx`

**Agregar después de línea 264**:

```typescript
import { useMemo } from 'react';

// Memoizar cálculos costosos del círculo de progreso
const circleMetrics = useMemo(() => {
  const circ = getCircleCircumference();
  const progreso = calculateProgress(horasHechas, horasHechas + horasPorHacer);
  const arcLength = (circ * 3) / 4;

  return {
    circumference: circ,
    porcentajeProgreso: progreso,
    strokeDasharray: `${(arcLength * progreso) / 100} ${circ}`,
    strokeDashoffset: -circ / 8,
  };
}, [horasHechas, horasPorHacer]);

// Usar en el SVG:
<circle
  cx="64"
  cy="64"
  r="58"
  stroke="currentColor"
  className="text-primary"
  strokeWidth="8"
  fill="none"
  strokeDasharray={circleMetrics.strokeDasharray}
  strokeDashoffset={circleMetrics.strokeDashoffset}
  strokeLinecap="round"
  className="transition-all duration-300"
  transform="rotate(90 64 64)"
/>
```

---

### 2.3 Unificar Estilos de Widgets

**Crear archivo**: `/lib/constants/widget-styles.ts`

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Estilos consistentes para items de ausencia
 */
export const ausenciaItemStyles = cva(
  'flex items-center py-2 cursor-pointer transition-colors rounded-lg px-2 -mx-2 min-h-[44px]',
  {
    variants: {
      state: {
        upcoming: 'hover:bg-gray-50',
        past: 'opacity-60 hover:bg-gray-50 hover:opacity-100',
      },
      spacing: {
        compact: 'gap-2 sm:gap-3',
        normal: 'gap-3 sm:gap-4',
      },
    },
    defaultVariants: {
      state: 'upcoming',
      spacing: 'compact',
    },
  }
);

export type AusenciaItemVariants = VariantProps<typeof ausenciaItemStyles>;
```

**Actualizar**: `/components/shared/ausencias-widget.tsx`

```typescript
import { ausenciaItemStyles } from '@/lib/constants/widget-styles';

// Línea 120 y 158: Reemplazar clases largas
// ANTES:
className="flex items-center gap-2 sm:gap-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2 min-h-[44px]"

// DESPUÉS:
className={ausenciaItemStyles({ state: 'upcoming' })}

// Para ausencias pasadas:
className={ausenciaItemStyles({ state: 'past' })}
```

---

## 📚 Prioridad 3: Documentación (Backlog)

### 3.1 Agregar JSDoc a Funciones Complejas

**Archivo**: `/components/shared/fichaje-widget.tsx`

**Agregar antes de línea 71**:

```typescript
/**
 * Actualiza las horas trabajadas basándose en los eventos de fichaje
 * Calcula el tiempo total trabajado considerando entradas, salidas y pausas
 *
 * @param eventos - Array de eventos de fichaje ordenados cronológicamente
 * @remarks
 * - Usa la función calcularHorasTrabajadas de lib/calculos/fichajes.ts
 * - Actualiza los estados horasHechas, horasPorHacer y tiempoTrabajado
 * - Si no hay eventos, resetea todo a 0
 */
const actualizarHorasTrabajadas = useCallback((eventos: FichajeEvento[]) => {
  // ... código existente
}, []);

/**
 * Obtiene el estado actual del fichaje del día
 * Consulta la API y actualiza el estado del componente
 *
 * @remarks
 * - Usa la fecha local (YYYY-MM-DD) para evitar problemas de zona horaria
 * - Maneja errores de forma defensiva, reseteando estado en caso de fallo
 * - Se ejecuta automáticamente al montar el componente
 */
const obtenerEstadoActual = useCallback(async () => {
  // ... código existente
}, [actualizarHorasTrabajadas]);
```

---

### 3.2 Preparar Estructura i18n

**Crear archivo**: `/lib/i18n/translations.ts`

```typescript
/**
 * Translations - Preparación para internacionalización futura
 * Por ahora solo español, estructura lista para agregar idiomas
 */

export const translations = {
  es: {
    common: {
      greeting: 'Buenos Días',
      loading: 'Cargando...',
      error: 'Error',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
    },
    fichaje: {
      title: 'Fichaje',
      sinFichar: 'Sin fichar',
      trabajando: 'Trabajando',
      enPausa: 'En pausa',
      finalizado: 'Jornada finalizada',
      iniciarJornada: 'Iniciar Jornada',
      pausar: 'Pausar',
      reanudar: 'Reanudar',
      finalizar: 'Finalizar Jornada',
      anadirManual: 'Añadir Manual',
      horasRestantes: '{hours} restantes',
      enDescanso: 'En descanso',
      listoParaComenzar: 'Listo para comenzar',
      diaCompletado: 'Día completado',
    },
    ausencias: {
      title: 'Ausencias',
      solicitar: 'Solicitar ausencia',
      solicitarShort: 'Solicitar',
      diasAcumulados: 'Días acumulados',
      diasDisponibles: 'Días disponibles',
      diasUtilizados: 'Días utilizados',
      proximasAusencias: 'Próximas ausencias',
      ausenciasPasadas: 'Ausencias pasadas',
      noProximas: 'No hay próximas ausencias',
      noPasadas: 'No hay ausencias pasadas',
    },
    navigation: {
      dashboard: 'Dashboard',
      horario: 'Horario',
      bandeja: 'Bandeja',
      perfil: 'Perfil',
      ajustes: 'Ajustes',
    },
  },
} as const;

// Helper para obtener traducciones (preparado para múltiples idiomas)
export function t(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: any = translations.es;

  for (const k of keys) {
    value = value[k];
    if (!value) return key;
  }

  if (typeof value !== 'string') return key;

  // Reemplazar parámetros {param}
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? key));
  }

  return value;
}
```

**Uso en componentes**:

```typescript
import { t } from '@/lib/i18n/translations';

// ANTES:
<h1>Buenos Días, {userName}</h1>

// DESPUÉS:
<h1>{t('common.greeting')}, {userName}</h1>
```

---

## ✅ Checklist de Implementación

### Prioridad 1 (Esta semana)
- [ ] Crear `/lib/constants/design-tokens.ts`
- [ ] Crear `/lib/constants/widget-dimensions.ts`
- [ ] Actualizar `/tailwind.config.ts`
- [ ] Actualizar `/components/layout/bottom-navigation.tsx`
- [ ] Actualizar `/components/shared/fichaje-widget.tsx`
- [ ] Actualizar `/components/shared/widget-card.tsx`
- [ ] Actualizar `/app/(dashboard)/layout.tsx`
- [ ] Ejecutar `npm run build` para verificar

### Prioridad 2 (Próximas 2 semanas)
- [ ] Crear `/lib/config/navigation.ts`
- [ ] Refactorizar bottom-navigation.tsx con nueva config
- [ ] Añadir memoización en fichaje-widget.tsx
- [ ] Crear `/lib/constants/widget-styles.ts`
- [ ] Actualizar ausencias-widget.tsx con estilos unificados
- [ ] Ejecutar `npm run build` para verificar

### Prioridad 3 (Backlog)
- [ ] Añadir JSDoc a funciones complejas
- [ ] Crear `/lib/i18n/translations.ts`
- [ ] Actualizar componentes con t() helper
- [ ] Normalizar nombres de funciones (inglés)
- [ ] Eliminar tipos `any` restantes

---

## 🧪 Testing después de cambios

### 1. Build
```bash
npm run build
```
Debe completar sin errores.

### 2. Visual Testing
```bash
npm run dev
```

Verificar en diferentes tamaños:
- **Mobile**: < 640px (iPhone 12 - 390px)
- **Desktop**: >= 640px (Laptop - 1280px)

Verificar:
- ✅ Bottom navigation solo en mobile
- ✅ Sidebar solo en desktop
- ✅ Widgets responsive correctamente
- ✅ Touch targets >= 44px
- ✅ Color terracota en elementos activos
- ✅ No overflow o scroll horizontal

### 3. Funcionalidad
- ✅ Navegación funciona en ambos modos
- ✅ Fichaje widget actualiza correctamente
- ✅ Ausencias widget muestra datos
- ✅ Dashboards cargan sin errores

---

## 📊 Impacto Esperado

### Antes (7.4/10)
- Color hardcodeado en 5+ lugares
- Breakpoints repetidos 50+ veces
- Magic numbers sin explicación
- Código duplicado en navegación
- Clases CSS muy largas

### Después (9.0/10)
- ✅ Color centralizado en design-tokens
- ✅ Breakpoints en constantes reutilizables
- ✅ Magic numbers documentados
- ✅ Navegación DRY y escalable
- ✅ Estilos con variants (cva)

### Beneficios
1. **Mantenibilidad**: Cambiar breakpoint = 1 archivo vs 50+
2. **Consistencia**: Imposible usar valores incorrectos
3. **Escalabilidad**: Fácil agregar nuevos roles/idiomas
4. **Performance**: Memoización reduce re-renders
5. **DX**: Autocomplete de constantes en IDE

---

## 🚨 Notas Importantes

1. **No rompe nada**: Son mejoras de calidad, no fixes de bugs
2. **Deployable ahora**: El código actual funciona perfectamente
3. **Incremental**: Se puede implementar en fases
4. **Backward compatible**: No afecta funcionalidad existente
5. **Build verificado**: ✅ 118 páginas generadas exitosamente

---

## 📞 Soporte

Si encuentras problemas durante la implementación:
1. Verificar que todas las importaciones estén correctas
2. Ejecutar `npm run build` para detectar errores TS
3. Verificar que Tailwind reconoce las nuevas clases
4. Revisar este documento para ejemplos completos

**Estado actual**: ✅ **READY TO DEPLOY**
**Próximo paso**: Implementar Prioridad 1
