'use client';

// ========================================
// Modal de Preferencias de Vacaciones
// ========================================
// Modal para que empleados indiquen sus preferencias de vacaciones en una campaña

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Info, Calendar as CalendarIcon, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMutation } from '@/lib/hooks';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

  const { mutate: guardarPreferencias, loading: guardando } = useMutation<any, any>({
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
    }
  }, [open, campanaId]);

  const fechaInicio = new Date(fechaInicioObjetivo);
  const fechaFin = new Date(fechaFinObjetivo);

  const toggleFecha = (fecha: Date, modo: 'ideales' | 'prioritarios' | 'alternativos') => {
    const fechaStr = fecha.toISOString().split('T')[0];
    
    if (modo === 'ideales') {
      const existe = diasIdeales.some(d => d.toISOString().split('T')[0] === fechaStr);
      if (existe) {
        setDiasIdeales(diasIdeales.filter(d => d.toISOString().split('T')[0] !== fechaStr));
      } else {
        setDiasIdeales([...diasIdeales, fecha]);
      }
    } else if (modo === 'prioritarios') {
      const existe = diasPrioritarios.some(d => d.toISOString().split('T')[0] === fechaStr);
      if (existe) {
        setDiasPrioritarios(diasPrioritarios.filter(d => d.toISOString().split('T')[0] !== fechaStr));
      } else {
        setDiasPrioritarios([...diasPrioritarios, fecha]);
      }
    } else {
      const existe = diasAlternativos.some(d => d.toISOString().split('T')[0] === fechaStr);
      if (existe) {
        setDiasAlternativos(diasAlternativos.filter(d => d.toISOString().split('T')[0] !== fechaStr));
      } else {
        setDiasAlternativos([...diasAlternativos, fecha]);
      }
    }
  };

  const handleGuardar = () => {
    guardarPreferencias(
      `/api/campanas-vacaciones/${campanaId}/preferencia`,
      {
        diasIdeales: diasIdeales.map(d => d.toISOString().split('T')[0]),
        diasPrioritarios: diasPrioritarios.map(d => d.toISOString().split('T')[0]),
        diasAlternativos: diasAlternativos.map(d => d.toISOString().split('T')[0]),
        completada: true,
      },
      { method: 'PATCH' }
    );
  };

  const esFechaSeleccionada = (fecha: Date, modo: 'ideales' | 'prioritarios' | 'alternativos') => {
    const fechaStr = fecha.toISOString().split('T')[0];
    if (modo === 'ideales') {
      return diasIdeales.some(d => d.toISOString().split('T')[0] === fechaStr);
    } else if (modo === 'prioritarios') {
      return diasPrioritarios.some(d => d.toISOString().split('T')[0] === fechaStr);
    } else {
      return diasAlternativos.some(d => d.toISOString().split('T')[0] === fechaStr);
    }
  };

  const puedeGuardar = diasIdeales.length > 0 || diasPrioritarios.length > 0 || diasAlternativos.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {campanaTitulo}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <CalendarIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {format(fechaInicio, 'PPP', { locale: es })} - {format(fechaFin, 'PPP', { locale: es })}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info Tooltip */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  ¿Cómo funciona?
                </p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• <strong>Fechas ideales:</strong> Tus días preferidos de vacaciones</li>
                  <li>• <strong>Fechas prioritarias:</strong> Días muy importantes para ti</li>
                  <li>• <strong>Fechas alternativas:</strong> Opciones si no están disponibles las anteriores</li>
                </ul>
              </div>
            </div>
          </div>

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
                const fechaStr = date.toISOString().split('T')[0];
                const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
                const fechaFinStr = fechaFin.toISOString().split('T')[0];
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
                alternativo: 'bg-gray-400 text-white hover:bg-gray-500',
              }}
              className="w-full"
            />
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
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
                  <span className="text-xs text-gray-600">Ninguna seleccionada</span>
                ) : (
                  diasAlternativos.slice(0, 5).map((fecha) => (
                    <Badge key={fecha.toISOString()} className="bg-gray-600 text-white border-0 text-xs">
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
          <Button variant="outline" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGuardar} 
            disabled={!puedeGuardar || guardando}
            className="min-w-[120px]"
          >
            {guardando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Preferencias'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
