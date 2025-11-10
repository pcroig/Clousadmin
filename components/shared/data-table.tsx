// ========================================
// Data Table - Generic reusable table component
// ========================================

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from './utils';
import { getAvatarStyle } from '@/lib/design-system';

export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  emptyMessage?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  onRowClick,
  getRowId,
  emptyMessage = 'No hay datos disponibles',
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
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
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
                  {columns.map((column) => {
                    const renderedCell = column.cell
                      ? column.cell(row)
                      : column.accessorKey
                      ? String((row as Record<string, unknown>)[column.accessorKey as string] ?? '')
                      : '';

                    return (
                      <td key={column.id} className="px-6 py-4 text-sm text-gray-900">
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

// Helper component for avatar cells
export function AvatarCell({ nombre, avatar }: { nombre: string; avatar?: string }) {

  const avatarStyle = getAvatarStyle(nombre);

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        {avatar && <AvatarImage src={avatar} />}
        <AvatarFallback
          className="text-xs font-semibold uppercase"
          style={avatarStyle}
        >
          {getInitials(nombre)}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium">{nombre}</span>
    </div>
  );
}
