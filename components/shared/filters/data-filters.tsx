'use client';

import { Search, X } from 'lucide-react';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FilterOption {
  label: string;
  value: string;
}

interface DataFiltersProps {
  // Search
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Status Filter
  estadoValue?: string;
  onEstadoChange?: (value: string) => void;
  estadoOptions?: FilterOption[];
  estadoLabel?: string;

  // Team Filter
  equipoValue?: string;
  onEquipoChange?: (value: string) => void;
  equipoOptions?: FilterOption[];
  equipoLabel?: string;

  // Extra
  children?: React.ReactNode;
  className?: string;
}

export function DataFilters({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  estadoValue,
  onEstadoChange,
  estadoOptions = [],
  estadoLabel = 'Estado',
  equipoValue,
  onEquipoChange,
  equipoOptions = [],
  equipoLabel = 'Equipo',
  children,
  className,
}: DataFiltersProps) {
  const hasActiveFilters =
    (estadoValue && estadoValue !== 'todos') ||
    (equipoValue && equipoValue !== 'todos') ||
    !!searchQuery;

  const handleClearFilters = useCallback(() => {
    if (onSearchChange) onSearchChange('');
    if (onEstadoChange) onEstadoChange('todos');
    if (onEquipoChange) onEquipoChange('todos');
  }, [onSearchChange, onEstadoChange, onEquipoChange]);

  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap', className)}>
      {/* Search */}
      {onSearchChange && (
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
      )}

      {/* Status Filter */}
      {onEstadoChange && estadoOptions.length > 0 && (
        <div className="w-full sm:w-[180px]">
          <Select value={estadoValue} onValueChange={onEstadoChange}>
            <SelectTrigger>
              <SelectValue placeholder={estadoLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {estadoOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Team Filter */}
      {onEquipoChange && (
        <div className="w-full sm:w-[200px]">
          <Select value={equipoValue} onValueChange={onEquipoChange}>
            <SelectTrigger>
              <SelectValue placeholder={equipoLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los equipos</SelectItem>
              <SelectItem value="sin_equipo">Sin equipo asignado</SelectItem>
              {equipoOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Extra slots (e.g. badges, custom filters) */}
      {children}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-8 px-2 lg:px-3 text-gray-500 hover:text-gray-900"
        >
          <X className="mr-2 h-4 w-4" />
          Limpiar
        </Button>
      )}
    </div>
  );
}





