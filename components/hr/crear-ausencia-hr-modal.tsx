'use client';

import { useMemo, useState } from 'react';
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
import {
  PERIODO_MEDIO_DIA_LABELS,
  PERIODOS_MEDIO_DIA_OPTIONS,
  PeriodoMedioDiaValue,
} from '@/lib/constants/enums';
import { toast } from 'sonner';

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

interface CrearAusenciaHRModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  empleadoIdPrefilled?: string; // Si se abre desde detalle de empleado
  empleados?: Array<{ id: string; nombre: string; apellidos: string; email: string }>; // Lista de empleados si no hay prefilled
}

type TipoAusenciaOption = {
  value: string;
  label: string;
  descripcion: string;
  needsApproval: boolean;
  descuentaSaldo: boolean;
};

const TIPOS_AUSENCIA: TipoAusenciaOption[] = [
  {
    value: 'vacaciones',
    label: 'Vacaciones',
    descripcion: 'Descuenta saldo',
    needsApproval: true,
    descuentaSaldo: true
  },
  {
    value: 'enfermedad',
    label: 'Enfermedad',
    descripcion: 'No descuenta saldo',
    needsApproval: false,
    descuentaSaldo: false
  },
  {
    value: 'enfermedad_familiar',
    label: 'Enfermedad familiar',
    descripcion: 'No descuenta saldo',
    needsApproval: false,
    descuentaSaldo: false
  },
  {
    value: 'maternidad_paternidad',
    label: 'Maternidad/Paternidad',
    descripcion: 'No descuenta saldo',
    needsApproval: false,
    descuentaSaldo: false
  },
  {
    value: 'otro',
    label: 'Otro',
    descripcion: 'No descuenta saldo',
    needsApproval: true,
    descuentaSaldo: false
  },
];

const ESTADOS_AUSENCIA = [
  { value: 'pendiente', label: 'Pendiente de aprobación' },
  { value: 'confirmada', label: 'Aprobada (En curso)' },
  { value: 'completada', label: 'Completada' },
  { value: 'rechazada', label: 'Rechazada' },
];

const TipoOptionContent = ({
  label,
  descuentaSaldo,
}: Pick<TipoAusenciaOption, 'label' | 'descuentaSaldo'>) => (
  <span className="flex min-w-0 flex-wrap items-center gap-2">
    <span className="font-medium">{label}</span>
    <span className={`text-xs ${descuentaSaldo ? 'text-orange-600' : 'text-gray-500'}`}>
      {descuentaSaldo ? '📊 Descuenta saldo' : 'No descuenta saldo'}
    </span>
  </span>
);

export function CrearAusenciaHRModal({
  open,
  onClose,
  onSuccess,
  empleadoIdPrefilled,
  empleados = [],
}: CrearAusenciaHRModalProps) {
  const [empleadoId, setEmpleadoId] = useState<string>(empleadoIdPrefilled || '');
  const [tipo, setTipo] = useState<string>('vacaciones');
  const [estado, setEstado] = useState<string>('confirmada'); // Por defecto aprobada para HR
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [medioDia, setMedioDia] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoMedioDiaValue>('manana');
  const [descripcion, setDescripcion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [justificante, setJustificante] = useState<File | null>(null);
  const [uploadingJustificante, setUploadingJustificante] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedTipo = useMemo(
    () => TIPOS_AUSENCIA.find((t) => t.value === tipo),
    [tipo],
  );

  const handleReset = () => {
    if (!empleadoIdPrefilled) {
      setEmpleadoId('');
    }
    setTipo('vacaciones');
    setEstado('confirmada');
    setFechaInicio(undefined);
    setFechaFin(undefined);
    setMedioDia(false);
    setDescripcion('');
    setMotivo('');
    setMotivoRechazo('');
    setJustificante(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const empleadoIdToUse = empleadoIdPrefilled || empleadoId;

    if (!empleadoIdToUse) {
      setError('Por favor selecciona un empleado');
      setLoading(false);
      return;
    }

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

    if (estado === 'rechazada' && !motivoRechazo.trim()) {
      setError('El motivo de rechazo es obligatorio cuando el estado es "Rechazada"');
      setLoading(false);
      return;
    }

    try {
      // Subir justificante si hay archivo
      let justificanteUrl: string | undefined;
      let documentoId: string | undefined;

      if (justificante) {
        setUploadingJustificante(true);

        const formData = new FormData();
        formData.append('file', justificante);
        formData.append('tipo', 'justificante');
        formData.append('crearDocumento', 'true');
        formData.append('empleadoId', empleadoIdToUse);

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

      // Construir payload
      interface AusenciaPayload {
        empleadoId: string;
        tipo: string;
        fechaInicio: string;
        fechaFin: string;
        medioDia: boolean;
        periodo?: PeriodoMedioDiaValue;
        descripcion?: string;
        motivo?: string;
        justificanteUrl?: string;
        documentoId?: string;
        estadoInicial?: string;
        motivoRechazo?: string;
      }

      const payload: AusenciaPayload = {
        empleadoId: empleadoIdToUse,
        tipo,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        medioDia,
        estadoInicial: estado, // HR puede establecer el estado directamente
      };

      if (medioDia) {
        payload.periodo = periodo;
      }

      if (descripcion.trim()) {
        payload.descripcion = descripcion.trim();
      }

      if (motivo.trim()) {
        payload.motivo = motivo.trim();
      }

      if (estado === 'rechazada' && motivoRechazo.trim()) {
        payload.motivoRechazo = motivoRechazo.trim();
      }

      if (justificanteUrl) {
        payload.justificanteUrl = justificanteUrl;
      }
      if (documentoId) {
        payload.documentoId = documentoId;
      }

      const response = await fetch('/api/ausencias/crear-hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const apiError = data as ApiErrorResponse;
        if (apiError.details && Array.isArray(apiError.details)) {
          const errores = apiError.details.map((d) =>
            `${(d as Record<string, unknown>).path ? String((d as Record<string, unknown>).path).replace(/,/g, '.') : 'campo'}: ${d.message}`
          ).join(', ');
          throw new Error(apiError.error + ': ' + errores);
        }
        throw new Error(apiError.error || 'Error al crear ausencia');
      }

      toast.success('Ausencia creada correctamente');
      onSuccess();
      onClose();
      handleReset();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido');
      setError(error.message || 'Error al crear ausencia');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !uploadingJustificante) {
      handleReset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Ausencia (HR Admin)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de empleado (solo si no hay prefilled) */}
          {!empleadoIdPrefilled && (
            <div>
              <Label htmlFor="empleado">Empleado *</Label>
              <Select value={empleadoId} onValueChange={setEmpleadoId}>
                <SelectTrigger id="empleado">
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre} {emp.apellidos} - {emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tipo de Ausencia */}
          <div>
            <Label htmlFor="tipo">Tipo de ausencia *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo" className="w-full">
                <SelectValue placeholder="Selecciona un tipo">
                  {selectedTipo && (
                    <TipoOptionContent
                      label={selectedTipo.label}
                      descuentaSaldo={selectedTipo.descuentaSaldo}
                    />
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIPOS_AUSENCIA.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <TipoOptionContent
                      label={t.label}
                      descuentaSaldo={t.descuentaSaldo}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado de la ausencia */}
          <div>
            <Label htmlFor="estado">Estado *</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger id="estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_AUSENCIA.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Como HR Admin, puedes crear ausencias directamente aprobadas o rechazadas
            </p>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  />
                </PopoverContent>
              </Popover>
            </div>

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
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaFin}
                    onSelect={setFechaFin}
                    disabled={(date) => fechaInicio ? date < fechaInicio : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Medio Día */}
          <div className="space-y-3">
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

            {medioDia && (
              <div>
                <Label htmlFor="periodo">¿Qué medio día?</Label>
                <Select
                  value={periodo}
                  onValueChange={(value) => setPeriodo(value as PeriodoMedioDiaValue)}
                >
                  <SelectTrigger id="periodo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODOS_MEDIO_DIA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Agrega detalles adicionales..."
            />
          </div>

          {/* Motivo (obligatorio para tipo "otro") */}
          {tipo === 'otro' && (
            <div>
              <Label htmlFor="motivo">Motivo *</Label>
              <Input
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={200}
                placeholder="Especifica el motivo de la ausencia"
              />
            </div>
          )}

          {/* Motivo de rechazo (obligatorio si estado = rechazada) */}
          {estado === 'rechazada' && (
            <div>
              <Label htmlFor="motivoRechazo">Motivo de rechazo *</Label>
              <textarea
                id="motivoRechazo"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                maxLength={500}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Explica por qué se rechaza esta ausencia..."
              />
            </div>
          )}

          {/* Justificante */}
          <div>
            <Label htmlFor="justificante">Justificante (opcional)</Label>
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
                Archivo: {justificante.name} ({(justificante.size / 1024).toFixed(1)} KB)
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
              onClick={handleClose}
              disabled={loading || uploadingJustificante}
            >
              Cancelar
            </Button>
            <LoadingButton
              type="submit"
              loading={loading || uploadingJustificante}
              disabled={loading || uploadingJustificante}
            >
              {uploadingJustificante ? 'Subiendo...' : loading ? 'Creando...' : 'Crear Ausencia'}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
