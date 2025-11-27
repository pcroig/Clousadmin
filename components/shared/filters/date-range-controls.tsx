'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type RangeValue = 'dia' | 'semana' | 'mes';

const RANGE_OPTIONS: Array<{ value: RangeValue; label: string }> = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
];

interface DateRangeControlsProps {
  range: RangeValue;
  label: string;
  onRangeChange: (value: RangeValue) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  variant?: 'desktop' | 'mobile';
  className?: string;
}

export function DateRangeControls({
  range,
  label,
  onRangeChange,
  onNavigate,
  variant = 'desktop',
  className,
}: DateRangeControlsProps) {
  if (variant === 'mobile') {
    return (
      <div className={cn('space-y-3', className)}>
        <Select value={range} onValueChange={(value) => onRangeChange(value as RangeValue)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Rango" />
          </SelectTrigger>
          <SelectContent align="start">
            {RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => onNavigate('prev')}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>
          <span className="text-sm font-semibold text-gray-900">{label}</span>
          <Button variant="ghost" className="flex-1" onClick={() => onNavigate('next')}>
            Siguiente
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={range} onValueChange={(value) => onRangeChange(value as RangeValue)}>
        <SelectTrigger className="w-[110px]">
          <SelectValue placeholder="Rango" />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Periodo anterior"
        onClick={() => onNavigate('prev')}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="min-w-[140px] text-sm font-semibold text-center text-gray-900">{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Periodo siguiente"
        onClick={() => onNavigate('next')}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

