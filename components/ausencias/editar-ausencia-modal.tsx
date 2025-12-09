// ========================================
// Ausencia Modal - Crear y Editar Ausencias
// ========================================
// Modal unificado para crear y editar ausencias
// - Modo CREAR: ausencia = null, muestra selector de empleado
// - Modo EDITAR: ausencia != null, usa empleadoId existente

'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import { ResponsiveDateRangePicker } from '@/components/shared/responsive-date-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { EstadoAusencia, PeriodoMedioDiaValue } from '@/lib/constants/enums';
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { parseJson } from '@/lib/utils/json';

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
  puesto: string;
}

export interface EditarAusencia {
  id: string;
  empleadoId: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  createdAt: string;
  medioDia: boolean;
  periodo?: string | null;
  estado: string;
  motivo: string | null;
  justificanteUrl?: string | null;
  documentoId?: string | null;
  diasSolicitados?: number | string;
  empleado: {
    nombre: string;
    apellidos: string;
    puesto: string;
  };
}

interface EditarAusenciaModalProps {
  open: boolean;
  ausencia: EditarAusencia | null;
  onClose: () => void;
  onSuccess: () => void;
  contexto?: 'empleado' | 'manager' | 'hr_admin';
}

const TIPOS_AUSENCIA = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'enfermedad_familiar', label: 'Enfermedad Familiar' },
  { value: 'maternidad_paternidad', label: 'Maternidad/Paternidad' },
  { value: 'otro', label: 'Otro' },
];

const PERIODOS_MEDIO_DIA = [
  { value: 'manana', label: 'Mañana' },
  { value: 'tarde', label: 'Tarde' },
];

export function EditarAusenciaModal({
  open,
  ausencia,
  onClose,
  onSuccess,
  contexto = 'empleado',
}: EditarAusenciaModalProps) {
  // Modo crear o editar
  const isCreating = ausencia === null;
  const isEditing = !isCreating;

  // Estados para modo CREAR: selector de empleado
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState('');

  // Estados del formulario
  const [tipo, setTipo] = useState('vacaciones');
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
  const [fechaFin, setFechaFin] = useState<Date | undefined>();
  const [medioDia, setMedioDia] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoMedioDiaValue>('manana');
  const [motivo, setMotivo] = useState('');
  const [justificanteFile, setJustificanteFile] = useState<File | null>(null);
  const [justificanteUrl, setJustificanteUrl] = useState<string | null>(null);
  const [documentoId, setDocumentoId] = useState<string | null>(null);
  const [uploadingJustificante, setUploadingJustificante] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Saldo de vacaciones
  const [saldoDisponible, setSaldoDisponible] = useState<number | null>(null);
  const [loadingSaldo, setLoadingSaldo] = useState(false);

  // EmpleadoId efectivo: seleccionado (crear) o de ausencia (editar)
  const efectivoEmpleadoId = isCreating ? selectedEmpleadoId : ausencia?.empleadoId || '';

  const isSingleDaySelection = useMemo(() => {
    if (!fechaInicio || !fechaFin) return false;
    return fechaInicio.toDateString() === fechaFin.toDateString();
  }, [fechaInicio, fechaFin]);

  const medioDiaDisponible = Boolean(fechaInicio && fechaFin && isSingleDaySelection);

  // Calcular días solicitados (aproximación simple para validación de frontend)
  const diasSolicitados = useMemo(() => {
    if (!fechaInicio || !fechaFin) return 0;

    const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return medioDia ? diffDays * 0.5 : diffDays;
  }, [fechaInicio, fechaFin, medioDia]);

  // Validar si excede el saldo disponible
  const excedeSaldo = useMemo(() => {
    if (tipo !== 'vacaciones' || saldoDisponible === null) return false;

    // MODO EDITAR: considerar días originales
    if (isEditing && ausencia) {
      const diasOriginales = Number(ausencia.diasSolicitados) || 0;
      const saldoConDevolucion = saldoDisponible + diasOriginales;
      return diasSolicitados > saldoConDevolucion;
    }

    // MODO CREAR: comparar directamente
    return diasSolicitados > saldoDisponible;
  }, [tipo, diasSolicitados, saldoDisponible, ausencia, isEditing]);

  // Cargar empleados activos (solo en modo CREAR)
  useEffect(() => {
    if (!open || !isCreating) return;

    const fetchEmpleados = async () => {
      setLoadingEmpleados(true);
      try {
        const response = await fetch('/api/empleados?activos=true');
        if (!response.ok) throw new Error('Error al cargar empleados');

        const data = await parseJson<{ data: Empleado[] }>(response);
        const empleadosArray = extractArrayFromResponse(data) as Empleado[];
        setEmpleados(empleadosArray);
      } catch (err) {
        console.error('[fetchEmpleados] Error:', err);
        toast.error('Error al cargar la lista de empleados');
        setEmpleados([]);
      } finally {
        setLoadingEmpleados(false);
      }
    };

    fetchEmpleados();
  }, [open, isCreating]);

  // Cargar saldo del empleado
  useEffect(() => {
    if (!efectivoEmpleadoId || tipo !== 'vacaciones') {
      setSaldoDisponible(null);
      return;
    }

    const fetchSaldo = async () => {
      setLoadingSaldo(true);
      try {
        const response = await fetch(`/api/ausencias/saldo?empleadoId=${efectivoEmpleadoId}`);
        if (!response.ok) throw new Error('Error al cargar saldo');

        const data = await parseJson<{ diasDisponibles: number }>(response);
        setSaldoDisponible(data.diasDisponibles);
      } catch (err) {
        console.error('[fetchSaldo] Error:', err);
        setSaldoDisponible(null);
      } finally {
        setLoadingSaldo(false);
      }
    };

    fetchSaldo();
  }, [efectivoEmpleadoId, tipo]);

  // Precargar datos cuando se abre el modal en MODO EDITAR
  useEffect(() => {
    if (!open) return;

    if (ausencia) {
      // MODO EDITAR: precargar datos existentes
      setTipo(ausencia.tipo);
      setFechaInicio(new Date(ausencia.fechaInicio));
      setFechaFin(new Date(ausencia.fechaFin));
      setMedioDia(Boolean(ausencia.medioDia));
      setPeriodo((ausencia.periodo as PeriodoMedioDiaValue) || 'manana');
      setMotivo(ausencia.motivo || '');
      setJustificanteUrl(ausencia.justificanteUrl || null);
      setDocumentoId(ausencia.documentoId || null);
      setJustificanteFile(null);
      setError('');
      setSaldoDisponible(null);
    } else {
      // MODO CREAR: resetear a valores por defecto
      setSelectedEmpleadoId('');
      setTipo('vacaciones');
      setFechaInicio(undefined);
      setFechaFin(undefined);
      setMedioDia(false);
      setPeriodo('manana');
      setMotivo('');
      setJustificanteUrl(null);
      setDocumentoId(null);
      setJustificanteFile(null);
      setError('');
      setSaldoDisponible(null);
    }
  }, [open, ausencia]);

  const handleClose = () => {
    setJustificanteFile(null);
    setError('');
    onClose();
  };

  const uploadJustificante = async (file: File, empleadoId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', 'justificante');
    formData.append('crearDocumento', 'true');
    formData.append('empleadoId', empleadoId);

    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error('Error al subir el justificante');
    }

    const uploadData = await parseJson<{ url: string; documento?: { id: string } }>(uploadResponse);
    return {
      url: uploadData.url,
      documentoId: uploadData.documento?.id,
    };
  };

  const handleSave = async () => {
    // Validaciones comunes
    if (isCreating && !selectedEmpleadoId) {
      setError('Selecciona un empleado');
      return;
    }

    if (!fechaInicio || !fechaFin) {
      setError('Selecciona las fechas de inicio y fin');
      return;
    }

    if (fechaFin < fechaInicio) {
      setError('La fecha de fin debe ser posterior a la de inicio');
      return;
    }

    if (tipo === 'otro' && !motivo.trim()) {
      setError('El motivo es obligatorio para ausencias de tipo "Otro"');
      return;
    }

    // Validar saldo de vacaciones
    if (tipo === 'vacaciones' && excedeSaldo) {
      if (isEditing && ausencia) {
        const diasOriginales = Number(ausencia.diasSolicitados) || 0;
        const saldoConDevolucion = (saldoDisponible || 0) + diasOriginales;
        setError(`No hay saldo suficiente. Disponibles (con devolución): ${saldoConDevolucion} días, solicitados: ${diasSolicitados} días.`);
      } else {
        setError(`No hay saldo suficiente. Disponibles: ${saldoDisponible} días, solicitados: ${diasSolicitados} días.`);
      }
      return;
    }

    setSaving(true);
    setError('');

    try {
      let newJustificanteUrl = justificanteUrl;
      let newDocumentoId = documentoId;

      // Subir justificante si hay archivo nuevo
      if (justificanteFile) {
        setUploadingJustificante(true);
        const uploadResult = await uploadJustificante(justificanteFile, efectivoEmpleadoId);
        newJustificanteUrl = uploadResult.url;
        newDocumentoId = uploadResult.documentoId || null;
        setUploadingJustificante(false);
      }

      // Normalizar fechas a medianoche UTC antes de enviar
      // Usar Date.UTC() para evitar problemas de zona horaria
      const fechaInicioNormalizada = new Date(Date.UTC(
        fechaInicio.getFullYear(),
        fechaInicio.getMonth(),
        fechaInicio.getDate(),
        0, 0, 0, 0
      ));

      const fechaFinNormalizada = new Date(Date.UTC(
        fechaFin.getFullYear(),
        fechaFin.getMonth(),
        fechaFin.getDate(),
        0, 0, 0, 0
      ));

      const payload: Record<string, unknown> = {
        tipo,
        fechaInicio: fechaInicioNormalizada.toISOString(),
        fechaFin: fechaFinNormalizada.toISOString(),
        medioDia,
      };

      // Solo agregar motivo si tiene valor (Zod no acepta null en campos .optional())
      if (motivo && motivo.trim()) {
        payload.motivo = motivo.trim();
      }

      // MODO CREAR: agregar empleadoId (el estado lo determina automáticamente el backend)
      if (isCreating) {
        payload.empleadoId = selectedEmpleadoId;
      }

      if (medioDia) {
        payload.periodo = periodo;
      }

      if (newJustificanteUrl) {
        payload.justificanteUrl = newJustificanteUrl;
      }

      if (newDocumentoId) {
        payload.documentoId = newDocumentoId;
      }

      // Elegir endpoint según modo
      const url = isCreating ? '/api/ausencias' : `/api/ausencias/${ausencia!.id}`;
      const method = isCreating ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await parseJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error || (isCreating ? 'Error al crear la ausencia' : 'Error al actualizar la ausencia'));
      }

      toast.success(isCreating ? 'Ausencia creada correctamente' : 'Ausencia actualizada correctamente');
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      console.error('[handleSave] Error:', err);
      const errorMessage = err instanceof Error ? err.message : (isCreating ? 'Error al crear la ausencia' : 'Error al actualizar la ausencia');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      setUploadingJustificante(false);
    }
  };

  const handleDelete = async () => {
    if (!ausencia) return; // Solo disponible en modo EDITAR

    if (!confirm('¿Estás seguro de que quieres eliminar esta ausencia? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/ausencias/${ausencia.id}`, {
        method: 'DELETE',
      });

      const data = await parseJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar la ausencia');
      }

      toast.success('Ausencia eliminada correctamente');
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      console.error('[handleDelete] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar la ausencia';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const formatSolicitudFecha = (dateString: string) => {
    try {
      return format(new Date(dateString), 'd MMM yyyy', { locale: es });
    } catch {
      return 'Fecha no disponible';
    }
  };

  const empleadoSeleccionado = empleados.find((e) => e.id === selectedEmpleadoId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isCreating ? 'Crear Ausencia' : 'Editar Ausencia'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* MODO EDITAR: Banner con info del empleado */}
          {isEditing && ausencia && (
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm font-medium text-gray-900">
                {ausencia.empleado.nombre} {ausencia.empleado.apellidos}
              </p>
              <p className="text-xs text-gray-500">{ausencia.empleado.puesto}</p>
              <p className="text-xs text-gray-500 mt-1">
                Solicitada el {formatSolicitudFecha(ausencia.createdAt)}
              </p>
            </div>
          )}

          {/* MODO CREAR: Selector de empleado */}
          {isCreating && (
            <Field>
              <FieldLabel>Empleado *</FieldLabel>
              {loadingEmpleados ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Spinner className="size-4" />
                  Cargando empleados...
                </div>
              ) : (
                <Select value={selectedEmpleadoId} onValueChange={setSelectedEmpleadoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {empleados.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nombre} {emp.apellidos} - {emp.puesto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {empleadoSeleccionado && (
                <p className="text-xs text-gray-500 mt-1">
                  {empleadoSeleccionado.puesto}
                </p>
              )}
            </Field>
          )}

          {/* Tipo de ausencia */}
          <Field>
            <FieldLabel>Tipo de ausencia *</FieldLabel>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
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
            {/* Validación de saldo para vacaciones */}
            {tipo === 'vacaciones' && efectivoEmpleadoId && loadingSaldo && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <Spinner className="size-3" />
                  Verificando saldo disponible...
                </p>
              </div>
            )}
            {tipo === 'vacaciones' && efectivoEmpleadoId && !loadingSaldo && excedeSaldo && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-medium">⚠️ Saldo insuficiente</p>
                <p className="text-xs text-red-700 mt-1">
                  Días solicitados: {diasSolicitados} | Disponibles: {
                    isEditing && ausencia
                      ? (saldoDisponible || 0) + (Number(ausencia.diasSolicitados) || 0)
                      : (saldoDisponible || 0)
                  } días
                </p>
              </div>
            )}
          </Field>

          {/* Fechas - Rango */}
          <Field>
            <FieldLabel>Periodo de ausencia *</FieldLabel>
            <ResponsiveDateRangePicker
              dateRange={{ from: fechaInicio, to: fechaFin }}
              onSelect={(range) => {
                setFechaInicio(range.from);
                setFechaFin(range.to);
              }}
              placeholder="Seleccionar rango de fechas"
              label="Seleccionar periodo"
            />
            {fechaInicio && fechaFin && (
              <p className="mt-1 text-xs text-gray-500">
                {isSingleDaySelection 
                  ? '1 día seleccionado' 
                  : `${Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1} días en el rango`
                }
              </p>
            )}
          </Field>

          {/* Medio día */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
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
                className={medioDiaDisponible ? 'text-sm cursor-pointer' : 'text-sm cursor-not-allowed text-gray-400'}
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

          {medioDia && (
            <Field>
              <FieldLabel>Periodo *</FieldLabel>
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoMedioDiaValue)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODOS_MEDIO_DIA.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {/* Motivo */}
          <Field>
            <FieldLabel>
              Motivo o detalles {tipo === 'otro' ? '*' : '(opcional)'}
            </FieldLabel>
            <textarea
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
          </Field>

          {/* Justificante - igual que en solicitar ausencia */}
          <Field>
            <FieldLabel>Justificante (opcional)</FieldLabel>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setJustificanteFile(e.target.files?.[0] || null)}
              disabled={saving || uploadingJustificante}
              className="cursor-pointer"
            />
            {justificanteFile && (
              <p className="text-xs text-gray-500 mt-1">
                Archivo seleccionado: {justificanteFile.name} ({(justificanteFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
            {uploadingJustificante && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                <Spinner className="size-3 text-gray-400" />
                Subiendo justificante...
              </p>
            )}
            {!justificanteFile && justificanteUrl && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                <Button variant="link" className="px-0 h-auto text-xs" asChild>
                  <a href={justificanteUrl} target="_blank" rel="noopener noreferrer">
                    Ver justificante actual
                  </a>
                </Button>
                (se mantendrá si no adjuntas uno nuevo)
              </p>
            )}
          </Field>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {/* Botón eliminar solo en modo EDITAR */}
          {isEditing && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving || deleting || uploadingJustificante}
              className="mr-auto"
            >
              {deleting ? (
                <>
                  <Spinner className="size-3 mr-2" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          )}

          <LoadingButton
            onClick={handleSave}
            loading={saving || uploadingJustificante}
            disabled={saving || deleting || uploadingJustificante || loadingEmpleados}
          >
            {uploadingJustificante
              ? 'Subiendo...'
              : saving
                ? (isCreating ? 'Creando...' : 'Guardando...')
                : (isCreating ? 'Crear ausencia' : 'Guardar cambios')
            }
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

