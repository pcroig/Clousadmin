'use client';

// ========================================
// Calendario Visual de Festivos
// ========================================

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import {
  type DiasLaborables,
} from '@/lib/calculos/dias-laborables.definitions';
import { cn } from '@/lib/utils';
import { parseJson } from '@/lib/utils/json';

import type { Festivo } from '@/types/festivos';

interface FestivosResponse {
  festivos?: Festivo[];
}

interface CalendarioFestivosProps {
  diasLaborables: DiasLaborables;
  onUpdate?: () => void;
  refreshToken?: number;
  onRequestCreate: (fecha: string) => void;
  onRequestEdit: (festivo: Festivo) => void;
  numberOfMonths?: number;
  showLegend?: boolean;
  legendClassName?: string;
}

const DIA_SEMANA_KEYS: Array<keyof DiasLaborables> = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];

export function CalendarioFestivos({
  diasLaborables,
  onUpdate,
  refreshToken = 0,
  onRequestCreate,
  onRequestEdit,
  numberOfMonths = 2,
  showLegend = true,
  legendClassName,
}: CalendarioFestivosProps) {
  const [mesActual, setMesActual] = useState(new Date());
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [cargando, setCargando] = useState(true);

  const festivosDates = useMemo(
    () =>
      festivos
        .filter((festivo) => festivo.activo)
        .map((festivo) => new Date(`${festivo.fecha}T00:00:00`)),
    [festivos]
  );

  const cargarFestivos = useCallback(async () => {
    setCargando(true);
    try {
      const añoActual = mesActual.getFullYear();
      // Calcular año del mes siguiente para obtener festivos de ambos años si cruzan
      const mesSiguiente = new Date(mesActual);
      mesSiguiente.setMonth(mesSiguiente.getMonth() + 1);
      const añoSiguiente = mesSiguiente.getFullYear();

      // Cargar festivos de ambos años si cruzan el año
      const años = añoActual === añoSiguiente
        ? [añoActual]
        : [añoActual, añoSiguiente];

      const responses = await Promise.all(
        años.map(año => fetch(`/api/festivos?año=${año}`))
      );

      const allFestivos: Festivo[] = [];
      for (const response of responses) {
        if (response.ok) {
          const data = await parseJson<FestivosResponse>(response);
          if (Array.isArray(data?.festivos)) {
            allFestivos.push(...data.festivos);
          }
        }
      }

      setFestivos(allFestivos);
    } catch (error) {
      console.error('Error cargando festivos:', error);
    } finally {
      setCargando(false);
    }
  }, [mesActual]);

  useEffect(() => {
    cargarFestivos();
  }, [cargarFestivos, refreshToken]);

  function handleDiaClick(date: Date | undefined) {
    if (!date) return;

    const fechaStr = date.toISOString().split('T')[0];
    const festivoExistente = festivos.find((f) => f.fecha === fechaStr);

    if (festivoExistente) {
      onRequestEdit(festivoExistente);
      return;
    }

    onRequestCreate(fechaStr);
  }

  const esDiaLaborable = useCallback(
    (date: Date) => {
      const key = DIA_SEMANA_KEYS[date.getDay()];
      return diasLaborables[key];
    },
    [diasLaborables]
  );

  return (
    <div className="space-y-4">
      {showLegend && !cargando && <CalendarioFestivosLegend className={legendClassName} />}

      <div>
        {cargando ? (
          <div className="py-8 text-center text-gray-500">Cargando calendario...</div>
        ) : (
          <Calendar
            mode="single"
            selected={undefined}
            onSelect={handleDiaClick}
            month={mesActual}
            onMonthChange={setMesActual}
            numberOfMonths={numberOfMonths}
            modifiers={{
              festivo: festivosDates,
              noLaborable: (date: Date) => !esDiaLaborable(date),
            }}
            components={{
              DayButton: (props) => (
                <CalendarDayButton
                  {...props}
                  className={cn(
                    props.className,
                    props.modifiers?.noLaborable && 'bg-muted/40 text-gray-400',
                    props.modifiers?.festivo && 'bg-red-100 text-red-900 font-semibold hover:bg-red-200'
                  )}
                />
              ),
            }}
            className="mx-auto"
          />
        )}
      </div>
    </div>
  );
}

interface CalendarioFestivosLegendProps {
  className?: string;
}

export function CalendarioFestivosLegend({ className }: CalendarioFestivosLegendProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-4 text-xs text-muted-foreground', className)}>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm border border-red-200 bg-red-100" />
        <span>Festivos</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm bg-muted/40" />
        <span>No laborable</span>
      </div>
    </div>
  );
}

