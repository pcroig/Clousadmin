'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Check, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { cn, toDateOnlyString } from '@/lib/utils';
import { toast } from 'sonner';

const MIN_ALTERNATIVOS_RATIO = 0.5;

type TipoPropuesta = 'ideal' | 'alternativo' | 'ajustado';

interface PropuestaInfo {
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  tipo: TipoPropuesta;
  motivo: string;
}

interface ResponderPropuestaModalProps {
  open: boolean;
  onClose: () => void;
  campanaId: string;
  campanaTitulo: string;
  fechaInicioObjetivo: string;
  fechaFinObjetivo: string;
  propuesta: PropuestaInfo;
  onResponded: () => void;
}

export function ResponderPropuestaModal({
  open,
  onClose,
  campanaId,
  campanaTitulo,
  fechaInicioObjetivo,
  fechaFinObjetivo,
  propuesta,
  onResponded,
}: ResponderPropuestaModalProps) {
  const [aceptando, setAceptando] = useState(false);
  const [modoCambio, setModoCambio] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [diasIdeales, setDiasIdeales] = useState<Date[]>([]);
  const [diasPrioritarios, setDiasPrioritarios] = useState<Date[]>([]);
  const [diasAlternativos, setDiasAlternativos] = useState<Date[]>([]);
  const [modoSeleccion, setModoSeleccion] = useState<'ideales' | 'prioritarios' | 'alternativos'>(
    'ideales'
  );
  const [error, setError] = useState<string | null>(null);

  const fechaInicioCampana = new Date(fechaInicioObjetivo);
  const fechaFinCampana = new Date(fechaFinObjetivo);

  const alternativosRequeridos = useMemo(
    () => Math.ceil(diasIdeales.length * MIN_ALTERNATIVOS_RATIO),
    [diasIdeales.length]
  );

  const cumpleAlternativos =
    diasIdeales.length === 0 || diasAlternativos.length >= alternativosRequeridos;

  const toggleFecha = (fecha: Date, modo: 'ideales' | 'prioritarios' | 'alternativos') => {
    const fechaStr = toDateOnlyString(fecha);

    const toggle = (lista: Date[], setLista: (value: Date[]) => void) => {
      const existe = lista.some((d) => toDateOnlyString(d) === fechaStr);
      if (existe) {
        setLista(lista.filter((d) => toDateOnlyString(d) !== fechaStr));
      } else {
        setLista([...lista, fecha]);
      }
    };

    if (modo === 'ideales') toggle(diasIdeales, setDiasIdeales);
    if (modo === 'prioritarios') toggle(diasPrioritarios, setDiasPrioritarios);
    if (modo === 'alternativos') toggle(diasAlternativos, setDiasAlternativos);
  };

  const handleAceptar = async () => {
    setAceptando(true);
    try {
      const response = await fetch(`/api/campanas-vacaciones/${campanaId}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'aceptar' }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || 'No se pudo aceptar la propuesta');
      }

      toast.success('Propuesta aceptada. Se creó una solicitud de ausencia.');
      onResponded();
      handleClose();
    } catch (error) {
      console.error('[ResponderPropuesta] Error aceptando propuesta:', error);
      toast.error(error instanceof Error ? error.message : 'Error al aceptar la propuesta');
    } finally {
      setAceptando(false);
    }
  };

  const handleSolicitarCambio = async () => {
    if (!cumpleAlternativos) {
      setError(`Añade al menos ${alternativosRequeridos} días alternativos.`);
      return;
    }

    setError(null);
    setSolicitando(true);
    try {
      const response = await fetch(`/api/campanas-vacaciones/${campanaId}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'solicitar_cambio',
          diasIdeales: diasIdeales.map(toDateOnlyString),
          diasPrioritarios: diasPrioritarios.map(toDateOnlyString),
          diasAlternativos: diasAlternativos.map(toDateOnlyString),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || 'No se pudo solicitar el cambio');
      }

      toast.success('Solicitud de cambio enviada. RRHH revisará tu propuesta.');
      onResponded();
      handleClose();
    } catch (error) {
      console.error('[ResponderPropuesta] Error solicitando cambio:', error);
      toast.error(error instanceof Error ? error.message : 'Error al solicitar cambio');
    } finally {
      setSolicitando(false);
    }
  };

  const resetCambioState = () => {
    setModoCambio(false);
    setDiasIdeales([]);
    setDiasPrioritarios([]);
    setDiasAlternativos([]);
    setModoSeleccion('ideales');
    setError(null);
  };

  const handleClose = () => {
    resetCambioState();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Revisa tu propuesta de vacaciones</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            <CalendarIcon className="inline h-3.5 w-3.5 mr-1 text-gray-500" />
            Campaña: {campanaTitulo}
          </DialogDescription>
        </DialogHeader>

        {!modoCambio ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Propuesta asignada</h3>
                <Badge variant="secondary" className="capitalize">
                  {propuesta.tipo}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Fecha inicio</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(propuesta.fechaInicio), 'PPP', { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fecha fin</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(propuesta.fechaFin), 'PPP', { locale: es })}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700">
                <strong>Días asignados:</strong> {propuesta.dias} días
              </p>
              <p className="text-sm text-gray-600">
                <strong>Motivo:</strong> {propuesta.motivo}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleAceptar} disabled={aceptando} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                {aceptando ? 'Aceptando...' : 'Aceptar propuesta'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setModoCambio(true)}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Solicitar cambio
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Proponer nuevas fechas</h3>
              <Button variant="ghost" size="sm" onClick={resetCambioState}>
                Cancelar
              </Button>
            </div>

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

            <div className="border border-gray-200 rounded-lg p-4">
              <Calendar
                mode="single"
                selected={undefined}
                onSelect={(fecha) => {
                  if (fecha) toggleFecha(fecha, modoSeleccion);
                }}
                disabled={(date) => {
                  const fechaStr = toDateOnlyString(date);
                  const inicio = toDateOnlyString(fechaInicioCampana);
                  const fin = toDateOnlyString(fechaFinCampana);
                  return fechaStr < inicio || fechaStr > fin;
                }}
                modifiers={{
                  ideal: (date) =>
                    diasIdeales.some((d) => toDateOnlyString(d) === toDateOnlyString(date)),
                  prioritario: (date) =>
                    diasPrioritarios.some((d) => toDateOnlyString(d) === toDateOnlyString(date)),
                  alternativo: (date) =>
                    diasAlternativos.some((d) => toDateOnlyString(d) === toDateOnlyString(date)),
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
                  Necesitas al menos {alternativosRequeridos} días alternativos.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <PreferenciasResumen titulo="Ideales" color="text-blue-700" fechas={diasIdeales} />
              <PreferenciasResumen
                titulo="Prioritarios"
                color="text-orange-700"
                fechas={diasPrioritarios}
              />
              <PreferenciasResumen
                titulo="Alternativos"
                color="text-gray-700"
                fechas={diasAlternativos}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <LoadingButton
              onClick={handleSolicitarCambio}
              loading={solicitando}
              disabled={!cumpleAlternativos || solicitando}
              className="w-full"
            >
              {solicitando ? 'Enviando...' : 'Enviar nueva propuesta'}
            </LoadingButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreferenciasResumen({
  titulo,
  color,
  fechas,
}: {
  titulo: string;
  color: string;
  fechas: Date[];
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <Label className={cn('text-xs font-medium mb-2 block', color)}>{titulo}</Label>
      <div className="flex flex-wrap gap-1.5 min-h-[40px]">
        {fechas.length === 0 ? (
          <span className="text-xs text-gray-500">Sin fechas</span>
        ) : (
          fechas.slice(0, 4).map((fecha) => (
            <Badge key={fecha.toISOString()} variant="secondary" className="text-[11px]">
              {format(fecha, 'dd MMM', { locale: es })}
            </Badge>
          ))
        )}
        {fechas.length > 4 && (
          <Badge variant="outline" className="text-[10px]">
            +{fechas.length - 4}
          </Badge>
        )}
      </div>
    </div>
  );
}

