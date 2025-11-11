// ========================================
// Modal Compensar Horas Extra (HR)
// ========================================
// Permite a HR compensar horas extra directamente desde la ficha del empleado

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingButton } from '@/components/shared/loading-button';
import { toast } from 'sonner';
import { Clock, TrendingUp } from 'lucide-react';

interface CompensarHorasModalProps {
  empleadoId: string;
  empleadoNombre: string;
  balanceAcumulado: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CompensarHorasModal({
  empleadoId,
  empleadoNombre,
  balanceAcumulado,
  open,
  onClose,
  onSuccess,
}: CompensarHorasModalProps) {
  const [horasACompensar, setHorasACompensar] = useState('');
  const [tipoCompensacion, setTipoCompensacion] = useState<'nomina' | 'ausencia'>('ausencia');
  const [procesando, setProcesando] = useState(false);

  const maxHoras = Math.max(0, balanceAcumulado);

  const formatearHoras = (horas: number) => {
    const h = Math.floor(Math.abs(horas));
    const m = Math.round((Math.abs(horas) - h) * 60);
    return `${h}h ${m}m`;
  };

  const calcularDias = (horas: number) => {
    return Math.round((horas / 8) * 10) / 10;
  };

  const handleSubmit = async () => {
    // Validaciones
    const horas = parseFloat(horasACompensar);

    if (!horasACompensar || isNaN(horas)) {
      toast.error('Debes especificar las horas a compensar');
      return;
    }

    if (horas <= 0) {
      toast.error('Las horas deben ser mayores a 0');
      return;
    }

    if (horas > maxHoras) {
      toast.error(`No puedes compensar más de ${formatearHoras(maxHoras)}`);
      return;
    }

    setProcesando(true);

    try {
      // Crear la compensación directamente como HR
      const response = await fetch('/api/compensaciones-horas-extra/crear-hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleadoId,
          horasBalance: horas,
          tipoCompensacion,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear compensación');
      }

      const data = await response.json();

      toast.success(
        tipoCompensacion === 'ausencia'
          ? `Compensación aprobada: +${calcularDias(horas)} días añadidos al saldo`
          : 'Compensación marcada para incluir en nómina'
      );

      // Limpiar y cerrar
      setHorasACompensar('');
      setTipoCompensacion('ausencia');
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('[CompensarHorasModal] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear compensación');
    } finally {
      setProcesando(false);
    }
  };

  const handleClose = () => {
    if (!procesando) {
      setHorasACompensar('');
      setTipoCompensacion('ausencia');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Compensar Horas Extra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información del empleado */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Empleado</h4>
            <p className="text-sm text-gray-700">{empleadoNombre}</p>
          </div>

          {/* Balance actual */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h4 className="text-sm font-semibold text-green-900">Balance Acumulado</h4>
            </div>
            <p className="text-2xl font-bold text-green-600">
              +{formatearHoras(balanceAcumulado)}
            </p>
            <p className="text-xs text-green-700 mt-1">
              Disponibles para compensar
            </p>
          </div>

          {/* Input horas a compensar */}
          <div className="space-y-2">
            <Label htmlFor="horas">Horas a compensar *</Label>
            <div className="relative">
              <Input
                id="horas"
                type="number"
                step="0.5"
                min="0"
                max={maxHoras}
                value={horasACompensar}
                onChange={(e) => setHorasACompensar(e.target.value)}
                placeholder={`Máximo ${maxHoras.toFixed(1)} horas`}
                className="pr-12"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                horas
              </div>
            </div>
            {horasACompensar && !isNaN(parseFloat(horasACompensar)) && (
              <p className="text-xs text-gray-500">
                ≈ {formatearHoras(parseFloat(horasACompensar))}
              </p>
            )}
          </div>

          {/* Tipo de compensación */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de compensación *</Label>
            <Select value={tipoCompensacion} onValueChange={(v: 'nomina' | 'ausencia') => setTipoCompensacion(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ausencia">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Ausencia/Vacaciones</span>
                    <span className="text-xs text-gray-500">
                      Se añadirán días al saldo de vacaciones (8h = 1 día)
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="nomina">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Nómina</span>
                    <span className="text-xs text-gray-500">
                      Se incluirá en la próxima nómina como horas extra
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview de la compensación */}
          {horasACompensar && !isNaN(parseFloat(horasACompensar)) && parseFloat(horasACompensar) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium mb-1">
                Vista previa:
              </p>
              <p className="text-sm text-blue-700">
                {tipoCompensacion === 'ausencia'
                  ? `Se añadirán ${calcularDias(parseFloat(horasACompensar))} días al saldo de vacaciones del empleado`
                  : `${formatearHoras(parseFloat(horasACompensar))} se marcarán para incluir en la próxima nómina`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={procesando}>
            Cancelar
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            loading={procesando}
            className="bg-green-600 hover:bg-green-700"
          >
            Confirmar Compensación
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



