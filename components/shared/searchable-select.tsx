// ========================================
// Searchable Select - Combobox Reutilizable Responsive
// ========================================
// Uso:
// <SearchableSelect items={equipos} value={selected} onChange={setSelected} placeholder="Buscar..." />
//
// En mobile: usa Sheet (bottom sheet) para mejor UX táctil
// En desktop: usa Popover estándar

'use client';

import { Check, ChevronsUpDown, Search } from 'lucide-react';
import * as React from 'react';

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

export interface Item {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Label para el sheet en mobile
   */
  label?: string;
}

export function SearchableSelect({
  items,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  emptyMessage = 'No se encontraron resultados',
  disabled = false,
  className,
  label = 'Seleccionar opción',
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const selectedItem = items.find((item) => item.value === value);

  const handleSelect = (currentValue: string) => {
    onChange(currentValue === value ? '' : currentValue);
    setOpen(false);
  };

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
            'w-full justify-between',
            MOBILE_DESIGN.components.select.trigger,
            className
          )}
        >
          <span className="truncate">{selectedItem?.label || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
        </Button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[80vh] pb-safe">
            <SheetHeader className="mb-4">
              <SheetTitle>{label}</SheetTitle>
            </SheetHeader>

            <Command className="border-none">
              <div className="flex items-center border-b px-3 pb-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                  placeholder="Buscar..."
                  className="border-none focus:ring-0 text-base"
                />
              </div>
              <CommandList className="max-h-[50vh] overflow-auto">
                <CommandEmpty className="py-6 text-center text-sm text-gray-500">
                  {emptyMessage}
                </CommandEmpty>
                <CommandGroup>
                  {items.map((item) => (
                    <CommandItem
                      key={item.value}
                      value={item.value}
                      onSelect={handleSelect}
                      className={cn(
                        MOBILE_DESIGN.components.select.item,
                        'flex items-center'
                      )}
                    >
                      <Check
                        className={cn(
                          'mr-3 h-5 w-5 flex-shrink-0',
                          value === item.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
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
          className={cn('w-full justify-between', className)}
        >
          <span className="truncate">{selectedItem?.label || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === item.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
