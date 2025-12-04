// ========================================
// Responsive Date Picker - Selector de fecha optimizado para mobile y desktop
// ========================================
// En mobile: Sheet con calendario táctil
// En desktop: Popover estándar

'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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

interface ResponsiveDatePickerProps {
  /**
   * Fecha seleccionada
   */
  date: Date | undefined;
  /**
   * Callback cuando cambia la fecha
   */
  onSelect: (date: Date | undefined) => void;
  /**
   * Placeholder cuando no hay fecha seleccionada
   */
  placeholder?: string;
  /**
   * Función para deshabilitar fechas
   */
  disabled?: ((date: Date) => boolean) | boolean;
  /**
   * Label para el sheet en mobile
   */
  label?: string;
  /**
   * Clases adicionales para el trigger
   */
  className?: string;
  /**
   * Fecha mínima seleccionable
   */
  fromDate?: Date;
  /**
   * Fecha máxima seleccionable
   */
  toDate?: Date;
}

export function ResponsiveDatePicker({
  date,
  onSelect,
  placeholder = 'Seleccionar fecha',
  disabled,
  label = 'Seleccionar fecha',
  className,
  fromDate,
  toDate,
}: ResponsiveDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const isDisabled = typeof disabled === 'boolean' ? disabled : false;

  const handleSelect = (selectedDate: Date | undefined) => {
    onSelect(selectedDate);
    if (selectedDate) {
      setOpen(false);
    }
  };

  const displayText = date ? format(date, 'PPP', { locale: es }) : placeholder;

  // Mobile: Sheet (bottom sheet)
  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          disabled={isDisabled}
          onClick={() => setOpen(true)}
          className={cn(
            'w-full justify-start text-left font-normal',
            MOBILE_DESIGN.components.select.trigger,
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-5 w-5 flex-shrink-0" />
          <span className="truncate">{displayText}</span>
        </Button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] pb-safe">
            <SheetHeader className="mb-4">
              <SheetTitle>{label}</SheetTitle>
            </SheetHeader>

            <div className="flex justify-center pb-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleSelect}
                disabled={typeof disabled === 'function' ? disabled : undefined}
                fromDate={fromDate}
                toDate={toDate}
                initialFocus
                className="rounded-md border-0"
                classNames={{
                  day_button: cn(
                    MOBILE_DESIGN.components.calendar.dayButton,
                    'rounded-lg font-medium hover:bg-accent hover:text-accent-foreground'
                  ),
                  day_selected: 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground',
                  day_today: 'bg-gray-100 text-accent-foreground',
                  day_outside: 'opacity-50',
                  day_disabled: 'opacity-30 cursor-not-allowed',
                }}
              />
            </div>

            {/* Botones de acción para mobile */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              {date && (
                <Button
                  variant="default"
                  onClick={() => {
                    onSelect(undefined);
                    setOpen(false);
                  }}
                  className="flex-1"
                >
                  Limpiar
                </Button>
              )}
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
          disabled={isDisabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={typeof disabled === 'function' ? disabled : undefined}
          fromDate={fromDate}
          toDate={toDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Props para DateRangePicker
 */
interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface ResponsiveDateRangePickerProps {
  /**
   * Rango de fechas seleccionado
   */
  dateRange: DateRange;
  /**
   * Callback cuando cambia el rango
   */
  onSelect: (range: DateRange) => void;
  /**
   * Placeholder cuando no hay rango seleccionado
   */
  placeholder?: string;
  /**
   * Función para deshabilitar fechas
   */
  disabled?: ((date: Date) => boolean) | boolean;
  /**
   * Label para el sheet en mobile
   */
  label?: string;
  /**
   * Clases adicionales para el trigger
   */
  className?: string;
  /**
   * Fecha mínima seleccionable
   */
  fromDate?: Date;
  /**
   * Fecha máxima seleccionable
   */
  toDate?: Date;
}

/**
 * Date Range Picker responsive
 * Permite seleccionar un rango de fechas (inicio y fin)
 */
export function ResponsiveDateRangePicker({
  dateRange,
  onSelect,
  placeholder = 'Seleccionar rango',
  disabled,
  label = 'Seleccionar rango de fechas',
  className,
  fromDate,
  toDate,
}: ResponsiveDateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const isDisabled = typeof disabled === 'boolean' ? disabled : false;

  const handleSelect = (range: DateRange | undefined) => {
    if (range) {
      // Si solo se selecciona 'from' (primer clic), forzar 'to' al mismo día
      // Esto permite rangos de 1 día de forma natural
      const normalizedRange: DateRange = {
        from: range.from,
        to: range.to ?? range.from,
      };
      onSelect(normalizedRange);
    }
  };

  const displayText = dateRange.from
    ? dateRange.to
      ? `${format(dateRange.from, 'PP', { locale: es })} - ${format(dateRange.to, 'PP', { locale: es })}`
      : format(dateRange.from, 'PP', { locale: es })
    : placeholder;

  // Mobile: Sheet (bottom sheet)
  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          disabled={isDisabled}
          onClick={() => setOpen(true)}
          className={cn(
            'w-full justify-start text-left font-normal',
            MOBILE_DESIGN.components.select.trigger,
            !dateRange.from && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-5 w-5 flex-shrink-0" />
          <span className="truncate">{displayText}</span>
        </Button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] pb-safe">
            <SheetHeader className="mb-4">
              <SheetTitle>{label}</SheetTitle>
            </SheetHeader>

            <div className="flex justify-center pb-4">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range) {
                    handleSelect({ from: range.from, to: range.to });
                  }
                }}
                disabled={typeof disabled === 'function' ? disabled : undefined}
                fromDate={fromDate}
                toDate={toDate}
                numberOfMonths={1}
                initialFocus
                className="rounded-md border-0"
                classNames={{
                  day_button: cn(
                    MOBILE_DESIGN.components.calendar.dayButton,
                    'rounded-lg font-medium hover:bg-accent hover:text-accent-foreground'
                  ),
                  day_selected: 'bg-accent text-accent-foreground',
                  day_range_middle: 'bg-accent/50',
                  day_today: 'bg-gray-100',
                  day_outside: 'opacity-50',
                  day_disabled: 'opacity-30 cursor-not-allowed',
                }}
              />
            </div>

            {/* Botones de acción para mobile */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              {dateRange.from && (
                <Button
                  variant="default"
                  onClick={() => {
                    onSelect({ from: undefined, to: undefined });
                    setOpen(false);
                  }}
                  className="flex-1"
                >
                  Limpiar
                </Button>
              )}
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
          disabled={isDisabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !dateRange.from && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: dateRange.from, to: dateRange.to }}
          onSelect={(range) => {
            if (range) {
              handleSelect({ from: range.from, to: range.to });
            }
          }}
          disabled={typeof disabled === 'function' ? disabled : undefined}
          fromDate={fromDate}
          toDate={toDate}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

