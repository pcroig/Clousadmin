// ========================================
// Count Badge - Badge para mostrar número de items nuevos
// ========================================
// Badge estandarizado para mostrar contadores en widgets y otros componentes

import { cn } from '@/lib/utils';

interface CountBadgeProps {
  count: string | number;
  className?: string;
}

/**
 * Badge estandarizado para mostrar contadores de items nuevos
 * Diseño: cuadrado con bordes redondeados, tamaño compacto, color de marca
 */
export function CountBadge({ count, className }: CountBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-[18px] h-[18px]',
        'px-1.5',
        'bg-accent text-white',
        'text-[10px] sm:text-[11px] font-semibold',
        'rounded-md',
        'shrink-0',
        className
      )}
    >
      {count}
    </span>
  );
}







