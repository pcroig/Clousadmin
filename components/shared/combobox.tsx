// ========================================
// Combobox Component
// ========================================
// Componente reutilizable que permite buscar, seleccionar y crear nuevos items

'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
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

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  createText?: string;
  searchPlaceholder?: string;
  onCreateNew?: (searchValue: string) => Promise<string | null>; // Retorna el ID del nuevo item creado o null si falla
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Seleccionar...',
  emptyText = 'No se encontraron resultados.',
  createText = 'Crear nuevo',
  searchPlaceholder = 'Buscar...',
  onCreateNew,
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);

  // Encontrar el label del item seleccionado
  const selectedOption = options.find((option) => option.value === value);

  // Filtrar opciones basado en la búsqueda
  const filteredOptions = React.useMemo(() => {
    if (!searchValue.trim()) return options;
    const searchLower = searchValue.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    );
  }, [options, searchValue]);

  // Verificar si el valor de búsqueda no coincide con ninguna opción existente
  const canCreateNew = React.useMemo(() => {
    if (!onCreateNew || !searchValue.trim()) return false;
    const searchLower = searchValue.toLowerCase().trim();
    return !options.some(
      (option) => option.label.toLowerCase() === searchLower
    );
  }, [options, searchValue, onCreateNew]);

  const handleCreateNew = async () => {
    if (!onCreateNew || !searchValue.trim()) return;

    setIsCreating(true);
    try {
      const newId = await onCreateNew(searchValue.trim());
      if (newId) {
        setSearchValue('');
        setOpen(false);
        onValueChange(newId);
      }
    } catch (error) {
      console.error('[Combobox] Error creating new item:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelect = (selectedValue: string) => {
    // Permitir deseleccionar si se hace clic en el mismo item
    const newValue = selectedValue === value ? '' : selectedValue;
    onValueChange(newValue);
    setOpen(false);
    setSearchValue('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-9',
            !selectedOption && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-none p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {canCreateNew ? (
                <div className="py-2 px-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleCreateNew}
                    disabled={isCreating}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {isCreating
                      ? 'Creando...'
                      : `${createText}: "${searchValue}"`}
                  </Button>
                </div>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            {filteredOptions.length > 0 && (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
                {canCreateNew && (
                  <CommandItem onSelect={handleCreateNew} disabled={isCreating}>
                    <Plus className="mr-2 h-4 w-4" />
                    {isCreating
                      ? 'Creando...'
                      : `${createText}: "${searchValue}"`}
                  </CommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

