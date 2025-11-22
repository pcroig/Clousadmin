'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Check, Edit } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';


interface PropuestaVacacion {
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  tipo: 'ideal' | 'alternativo' | 'ajustado';
  motivo: string;
  prioridad: number;
}

interface ResultadoVacacionesModalProps {
  open: boolean;
  campanaId: string;
  campanaTitulo: string;
  propuesta: PropuestaVacacion;
  onClose: () => void;
  onAceptar: () => void;
}

export function ResultadoVacacionesModal({
  open,
  campanaId,
  campanaTitulo,
  propuesta,
  onClose,
  onAceptar,
}: ResultadoVacacionesModalProps) {
  const [cargando, setCargando] = useState(false);

  async function handleAceptar() {
    setCargando(true);
    try {
      const res = await fetch(`/api/campanas-vacaciones/${campanaId}/aceptar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        toast.success('Propuesta aceptada. Se ha creado una solicitud de ausencia que debe ser aprobada por RRHH.');
        onAceptar();
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al aceptar propuesta');
      }
    } catch (e) {
      console.error('Error aceptando propuesta:', e);
      toast.error('Error al aceptar propuesta');
    } finally {
      setCargando(false);
    }
  }

  function handleSolicitarCambio() {
    toast.info('Para solicitar un cambio, ve a la sección de Ausencias y crea una nueva solicitud con tus fechas preferidas.');
    onClose();
  }

  const tipoBadge = {
    ideal: { label: 'Fechas ideales', className: 'bg-green-100 text-green-800' },
    alternativo: { label: 'Fechas alternativas', className: 'bg-blue-100 text-blue-800' },
    ajustado: { label: 'Fechas ajustadas', className: 'bg-yellow-100 text-yellow-800' },
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <DialogTitle>Resultado del cuadrado de vacaciones</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                <span className="font-medium text-gray-700">Campaña:</span> {campanaTitulo}
              </DialogDescription>
            </div>
            <InfoTooltip
              content="El sistema ajusta automáticamente las vacaciones para evitar solapamientos y respetar las preferencias indicadas."
            />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Propuesta */}
          <div className="border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Tu propuesta de vacaciones</h3>
              <Badge className={tipoBadge[propuesta.tipo].className}>
                {tipoBadge[propuesta.tipo].label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Fecha de inicio</FieldLabel>
                <div className="flex items-center gap-2 text-gray-900">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(propuesta.fechaInicio), 'PPP', { locale: es })}
                </div>
              </Field>

              <Field>
                <FieldLabel>Fecha de fin</FieldLabel>
                <div className="flex items-center gap-2 text-gray-900">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(propuesta.fechaFin), 'PPP', { locale: es })}
                </div>
              </Field>
            </div>

            <Field>
              <FieldLabel>Días solicitados</FieldLabel>
              <p className="text-2xl font-bold text-gray-900">{propuesta.dias} días</p>
            </Field>

            <Field>
              <FieldLabel>Motivo de la asignación</FieldLabel>
              <p className="text-sm text-gray-700">{propuesta.motivo}</p>
            </Field>
          </div>

          {/* Explicación */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>¿Qué significa esto?</strong>
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
              <li>
                <strong>Fechas ideales:</strong> Se han asignado exactamente los días que solicitaste.
              </li>
              <li>
                <strong>Fechas alternativas:</strong> Se han usado tus días alternativos para evitar solapamiento.
              </li>
              <li>
                <strong>Fechas ajustadas:</strong> Se han ajustado ligeramente tus preferencias para optimizar el equipo.
              </li>
            </ul>
          </div>

          {/* Acciones */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Importante:</strong> Al aceptar esta propuesta, se creará automáticamente una solicitud
              de ausencia que debe ser aprobada por RRHH. Si no estás de acuerdo, puedes solicitar un cambio
              manualmente creando una nueva solicitud en la sección de Ausencias.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSolicitarCambio} disabled={cargando}>
            <Edit className="w-4 h-4 mr-2" />
            Solicitar cambio
          </Button>
          <Button onClick={handleAceptar} disabled={cargando}>
            <Check className="w-4 h-4 mr-2" />
            {cargando ? 'Aceptando...' : 'Aceptar propuesta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}






