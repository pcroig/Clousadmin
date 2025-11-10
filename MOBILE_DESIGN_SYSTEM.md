# Mobile Design System - Clousadmin

## Estrategia de Optimización

**Objetivo**: Optimizar la experiencia de usuario para **desktop** y **mobile** específicamente.
**Tablet**: Comportamiento indeferente, seguirá patrones responsivos naturales.

## Breakpoints

```css
Mobile:  < 640px  (Tailwind: default, sin prefijo)
Desktop: ≥ 640px  (Tailwind: sm:)
```

**Decisión**: Usar `sm` (640px) como punto de cambio principal entre mobile y desktop.

## Arquitectura de Navegación

### Desktop (≥ 640px)
- **Sidebar izquierdo fijo** (mantener existente)
- Navegación vertical con iconos y labels
- Logo en header

### Mobile (< 640px)
- **Bottom Navigation** fijo en parte inferior
- 4-5 items máximo según rol
- Iconos + labels pequeños
- Active state con color terracota (#d97757)

#### Items por Rol

**Empleado**:
- Dashboard (Home icon)
- Horario (Calendar icon)
- Ausencias (Calendar X icon)
- Bandeja (Inbox icon)
- Perfil (User icon)

**Manager**:
- Dashboard (Home icon)
- Mi Equipo (Users icon)
- Ausencias (Calendar icon)
- Bandeja (Inbox icon)
- Perfil (User icon)

**HR Admin**:
- Dashboard (Home icon)
- Empleados (Users icon)
- Ausencias (Calendar icon)
- Bandeja (Inbox icon)
- Perfil (Cog icon)

## Layout Changes

### Contenedor Principal
```tsx
// Agregar padding-bottom para espacio de bottom nav en mobile
<main className="pb-0 sm:pb-0 pb-20">
  {/* pb-20 = 80px para bottom nav en mobile */}
</main>
```

### Padding Horizontal
```tsx
// Reducir padding en mobile
<div className="px-4 sm:px-8">
```

### Márgenes Verticales
```tsx
// Reducir espaciado en mobile
<div className="space-y-4 sm:space-y-6">
```

## Widgets

### Dashboard Empleado Mobile
**Mostrar únicamente**:
1. FichajeWidget
2. AusenciasWidget

**Ocultar**:
- NotificacionesWidget (mover a bandeja)
- Cualquier otro widget adicional

### Widget Card Base
```tsx
// Altura reducida en mobile
<WidgetCard className="h-[240px] sm:h-[280px]">
```

### Layout de Widgets
```tsx
// Stack vertical en mobile, grid en desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
```

## Componentes Específicos

### FichajeWidget

**Layout**:
```tsx
// Contenido principal: stack vertical en mobile, grid en desktop
<div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
```

**Reloj circular**:
```tsx
// Reducir tamaño en mobile
<div className="w-32 h-32 sm:w-40 sm:h-40">
```

**Botones**:
```tsx
// Full width en mobile
<Button className="w-full sm:w-auto">
```

### AusenciasWidget

**Lista de ausencias**:
```tsx
// Reducir altura máxima en mobile
<div className="max-h-[140px] sm:max-h-[180px] overflow-y-auto">
```

**Tarjetas de ausencia**:
```tsx
// Padding y texto más compacto
<div className="p-3 sm:p-4">
  <p className="text-xs sm:text-sm">
```

## Tipografía Mobile

### Títulos de Página
```tsx
text-xl sm:text-2xl  // 20px → 24px
```

### Títulos de Widget
```tsx
text-base sm:text-lg  // 16px → 18px
```

### Texto Normal
```tsx
text-sm sm:text-base  // 14px → 16px
```

### Texto Secundario
```tsx
text-xs sm:text-sm  // 12px → 14px
```

### Etiquetas/Badges
```tsx
text-[10px] sm:text-xs  // 10px → 12px
```

## Botones

### Botón Principal
```tsx
<Button className="w-full sm:w-auto">
  {/* Full width en mobile, auto en desktop */}
</Button>
```

### Botón con Icono
```tsx
// Ocultar texto en mobile si es necesario
<Button>
  <Icon className="w-4 h-4" />
  <span className="hidden sm:inline ml-2">Texto</span>
</Button>
```

## Modales y Diálogos

### Dialog/Sheet
```tsx
// En mobile usar Sheet (slide from bottom) en lugar de Dialog (center)
// Componente adaptativo basado en breakpoint
```

### Ancho de Modales
```tsx
<DialogContent className="w-[95vw] sm:max-w-[600px]">
  {/* Casi full width en mobile, max width en desktop */}
</DialogContent>
```

## Tablas

### Mobile Strategy
```tsx
// Ocultar columnas menos importantes en mobile
<th className="hidden sm:table-cell">Columna</th>
<td className="hidden sm:table-cell">Dato</td>

// O usar cards en lugar de tabla en mobile
<div className="block sm:hidden">
  {/* Card layout */}
</div>
<table className="hidden sm:table">
  {/* Table layout */}
</table>
```

## Formularios

### Input Fields
```tsx
<Input className="text-sm sm:text-base" />
// Font size para evitar zoom en iOS
```

### Labels
```tsx
<Label className="text-xs sm:text-sm">
```

### Spacing entre Fields
```tsx
<form className="space-y-3 sm:space-y-4">
```

## Dashboard Específicos

### Empleado Dashboard Mobile
```tsx
<div className="space-y-4">
  <FichajeWidget />
  <AusenciasWidget />
  {/* NotificacionesWidget solo en desktop o bandeja */}
</div>
```

### Manager Dashboard Mobile
- Mantener widgets esenciales
- Gráficos adaptativos (simplificados en mobile)
- Tablas → cards en mobile

### HR Admin Dashboard Mobile
- Similar a manager
- Métricas en grid 2x2 en mobile vs 4x1 en desktop

## Sistema de Colores (Sin Cambios)

Mantener el sistema de colores existente:
- Accent: #d97757 (terracota)
- Background: Blanco/Grays neutros
- Text: Gray-900 (títulos), Gray-600 (secondary)

## Iconografía

Usar lucide-react (ya instalado):
- Tamaño mobile: `w-4 h-4` o `w-5 h-5`
- Tamaño desktop: `w-5 h-5` o `w-6 h-6`

## Touch Targets

Mínimo 44x44px para elementos clickeables en mobile:
```tsx
<button className="min-h-[44px] min-w-[44px]">
```

## Z-Index Hierarchy

```
Bottom Navigation: z-50
Modals/Dialogs: z-50
Toasts: z-[100]
```

## Implementación por Fases

### Fase 1: Navegación y Layout Base ✓
1. Crear BottomNavigation component
2. Actualizar layouts principales con padding-bottom
3. Ocultar sidebar en mobile

### Fase 2: Dashboard Empleado
1. Adaptar FichajeWidget
2. Adaptar AusenciasWidget
3. Configurar visibilidad de widgets
4. Ajustar grid layout

### Fase 3: Dashboards Manager y HR
1. Adaptar widgets específicos
2. Convertir tablas a cards en mobile
3. Simplificar gráficos

### Fase 4: Formularios y Vistas Detalle
1. Adaptar formularios de ausencias
2. Adaptar formularios de fichajes
3. Adaptar vistas de perfil/settings

### Fase 5: Testing y Refinamiento
1. Probar en dispositivos reales
2. Ajustar touch targets
3. Optimizar animaciones
4. Performance testing

## Notas de Implementación

1. **Mobile-first approach**: Escribir estilos mobile primero, luego `sm:` para desktop
2. **Componentes reutilizables**: Crear variantes mobile de componentes complejos
3. **Progressive enhancement**: Desktop agrega funcionalidad, mobile mantiene core
4. **Performance**: Lazy load widgets pesados, optimizar imágenes
5. **Accesibilidad**: Mantener labels, ARIA attributes, keyboard navigation

## Testing Checklist

- [ ] iPhone SE (375px) - mínimo soporte
- [ ] iPhone 12/13/14 (390px) - común
- [ ] iPhone 14 Pro Max (430px) - grande
- [ ] Android mid-range (360px-400px)
- [ ] Touch targets >= 44px
- [ ] Scroll natural sin interferencia
- [ ] Bottom nav no obstruye contenido
- [ ] Formularios no causan zoom en iOS
- [ ] Transiciones suaves
