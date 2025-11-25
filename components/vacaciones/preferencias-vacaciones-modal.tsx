'use client';

// ========================================
// Modal de Preferencias de Vacaciones (General)
// ========================================

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { LoadingButton } from '@/components/shared/loading-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation } from '@/lib/hooks';
import { cn, toDateOnlyString } from '@/lib/utils';
import { parseJson, parseJsonSafe } from '@/lib/utils/json';

const MIN_ALTERNATIVOS_RATIO = 0.5;

type ModoSeleccion = 'ideales' | 'prioritarios' | 'alternativos';

interface PreferenciaPayload {
  diasIdeales?: unknown;
  diasPrioritarios?: unknown;
  diasAlternativos?: unknown;
}

const parseFechaArray = (value: unknown): Date[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const fecha = new Date(entry as string);
      return Number.isNaN(fecha.getTime()) ? null : fecha;
    })
    .filter((fecha): fecha is Date => Boolean(fecha));
};

const modoConfig: Record<
  ModoSeleccion,
  {
    label: string;
    description: string;
    accentClass: string;
    previewBadgeClass: string;
    summaryBadgeClass: string;
    emptyText: string;
    activeClasses: string;
  }
> = {
  ideales: {
    label: 'Fechas ideales',
    description: 'Tus días perfectos de vacaciones',
    accentClass: 'text-blue-700',
    previewBadgeClass: 'bg-blue-600 text-white border-0',
    summaryBadgeClass: 'bg-blue-100 text-blue-800 border-0',
    emptyText: 'Añade tus fechas ideales en el calendario',
    activeClasses: 'border-blue-400 bg-blue-50 shadow-sm',
  },
  prioritarios: {
    label: 'Fechas prioritarias',
    description: 'Días críticos que no puedes mover',
    accentClass: 'text-orange-700',
    previewBadgeClass: 'bg-orange-600 text-white border-0',
    summaryBadgeClass: 'bg-orange-100 text-orange-800 border-0',
    emptyText: 'Marca aquí los días inamovibles',
    activeClasses: 'border-orange-400/70 bg-orange-50 shadow-sm',
  },
  alternativos: {
    label: 'Fechas alternativas',
    description: 'Opciones flexibles (mín. 50% de ideales)',
    accentClass: 'text-gray-700',
    previewBadgeClass: 'bg-gray-700 text-white border-0',
    summaryBadgeClass: 'bg-gray-200 text-gray-800 border-0',
    emptyText: 'Define tus opciones alternativas',
    activeClasses: 'border-gray-400 bg-gray-50 shadow-sm',
  },
};

const modosOrdenados: ModoSeleccion[] = ['ideales', 'prioritarios', 'alternativos'];

interface PreferenciasVacacionesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campanaId: string;
  campanaTitulo: string;
  fechaInicioObjetivo: string;
  fechaFinObjetivo: string;
}

export function PreferenciasVacacionesModal({
  open,
  onClose,
  onSuccess,
  campanaId,
  campanaTitulo,
  fechaInicioObjetivo,
  fechaFinObjetivo,
}: PreferenciasVacacionesModalProps) {
  const [diasIdeales, setDiasIdeales] = useState<Date[]>([]);
  const [diasPrioritarios, setDiasPrioritarios] = useState<Date[]>([]);
  const [diasAlternativos, setDiasAlternativos] = useState<Date[]>([]);
  const [modoSeleccion, setModoSeleccion] = useState<ModoSeleccion>('ideales');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  interface MutationVariables {
    diasIdeales: string[];
    diasPrioritarios: string[];
    diasAlternativos: string[];
    completada: boolean;
  }
  
  const { mutate: guardarPreferencias, loading: guardando } = useMutation<Record<string, unknown>, MutationVariables>({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  // Obtener preferencia existente al abrir
  useEffect(() => {
    if (!open || !campanaId) {
      return;
    }

    let isMounted = true;

    const loadPreferencia = async () => {
      try {
        const res = await fetch(`/api/campanas-vacaciones/${campanaId}/preferencia`);
        if (!res.ok) {
          const errorResponse = await parseJsonSafe<{ error?: string }>(res, {});
          throw new Error(errorResponse.error ?? 'Error al cargar preferencia');
        }
        const data = await parseJson<PreferenciaPayload>(res);
        if (!isMounted) {
          return;
        }

        setErrorMessage(null);
        setDiasIdeales(parseFechaArray(data.diasIdeales));
        setDiasPrioritarios(parseFechaArray(data.diasPrioritarios));
        setDiasAlternativos(parseFechaArray(data.diasAlternativos));
      } catch (err) {
        console.error('Error cargando preferencia:', err);
      }
    };

    void loadPreferencia();

    return () => {
      isMounted = false;
    };
  }, [open, campanaId]);

  const fechaInicio = new Date(fechaInicioObjetivo);
  const fechaFin = new Date(fechaFinObjetivo);

  const toggleFecha = (fecha: Date, modo: ModoSeleccion) => {
    const fechaStr = toDateOnlyString(fecha);
    
    const toggle = (lista: Date[], setLista: (value: Date[]) => void) => {
      const existe = lista.some(d => toDateOnlyString(d) === fechaStr);
      if (existe) {
        setLista(lista.filter(d => toDateOnlyString(d) !== fechaStr));
      } else {
        setLista([...lista, fecha]);
      }
    };

    if (modo === 'ideales') {
      toggle(diasIdeales, setDiasIdeales);
    } else if (modo === 'prioritarios') {
      toggle(diasPrioritarios, setDiasPrioritarios);
    } else {
      toggle(diasAlternativos, setDiasAlternativos);
    }
  };

  const alternativosRequeridos = Math.ceil(diasIdeales.length * MIN_ALTERNATIVOS_RATIO);
  const cumpleAlternativos = diasIdeales.length === 0 || diasAlternativos.length >= alternativosRequeridos;

  const handleGuardar = () => {
    if (!cumpleAlternativos) {
      setErrorMessage(`Añade al menos ${alternativosRequeridos} días alternativos (50% de tus días ideales).`);
      return;
    }
    setErrorMessage(null);

    guardarPreferencias(
      `/api/campanas-vacaciones/${campanaId}/preferencia`,
      {
        diasIdeales: diasIdeales.map(toDateOnlyString),
        diasPrioritarios: diasPrioritarios.map(toDateOnlyString),
        diasAlternativos: diasAlternativos.map(toDateOnlyString),
        completada: true,
      },
      { method: 'PATCH' }
    );
  };

  const esFechaSeleccionada = (fecha: Date, modo: ModoSeleccion) => {
    const fechaStr = toDateOnlyString(fecha);
    if (modo === 'ideales') {
      return diasIdeales.some(d => toDateOnlyString(d) === fechaStr);
    } else if (modo === 'prioritarios') {
      return diasPrioritarios.some(d => toDateOnlyString(d) === fechaStr);
    } else {
      return diasAlternativos.some(d => toDateOnlyString(d) === fechaStr);
    }
  };

  const puedeGuardar = (diasIdeales.length > 0 || diasPrioritarios.length > 0 || diasAlternativos.length > 0) && cumpleAlternativos;

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setErrorMessage(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  {campanaTitulo}
                </DialogTitle>
                <InfoTooltip
                  content={(
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">¿Cómo funciona?</p>
                      <ul className="space-y-1 text-xs">
                        <li>
                          <strong>Fechas ideales:</strong> Tus días preferidos de vacaciones
                        </li>
                        <li>
                          <strong>Fechas prioritarias:</strong> Días críticos que no puedes mover
                        </li>
                        <li>
                          <strong>Fechas alternativas:</strong> Opciones de respaldo (mínimo 50% de los días ideales)
                        </li>
                      </ul>
                    </div>
                  )}
                  side="left"
                />
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                <span>
                  {format(fechaInicio, 'PPP', { locale: es })} - {format(fechaFin, 'PPP', { locale: es })}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {modosOrdenados.map((modo) => {
              const config = modoConfig[modo];
              const lista =
                modo === 'ideales'
                  ? diasIdeales
                  : modo === 'prioritarios'
                    ? diasPrioritarios
                    : diasAlternativos;
              const isActive = modoSeleccion === modo;

              return (
                <button
                  key={modo}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setModoSeleccion(modo)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-200',
                    isActive ? config.activeClasses : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn('text-sm font-semibold', config.accentClass)}>{config.label}</p>
                      <p className="text-xs text-gray-500">{config.description}</p>
                    </div>
                    <Badge
                      className={cn(
                        'px-2 py-0.5 text-xs font-semibold rounded-full',
                        config.summaryBadgeClass
                      )}
                    >
                      {lista.length}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 min-h-[42px]">
                    {lista.length === 0 ? (
                      <span className="text-[11px] text-gray-500">{config.emptyText}</span>
                    ) : (
                      <>
                        {lista.slice(0, 5).map((fecha) => (
                          <Badge
                            key={`${modo}-${toDateOnlyString(fecha)}`}
                            className={cn('text-xs', config.previewBadgeClass)}
                          >
                            {format(fecha, 'dd MMM', { locale: es })}
                          </Badge>
                        ))}
                        {lista.length > 5 && (
                          <Badge className={cn('text-xs', config.summaryBadgeClass)}>
                            +{lista.length - 5}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <Calendar
              mode="single"
              selected={undefined}
              onSelect={(fecha) => {
                if (fecha) {
                  toggleFecha(fecha, modoSeleccion);
                }
              }}
              disabled={(date) => {
                const fechaStr = toDateOnlyString(date);
                const fechaInicioStr = toDateOnlyString(fechaInicio);
                const fechaFinStr = toDateOnlyString(fechaFin);
                return fechaStr < fechaInicioStr || fechaStr > fechaFinStr;
              }}
              modifiers={{
                ideal: (date) => esFechaSeleccionada(date, 'ideales'),
                prioritario: (date) => esFechaSeleccionada(date, 'prioritarios'),
                alternativo: (date) => esFechaSeleccionada(date, 'alternativos'),
              }}
              modifiersClassNames={{
                ideal: 'bg-blue-600 text-white hover:bg-blue-700',
                prioritario: 'bg-orange-600 text-white hover:bg-orange-700',
                alternativo: 'bg-gray-600 text-white hover:bg-gray-700',
              }}
              className="w-full"
            />
            {diasIdeales.length > 0 && !cumpleAlternativos && (
              <p className="mt-3 text-xs text-red-600">
                Necesitas al menos {alternativosRequeridos} días alternativos para continuar.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <div className="flex-1 text-sm text-gray-500 self-center">
            {diasIdeales.length > 0 && (
              <span>
                Recordatorio: necesitamos al menos {alternativosRequeridos} días alternativos para garantizar
                flexibilidad del equipo.
              </span>
            )}
            {errorMessage && <p className="text-red-600 mt-1">{errorMessage}</p>}
          </div>
          <Button variant="outline" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <LoadingButton 
            onClick={handleGuardar} 
            loading={guardando}
            disabled={!puedeGuardar || guardando}
            className="min-w-[160px]"
          >
            {guardando ? 'Guardando...' : 'Guardar preferencias'}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

