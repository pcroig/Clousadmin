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
      <div className="rounded-md border p-4">
        {cargando ? (
          <div className="text-center py-8 text-gray-500">Cargando calendario...</div>
        ) : (
          <Calendar
            mode="single"
            selected={undefined}
            onSelect={handleDiaClick}
            month={mesActual}
            onMonthChange={setMesActual}
            numberOfMonths={2}
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
                    props.modifiers?.noLaborable && 'text-gray-400 bg-muted/40',
                    props.modifiers?.festivo && 'bg-red-100 text-red-900 font-semibold hover:bg-red-200'
                  )}
                />
              ),
            }}
            className="mx-auto"
          />
        )}
      </div>

      {!cargando && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-200" />
            <span>Festivos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-muted/40" />
            <span>No laborable</span>
          </div>
        </div>
      )}

      {onUpdate && (
        <div className="text-xs text-muted-foreground">
          Las actualizaciones desde la lista de festivos se sincronizan automáticamente con este
          calendario.
        </div>
      )}
    </div>
  );
}

