// ========================================
// Mobile Collapsible Table Component
// ========================================
// Componente base reutilizable para tablas móviles con filas colapsables
// Desktop mantiene tabla normal con columnas

'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MobileTableColumn<T = unknown> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  priority: 'primary' | 'secondary' | 'details';
}

interface MobileCollapsibleTableProps<T = unknown> {
  columns: MobileTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

/**
 * Tabla colapsable para mobile
 * - Solo visible en mobile (sm:hidden)
 * - Filas expandibles con información mínima visible
 * - Touch target mínimo 60px
 * - Animación suave 150ms
 */
export function MobileCollapsibleTable<T = unknown>({
  columns,
  data,
  keyExtractor,
  emptyState,
  onRowClick,
  className = '',
}: MobileCollapsibleTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filtrar columnas por prioridad
  const primaryColumn = columns.find((col) => col.priority === 'primary');
  const secondaryColumn = columns.find((col) => col.priority === 'secondary');
  const detailColumns = columns.filter((col) => col.priority === 'details');

  const toggleRow = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (expandedRows.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const handleRowClick = (row: T, rowId: string) => {
    if (onRowClick) {
      onRowClick(row);
    } else {
      toggleRow(rowId);
    }
  };

  if (data.length === 0) {
    return (
      <div className={cn('py-8 text-center', className)}>
        {emptyState || (
          <p className="text-sm text-gray-500">No hay datos disponibles</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {data.map((row) => {
        const rowId = keyExtractor(row);
        const isExpanded = expandedRows.has(rowId);

        return (
          <Card
            key={rowId}
            className="overflow-hidden border-gray-200 shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="p-0">
              {/* Fila compacta - siempre visible */}
              <button
                onClick={() => handleRowClick(row, rowId)}
                className="w-full min-h-[60px] px-3 py-3 flex items-center justify-between gap-3 text-left transition-colors active:bg-gray-50"
              >
                {/* Columna principal (izquierda) */}
                <div className="flex-1 min-w-0">
                  {primaryColumn && (
                    <div className="text-sm font-semibold text-gray-900">
                      {primaryColumn.render(row)}
                    </div>
                  )}
                </div>

                {/* Columna secundaria (derecha) */}
                <div className="flex items-center gap-2">
                  {secondaryColumn && (
                    <div className="text-sm font-medium text-gray-700">
                      {secondaryColumn.render(row)}
                    </div>
                  )}

                  {/* Chevron indicador */}
                  {detailColumns.length > 0 && (
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400 transition-transform" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400 transition-transform" />
                      )}
                    </div>
                  )}
                </div>
              </button>

              {/* Contenido expandido */}
              {isExpanded && detailColumns.length > 0 && (
                <div className="px-3 pb-3 pt-0 border-t bg-gray-50/50 animate-in slide-in-from-top-2 duration-150">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                    {detailColumns.map((col) => (
                      <div key={col.key} className="col-span-2">
                        <div className="text-xs text-gray-500 mb-0.5">
                          {col.label}
                        </div>
                        <div className="text-sm text-gray-900">
                          {col.render(row)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

