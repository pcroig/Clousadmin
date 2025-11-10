'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Spinner } from '@/components/ui/spinner';

interface ErrorDetail {
  field?: string;
  message: string;
  [key: string]: unknown;
}

interface ApiErrorResponse {
  error: string;
  details: ErrorDetail[];
  [key: string]: unknown;
}

interface SolicitarAusenciaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  saldoDisponible?: number;
}

const TIPOS_AUSENCIA = [
  { 
    value: 'vacaciones', 
    label: 'Vacaciones', 
    descripcion: 'Necesita aprobación • Descuenta saldo',
    needsApproval: true,
    descuentaSaldo: true
  },
  { 
    value: 'enfermedad', 
    label: 'Enfermedad', 
    descripcion: 'No necesita aprobación • No descuenta saldo',
    needsApproval: false,
    descuentaSaldo: false
  },
  { 
    value: 'enfermedad_familiar', 
    label: 'Enfermedad familiar', 
    descripcion: 'No necesita aprobación • No descuenta saldo',
    needsApproval: false,
    descuentaSaldo: false
  },
  { 
    value: 'maternidad_paternidad', 
    label: 'Maternidad/Paternidad', 
    descripcion: 'No necesita aprobación • No descuenta saldo',
    needsApproval: false,
    descuentaSaldo: false
  },
  { 
    value: 'otro', 
    label: 'Otro', 
    descripcion: 'Necesita aprobación • No descuenta saldo',
    needsApproval: true,
    descuentaSaldo: false
  },
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
  const [justificante, setJustificante] = useState<File | null>(null);
  const [uploadingJustificante, setUploadingJustificante] = useState(false);
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
      // Subir justificante a S3 si hay archivo y crear documento en BD
      let justificanteUrl: string | undefined;
      let documentoId: string | undefined;
      
      if (justificante) {
        setUploadingJustificante(true);
        
        // Obtener empleadoId del usuario actual
        const empleadoResponse = await fetch('/api/empleados/me');
        const empleadoData = await empleadoResponse.json();
        const empleadoId = empleadoData?.id;

        const formData = new FormData();
        formData.append('file', justificante);
        formData.append('tipo', 'justificante');
        formData.append('crearDocumento', 'true');
        if (empleadoId) {
          formData.append('empleadoId', empleadoId);
        }

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Error al subir el justificante');
        }

        const uploadData = await uploadResponse.json();
        justificanteUrl = uploadData.url;
        documentoId = uploadData.documento?.id;
        setUploadingJustificante(false);
      }

      // Construir payload solo con campos que tienen valores
      interface AusenciaPayload {
        tipo: string;
        fechaInicio: string;
        fechaFin: string;
        medioDia: boolean;
        descripcion?: string;
        motivo?: string;
        justificanteUrl?: string;
        documentoId?: string;
      }
      
      const payload: AusenciaPayload = {
        tipo,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        medioDia,
      };

      // Solo incluir descripcion si tiene valor
      if (descripcion.trim()) {
        payload.descripcion = descripcion.trim();
      }

      // Solo incluir motivo si tiene valor (o si es tipo "otro" y es requerido)
      if (tipo === 'otro') {
        if (!motivo.trim()) {
          setError('El motivo es obligatorio para ausencias de tipo "Otro"');
          setLoading(false);
          return;
        }
        payload.motivo = motivo.trim();
      } else if (motivo.trim()) {
        payload.motivo = motivo.trim();
      }

      // Incluir justificante URL y documentoId si se subió
      if (justificanteUrl) {
        payload.justificanteUrl = justificanteUrl;
      }
      if (documentoId) {
        payload.documentoId = documentoId;
      }

      const response = await fetch('/api/ausencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Mostrar detalles de validación si están disponibles
        const apiError = data as ApiErrorResponse;
        if (apiError.details && Array.isArray(apiError.details)) {
          const errores = apiError.details.map((d) => 
            `${(d as Record<string, unknown>).path ? String((d as Record<string, unknown>).path).replace(/,/g, '.') : 'campo'}: ${d.message}`
          ).join(', ');
          throw new Error(apiError.error + ': ' + errores);
        }
        throw new Error(apiError.error || 'Error al crear solicitud');
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
      setJustificante(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido');
      setError(error.message || 'Error al crear solicitud');
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
                    <div className="flex flex-col">
                      <span className="font-medium">{t.label}</span>
                      <span className="text-xs text-gray-500">{t.descripcion}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Información adicional del tipo seleccionado */}
            {TIPOS_AUSENCIA.find((t) => t.value === tipo) && (
              <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
                <span className={TIPOS_AUSENCIA.find((t) => t.value === tipo)?.needsApproval ? 'text-yellow-600' : 'text-green-600'}>
                  {TIPOS_AUSENCIA.find((t) => t.value === tipo)?.needsApproval ? '⏱ Necesita aprobación' : '✓ No necesita aprobación'}
                </span>
                <span className="text-gray-400">•</span>
                <span className={TIPOS_AUSENCIA.find((t) => t.value === tipo)?.descuentaSaldo ? 'text-orange-600' : 'text-gray-500'}>
                  {TIPOS_AUSENCIA.find((t) => t.value === tipo)?.descuentaSaldo ? '📊 Descuenta saldo' : 'No descuenta saldo'}
                </span>
              </p>
            )}
          </div>

          {/* Saldo disponible (solo vacaciones) */}
          {tipo === 'vacaciones' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <InfoTooltip
                content="Incluye los días de vacaciones disponibles teniendo en cuenta solicitudes aprobadas y pendientes."
                variant="subtle"
                side="right"
              />
              <span>
                <span className="font-medium text-gray-900">Días disponibles:</span> {saldoDisponible} días
              </span>
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

          {/* Justificante (opcional) */}
          <div>
            <Label htmlFor="justificante">
              Justificante (opcional)
              {(tipo === 'enfermedad' || tipo === 'enfermedad_familiar' || tipo === 'maternidad_paternidad') && (
                <span className="text-xs text-gray-500 ml-2">Recomendado para estos tipos de ausencia</span>
              )}
            </Label>
            <Input
              id="justificante"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setJustificante(e.target.files?.[0] || null)}
              disabled={loading || uploadingJustificante}
              className="cursor-pointer"
            />
            {justificante && (
              <p className="text-xs text-gray-500 mt-1">
                Archivo seleccionado: {justificante.name} ({(justificante.size / 1024).toFixed(1)} KB)
              </p>
            )}
            {uploadingJustificante && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                <Spinner className="size-3 text-gray-400" />
                Subiendo justificante...
              </p>
            )}
          </div>

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
            <LoadingButton
              type="submit"
              loading={loading || uploadingJustificante}
              disabled={loading || uploadingJustificante}
            >
              {uploadingJustificante ? 'Subiendo justificante...' : loading ? 'Enviando...' : 'Solicitar'}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

