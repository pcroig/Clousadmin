# Ejemplos de Uso - Sistema de Diseño

Este documento proporciona ejemplos prácticos de cómo usar el sistema de diseño centralizado.

## Importación

```tsx
import {
  iconClasses,
  accentColors,
  getIconClasses,
  getAccentTextClass,
  badgeVariants
} from '@/lib/design-system';
```

## Ejemplos de Iconos

### 1. Icono Simple (por defecto)

```tsx
import { Clock } from 'lucide-react';
import { iconClasses } from '@/lib/design-system';

// En lugar de:
<Clock className="w-5 h-5 text-gray-600" />

// Usar:
<Clock className={iconClasses.default} />
```

### 2. Icono con Color de Acento

```tsx
import { Calendar } from 'lucide-react';
import { iconClasses } from '@/lib/design-system';

// En lugar de:
<Calendar className="w-5 h-5 text-[#d97757]" />

// Usar:
<Calendar className={iconClasses.accent} />
```

### 3. Icono Interactivo (con hover)

```tsx
import { Edit2 } from 'lucide-react';
import { iconClasses } from '@/lib/design-system';

// Icono que cambia de color al hacer hover
<button>
  <Edit2 className={iconClasses.interactive} />
</button>
```

### 4. Icono Condicional (activo/inactivo)

```tsx
import { Home } from 'lucide-react';
import { getIconClasses } from '@/lib/design-system';

function MenuItem({ isActive }: { isActive: boolean }) {
  return (
    <button>
      <Home className={getIconClasses(isActive, 'default')} />
      <span>Inicio</span>
    </button>
  );
}
```

### 5. Diferentes Tamaños

```tsx
import { iconClasses } from '@/lib/design-system';
import { Settings } from 'lucide-react';

// Pequeño (16px) - para botones compactos
<Settings className={iconClasses.small} />

// Por defecto (20px) - uso general
<Settings className={iconClasses.default} />

// Grande (24px) - para encabezados
<Settings className={iconClasses.large} />

// Extra grande (32px) - decorativo
<Settings className={iconClasses.xlarge} />
```

## Ejemplos de Widgets/Cards

### Widget de Balance

```tsx
import { Clock } from 'lucide-react';
import { iconClasses } from '@/lib/design-system';
import { Card } from '@/components/ui/card';

function BalanceWidget({ balance }: { balance: number }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className={iconClasses.accent} />
        <h3 className="text-base font-semibold">Balance de Horas</h3>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {balance >= 0 ? '+' : ''}{balance.toFixed(1)}h
      </div>
    </Card>
  );
}
```

### Widget con Icono Interactivo

```tsx
import { Folder } from 'lucide-react';
import { iconClasses } from '@/lib/design-system';

function FolderItem({ name, count }: { name: string; count: number }) {
  return (
    <div className="flex flex-col items-center cursor-pointer group">
      <Folder className={iconClasses.interactive} />
      <p className="text-sm font-medium text-gray-900">{name}</p>
      <p className="text-xs text-gray-500">{count} documentos</p>
    </div>
  );
}
```

## Ejemplos de Badges

### Badge de Estado Simple

```tsx
import { Badge } from '@/components/ui/badge';
import { badgeVariants } from '@/lib/design-system';

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const labels = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
  };

  return (
    <Badge className={badgeVariants[status]}>
      {labels[status]}
    </Badge>
  );
}
```

### Badge con Icono

```tsx
import { Badge } from '@/components/ui/badge';
import { badgeVariants } from '@/lib/design-system';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

function StatusBadgeWithIcon({
  status
}: {
  status: 'pending' | 'approved' | 'rejected'
}) {
  const config = {
    pending: {
      label: 'Pendiente',
      icon: Clock,
      className: badgeVariants.pending
    },
    approved: {
      label: 'Aprobado',
      icon: CheckCircle,
      className: badgeVariants.approved
    },
    rejected: {
      label: 'Rechazado',
      icon: XCircle,
      className: badgeVariants.rejected
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge className={className}>
      <Icon className="w-3.5 h-3.5 mr-1" />
      {label}
    </Badge>
  );
}
```

## Ejemplos de Botones

### Botón con Icono

```tsx
import { Plus } from 'lucide-react';
import { iconClasses } from '@/lib/design-system';
import { Button } from '@/components/ui/button';

function AddButton() {
  return (
    <Button>
      <Plus className={iconClasses.small} />
      <span className="ml-2">Añadir</span>
    </Button>
  );
}
```

### Botón de Icono Solo (sin fondo)

```tsx
import { Edit2 } from 'lucide-react';
import { iconClasses } from '@/lib/design-system';

function EditButton() {
  return (
    <button
      className="p-1"
      title="Editar"
    >
      <Edit2 className={iconClasses.interactiveSmall} />
    </button>
  );
}
```

## Ejemplos de Menú/Navegación

### Item de Menú con Estado Activo

```tsx
import { Home, Calendar, Clock, Settings } from 'lucide-react';
import { getIconClasses } from '@/lib/design-system';

function MenuItem({
  icon: Icon,
  label,
  active
}: {
  icon: typeof Home;
  label: string;
  active: boolean;
}) {
  return (
    <button
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-gray-100'
          : 'hover:bg-gray-50'
      }`}
    >
      <Icon className={getIconClasses(active, 'default')} />
      <span className={active ? 'text-[#d97757] font-medium' : 'text-gray-700'}>
        {label}
      </span>
    </button>
  );
}
```

### Tabs con Iconos

```tsx
import { FileText, Calendar } from 'lucide-react';
import { getIconClasses } from '@/lib/design-system';

function TabButton({
  icon: Icon,
  label,
  isActive,
  onClick
}: {
  icon: typeof FileText;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
        isActive
          ? 'border-[#d97757] text-[#d97757]'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon className={getIconClasses(isActive, 'small')} />
      {label}
    </button>
  );
}
```

## Uso con Estilos Inline

En casos donde necesites usar estilos inline en lugar de clases:

```tsx
import { Calendar } from 'lucide-react';
import { accentColors, getAccentColorStyle } from '@/lib/design-system';

// Opción 1: Usar constantes
<Calendar style={{ color: accentColors.active }} />

// Opción 2: Usar helper
<Calendar style={getAccentColorStyle('active')} />

// Con hover (necesitas estado)
function InteractiveIcon() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Calendar
      style={{
        color: isHovered ? accentColors.hover : accentColors.active
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  );
}
```

## Antes y Después

### ❌ Antes (No escalable)

```tsx
// Colores hardcodeados en cada componente
<Clock className="w-5 h-5 text-[#F26C21]" />
<Calendar className="w-5 h-5 text-[#f26c21]" /> // inconsistente
<Settings className="w-5 h-5" style={{ color: '#F26C21' }} />

// Estados duplicados en múltiples lugares
function getEstadoBadge(estado: string) {
  const variants = {
    pendiente: { className: 'bg-yellow-100 text-yellow-800' },
    // ... repetido en 10 archivos diferentes
  };
}
```

### ✅ Después (Escalable y mantenible)

```tsx
import { iconClasses, badgeVariants } from '@/lib/design-system';

// Consistente y fácil de mantener
<Clock className={iconClasses.accent} />
<Calendar className={iconClasses.accent} />
<Settings className={iconClasses.accent} />

// Sistema centralizado
function getEstadoBadge(estado: BadgeVariant) {
  return <Badge className={badgeVariants[estado]}>{estado}</Badge>;
}
```

## Migración Gradual

Puedes migrar gradualmente tus componentes:

```tsx
// PASO 1: Importar el sistema
import { iconClasses } from '@/lib/design-system';

// PASO 2: Reemplazar clases hardcodeadas
// Antes:
<Clock className="w-5 h-5 text-gray-600" />
// Después:
<Clock className={iconClasses.default} />

// PASO 3: Actualizar colores de acento
// Antes:
<Calendar className="w-5 h-5 text-[#F26C21]" />
// Después:
<Calendar className={iconClasses.accent} />
```

## Notas

- **Consistencia**: Usar el sistema asegura que todos los iconos tengan el mismo tamaño y color
- **Mantenibilidad**: Cambios centralizados se propagan automáticamente
- **Escalabilidad**: Fácil añadir nuevas variantes sin duplicar código
- **Type-safe**: TypeScript ayuda a prevenir errores
