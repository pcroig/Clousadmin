'use client';

// ========================================
// Modal: Preferencias de Vacaciones (Empleado)
// ========================================
// Se abre automáticamente cuando hay campañas pendientes

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Star, CheckCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ModalPreferenciasVacacionesProps {
  campaniaId: string;
  campaniaNombre: string;
  fechaInicio: Date;
  fechaFin: Date;
  diasRespuesta: number;
  open: boolean;
  onClose: () => void;
  onEnviado?: () => void;
}

type TipoPreferencia = 'ideales' | 'prioritarios' | 'alternativos';

export function ModalPreferenciasVacaciones({
  campaniaId,
  campaniaNombre,
  fechaInicio,
  fechaFin,
  diasRespuesta,
  open,
  onClose,
  onEnviado,
}: ModalPreferenciasVacacionesProps) {
  const [enviando, setEnviando] = useState(false);
  const [tab, setTab] = useState<TipoPreferencia>('ideales');

  // Fechas seleccionadas por tipo
  const [diasIdeales, setDiasIdeales] = useState<Date[]>([]);
  const [diasPrioritarios, setDiasPrioritarios] = useState<Date[]>([]);
  const [diasAlternativos, setDiasAlternativos] = useState<Date[]>([]);

  const handleDayClick = (day: Date, tipo: TipoPreferencia) => {
    const setter = tipo === 'ideales' ? setDiasIdeales : tipo === 'prioritarios' ? setDiasPrioritarios : setDiasAlternativos;
    const actual = tipo === 'ideales' ? diasIdeales : tipo === 'prioritarios' ? diasPrioritarios : diasAlternativos;

    const yaSeleccionado = actual.some(
      (d) => d.toISOString().split('T')[0] === day.toISOString().split('T')[0]
    );

    if (yaSeleccionado) {
      setter(actual.filter((d) => d.toISOString().split('T')[0] !== day.toISOString().split('T')[0]));
    } else {
      setter([...actual, day]);
    }
  };

  async function handleEnviar() {
    if (diasIdeales.length === 0 && diasPrioritarios.length === 0 && diasAlternativos.length === 0) {
      alert('Selecciona al menos un día en cualquier categoría');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`/api/campanias/${campaniaId}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diasIdeales: diasIdeales.map((d) => d.toISOString().split('T')[0]),
          diasPrioritarios: diasPrioritarios.map((d) => d.toISOString().split('T')[0]),
          diasAlternativos: diasAlternativos.map((d) => d.toISOString().split('T')[0]),
        }),
      });

      if (res.ok) {
        alert('¡Preferencias enviadas correctamente!');
        if (onEnviado) onEnviado();
        onClose();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al enviar preferencias');
      }
    } catch (e) {
      alert('Error al enviar preferencias');
    } finally {
      setEnviando(false);
    }
  }

  const modifiers = {
    ideales: diasIdeales,
    prioritarios: diasPrioritarios,
    alternativos: diasAlternativos,
  };

  const modifiersStyles = {
    ideales: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      fontWeight: 'bold',
    },
    prioritarios: {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
      fontWeight: 'bold',
    },
    alternativos: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
      fontWeight: 'bold',
    },
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {campaniaNombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Tu equipo está planificando vacaciones</p>
                <p>
                  Periodo: {format(fechaInicio, 'PPP', { locale: es })} -{' '}
                  {format(fechaFin, 'PPP', { locale: es })}
                </p>
                <p className="mt-1">
                  Tienes <span className="font-semibold">{diasRespuesta} días</span> para indicar
                  tus preferencias. La IA optimizará el calendario respetando al máximo tus
                  elecciones.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{diasIdeales.length}</div>
              <div className="text-sm text-gray-600">Días ideales</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{diasPrioritarios.length}</div>
              <div className="text-sm text-gray-600">Días prioritarios</div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-700">{diasAlternativos.length}</div>
              <div className="text-sm text-gray-600">Días alternativos</div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TipoPreferencia)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ideales">
                <Star className="w-4 h-4 mr-1" />
                Ideales
              </TabsTrigger>
              <TabsTrigger value="prioritarios">
                <CheckCircle className="w-4 h-4 mr-1" />
                Prioritarios
              </TabsTrigger>
              <TabsTrigger value="alternativos">
                <CalendarIcon className="w-4 h-4 mr-1" />
                Alternativos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ideales" className="space-y-2">
              <div className="text-sm text-gray-600 p-3 bg-green-50 border border-green-200 rounded">
                <span className="font-semibold">Días ideales:</span> Estas son tus fechas
                preferidas. La IA intentará asignártelas en primer lugar.
              </div>
              <div className="flex justify-center">
                <Calendar
                  mode="multiple"
                  selected={diasIdeales}
                  onDayClick={(day) => handleDayClick(day, 'ideales')}
                  fromDate={fechaInicio}
                  toDate={fechaFin}
                  locale={es}
                  numberOfMonths={2}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                />
              </div>
            </TabsContent>

            <TabsContent value="prioritarios" className="space-y-2">
              <div className="text-sm text-gray-600 p-3 bg-blue-50 border border-blue-200 rounded">
                <span className="font-semibold">Días prioritarios:</span> Fechas críticas para ti
                (eventos importantes, compromisos). La IA las respetará con máxima prioridad.
              </div>
              <div className="flex justify-center">
                <Calendar
                  mode="multiple"
                  selected={diasPrioritarios}
                  onDayClick={(day) => handleDayClick(day, 'prioritarios')}
                  fromDate={fechaInicio}
                  toDate={fechaFin}
                  locale={es}
                  numberOfMonths={2}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                />
              </div>
            </TabsContent>

            <TabsContent value="alternativos" className="space-y-2">
              <div className="text-sm text-gray-600 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <span className="font-semibold">Días alternativos:</span> Fechas que también te van
                bien si tus días ideales no están disponibles.
              </div>
              <div className="flex justify-center">
                <Calendar
                  mode="multiple"
                  selected={diasAlternativos}
                  onDayClick={(day) => handleDayClick(day, 'alternativos')}
                  fromDate={fechaInicio}
                  toDate={fechaFin}
                  locale={es}
                  numberOfMonths={2}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleEnviar} disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar Preferencias'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

