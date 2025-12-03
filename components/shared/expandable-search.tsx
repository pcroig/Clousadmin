'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { TextIconButton } from './text-icon-button';

interface ExpandableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /**
   * Si debe mostrar el texto del botón cuando está colapsado
   */
  showCollapsedLabel?: boolean;
}

export function ExpandableSearch({
  value,
  onChange,
  placeholder = 'Buscar...',
  className,
  showCollapsedLabel = false,
}: ExpandableSearchProps) {
  const [isExpanded, setIsExpanded] = useState(Boolean(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isExpanded]);

  useEffect(() => {
    if (value && !isExpanded) {
      setIsExpanded(true);
    }
  }, [value, isExpanded]);

  const handleCollapse = () => {
    onChange('');
    setIsExpanded(false);
  };

  return (
    <div className={cn('flex items-center justify-end', className)}>
      {isExpanded ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm min-w-[240px]">
          <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-8 border-0 bg-transparent px-0 text-sm text-gray-900 focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={handleCollapse}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <TextIconButton
          icon={Search}
          label="Buscar"
          hideLabel={!showCollapsedLabel}
          onClick={() => setIsExpanded(true)}
        />
      )}
    </div>
  );
}



