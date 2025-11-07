# 🎨 Sistema de Colores Unificado - Clousadmin

## Resumen Ejecutivo

Este documento define el sistema de colores unificado para toda la plataforma Clousadmin. **Todos los componentes deben seguir estas reglas estrictamente.**

---

## 📋 Reglas Fundamentales

### 1. **Iconos - SIN FONDO**
- ✅ **Iconos siempre en gris oscuro**: `text-gray-600` o `text-gray-700`
- ❌ **NUNCA usar fondos de color en iconos** (ej: `bg-green-50`, `bg-blue-100`)
- ✅ **Iconos destacados**: Solo usar `text-[#d97757]` cuando el icono necesita destacar
- ✅ **Hover en iconos**: `hover:text-[#c6613f]` para interacciones

### 2. **Color Principal de Acento**
- **Activo**: `#d97757` (terracota/naranja suave)
- **Inactivo**: `#e1af9e` (naranja pálido)
- **Hover**: `#c6613f` (naranja oscuro)
- ❌ **NO usar**: `#f26c21` (color antiguo, deprecado)

### 3. **Colores Permitidos**

#### Colores Base (Fondos y Superficies)
- `bg-white` / `bg-gray-50` / `bg-gray-100` - Fondos neutros
- `bg-stone-100` / `bg-stone-200` - Fondos crema/pastel (para avatares, elementos decorativos)

#### Colores de Texto
- `text-gray-900` - Texto principal
- `text-gray-700` - Texto secundario
- `text-gray-600` - Texto terciario (iconos por defecto)
- `text-gray-500` - Texto deshabilitado

#### Colores de Acento (Solo para detalles destacados)
- `text-[#d97757]` - Color principal activo
- `text-[#e1af9e]` - Color inactivo
- `hover:text-[#c6613f]` - Hover

#### Colores de Estado (Solo para badges y estados)
- `bg-green-100 text-green-700` - Aprobado/Éxito
- `bg-red-100 text-red-700` - Rechazado/Error
- `bg-yellow-100 text-yellow-700` - Pendiente/Advertencia
- `bg-blue-100 text-blue-700` - Info (uso limitado)

#### Colores de Botones de Acción (EXCEPCIÓN)
- ✅ **Botón Aprobar**: `bg-green-600 hover:bg-green-700 text-white`
- ✅ **Botón Rechazar**: `bg-red-600 hover:bg-red-700 text-white`
- ✅ **Botón Principal**: `bg-[#d97757] hover:bg-[#c6613f] text-white`

### 4. **Colores NO Permitidos**
- ❌ Fondos de color en iconos (`bg-green-50`, `bg-blue-100`, etc.)
- ❌ Colores arbitrarios no definidos en este sistema
- ❌ `#f26c21` (color antiguo deprecado)
- ❌ Colores vibrantes sin propósito específico

---

## 🎯 Aplicación por Tipo de Componente

### Iconos

```tsx
// ✅ CORRECTO - Icono sin fondo, gris oscuro
<CheckCircle2 className="w-5 h-5 text-gray-600" />

// ✅ CORRECTO - Icono destacado con color de acento
<Calendar className="w-5 h-5 text-[#d97757]" />

// ✅ CORRECTO - Icono con hover interactivo
<Edit className="w-5 h-5 text-gray-600 hover:text-[#c6613f] transition-colors" />

// ❌ INCORRECTO - Icono con fondo de color
<div className="bg-green-50 border-green-200">
  <CheckCircle2 className="w-5 h-5 text-green-600" />
</div>

// ✅ CORRECTO - Sin fondo, solo icono
<CheckCircle2 className="w-5 h-5 text-gray-600" />
```

### Notificaciones

```tsx
// ✅ CORRECTO - Notificación sin fondo en icono
<div className="flex items-start gap-4">
  <CheckCircle2 className="w-5 h-5 text-gray-600 flex-shrink-0" />
  <div className="flex-1">
    <p className="text-sm font-semibold text-gray-900">Título</p>
    <p className="text-sm text-gray-600">Mensaje</p>
  </div>
</div>

// ❌ INCORRECTO - Notificación con fondo en icono
<div className="flex items-start gap-4">
  <div className="bg-green-50 border-green-200 p-2 rounded-lg">
    <CheckCircle2 className="w-5 h-5 text-green-600" />
  </div>
  ...
</div>
```

### Badges de Estado

```tsx
// ✅ CORRECTO - Badge de estado aprobado
<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
  Aprobada
</span>

// ✅ CORRECTO - Badge de estado rechazado
<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
  Rechazada
</span>
```

### Botones de Acción

```tsx
// ✅ CORRECTO - Botón aprobar (EXCEPCIÓN permitida)
<button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
  Aprobar
</button>

// ✅ CORRECTO - Botón rechazar (EXCEPCIÓN permitida)
<button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
  Rechazar
</button>

// ✅ CORRECTO - Botón principal con color de acento
<button className="bg-[#d97757] hover:bg-[#c6613f] text-white px-4 py-2 rounded">
  Guardar
</button>
```

---

## 📐 Paleta de Colores Completa

### Colores de Acento
| Nombre | Hex | Uso | Clase Tailwind |
|--------|-----|-----|----------------|
| Activo | `#d97757` | Elementos activos, iconos destacados | `text-[#d97757]` |
| Inactivo | `#e1af9e` | Elementos deshabilitados | `text-[#e1af9e]` |
| Hover | `#c6613f` | Estados hover | `hover:text-[#c6613f]` |

### Colores de Fondo
| Nombre | Hex | Uso | Clase Tailwind |
|--------|-----|-----|----------------|
| Blanco | `#FFFFFF` | Fondos principales | `bg-white` |
| Gris claro | `#F9FAFB` | Fondos secundarios | `bg-gray-50` |
| Gris medio | `#F3F4F6` | Fondos terciarios | `bg-gray-100` |
| Crema/Pastel | `#F5F5F4` | Avatares, elementos decorativos | `bg-stone-100` |

### Colores de Texto
| Nombre | Hex | Uso | Clase Tailwind |
|--------|-----|-----|----------------|
| Principal | `#111827` | Texto principal | `text-gray-900` |
| Secundario | `#374151` | Texto secundario | `text-gray-700` |
| Terciario | `#4B5563` | Iconos, texto terciario | `text-gray-600` |
| Deshabilitado | `#6B7280` | Texto deshabilitado | `text-gray-500` |

### Colores de Estado (Badges)
| Estado | Fondo | Texto | Clase Tailwind |
|--------|-------|-------|----------------|
| Aprobado/Éxito | `#DCFCE7` | `#166534` | `bg-green-100 text-green-700` |
| Rechazado/Error | `#FEE2E2` | `#991B1B` | `bg-red-100 text-red-700` |
| Pendiente/Advertencia | `#FEF3C7` | `#92400E` | `bg-yellow-100 text-yellow-700` |
| Info | `#DBEAFE` | `#1E40AF` | `bg-blue-100 text-blue-700` |

### Colores de Botones (EXCEPCIÓN)
| Acción | Fondo | Hover | Clase Tailwind |
|--------|-------|-------|----------------|
| Aprobar | `#16A34A` | `#15803D` | `bg-green-600 hover:bg-green-700` |
| Rechazar | `#DC2626` | `#B91C1C` | `bg-red-600 hover:bg-red-700` |
| Principal | `#d97757` | `#c6613f` | `bg-[#d97757] hover:bg-[#c6613f]` |

---

## 🔧 Utilidades y Helpers

### Usar `lib/design-system.ts`

```tsx
import { iconClasses, accentColors } from '@/lib/design-system';

// Icono por defecto (gris oscuro)
<Clock className={iconClasses.default} />

// Icono con acento
<Calendar className={iconClasses.accent} />

// Icono interactivo
<Edit className={iconClasses.interactive} />

// Color de acento programático
const color = accentColors.active; // '#d97757'
```

---

## ✅ Checklist de Aplicación

Al revisar o crear componentes, verificar:

- [ ] Los iconos NO tienen fondo de color
- [ ] Los iconos usan `text-gray-600` por defecto
- [ ] Los iconos destacados usan `text-[#d97757]`
- [ ] Los hovers usan `hover:text-[#c6613f]`
- [ ] NO se usa `#f26c21` (color antiguo)
- [ ] Los badges de estado usan los colores definidos
- [ ] Los botones de aprobar/rechazar mantienen verde/rojo
- [ ] Los fondos usan solo colores base (blanco, gris, crema)

---

## 🚫 Anti-Patrones Comunes

### ❌ NO Hacer

```tsx
// Icono con fondo de color
<div className="bg-green-50 border-green-200 p-2 rounded-lg">
  <CheckCircle2 className="w-5 h-5 text-green-600" />
</div>

// Color antiguo deprecado
<Icon className="w-5 h-5 text-[#f26c21]" />

// Colores arbitrarios
<div className="bg-purple-100 text-purple-800">
```

### ✅ Hacer

```tsx
// Icono sin fondo, gris oscuro
<CheckCircle2 className="w-5 h-5 text-gray-600" />

// Color de acento correcto
<Icon className="w-5 h-5 text-[#d97757]" />

// Badge de estado con colores definidos
<span className="bg-green-100 text-green-700">Aprobada</span>
```

---

## 📚 Referencias

- **Archivo de configuración**: `lib/design-system.ts`
- **Variables CSS**: `app/globals.css`
- **Ejemplos de uso**: Ver componentes en `components/hr/bandeja-entrada-solicitudes.tsx`

---

**Última actualización**: 2025-01-27
**Versión**: 1.0.0

