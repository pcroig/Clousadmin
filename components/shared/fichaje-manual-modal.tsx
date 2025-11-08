// ========================================
// Modal Fichaje Manual - Solicitud de fichaje manual
// ========================================
// Permite al empleado crear una solicitud de fichaje manual para el día actual

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LoadingButton } from '@/components/shared/loading-button';
import { toast } from 'sonner';

interface FichajeManualModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function FichajeManualModal({ open, onClose, onSuccess }: FichajeManualModalProps) {
  const [tipo, setTipo] = useState<'entrada' | 'pausa_inicio' | 'pausa_fin' | 'salida'>('entrada');
  const [hora, setHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hora) {
      toast.error('Debes especificar una hora');
      return;
    }

    setGuardando(true);

    try {
      // Obtener fecha actual en formato YYYY-MM-DD
      const hoy = new Date();
      const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

      // Crear solicitud de fichaje manual
      const response = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'fichaje_manual',
          camposCambiados: {
            fecha,
            tipo,
            hora: `${fecha}T${hora}:00`,
            motivo: motivo || 'Fichaje manual',
          },
          motivo: motivo || 'Fichaje manual',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear solicitud');
      }

      toast.success('Solicitud de fichaje creada. Se procesará automáticamente.');
      
      // Limpiar formulario
      setTipo('entrada');
      setHora('');
      setMotivo('');
      
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir Fichaje Manual</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Crea una solicitud de fichaje para el día de hoy. Se procesará automáticamente.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
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
              <p className="text-xs text-gray-500">
                Solo para el día de hoy ({new Date().toLocaleDateString('es-ES')})
              </p>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <LoadingButton type="submit" loading={guardando}>
              Crear Solicitud
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

