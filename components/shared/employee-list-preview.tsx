'use client';

import { EmpleadoHoverCard } from '@/components/empleado/empleado-hover-card';
import { EmployeeAvatar } from '@/components/shared/employee-avatar';
import { cn } from '@/lib/utils';

interface EmployeeListItem {
  id: string;
  nombre: string;
  apellidos?: string | null;
  fotoUrl?: string | null;
  avatar?: string | null;
  subtitle?: string | null;
}

type AvatarSize = 'xxs' | 'xs' | 'sm' | 'md';

interface EmployeeListPreviewProps {
  empleados: EmployeeListItem[];
  maxVisible?: number;
  emptyLabel?: string;
  dense?: boolean;
  avatarSize?: AvatarSize;
  className?: string;
}

/**
 * Muestra avatares apilados (overlapping) de empleados
 * Similar al widget de plantilla
 */
export function EmployeeListPreview({
  empleados,
  maxVisible = 3,
  emptyLabel = 'Sin personas',
  dense = false,
  avatarSize,
  className,
}: EmployeeListPreviewProps) {
  if (!empleados || empleados.length === 0) {
    return (
      <span className={cn('text-xs text-gray-500', className)}>
        {emptyLabel}
      </span>
    );
  }

  const visibles = empleados.slice(0, maxVisible);
  const restantes = empleados.length - visibles.length;
  const resolvedAvatarSize = avatarSize ?? (dense ? 'xs' : 'sm');
  const sizeConfig = {
    xxs: {
      dimension: 'h-6 w-6',
      fallback: 'text-[8px]',
      count: 'h-6 w-6 text-[9px]',
      overlap: '-space-x-1.5',
    },
    xs: {
      dimension: 'h-7 w-7',
      fallback: 'text-[9px]',
      count: 'h-7 w-7 text-[10px]',
      overlap: '-space-x-1.5',
    },
    sm: {
      dimension: 'h-8 w-8',
      fallback: 'text-[11px]',
      count: 'h-8 w-8 text-[11px]',
      overlap: '-space-x-2',
    },
    md: {
      dimension: 'h-9 w-9',
      fallback: 'text-[11px]',
      count: 'h-9 w-9 text-[12px]',
      overlap: '-space-x-2',
    },
  } satisfies Record<AvatarSize, { dimension: string; fallback: string; count: string; overlap: string }>;

  const { dimension, fallback, count, overlap } = sizeConfig[resolvedAvatarSize];

  return (
    <div className={cn('flex flex-shrink-0', overlap, className)}>
      {visibles.map((empleado) => {
        const fotoUrl = empleado.fotoUrl ?? empleado.avatar ?? null;

        return (
          <EmpleadoHoverCard
            key={empleado.id}
            empleado={{
              id: empleado.id,
              nombre: empleado.nombre,
              apellidos: empleado.apellidos,
              fotoUrl,
            }}
            triggerClassName="inline-flex gap-0"
          >
            <EmployeeAvatar
              nombre={empleado.nombre}
              apellidos={empleado.apellidos ?? undefined}
              fotoUrl={fotoUrl}
            size={
              resolvedAvatarSize === 'md'
                ? 'md'
                : resolvedAvatarSize === 'xs'
                  ? 'xs'
                  : resolvedAvatarSize === 'xxs'
                    ? 'xs'
                    : 'sm'
            }
              className={cn(dimension, 'border-2 border-white bg-white')}
              fallbackClassName={fallback}
            />
          </EmpleadoHoverCard>
        );
      })}

      {restantes > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full border-2 border-white bg-gray-100 font-semibold text-gray-600',
            count
          )}
        >
          +{restantes}
        </div>
      )}
    </div>
  );
}



