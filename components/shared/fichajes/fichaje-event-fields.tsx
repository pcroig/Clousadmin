'use client';

import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type TipoEventoFichaje = 'entrada' | 'pausa_inicio' | 'pausa_fin' | 'salida';

interface FichajeEventFieldsProps {
  tipo: TipoEventoFichaje;
  hora: string;
  onTipoChange: (tipo: TipoEventoFichaje) => void;
  onHoraChange: (hora: string) => void;
  showLabels?: boolean;
  disabled?: boolean;
  className?: string;
}

const EVENT_OPTIONS: Array<{ label: string; value: TipoEventoFichaje }> = [
  { label: 'Entrada', value: 'entrada' },
  { label: 'Inicio de pausa', value: 'pausa_inicio' },
  { label: 'Fin de pausa', value: 'pausa_fin' },
  { label: 'Salida', value: 'salida' },
];

export function FichajeEventFields({
  tipo,
  hora,
  onTipoChange,
  onHoraChange,
  showLabels = false,
  disabled = false,
  className,
}: FichajeEventFieldsProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4', className)}>
      <Field className="flex-1">
        {showLabels && <FieldLabel>Tipo de evento</FieldLabel>}
        <Select value={tipo} onValueChange={(value) => onTipoChange(value as TipoEventoFichaje)} disabled={disabled}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Selecciona tipo" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field className="flex-1">
        {showLabels && <FieldLabel>Hora</FieldLabel>}
        <Input
          type="time"
          value={hora}
          onChange={(event) => onHoraChange(event.target.value)}
          disabled={disabled}
          className="bg-white"
        />
      </Field>
    </div>
  );
}

