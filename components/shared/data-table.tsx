// ========================================
// Data Table - Generic reusable table component
// ========================================

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarPlaceholderClasses } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import { getInitials } from './utils';

export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  emptyMessage?: string;
  emptyComponent?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  getRowId,
  emptyMessage = 'No hay datos disponibles',
  emptyComponent,
}: DataTableProps<T>) {

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="px-6 py-3 text-left text-sm font-semibold text-gray-900"
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
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center"
                >
                  {emptyComponent || <p className="text-sm text-gray-500">{emptyMessage}</p>}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={getRowId?.(row) || idx}
                  onClick={() => onRowClick?.(row)}
                  className={`${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  } transition-colors`}
                >
                  {columns.map((column) => (
                    <td key={column.id} className="px-6 py-4 text-sm text-gray-900">
                      {column.cell
                        ? column.cell(row)
                        : column.accessorKey
                        ? String(row[column.accessorKey] || '')
                        : ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper component for avatar cells
export function AvatarCell({ nombre, avatar }: { nombre: string; avatar?: string }) {

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        {avatar && <AvatarImage src={avatar} />}
        <AvatarFallback
          className={cn(
            getAvatarPlaceholderClasses(nombre),
            'text-xs font-medium'
          )}
        >
          {getInitials(nombre)}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium">{nombre}</span>
    </div>
  );
}
