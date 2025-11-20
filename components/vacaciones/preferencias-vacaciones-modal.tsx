'use client';

// ========================================
// Modal de Preferencias de Vacaciones (General)
// ========================================

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMutation } from '@/lib/hooks';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { toDateOnlyString } from '@/lib/utils';

const MIN_ALTERNATIVOS_RATIO = 0.5;

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
  const [modoSeleccion, setModoSeleccion] = useState<'ideales' | 'prioritarios' | 'alternativos'>('ideales');
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
    if (open && campanaId) {
      fetch(`/api/campanas-vacaciones/${campanaId}/preferencia`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            const pref = data.data;
            if (pref.diasIdeales) {
              setDiasIdeales((pref.diasIdeales as string[]).map(d => new Date(d)));
            }
            if (pref.diasPrioritarios) {
              setDiasPrioritarios((pref.diasPrioritarios as string[]).map(d => new Date(d)));
            }
            if (pref.diasAlternativos) {
              setDiasAlternativos((pref.diasAlternativos as string[]).map(d => new Date(d)));
            }
          }
        })
        .catch(err => console.error('Error cargando preferencia:', err));
    } else if (!open) {
      setErrorMessage(null);
    }
  }, [open, campanaId]);

  const fechaInicio = new Date(fechaInicioObjetivo);
  const fechaFin = new Date(fechaFinObjetivo);

  const toggleFecha = (fecha: Date, modo: 'ideales' | 'prioritarios' | 'alternativos') => {
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

  const esFechaSeleccionada = (fecha: Date, modo: 'ideales' | 'prioritarios' | 'alternativos') => {
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {campanaTitulo}
              </DialogTitle>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                <span>
                  {format(fechaInicio, 'PPP', { locale: es })} - {format(fechaFin, 'PPP', { locale: es })}
                </span>
              </div>
            </div>
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
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selector de modo */}
          <div className="flex gap-2">
            <Button
              variant={modoSeleccion === 'ideales' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setModoSeleccion('ideales')}
              className="flex-1"
            >
              Ideales ({diasIdeales.length})
            </Button>
            <Button
              variant={modoSeleccion === 'prioritarios' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setModoSeleccion('prioritarios')}
              className="flex-1"
            >
              Prioritarios ({diasPrioritarios.length})
            </Button>
            <Button
              variant={modoSeleccion === 'alternativos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setModoSeleccion('alternativos')}
              className="flex-1"
            >
              Alternativos ({diasAlternativos.length})
            </Button>
          </div>

          {/* Calendario */}
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

          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
              <Label className="text-xs text-blue-700 font-medium mb-2 block">
                Fechas Ideales
              </Label>
              <div className="flex flex-wrap gap-1.5 min-h-[60px]">
                {diasIdeales.length === 0 ? (
                  <span className="text-xs text-blue-600">Ninguna seleccionada</span>
                ) : (
                  diasIdeales.slice(0, 5).map((fecha) => (
                    <Badge key={fecha.toISOString()} className="bg-blue-600 text-white border-0 text-xs">
                      {format(fecha, 'dd MMM', { locale: es })}
                    </Badge>
                  ))
                )}
                {diasIdeales.length > 5 && (
                  <Badge className="bg-blue-200 text-blue-800 border-0 text-xs">
                    +{diasIdeales.length - 5}
                  </Badge>
                )}
              </div>
            </div>

            <div className="border border-orange-200 rounded-lg p-3 bg-orange-50">
              <Label className="text-xs text-orange-700 font-medium mb-2 block">
                Fechas Prioritarias
              </Label>
              <div className="flex flex-wrap gap-1.5 min-h-[60px]">
                {diasPrioritarios.length === 0 ? (
                  <span className="text-xs text-orange-600">Ninguna seleccionada</span>
                ) : (
                  diasPrioritarios.slice(0, 5).map((fecha) => (
                    <Badge key={fecha.toISOString()} className="bg-orange-600 text-white border-0 text-xs">
                      {format(fecha, 'dd MMM', { locale: es })}
                    </Badge>
                  ))
                )}
                {diasPrioritarios.length > 5 && (
                  <Badge className="bg-orange-200 text-orange-800 border-0 text-xs">
                    +{diasPrioritarios.length - 5}
                  </Badge>
                )}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <Label className="text-xs text-gray-700 font-medium mb-2 block">
                Fechas Alternativas
              </Label>
              <div className="flex flex-wrap gap-1.5 min-h-[60px]">
                {diasAlternativos.length === 0 ? (
                  <span className="text-xs text-gray-600">
                    {diasIdeales.length > 0
                      ? `Selecciona al menos ${alternativosRequeridos}`
                      : 'Ninguna seleccionada'}
                  </span>
                ) : (
                  diasAlternativos.slice(0, 5).map((fecha) => (
                    <Badge key={fecha.toISOString()} className="bg-gray-700 text-white border-0 text-xs">
                      {format(fecha, 'dd MMM', { locale: es })}
                    </Badge>
                  ))
                )}
                {diasAlternativos.length > 5 && (
                  <Badge className="bg-gray-200 text-gray-800 border-0 text-xs">
                    +{diasAlternativos.length - 5}
                  </Badge>
                )}
              </div>
            </div>
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

