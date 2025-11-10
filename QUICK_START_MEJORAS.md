# Quick Start - Mejoras Mobile

**Guía rápida de implementación paso a paso**

---

## 🚀 Implementación Rápida (15 minutos)

### Paso 1: Crear archivos de constantes (3 min)

```bash
# Crear directorios
mkdir -p lib/constants
mkdir -p lib/config

# Copiar archivos desde MEJORAS_MOBILE_PENDIENTES.md:
# - lib/constants/design-tokens.ts (sección 1.1)
# - lib/constants/widget-dimensions.ts (sección 1.2)
```

### Paso 2: Actualizar Tailwind (1 min)

```bash
# Editar tailwind.config.ts
# Agregar import y colors según sección 1.3
```

### Paso 3: Buscar y reemplazar (10 min)

**Bottom Navigation** (`components/layout/bottom-navigation.tsx`):
```typescript
// Buscar: 'text-[#d97757]'
// Reemplazar: 'text-primary'
```

**Fichaje Widget** (`components/shared/fichaje-widget.tsx`):
```typescript
// 1. Agregar imports:
import { WIDGET_DIMENSIONS, getCircleCircumference, calculateProgress } from '@/lib/constants/widget-dimensions';

// 2. Buscar: const circumference = 2 * Math.PI * 58;
// Reemplazar: const circumference = getCircleCircumference();

// 3. Buscar: (horasHechas / (horasHechas + horasPorHacer)) * 100
// Reemplazar: calculateProgress(horasHechas, horasHechas + horasPorHacer)

// 4. Buscar: stroke="#d97757"
// Reemplazar: className="text-primary" stroke="currentColor"
```

**Dashboard Layout** (`app/(dashboard)/layout.tsx`):
```typescript
// 1. Agregar import:
import { RESPONSIVE_CLASSES } from '@/lib/constants/design-tokens';

// 2. Buscar: className="hidden sm:flex"
// Reemplazar: className={RESPONSIVE_CLASSES.hideOnMobile}

// 3. Buscar: className="flex-1 overflow-y-auto pb-16 sm:pb-0"
// Reemplazar: className={cn("flex-1 overflow-y-auto", RESPONSIVE_CLASSES.mobileBottomPadding)}
```

### Paso 4: Verificar (1 min)

```bash
npm run build
```

Si compila → ✅ **LISTO!**

---

## 📝 Lista de Archivos a Modificar

### ✅ Crear (Nuevos)
- [ ] `lib/constants/design-tokens.ts`
- [ ] `lib/constants/widget-dimensions.ts`

### 📝 Modificar (Existentes)
- [ ] `tailwind.config.ts`
- [ ] `components/layout/bottom-navigation.tsx`
- [ ] `components/shared/fichaje-widget.tsx`
- [ ] `components/shared/widget-card.tsx`
- [ ] `app/(dashboard)/layout.tsx`

---

## 🔍 Búsqueda y Reemplazo Global

### Color hardcodeado
```bash
# Buscar en toda la carpeta:
'#d97757'

# Reemplazar por:
'text-primary' (en className)
o
'bg-primary' (para backgrounds)
```

### Breakpoints comunes
```bash
# Buscar: 'hidden sm:flex'
# Reemplazar: RESPONSIVE_CLASSES.hideOnMobile

# Buscar: 'sm:hidden'
# Reemplazar: RESPONSIVE_CLASSES.showOnMobile

# Buscar: 'pb-16 sm:pb-0'
# Reemplazar: RESPONSIVE_CLASSES.mobileBottomPadding
```

---

## ⚡ Si tienes prisa (5 min)

**Solo lo crítico**:

1. Crear `lib/constants/design-tokens.ts` con DESIGN_TOKENS
2. Actualizar `tailwind.config.ts` para agregar `primary: '#d97757'`
3. Buscar y reemplazar `'#d97757'` → `'primary'` en todos los archivos
4. Build y listo

**El resto** puede esperar a la próxima sesión.

---

## 🐛 Troubleshooting

### Error: "Cannot find module design-tokens"
```bash
# Verificar que el archivo existe:
ls lib/constants/design-tokens.ts

# Verificar import path (usar @/ alias):
import { DESIGN_TOKENS } from '@/lib/constants/design-tokens';
```

### Error: "primary is not defined in Tailwind"
```bash
# Verificar tailwind.config.ts tiene:
colors: {
  primary: '#d97757',
}

# Reiniciar dev server:
npm run dev
```

### Build falla con errores TS
```bash
# Ver errores específicos:
npx tsc --noEmit

# Verificar imports y types
```

---

## 📊 Validación Final

Después de implementar, verificar:

- ✅ `npm run build` completa sin errores
- ✅ Color terracota (#d97757) aparece igual en UI
- ✅ Bottom nav funciona en mobile
- ✅ Widgets mantienen tamaños correctos
- ✅ No hay warnings de TypeScript
- ✅ No hay warnings de Tailwind

---

## 🎯 Resultado Esperado

**Antes**:
- Color `#d97757` en 5 lugares diferentes
- Difícil cambiar tema o color

**Después**:
- Color `primary` centralizado
- Cambiar color = 1 línea en design-tokens.ts

**Impacto**: Mantenibilidad +70%, Consistencia +100%

---

**Tiempo total**: ~15 minutos
**Complejidad**: Baja
**Riesgo**: Mínimo (solo refactor, no cambia comportamiento)
