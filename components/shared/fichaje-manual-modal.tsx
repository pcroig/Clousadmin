// ========================================
// Modal Fichaje Manual - Solicitud de fichaje manual
// ========================================
// Permite al empleado crear una solicitud de fichaje manual para el día actual

'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { FichajeEventFields, TipoEventoFichaje } from '@/components/shared/fichajes/fichaje-event-fields';
import { LoadingButton } from '@/components/shared/loading-button';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseJson } from '@/lib/utils/json';

interface FichajeManualModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  esHRAdmin?: boolean; // Si es true, guarda directamente sin crear solicitud
  empleadoId?: string; // Solo necesario para HR Admin
  contexto?: 'empleado' | 'manager' | 'hr_admin';
}

export function FichajeManualModal({
  open,
  onClose,
  onSuccess,
  esHRAdmin = false,
  empleadoId,
  contexto,
}: FichajeManualModalProps) {
  const resolvedContexto: 'empleado' | 'manager' | 'hr_admin' = useMemo(() => {
    if (contexto) return contexto;
    return esHRAdmin ? 'hr_admin' : 'empleado';
  }, [contexto, esHRAdmin]);
  const operaDirecto = resolvedContexto === 'hr_admin' || resolvedContexto === 'manager';

  const [tipo, setTipo] = useState<TipoEventoFichaje>('entrada');
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!hora) {
      toast.error('Debes especificar una hora');
      return;
    }

    const fechaSeleccionada = fecha || new Date().toISOString().split('T')[0];
    const fechaSeleccionadaDate = new Date(`${fechaSeleccionada}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaSeleccionadaDate > hoy) {
      toast.error('Solo puedes registrar fichajes hasta el día actual');
      return;
    }

    const fechaHora = new Date(`${fechaSeleccionada}T${hora}`);
    if (Number.isNaN(fechaHora.getTime())) {
      toast.error('Hora inválida');
      return;
    }

    if (fechaHora.getTime() > Date.now()) {
      toast.error('No puedes registrar fichajes en el futuro');
      return;
    }

    setGuardando(true);

    try {
      if (operaDirecto && !empleadoId) {
        throw new Error('No se ha indicado el empleado objetivo para el fichaje');
      }
      const targetEmpleadoId = operaDirecto ? empleadoId : undefined;
      const horaISO = fechaHora.toISOString();

      if (operaDirecto) {
        const responseFichajes = await fetch(
          `/api/fichajes?fecha=${fechaSeleccionada}&empleadoId=${empleadoId}`
        );

        if (!responseFichajes.ok) {
          throw new Error('Error al obtener fichajes del día');
        }

        const dataFichajes = await parseJson<{ data?: Array<{ id: string }> }>(responseFichajes);
        const fichajes = dataFichajes?.data || [];

        let fichajeId = fichajes[0]?.id;

        if (!fichajeId) {
          const responseCrearFichaje = await fetch('/api/fichajes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fecha: fechaSeleccionada,
              tipo: 'entrada',
              hora: horaISO,
              empleadoId: targetEmpleadoId,
            }),
          });

          if (!responseCrearFichaje.ok) {
            throw new Error('Error al crear fichaje');
          }

          const dataCrear = await parseJson<{ fichajeId?: string }>(responseCrearFichaje);
          if (!dataCrear?.fichajeId) {
            throw new Error('No se pudo obtener el ID del fichaje creado');
          }

          fichajeId = dataCrear.fichajeId;
        }

        if (fichajes.length > 0 || tipo !== 'entrada') {
          const responseEvento = await fetch('/api/fichajes/eventos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fichajeId,
              tipo,
              hora: horaISO,
              motivoEdicion: motivo || undefined,
            }),
          });

          if (!responseEvento.ok) {
            const error = await parseJson<{ error?: string }>(responseEvento).catch(() => null);
            throw new Error(error?.error || 'Error al crear evento');
          }
        }

        toast.success('Fichaje guardado correctamente');
      } else {
        const response = await fetch('/api/solicitudes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'fichaje_manual',
            camposCambiados: {
              fecha: fechaSeleccionada,
              tipo,
              hora: horaISO,
              motivo: motivo || 'Fichaje manual',
            },
            motivo: motivo || 'Fichaje manual',
          }),
        });

        if (!response.ok) {
          const error = await parseJson<{ error?: string }>(response).catch(() => null);
          throw new Error(error?.error || 'Error al crear solicitud');
        }

        toast.success('Solicitud de fichaje creada correctamente');
      }

      setTipo('entrada');
      setHora('');
      setMotivo('');
      setFecha(new Date().toISOString().split('T')[0]);

      onClose();

      onSuccess?.();
    } catch (error) {
      console.error('[FichajeManualModal] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear fichaje');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Añadir Fichaje Manual"
      description={
        operaDirecto
          ? 'Registra un fichaje indicando la fecha y la hora. Se guardará directamente.'
          : 'Solicita un fichaje indicando la fecha y la hora. Se procesará automáticamente tras enviarlo.'
      }
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
            {operaDirecto ? 'Guardar fichaje' : 'Crear solicitud'}
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

            <FichajeEventFields
              tipo={tipo}
              hora={hora}
              onTipoChange={setTipo}
              onHoraChange={setHora}
              showLabels
            />

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

