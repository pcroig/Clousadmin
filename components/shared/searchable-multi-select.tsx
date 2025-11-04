// ========================================
// Searchable Multi Select - Combobox Multi-Select Reutilizable
// ========================================
// Uso:
// <SearchableMultiSelect items={empleados} values={selected} onChange={setSelected} placeholder="Buscar..." />

'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { Badge } from '@/components/ui/badge';

interface Item {
  value: string;
  label: string;
}

interface SearchableMultiSelectProps {
  items: Item[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableMultiSelect({
  items,
  values,
  onChange,
  placeholder = 'Seleccionar...',
  emptyMessage = 'No se encontraron resultados',
  disabled = false,
  className,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (itemValue: string) => {
    if (values.includes(itemValue)) {
      onChange(values.filter((v) => v !== itemValue));
    } else {
      onChange([...values, itemValue]);
    }
  };

  const handleRemove = (itemValue: string) => {
    onChange(values.filter((v) => v !== itemValue));
  };

  const selectedItems = items.filter((item) => values.includes(item.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between min-h-10 h-auto', className)}
        >
          <div className="flex flex-wrap gap-1">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <Badge
                  key={item.value}
                  variant="secondary"
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.value);
                  }}
                >
                  {item.label}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={() => handleSelect(item.value)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      values.includes(item.value) ? 'opacity-100' : 'opacity-0'
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
