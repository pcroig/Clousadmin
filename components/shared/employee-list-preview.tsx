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
  const dimensionClasses =
    resolvedAvatarSize === 'xxs'
      ? 'h-6 w-6'
      : resolvedAvatarSize === 'xs'
        ? 'h-7 w-7'
        : resolvedAvatarSize === 'md'
          ? 'h-9 w-9'
          : 'h-8 w-8';
  const fallbackSize =
    resolvedAvatarSize === 'xxs'
      ? 'text-[8px]'
      : resolvedAvatarSize === 'xs'
        ? 'text-[9px]'
        : 'text-[11px]';

  return (
    <div className={cn('flex -space-x-2 flex-shrink-0', className)}>
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
              className={cn(dimensionClasses)}
              fallbackClassName={fallbackSize}
            />
          </EmpleadoHoverCard>
        );
      })}

      {restantes > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600',
            dense ? 'h-7 w-7 text-[9px]' : 'h-8 w-8'
          )}
        >
          +{restantes}
        </div>
      )}
    </div>
  );
}



