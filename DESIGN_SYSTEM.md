# Sistema de Diseño - Clousadmin

## 🎨 Sistema de Colores

### Colores Principales

#### Color de Acento (Detalles)
El color principal para detalles, resaltados y elementos interactivos:

```css
/* Activo/Principal */
#d97757

/* No activo/Deshabilitado */
#e1af9e

/* Hover/Interacción */
#c6613f
```

**Uso en Tailwind CSS**:
```tsx
// Estado activo
className="text-[#d97757]"

// Estado no activo
className="text-[#e1af9e]"

// Hover
className="hover:text-[#c6613f]"
```

#### Colores de Estado

Los colores de estado se mantienen con la paleta estándar de Tailwind:

- **Pendiente/Advertencia**: `bg-yellow-100 text-yellow-800`
- **Aprobado/Éxito**: `bg-green-100 text-green-800`
- **Rechazado/Error**: `bg-red-100 text-red-800`
- **Cancelado/Neutral**: `bg-gray-100 text-gray-800`
- **Editado/Info**: `bg-blue-100 text-blue-800`

### Escala de Grises

```css
/* Texto principal */
text-gray-900

/* Texto secundario */
text-gray-700

/* Iconos estándar */
text-gray-600

/* Texto deshabilitado */
text-gray-500

/* Fondos sutiles */
bg-gray-50, bg-gray-100

/* Bordes */
border-gray-200, border-gray-300
```

---

## 🎯 Sistema de Iconos

### Principios de Diseño

1. **Sin fondos**: Los iconos NO deben tener fondos circulares ni contenedores decorativos
2. **Color por defecto**: Gris oscuro (`text-gray-600`)
3. **Color de acento**: Solo usar `#d97757` para iconos destacados o activos
4. **Biblioteca**: `lucide-react` exclusivamente
5. **Consistencia**: Mantener tamaños estándar

### Biblioteca de Iconos

**Fuente**: [lucide-react](https://lucide.dev/)

```tsx
import { Home, Clock, Calendar, User } from 'lucide-react';
```

### Tamaños Estándar

| Contexto | Clases Tailwind | Píxeles |
|----------|----------------|---------|
| Icono pequeño (botones) | `w-4 h-4` | 16px |
| Icono estándar | `w-5 h-5` | 20px |
| Icono grande (encabezados) | `w-6 h-6` | 24px |
| Icono extra grande | `w-8 h-8` | 32px |

### Patrones de Implementación

#### ✅ Correcto: Icono Simple (por defecto)

```tsx
import { Clock } from 'lucide-react';

// Icono estándar gris
<Clock className="w-5 h-5 text-gray-600" />
```

#### ✅ Correcto: Icono con Color de Acento

```tsx
import { Calendar } from 'lucide-react';

// Icono destacado
<Calendar className="w-5 h-5 text-[#d97757]" />
```

#### ✅ Correcto: Icono con Estados Interactivos

```tsx
import { Edit } from 'lucide-react';

// Icono con hover
<button className="group">
  <Edit className="w-5 h-5 text-gray-600 group-hover:text-[#c6613f] transition-colors" />
</button>
```

#### ✅ Correcto: Icono en Widget/Card

```tsx
// Widget de balance de horas
<div className="flex items-start gap-3">
  <Clock className="w-5 h-5 text-[#d97757] flex-shrink-0 mt-0.5" />
  <div>
    <p className="text-sm text-gray-600">Balance de Horas</p>
    <p className="text-2xl font-semibold text-gray-900">+8:30</p>
  </div>
</div>
```

#### ❌ Incorrecto: Icono con Fondo Circular

```tsx
// NO HACER ESTO
<div className="w-10 h-10 rounded-full bg-[#d97757] flex items-center justify-center">
  <Clock className="w-5 h-5 text-white" />
</div>
```

#### ❌ Incorrecto: Usar Color Antiguo

```tsx
// NO USAR #f26c21
<Clock className="w-5 h-5 text-[#f26c21]" />

// USAR EN SU LUGAR
<Clock className="w-5 h-5 text-[#d97757]" />
```

### Excepciones Permitidas

**Avatares de Usuario**: Los avatares pueden mantener fondos ya que representan personas:

```tsx
<AvatarFallback className="bg-gray-900 text-white text-lg">
  {getInitials()}
</AvatarFallback>
```

**Botones de Acción Críticos**: Botones pequeños de acción pueden tener fondo:

```tsx
// Botón de editar perfil (excepcional)
<button className="bg-gray-900 text-white rounded-full p-1.5 hover:bg-gray-800">
  <Edit2 className="w-3 h-3" />
</button>
```

---

## 📋 Ejemplos Completos

### Widget de Información

```tsx
export function InfoWidget({ icon: Icon, label, value, highlighted = false }: InfoWidgetProps) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-start gap-3">
        <Icon
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            highlighted ? 'text-[#d97757]' : 'text-gray-600'
          }`}
        />
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
```

### Lista con Iconos

```tsx
export function MenuItem({ icon: Icon, label, active = false }: MenuItemProps) {
  return (
    <button
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-gray-100 text-[#d97757]'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon
        className={`w-5 h-5 ${
          active ? 'text-[#d97757]' : 'text-gray-600'
        }`}
      />
      <span>{label}</span>
    </button>
  );
}
```

### Badge con Estado

```tsx
export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
    approved: { label: 'Aprobada', className: 'bg-green-100 text-green-800', icon: CheckCircle },
    rejected: { label: 'Rechazada', className: 'bg-red-100 text-red-800', icon: XCircle },
  };

  const { label, className, icon: Icon } = variants[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
```

---

## 🔧 Utilidades CSS

### Clases de Color Personalizadas

Si necesitas usar los colores de acento frecuentemente, considera crear utilidades:

```tsx
// lib/utils/colors.ts
export const accentColors = {
  active: '#d97757',
  inactive: '#e1af9e',
  hover: '#c6613f',
} as const;

// Uso en componentes
import { accentColors } from '@/lib/utils/colors';

<Icon style={{ color: accentColors.active }} />
```

### Classes Helper

```tsx
// lib/utils/classes.ts
export const iconClasses = {
  default: 'w-5 h-5 text-gray-600',
  accent: 'w-5 h-5 text-[#d97757]',
  small: 'w-4 h-4 text-gray-600',
  large: 'w-6 h-6 text-gray-600',
} as const;

// Uso
import { iconClasses } from '@/lib/utils/classes';

<Icon className={iconClasses.accent} />
```

---

## 📝 Checklist de Revisión

Antes de crear/modificar componentes con iconos, verifica:

- [ ] El icono NO tiene fondo circular (excepto avatares/botones críticos)
- [ ] Se usa `lucide-react` como biblioteca de iconos
- [ ] El color por defecto es `text-gray-600`
- [ ] Si se destaca, se usa `text-[#d97757]`
- [ ] El tamaño es apropiado para el contexto (`w-5 h-5` estándar)
- [ ] NO se usa el color antiguo `#f26c21`
- [ ] Los estados hover usan `hover:text-[#c6613f]`
- [ ] Los elementos deshabilitados usan `text-[#e1af9e]`

---

## 🚀 Migración desde Sistema Antiguo

### Buscar y Reemplazar

```bash
# Buscar uso del color antiguo
grep -r "#f26c21" --include="*.tsx" --include="*.ts"

# Reemplazar por nuevo color
# Manual: cambiar #f26c21 por #d97757
```

### Eliminar Fondos de Iconos

**Antes**:
```tsx
<div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
  <Clock className="w-5 h-5 text-white" />
</div>
```

**Después**:
```tsx
<Clock className="w-5 h-5 text-[#d97757]" />
```

---

## 📚 Referencias

- [Lucide Icons](https://lucide.dev/) - Biblioteca de iconos
- [Tailwind CSS](https://tailwindcss.com/docs) - Framework de utilidades CSS
- Color principal: `#d97757` (terracota/naranja suave)
- Filosofía: Minimalista, limpio, sin adornos innecesarios

---

**Última actualización**: 2025-11-07
**Versión**: 1.0.0
