// ========================================
// Data Table - Generic reusable table component with responsive support
// ========================================

'use client';

import { type LucideIcon } from 'lucide-react';

import { EmployeeAvatar } from '@/components/shared/employee-avatar';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import { cn } from '@/lib/utils';

import { EmptyState } from './empty-state';
import { getInitials } from './utils';

import type { ReactNode } from 'react';

/**
 * Prioridad de columna para responsive
 * - high: Siempre visible (mobile + desktop)
 * - medium: Oculta en mobile pequeño, visible en tablet+
 * - low: Solo visible en desktop
 */
export type ColumnPriority = 'high' | 'medium' | 'low';

export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  width?: string;
  /**
   * Prioridad para responsive (default: 'medium')
   */
  priority?: ColumnPriority;
  /**
   * Si la columna debe ser sticky (útil para primera columna en mobile)
   */
  sticky?: boolean;
  /**
   * Alineación del contenido
   */
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  emptyIcon?: LucideIcon;
  emptyContent?: ReactNode;
  /**
   * Si debe usar modo compacto en mobile (padding reducido)
   */
  compactMobile?: boolean;
  /**
   * Clases adicionales para el contenedor
   */
  className?: string;
}

/**
 * DataTable responsive con:
 * - Scroll horizontal en mobile
 * - Columnas priorizadas (high/medium/low)
 * - Primera columna sticky opcional
 * - Modo compacto en mobile
 *
 * IMPORTANTE: El scroll vertical siempre debe estar a nivel de página (layout),
 * nunca a nivel de tabla. La tabla crece según su contenido.
 */
export function DataTable<T extends object>({
  columns,
  data,
  onRowClick,
  getRowId,
  emptyMessage = 'No hay datos disponibles',
  emptyDescription,
  emptyAction,
  emptyIcon,
  emptyContent,
  compactMobile = true,
  className,
}: DataTableProps<T>) {
  /**
   * Obtener clases de visibilidad según prioridad
   */
  const getPriorityClasses = (priority: ColumnPriority = 'medium') => {
    switch (priority) {
      case 'high':
        return ''; // Siempre visible
      case 'medium':
        return 'hidden sm:table-cell'; // Oculta en mobile, visible en tablet+
      case 'low':
        return 'hidden lg:table-cell'; // Solo desktop
      default:
        return '';
    }
  };

  /**
   * Obtener clases de alineación
   */
  const getAlignmentClasses = (align: Column<T>['align'] = 'left') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  return (
    <div className={cn(
      'rounded-xl border border-gray-200 bg-white overflow-hidden',
      className
    )}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    'py-3 text-sm font-semibold text-gray-900',
                    // Padding responsive
                    compactMobile ? 'px-3 sm:px-6' : 'px-6',
                    // Alineación
                    getAlignmentClasses(column.align),
                    // Visibilidad según prioridad
                    getPriorityClasses(column.priority),
                    // Sticky
                    column.sticky && 'sticky left-0 z-10 bg-gray-50'
                  )}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyContent ?? (
                    <EmptyState
                      layout="table"
                      icon={emptyIcon}
                      title={emptyMessage}
                      description={emptyDescription}
                      action={emptyAction}
                    />
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={getRowId?.(row) || idx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    onRowClick && 'group cursor-pointer hover:bg-gray-50 active:bg-gray-100',
                    'transition-colors'
                  )}
                >
                  {columns.map((column) => {
                    const renderedCell = column.cell
                      ? column.cell(row)
                      : column.accessorKey
                      ? String((row as Record<string, unknown>)[column.accessorKey as string] ?? '')
                      : '';

                    return (
                      <td
                        key={column.id}
                        className={cn(
                          // Tamaño de texto responsive
                          compactMobile ? 'text-xs sm:text-sm' : 'text-sm',
                          // Padding responsive
                          compactMobile ? 'px-3 py-3 sm:px-6 sm:py-4' : 'px-6 py-4',
                          // Color
                          'text-gray-900',
                          // Alineación
                          getAlignmentClasses(column.align),
                          // Visibilidad según prioridad
                          getPriorityClasses(column.priority),
                          // Sticky - heredar el fondo del hover del grupo
                          column.sticky && 'sticky left-0 z-10 bg-white group-hover:bg-gray-50',
                          // Asegurar que todas las celdas hereden el hover del grupo
                          onRowClick && 'group-hover:bg-gray-50'
                        )}
                      >
                        {renderedCell}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Helper component for avatar cells (responsive)
 * - Mobile: avatar más pequeño, texto compacto
 * - Desktop: tamaño normal
 */
interface AvatarCellProps {
  nombre?: string | null;
  apellidos?: string | null;
  fotoUrl?: string | null;
  avatar?: string | null; // Backward compatibility
  subtitle?: string;
  compact?: boolean;
}

export function AvatarCell({
  nombre,
  apellidos,
  fotoUrl,
  avatar,
  subtitle,
  compact = false,
}: AvatarCellProps) {
  const resolvedNombre = nombre ?? 'Empleado';
  const resolvedFotoUrl = fotoUrl ?? avatar ?? null;

  return (
    <div className={cn('flex items-center', compact ? 'gap-2' : 'gap-2 sm:gap-3')}>
      <EmployeeAvatar
        nombre={resolvedNombre}
        apellidos={apellidos}
        fotoUrl={resolvedFotoUrl}
        size={compact ? 'sm' : 'md'}
        className={cn(
          compact ? 'h-7 w-7 sm:h-9 sm:w-9' : 'h-9 w-9',
          'flex-shrink-0'
        )}
        fallbackClassName={compact ? 'text-[10px] sm:text-xs' : 'text-xs'}
      />
      <div className="min-w-0 flex-1">
        <span className={cn(
          'font-medium block truncate',
          compact && 'text-xs sm:text-sm'
        )}>
          {apellidos ? `${resolvedNombre} ${apellidos}` : resolvedNombre}
        </span>
        {subtitle && (
          <span className={cn(
            MOBILE_DESIGN.text.tiny,
            'block truncate'
          )}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
