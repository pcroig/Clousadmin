// ========================================
// Table Filters - Filter button + Date navigation
// ========================================

'use client';

import { Filter, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TableFiltersProps {
  currentMonth?: string; // ej: "jun 2025"
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onFilterClick?: () => void;
  showDateNavigation?: boolean;
}

export function TableFilters({
  currentMonth = 'jun 2025',
  onPreviousMonth,
  onNextMonth,
  onFilterClick,
  showDateNavigation = true,
}: TableFiltersProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      {/* Filtro Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onFilterClick}
        className="text-gray-600 hover:text-gray-900"
      >
        <Filter className="w-4 h-4 mr-2" />
        Filtro
      </Button>

      {/* Date Navigation */}
      {showDateNavigation && (
        <div className="flex items-center gap-2">
          <button
            onClick={onPreviousMonth}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>

          <span className="text-sm text-gray-700 font-medium min-w-[80px] text-center">
            {currentMonth}
          </span>

          <button
            onClick={onNextMonth}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>

          <button
            className="p-1 hover:bg-gray-100 rounded transition-colors ml-1"
            aria-label="Más opciones"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
}
