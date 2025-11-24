// ========================================
// Modal Gestión de Compensación de Horas Extra
// ========================================
// Permite a HR aprobar o rechazar compensaciones de horas extra

'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseJson } from '@/lib/utils/json';

interface CompensacionEmpleado {
  nombre: string;
  apellidos: string;
  email: string;
}

interface Compensacion {
  id: string;
  empleado: CompensacionEmpleado;
  horasBalance: number | string;
  tipoCompensacion: 'ausencia' | 'nomina';
  createdAt: string | Date;
}

interface CompensacionModalProps {
  compensacion: Compensacion;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CompensacionModal({ compensacion, open, onClose, onSuccess }: CompensacionModalProps) {
  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesando, setProcesando] = useState(false);

  if (!compensacion) return null;

  const formatearHoras = (horas: number) => {
    const h = Math.floor(Math.abs(horas));
    const m = Math.round((Math.abs(horas) - h) * 60);
    return `${h}h ${m}m`;
  };

  const handleSubmit = async () => {
    if (!accion) {
      toast.error('Selecciona una acción');
      return;
    }

    if (accion === 'rechazar' && !motivoRechazo.trim()) {
      toast.error('Debes especificar un motivo de rechazo');
      return;
    }

    setProcesando(true);

    try {
      const response = await fetch(`/api/compensaciones-horas-extra/${compensacion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion,
          motivoRechazo: accion === 'rechazar' ? motivoRechazo : undefined,
        }),
      });

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => null);
        throw new Error(error?.error || 'Error al procesar compensación');
      }

      toast.success(
        accion === 'aprobar'
          ? 'Compensación aprobada correctamente'
          : 'Compensación rechazada'
      );

      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('[CompensacionModal] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al procesar compensación');
    } finally {
      setProcesando(false);
    }
  };

  const calcularDias = (horas: number) => {
    return Math.round((horas / 8) * 10) / 10;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gestionar Compensación de Horas Extra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información del empleado */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Empleado</h4>
            <p className="text-sm text-gray-700">
              {compensacion.empleado.nombre} {compensacion.empleado.apellidos}
            </p>
            <p className="text-xs text-gray-500">{compensacion.empleado.email}</p>
          </div>

          {/* Detalles de la compensación */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Horas a compensar:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatearHoras(Number(compensacion.horasBalance))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tipo de compensación:</span>
              <span className="text-sm font-medium text-gray-900">
                {compensacion.tipoCompensacion === 'ausencia' ? 'Ausencia' : 'Nómina'}
              </span>
            </div>
            {compensacion.tipoCompensacion === 'ausencia' && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Días equivalentes:</span>
                <span className="text-sm font-medium text-green-600">
                  +{calcularDias(Number(compensacion.horasBalance))} días
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Solicitado:</span>
              <span className="text-sm text-gray-500">
                {new Date(compensacion.createdAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Acciones */}
          {!accion && (
            <div className="space-y-2">
              <Label>Selecciona una acción</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                  onClick={() => setAccion('aprobar')}
                >
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50"
                  onClick={() => setAccion('rechazar')}
                >
                  Rechazar
                </Button>
              </div>
            </div>
          )}

          {accion === 'aprobar' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900 font-medium mb-1">
                Confirmar aprobación
              </p>
              <p className="text-sm text-green-700">
                {compensacion.tipoCompensacion === 'ausencia'
                  ? `Se añadirán ${calcularDias(Number(compensacion.horasBalance))} días al saldo de vacaciones del empleado.`
                  : 'La compensación se marcará para incluir en la próxima nómina.'}
              </p>
            </div>
          )}

          {accion === 'rechazar' && (
            <div className="space-y-2">
              <Label htmlFor="motivoRechazo">Motivo del rechazo *</Label>
              <Textarea
                id="motivoRechazo"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Explica por qué se rechaza esta compensación"
                rows={3}
                required
              />
            </div>
          )}
        </div>

        <DialogFooter>
          {accion && (
            <Button
              variant="outline"
              onClick={() => {
                setAccion(null);
                setMotivoRechazo('');
              }}
              disabled={procesando}
            >
              Volver
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={procesando}>
            Cancelar
          </Button>
          {accion && (
            <LoadingButton
              onClick={handleSubmit}
              loading={procesando}
              className={
                accion === 'aprobar'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {accion === 'aprobar' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
            </LoadingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


