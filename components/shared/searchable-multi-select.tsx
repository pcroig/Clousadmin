// ========================================
// Searchable Multi Select - Combobox Multi-Select Reutilizable Responsive
// ========================================
// Uso:
// <SearchableMultiSelect items={empleados} values={selected} onChange={setSelected} placeholder="Buscar..." />
//
// En mobile: usa Sheet (bottom sheet) para mejor UX táctil
// En desktop: usa Popover estándar

'use client';

import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { cn } from '@/lib/utils';

export interface MultiSelectItem {
  value: string;
  label: string;
}

interface SearchableMultiSelectProps {
  items: MultiSelectItem[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Label para el sheet en mobile
   */
  label?: string;
  /**
   * Límite máximo de selecciones
   */
  maxSelections?: number;
}

export function SearchableMultiSelect({
  items,
  values,
  onChange,
  placeholder = 'Seleccionar...',
  emptyMessage = 'No se encontraron resultados',
  disabled = false,
  className,
  label = 'Seleccionar opciones',
  maxSelections,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const handleSelect = (itemValue: string) => {
    if (values.includes(itemValue)) {
      onChange(values.filter((v) => v !== itemValue));
    } else {
      // Verificar límite máximo
      if (maxSelections && values.length >= maxSelections) {
        return;
      }
      onChange([...values, itemValue]);
    }
  };

  const handleRemove = (itemValue: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(values.filter((v) => v !== itemValue));
  };

  const selectedItems = items.filter((item) => values.includes(item.value));

  // Trigger compartido
  const triggerContent = (
    <div className="flex items-center w-full gap-2">
      <div className="flex flex-wrap gap-1 flex-1 min-w-0">
        {selectedItems.length > 0 ? (
          selectedItems.map((item) => (
            <Badge
              key={item.value}
              variant="secondary"
              className="text-xs"
              onClick={(e) => handleRemove(item.value, e)}
            >
              <span className="max-w-[120px] truncate">{item.label}</span>
              <X className="ml-1 h-3 w-3 flex-shrink-0" />
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground truncate">{placeholder}</span>
        )}
      </div>
      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
    </div>
  );

  // Mobile: Sheet (bottom sheet)
  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            'w-full min-h-[44px] h-auto py-2 px-3 justify-start',
            className
          )}
        >
          {triggerContent}
        </Button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[80vh] pb-safe">
            <SheetHeader className="mb-4">
              <SheetTitle>
                {label}
                {maxSelections && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({values.length}/{maxSelections})
                  </span>
                )}
              </SheetTitle>
            </SheetHeader>

            {/* Badges seleccionados */}
            {selectedItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b">
                {selectedItems.map((item) => (
                  <Badge
                    key={item.value}
                    variant="secondary"
                    className="text-sm py-1.5 px-3"
                    onClick={(e) => handleRemove(item.value, e)}
                  >
                    {item.label}
                    <X className="ml-2 h-4 w-4" />
                  </Badge>
                ))}
              </div>
            )}

            <Command className="border-none">
              <div className="flex items-center border-b px-3 pb-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                  placeholder="Buscar..."
                  className="border-none focus:ring-0 text-base"
                />
              </div>
              <CommandList className="max-h-[40vh] overflow-auto">
                <CommandEmpty className="py-6 text-center text-sm text-gray-500">
                  {emptyMessage}
                </CommandEmpty>
                <CommandGroup>
                  {items.map((item) => {
                    const isSelected = values.includes(item.value);
                    const isDisabled = !isSelected && maxSelections && values.length >= maxSelections;

                    return (
                      <CommandItem
                        key={item.value}
                        value={item.value}
                        onSelect={() => handleSelect(item.value)}
                        disabled={isDisabled}
                        className={cn(
                          MOBILE_DESIGN.components.select.item,
                          'flex items-center',
                          isDisabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Check
                          className={cn(
                            'mr-3 h-5 w-5 flex-shrink-0',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>

            {/* Botón de confirmar para mobile */}
            <div className="pt-4 border-t mt-4">
              <Button
                onClick={() => setOpen(false)}
                className="w-full"
              >
                Confirmar ({selectedItems.length})
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Popover estándar
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full min-h-10 h-auto py-2 px-3 justify-start', className)}
        >
          {triggerContent}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => {
                const isSelected = values.includes(item.value);
                const isDisabled = !isSelected && maxSelections && values.length >= maxSelections;

                return (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={() => handleSelect(item.value)}
                    disabled={isDisabled}
                    className={cn(isDisabled && 'opacity-50 cursor-not-allowed')}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
