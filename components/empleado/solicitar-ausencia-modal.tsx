'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SolicitarAusenciaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  saldoDisponible?: number;
}

const TIPOS_AUSENCIA = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'enfermedad_familiar', label: 'Enfermedad familiar' },
  { value: 'maternidad_paternidad', label: 'Maternidad/Paternidad' },
  { value: 'otro', label: 'Otro' },
];

export function SolicitarAusenciaModal({
  open,
  onClose,
  onSuccess,
  saldoDisponible = 0,
}: SolicitarAusenciaModalProps) {
  const [tipo, setTipo] = useState<string>('vacaciones');
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [medioDia, setMedioDia] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!fechaInicio || !fechaFin) {
      setError('Por favor selecciona las fechas');
      setLoading(false);
      return;
    }

    if (tipo === 'otro' && !motivo.trim()) {
      setError('El motivo es obligatorio para ausencias de tipo "Otro"');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/ausencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          fechaInicio: fechaInicio.toISOString(),
          fechaFin: fechaFin.toISOString(),
          medioDia,
          descripcion: descripcion.trim() || null,
          motivo: motivo.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear solicitud');
      }

      onSuccess();
      onClose();
      
      // Reset form
      setTipo('vacaciones');
      setFechaInicio(undefined);
      setFechaFin(undefined);
      setMedioDia(false);
      setDescripcion('');
      setMotivo('');
    } catch (err: any) {
      setError(err.message || 'Error al crear solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Ausencia</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Ausencia */}
          <div>
            <Label htmlFor="tipo">Tipo de ausencia *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_AUSENCIA.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Saldo disponible (solo vacaciones) */}
          {tipo === 'vacaciones' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <span className="font-medium">Días disponibles:</span> {saldoDisponible} días
              </p>
            </div>
          )}

          {/* Fecha Inicio */}
          <div>
            <Label>Fecha de inicio *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaInicio ? format(fechaInicio, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaInicio}
                  onSelect={setFechaInicio}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fecha Fin */}
          <div>
            <Label>Fecha de fin *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaFin ? format(fechaFin, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaFin}
                  onSelect={setFechaFin}
                  disabled={(date) => {
                    const today = new Date(new Date().setHours(0, 0, 0, 0));
                    return date < today || (fechaInicio ? date < fechaInicio : false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Medio Día */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="medioDia"
              checked={medioDia}
              onChange={(e) => setMedioDia(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="medioDia" className="cursor-pointer">
              Medio día
            </Label>
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Agrega detalles adicionales..."
            />
          </div>

          {/* Motivo (obligatorio para "Otro") */}
          {tipo === 'otro' && (
            <div>
              <Label htmlFor="motivo">Motivo *</Label>
              <Input
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={500}
                placeholder="Ej: Mudanza, trámites legales, etc."
                required
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Solicitar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

