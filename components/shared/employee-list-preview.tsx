'use client';

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

interface EmployeeListPreviewProps {
  empleados: EmployeeListItem[];
  maxVisible?: number;
  emptyLabel?: string;
  dense?: boolean;
  className?: string;
}

export function EmployeeListPreview({
  empleados,
  maxVisible = 3,
  emptyLabel = 'Sin personas',
  dense = false,
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

  return (
    <div className={cn('space-y-2', className)}>
      {visibles.map((empleado) => {
        const fotoUrl = empleado.fotoUrl ?? empleado.avatar ?? null;
        const displayName = empleado.apellidos
          ? `${empleado.nombre} ${empleado.apellidos}`.trim()
          : empleado.nombre;

        return (
          <div
            key={empleado.id}
            className="flex items-center gap-2 min-w-0"
          >
            <EmployeeAvatar
              nombre={empleado.nombre}
              apellidos={empleado.apellidos ?? undefined}
              fotoUrl={fotoUrl}
              size={dense ? 'xs' : 'sm'}
              className={cn(
                dense ? 'h-7 w-7' : 'h-8 w-8',
                'flex-shrink-0'
              )}
              fallbackClassName={dense ? 'text-[9px]' : 'text-[11px]'}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {displayName}
              </p>
              {empleado.subtitle && (
                <p className="text-xs text-gray-500 truncate">{empleado.subtitle}</p>
              )}
            </div>
          </div>
        );
      })}

      {restantes > 0 && (
        <p className="text-xs font-medium text-gray-500">
          +{restantes} {restantes === 1 ? 'persona más' : 'personas más'}
        </p>
      )}
    </div>
  );
}



