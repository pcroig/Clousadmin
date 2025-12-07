// ========================================
// Mobile Search Bar Component
// ========================================
// Barra de búsqueda estandarizada para mobile
// Solo visible en mobile (sm:hidden)

'use client';

import { Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Barra de búsqueda estandarizada para mobile
 * - Altura: h-10 (40px)
 * - Icon de búsqueda a la izquierda
 * - Botón para limpiar a la derecha (cuando hay texto)
 * - Border radius: rounded-lg
 */
export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
}: MobileSearchBarProps) {
  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={cn('relative', className)}>
      {/* Icon de búsqueda */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>

      {/* Input */}
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-10 pl-9 pr-9 rounded-lg border border-gray-200',
          'text-sm text-gray-900 placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757]',
          'transition-colors'
        )}
      />

      {/* Botón limpiar */}
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Limpiar búsqueda"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}







