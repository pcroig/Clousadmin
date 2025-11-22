'use client';

import { Filter, Search, X } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { cn } from '@/lib/utils';

export interface CompactFilterBarProps {
  /** Valor del search input */
  searchValue: string;
  /** Callback cuando cambia el search */
  onSearchChange: (value: string) => void;
  /** Placeholder del search input */
  searchPlaceholder?: string;
  /** Número de filtros activos (para el badge) */
  activeFiltersCount?: number;
  /** Contenido de los filtros (se muestra en el sheet mobile) */
  filtersContent?: React.ReactNode;
  /** Título del sheet de filtros */
  filtersTitle?: string;
  /** Clases adicionales */
  className?: string;
  /** Mostrar botón de limpiar búsqueda */
  showClearButton?: boolean;
}

/**
 * Barra de filtros compacta con search y badge de filtros activos
 * 
 * Mobile: [🔍 Búsqueda] [Filtros (2)] → Abre BottomSheet
 * Desktop: Inline search + filters como ahora
 * 
 * @example
 * <CompactFilterBar
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   searchPlaceholder="Buscar empleado..."
 *   activeFiltersCount={2}
 *   filtersContent={
 *     <>
 *       <Select value={estado} onValueChange={setEstado}>...</Select>
 *       <DateRangePicker value={fecha} onChange={setFecha} />
 *     </>
 *   }
 * />
 */
export function CompactFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  activeFiltersCount = 0,
  filtersContent,
  filtersTitle = 'Filtros',
  className,
  showClearButton = true,
}: CompactFilterBarProps) {
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasActiveFilters = activeFiltersCount > 0;
  const hasSearch = searchValue.length > 0;

  // Desktop: Renderizar inline (el contenido completo se muestra directamente)
  if (!isMobile) {
    return (
      <div className={cn('flex items-center gap-3 flex-wrap', className)}>
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 pr-9"
          />
          {showClearButton && hasSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Limpiar búsqueda</span>
            </Button>
          )}
        </div>

        {/* Filters content inline */}
        {filtersContent}
      </div>
    );
  }

  // Mobile: Compact layout con sheet
  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              MOBILE_DESIGN.filterBar.searchInput,
              'pl-9',
              hasSearch && showClearButton ? 'pr-9' : ''
            )}
          />
          {showClearButton && hasSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Limpiar búsqueda</span>
            </Button>
          )}
        </div>

        {/* Filters button (solo si hay contenido de filtros) */}
        {filtersContent && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(true)}
            className={cn(
              MOBILE_DESIGN.filterBar.button,
              'gap-2 relative',
              hasActiveFilters && 'border-blue-600'
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <Badge
                variant="default"
                className={cn(
                  MOBILE_DESIGN.filterBar.badge,
                  'bg-blue-600 text-white'
                )}
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Filters Sheet */}
      {filtersContent && (
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>{filtersTitle}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              {filtersContent}
            </div>
            <div className="mt-6 pt-4 border-t flex gap-2">
              <Button
                variant="outline"
                onClick={() => setFiltersOpen(false)}
                className="flex-1"
              >
                Cerrar
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

