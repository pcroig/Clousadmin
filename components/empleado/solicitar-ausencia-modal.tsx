'use client';

import { useEffect, useMemo, useState } from 'react';

import { FileAttachment } from '@/components/shared/file-attachment';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { LoadingButton } from '@/components/shared/loading-button';
import { ResponsiveDateRangePicker } from '@/components/shared/responsive-date-picker';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { TIPOS_DESCUENTAN_SALDO } from '@/lib/constants/ausencias';
import {
  PeriodoMedioDiaValue,
  PERIODOS_MEDIO_DIA_OPTIONS,
} from '@/lib/constants/enums';
import { normalizeToUTCDate } from '@/lib/utils/dates';
import { parseJson } from '@/lib/utils/json';

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

interface EmpleadoMeResponse {
  id: string;
}

interface UploadApiResponse {
  url: string;
  s3Key?: string;
  size?: number;
  type?: string;
  createdAt?: string;
  documento?: {
    id: string;
  } | null;
}

interface SolicitarAusenciaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  saldoDisponible?: number;
  contexto?: 'empleado' | 'manager' | 'hr_admin';
  empleadoIdDestino?: string;
  defaultFechaInicio?: Date | string;
  defaultFechaFin?: Date | string;
  ausenciaInicial?: {
    id: string;
    tipo: string;
    fechaInicio: string;
    fechaFin: string;
    motivo?: string | null;
    justificanteUrl?: string | null;
    medioDia?: boolean;
    periodo?: PeriodoMedioDiaValue | null;
  };
}

type TipoAusenciaOption = {
  value: string;
  label: string;
  needsApproval: boolean;
  descuentaSaldo: boolean;
};

const TIPOS_AUSENCIA: TipoAusenciaOption[] = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'enfermedad_familiar', label: 'Enfermedad familiar' },
  { value: 'maternidad_paternidad', label: 'Maternidad/Paternidad' },
  { value: 'otro', label: 'Otro' },
].map((tipo) => ({
  ...tipo,
  needsApproval: tipo.value === 'vacaciones' || tipo.value === 'otro',
  descuentaSaldo: TIPOS_DESCUENTAN_SALDO.includes(tipo.value as (typeof TIPOS_DESCUENTAN_SALDO)[number]),
}));

const getApprovalCopy = (needsApproval: boolean) =>
  needsApproval ? 'Necesita aprobación' : 'Sin aprobación manual';

const getBalanceCopy = (descuentaSaldo: boolean) =>
  descuentaSaldo ? 'Descuenta saldo' : 'No descuenta saldo';

const TipoOptionContent = ({
  label,
  needsApproval,
  descuentaSaldo,
}: Pick<TipoAusenciaOption, 'label' | 'needsApproval' | 'descuentaSaldo'>) => (
  <span className="flex min-w-0 items-center gap-3">
    <span className="font-medium text-gray-900">{label}</span>
    <span className="flex-1 truncate text-right text-xs text-gray-500">
      {getApprovalCopy(needsApproval)} · {getBalanceCopy(descuentaSaldo)}
    </span>
  </span>
);

export function SolicitarAusenciaModal({
  open,
  onClose,
  onSuccess,
  saldoDisponible = 0,
  contexto = 'empleado',
  empleadoIdDestino,
  defaultFechaInicio,
  defaultFechaFin,
  ausenciaInicial,
}: SolicitarAusenciaModalProps) {
  const esHRAdmin = contexto === 'hr_admin';
  const isEditing = Boolean(ausenciaInicial);
  const submitLabel = isEditing ? 'Guardar cambios' : esHRAdmin ? 'Registrar' : 'Solicitar';
  const submitLoadingLabel = isEditing ? 'Guardando...' : esHRAdmin ? 'Registrando...' : 'Enviando...';
  const [tipo, setTipo] = useState<string>('vacaciones');
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [medioDia, setMedioDia] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoMedioDiaValue>('manana');
  const [motivo, setMotivo] = useState('');
  const [justificantes, setJustificantes] = useState<File[]>([]);
  const [uploadingJustificante, setUploadingJustificante] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedTipo = useMemo(
    () => TIPOS_AUSENCIA.find((t) => t.value === tipo),
    [tipo],
  );

  const today = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  }, []);

  const isSingleDaySelection = useMemo(() => {
    if (!fechaInicio || !fechaFin) return false;
    return fechaInicio.toDateString() === fechaFin.toDateString();
  }, [fechaInicio, fechaFin]);

  const medioDiaDisponible = Boolean(fechaInicio && fechaFin && isSingleDaySelection);
  const requiereMotivo = tipo === 'otro';
  const motivoValido = !requiereMotivo || motivo.trim().length > 0;

  useEffect(() => {
    if (medioDia && !medioDiaDisponible) {
      setMedioDia(false);
    }
  }, [medioDia, medioDiaDisponible]);

  useEffect(() => {
    if (!open) return;

    if (ausenciaInicial) {
      setTipo(ausenciaInicial.tipo);
      setFechaInicio(new Date(ausenciaInicial.fechaInicio));
      setFechaFin(new Date(ausenciaInicial.fechaFin));
      setMotivo(ausenciaInicial.motivo || '');
      setMedioDia(Boolean(ausenciaInicial.medioDia));
      setPeriodo(
        ausenciaInicial.medioDia ? ausenciaInicial.periodo ?? 'manana' : 'manana'
      );
      setJustificantes([]);
      setError('');
      return;
    }

    if (defaultFechaInicio) {
      const parsed = new Date(defaultFechaInicio);
      if (!Number.isNaN(parsed.getTime())) {
        setFechaInicio(parsed);
        if (!defaultFechaFin) {
          setFechaFin(parsed);
        }
      }
    }

    if (defaultFechaFin) {
      const parsed = new Date(defaultFechaFin);
      if (!Number.isNaN(parsed.getTime())) {
        setFechaFin(parsed);
      }
    }
  }, [open, defaultFechaInicio, defaultFechaFin, ausenciaInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!fechaInicio || !fechaFin) {
      setError('Por favor selecciona las fechas');
      setLoading(false);
      return;
    }

    if (esHRAdmin && !empleadoIdDestino) {
      setError('Selecciona un empleado válido');
      setLoading(false);
      return;
    }

    if (medioDia && !medioDiaDisponible) {
      setError('El medio día solo está disponible para ausencias de un solo día');
      setLoading(false);
      return;
    }

    if (!motivoValido) {
      setError('El motivo es obligatorio para ausencias de tipo "Otro"');
      setLoading(false);
      return;
    }

    try {
      // Subir justificante a S3 si hay archivos y crear documento en BD
      let justificanteUrl: string | undefined;
      let documentoId: string | undefined;
      
      if (justificantes.length > 0) {
        setUploadingJustificante(true);
        
        // Obtener empleadoId para asociar documento
        let empleadoIdDocumento = empleadoIdDestino;
        if (!empleadoIdDocumento) {
          const empleadoResponse = await fetch('/api/empleados/me');
          const empleadoData = await parseJson<EmpleadoMeResponse>(empleadoResponse);
          empleadoIdDocumento = empleadoData?.id;
        }

        // Subir solo el primer archivo como justificante (compatible con modelo actual)
        const formData = new FormData();
        formData.append('file', justificantes[0]);
        formData.append('tipo', 'justificante');
        formData.append('crearDocumento', 'true');
        if (empleadoIdDocumento) {
          formData.append('empleadoId', empleadoIdDocumento);
        }

        try {
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            const errorMessage = (errorData as { error?: string }).error || 'Error al subir el justificante';
            throw new Error(errorMessage);
          }

          const uploadData = await parseJson<UploadApiResponse>(uploadResponse);
          justificanteUrl = uploadData.url;
          documentoId = uploadData.documento?.id;
        } finally {
          setUploadingJustificante(false);
        }
      }

      // Construir payload solo con campos que tienen valores
      interface AusenciaPayload {
        tipo: string;
        fechaInicio: string;
        fechaFin: string;
        medioDia: boolean;
        periodo?: PeriodoMedioDiaValue;
        motivo?: string;
        justificanteUrl?: string;
        documentoId?: string;
        empleadoId?: string;
      }

      // Normalizar las fechas a medianoche UTC para evitar desfases de zona horaria
      const fechaInicioNormalizada = normalizeToUTCDate(fechaInicio);
      const fechaFinNormalizada = normalizeToUTCDate(fechaFin);

      const payload: AusenciaPayload = {
        tipo,
        fechaInicio: fechaInicioNormalizada.toISOString(),
        fechaFin: fechaFinNormalizada.toISOString(),
        medioDia,
      };

      if (esHRAdmin && empleadoIdDestino) {
        payload.empleadoId = empleadoIdDestino;
      }
      
      // Solo incluir periodo si medioDia es true
      if (medioDia) {
        payload.periodo = periodo;
      }

      if (motivo.trim()) {
        payload.motivo = motivo.trim();
      }

      // Incluir justificante URL y documentoId si se subió
      if (justificanteUrl) {
        payload.justificanteUrl = justificanteUrl;
      }
      if (documentoId) {
        payload.documentoId = documentoId;
      }

      const response = await fetch(
        ausenciaInicial ? `/api/ausencias/${ausenciaInicial.id}` : '/api/ausencias',
        {
          method: ausenciaInicial ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await parseJson<ApiErrorResponse | { success: boolean }>(response);

      if (!response.ok) {
        // Mostrar detalles de validación si están disponibles
        const apiError = data as ApiErrorResponse;
        if (apiError.details && Array.isArray(apiError.details)) {
          const errores = apiError.details.map((d) => 
            `${(d as Record<string, unknown>).path ? String((d as Record<string, unknown>).path).replace(/,/g, '.') : 'campo'}: ${d.message}`
          ).join(', ');
          throw new Error(apiError.error + ': ' + errores);
        }
        throw new Error(apiError.error || (ausenciaInicial ? 'Error al actualizar ausencia' : 'Error al crear solicitud'));
      }

      onSuccess();
      onClose();
      
      // Reset form
      setTipo('vacaciones');
      setFechaInicio(undefined);
      setFechaFin(undefined);
      setMedioDia(false);
      setMotivo('');
      setJustificantes([]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido');
      setError(error.message || 'Error al crear solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={
        ausenciaInicial
          ? 'Editar ausencia'
          : esHRAdmin
            ? 'Registrar ausencia'
            : 'Solicitar Ausencia'
      }
      complexity="complex"
      footer={
        <div className="flex gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading || uploadingJustificante}
            className="flex-1"
          >
            Cancelar
          </Button>
          <LoadingButton
            type="submit"
            form="solicitar-ausencia-form"
            loading={loading || uploadingJustificante}
            disabled={loading || uploadingJustificante || (tipo === 'otro' && !motivoValido)}
            className="flex-1"
          >
            {uploadingJustificante
              ? 'Subiendo...'
              : loading
                ? submitLoadingLabel
                : submitLabel}
          </LoadingButton>
        </div>
      }
    >
      <form id="solicitar-ausencia-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Ausencia */}
          <div>
            <Label htmlFor="tipo">Tipo de ausencia *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo" className="w-full">
                <SelectValue placeholder="Selecciona un tipo">
                  {selectedTipo && (
                    <TipoOptionContent
                      label={selectedTipo.label}
                      needsApproval={selectedTipo.needsApproval}
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
                      needsApproval={t.needsApproval}
                      descuentaSaldo={t.descuentaSaldo}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Saldo disponible (solo vacaciones) */}
          {tipo === 'vacaciones' && !esHRAdmin && Number.isFinite(saldoDisponible) && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="flex items-center gap-1 font-medium text-gray-900">
                Días disponibles
                <InfoTooltip
                  content="Incluye los días de vacaciones disponibles teniendo en cuenta solicitudes aprobadas y pendientes."
                  side="right"
                />
              </span>
              <span className="text-gray-900">{saldoDisponible} días</span>
            </div>
          )}

          {/* Fechas - Rango */}
          <div>
            <Label>Periodo de ausencia *</Label>
            <ResponsiveDateRangePicker
              dateRange={{ from: fechaInicio, to: fechaFin }}
              onSelect={(range) => {
                setFechaInicio(range.from);
                setFechaFin(range.to);
              }}
              placeholder="Seleccionar rango de fechas"
              label="Seleccionar periodo"
              disabled={(date) => date < today}
              fromDate={today}
            />
            {fechaInicio && fechaFin && (
              <p className="mt-1 text-xs text-gray-500">
                {isSingleDaySelection 
                  ? '1 día seleccionado' 
                  : `${Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1} días en el rango`
                }
              </p>
            )}
          </div>

          {/* Medio Día */}
          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="medioDia"
                  checked={medioDia}
                  onChange={(e) => setMedioDia(e.target.checked)}
                  className="rounded border-gray-300"
                  disabled={!medioDiaDisponible}
                />
                <Label
                  htmlFor="medioDia"
                  className={medioDiaDisponible ? 'cursor-pointer' : 'cursor-not-allowed text-gray-400'}
                >
                  Medio día
                </Label>
              </div>
              {!medioDiaDisponible && (
                <p className="text-xs text-gray-500">
                  Selecciona la misma fecha de inicio y fin para solicitar medio día.
                </p>
              )}
            </div>

            {/* Periodo (solo visible cuando medioDia=true) */}
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

          {/* Motivo obligatorio para tipo "otro" */}
          <div>
            <Label htmlFor="motivo">
              Motivo o detalles {tipo === 'otro' ? '*' : '(opcional)'}
            </Label>
            <textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder={
                tipo === 'otro'
                  ? 'Explica el motivo de la ausencia'
                  : 'Agrega detalles adicionales (opcional)'
              }
              required={tipo === 'otro'}
            />
          </div>


          {/* Justificante (opcional) */}
          <div className="space-y-2">
            <FileAttachment
              label={
                tipo === 'enfermedad' || tipo === 'enfermedad_familiar' || tipo === 'maternidad_paternidad'
                  ? 'Justificante (recomendado para este tipo de ausencia)'
                  : 'Justificante (opcional)'
              }
              description="Documentación médica o justificante"
              files={justificantes}
              onFilesChange={setJustificantes}
              multiple={false}
              maxFiles={1}
              maxSizeMB={10}
              acceptedTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']}
              disabled={loading || uploadingJustificante}
            />
            {uploadingJustificante && (
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <Spinner className="size-3 text-gray-400" />
                Subiendo justificante...
              </p>
            )}
            {justificantes.length === 0 && ausenciaInicial?.justificanteUrl && (
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <Button variant="link" className="px-0 h-auto text-xs" asChild>
                  <a href={ausenciaInicial.justificanteUrl} target="_blank" rel="noopener noreferrer">
                    Ver justificante actual
                  </a>
                </Button>
                (se mantendrá si no adjuntas uno nuevo)
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </form>
    </ResponsiveDialog>
  );
}

