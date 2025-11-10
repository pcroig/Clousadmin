// ========================================
// Modal de Complementos de Nómina
// ========================================
// Modal para que los managers completen complementos salariales de su equipo

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ComplementoEmpleado {
  empleadoId: string;
  empleadoNombre: string;
  horasExtra: number;
  plusNocturnidad: number;
  plusFestivos: number;
  otrosComplementos: number;
  observaciones: string;
}

interface ModalComplementosNominaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nominaId: string;
  mes: number;
  año: number;
  empleados: Array<{
    id: string;
    nombre: string;
    apellidos: string;
  }>;
  onGuardado?: () => void;
}

export function ModalComplementosNomina({
  open,
  onOpenChange,
  nominaId,
  mes,
  año,
  empleados,
  onGuardado,
}: ModalComplementosNominaProps) {
  const [guardando, setGuardando] = useState(false);
  const [complementos, setComplementos] = useState<Record<string, ComplementoEmpleado>>(
    empleados.reduce((acc, emp) => {
      acc[emp.id] = {
        empleadoId: emp.id,
        empleadoNombre: `${emp.nombre} ${emp.apellidos}`,
        horasExtra: 0,
        plusNocturnidad: 0,
        plusFestivos: 0,
        otrosComplementos: 0,
        observaciones: '',
      };
      return acc;
    }, {} as Record<string, ComplementoEmpleado>)
  );

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleChange = (empleadoId: string, campo: keyof ComplementoEmpleado, valor: string | number) => {
    setComplementos(prev => ({
      ...prev,
      [empleadoId]: {
        ...prev[empleadoId],
        [campo]: valor,
      },
    }));
  };

  const handleGuardar = async () => {
    setGuardando(true);
    
    try {
      const response = await fetch(`/api/nominas/${nominaId}/complementos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          complementos: Object.values(complementos),
        }),
      });

      if (response.ok) {
        toast.success('Complementos guardados correctamente');
        onOpenChange(false);
        onGuardado?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar complementos');
      }
    } catch (error) {
      console.error('[Modal Complementos] Error:', error);
      toast.error('Error de red al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const calcularTotalEmpleado = (empleadoId: string) => {
    const comp = complementos[empleadoId];
    if (!comp) return 0;
    
    return (
      Number(comp.horasExtra) +
      Number(comp.plusNocturnidad) +
      Number(comp.plusFestivos) +
      Number(comp.otrosComplementos)
    );
  };

  const calcularTotalGeneral = () => {
    return Object.keys(complementos).reduce((sum, empId) => {
      return sum + calcularTotalEmpleado(empId);
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Complementos de Nómina - {meses[mes - 1]} {año}
          </DialogTitle>
          <DialogDescription>
            Completa los complementos salariales para tu equipo. Los valores son en euros (€).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {empleados.map((empleado) => {
            const empId = empleado.id;
            const comp = complementos[empId];
            const total = calcularTotalEmpleado(empId);

            return (
              <div key={empId} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">
                    {empleado.nombre} {empleado.apellidos}
                  </h3>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total complementos</p>
                    <p className="text-xl font-bold text-blue-600">
                      {total.toFixed(2)} €
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`horasExtra-${empId}`}>Horas extra (€)</Label>
                    <Input
                      id={`horasExtra-${empId}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={comp.horasExtra}
                      onChange={(e) => handleChange(empId, 'horasExtra', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`plusNocturnidad-${empId}`}>Plus nocturnidad (€)</Label>
                    <Input
                      id={`plusNocturnidad-${empId}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={comp.plusNocturnidad}
                      onChange={(e) => handleChange(empId, 'plusNocturnidad', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`plusFestivos-${empId}`}>Plus festivos (€)</Label>
                    <Input
                      id={`plusFestivos-${empId}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={comp.plusFestivos}
                      onChange={(e) => handleChange(empId, 'plusFestivos', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`otrosComplementos-${empId}`}>Otros complementos (€)</Label>
                    <Input
                      id={`otrosComplementos-${empId}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={comp.otrosComplementos}
                      onChange={(e) => handleChange(empId, 'otrosComplementos', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`observaciones-${empId}`}>Observaciones (opcional)</Label>
                  <Input
                    id={`observaciones-${empId}`}
                    type="text"
                    value={comp.observaciones}
                    onChange={(e) => handleChange(empId, 'observaciones', e.target.value)}
                    placeholder="Notas adicionales sobre los complementos"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-left">
              <p className="text-sm text-gray-500">Total general</p>
              <p className="text-2xl font-bold text-green-600">
                {calcularTotalGeneral().toFixed(2)} €
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={guardando}
              >
                Cancelar
              </Button>
              <LoadingButton 
                onClick={handleGuardar}
                loading={guardando}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'Guardar complementos'}
              </LoadingButton>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

