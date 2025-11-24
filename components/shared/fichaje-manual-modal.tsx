// ========================================
// Modal Fichaje Manual - Solicitud de fichaje manual
// ========================================
// Permite al empleado crear una solicitud de fichaje manual para el día actual

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { parseJson } from '@/lib/utils/json';

interface FichajeManualModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function FichajeManualModal({ open, onClose, onSuccess }: FichajeManualModalProps) {
  const [tipo, setTipo] = useState<'entrada' | 'pausa_inicio' | 'pausa_fin' | 'salida'>('entrada');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setTipo('entrada');
      setHora('');
      setMotivo('');
      setFecha(new Date().toISOString().split('T')[0]);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hora) {
      toast.error('Debes especificar una hora');
      return;
    }

    setGuardando(true);

    try {
      const fechaSeleccionada = fecha || new Date().toISOString().split('T')[0];

      // Crear solicitud de fichaje manual
      const response = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'fichaje_manual',
          camposCambiados: {
            fecha: fechaSeleccionada,
            tipo,
            hora: `${fechaSeleccionada}T${hora}:00`,
            motivo: motivo || 'Fichaje manual',
          },
          motivo: motivo || 'Fichaje manual',
        }),
      });

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => null);
        throw new Error(error?.error || 'Error al crear solicitud');
      }

      toast.success('Solicitud de fichaje creada. Se procesará automáticamente.');
      
      // Limpiar formulario
      setTipo('entrada');
      setHora('');
      setMotivo('');
      setFecha(new Date().toISOString().split('T')[0]);
      
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('[FichajeManualModal] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear solicitud');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Añadir Fichaje Manual"
      description="Crea una solicitud de fichaje indicando el día y la hora. Se procesará automáticamente tras enviarla."
      complexity="medium"
      footer={
        <div className="flex gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={guardando}
            className="flex-1"
          >
            Cancelar
          </Button>
          <LoadingButton
            type="submit"
            form="fichaje-manual-form"
            loading={guardando}
            className="flex-1"
          >
            Crear Solicitud
          </LoadingButton>
        </div>
      }
    >
      <form id="fichaje-manual-form" onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Evento</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="pausa_inicio">Inicio de Pausa</SelectItem>
                  <SelectItem value="pausa_fin">Fin de Pausa</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora">Hora</Label>
              <Input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo (opcional)</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Olvidé fichar al entrar"
                rows={3}
              />
            </div>
          </div>
        </form>
    </ResponsiveDialog>
  );
}

