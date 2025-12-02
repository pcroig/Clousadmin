// ========================================
// Editar Ausencia Modal - Shared Component
// ========================================

'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
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
import { parseJson } from '@/lib/utils/json';

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
  const [tipo, setTipo] = useState('vacaciones');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
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

  // Precargar datos cuando se abre el modal
  useEffect(() => {
    if (!open || !ausencia) return;

    setTipo(ausencia.tipo);
    setFechaInicio(format(new Date(ausencia.fechaInicio), 'yyyy-MM-dd'));
    setFechaFin(format(new Date(ausencia.fechaFin), 'yyyy-MM-dd'));
    setMedioDia(Boolean(ausencia.medioDia));
    setPeriodo((ausencia.periodo as PeriodoMedioDiaValue) || 'manana');
    setMotivo(ausencia.motivo || '');
    setJustificanteUrl(ausencia.justificanteUrl || null);
    setDocumentoId(ausencia.documentoId || null);
    setJustificanteFile(null);
    setError('');
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
    if (!ausencia) return;

    // Validaciones
    if (!fechaInicio || !fechaFin) {
      setError('Selecciona las fechas de inicio y fin');
      return;
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (fin < inicio) {
      setError('La fecha de fin debe ser posterior a la de inicio');
      return;
    }

    if (tipo === 'otro' && !motivo.trim()) {
      setError('El motivo es obligatorio para ausencias de tipo "Otro"');
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
        const uploadResult = await uploadJustificante(justificanteFile, ausencia.empleadoId);
        newJustificanteUrl = uploadResult.url;
        newDocumentoId = uploadResult.documentoId || null;
        setUploadingJustificante(false);
      }

      const payload: Record<string, unknown> = {
        tipo,
        fechaInicio,
        fechaFin,
        medioDia,
        motivo: motivo || null,
      };

      if (medioDia) {
        payload.periodo = periodo;
      }

      if (newJustificanteUrl) {
        payload.justificanteUrl = newJustificanteUrl;
      }

      if (newDocumentoId) {
        payload.documentoId = newDocumentoId;
      }

      const response = await fetch(`/api/ausencias/${ausencia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await parseJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar la ausencia');
      }

      toast.success('Ausencia actualizada correctamente');
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      console.error('[handleSave] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar la ausencia';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      setUploadingJustificante(false);
    }
  };

  const handleDelete = async () => {
    if (!ausencia) return;

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

  if (!ausencia) return null;

  const formatSolicitudFecha = (dateString: string) => {
    try {
      return format(new Date(dateString), 'd MMM yyyy', { locale: es });
    } catch {
      return 'Fecha no disponible';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Ausencia</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Banner sin fondo con nombre, rol y fecha */}
          <div className="border-b border-gray-200 pb-4">
            <p className="text-sm font-medium text-gray-900">
              {ausencia.empleado.nombre} {ausencia.empleado.apellidos}
            </p>
            <p className="text-xs text-gray-500">{ausencia.empleado.puesto}</p>
            <p className="text-xs text-gray-500 mt-1">
              Solicitada el {formatSolicitudFecha(ausencia.createdAt)}
            </p>
          </div>

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
          </Field>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Fecha inicio *</FieldLabel>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Fecha fin *</FieldLabel>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </Field>
          </div>

          {/* Medio día */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="medioDia"
              checked={medioDia}
              onChange={(e) => setMedioDia(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="medioDia" className="text-sm">
              Medio día
            </Label>
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
          <LoadingButton
            onClick={handleSave}
            loading={saving || uploadingJustificante}
            disabled={saving || deleting || uploadingJustificante}
          >
            {uploadingJustificante ? 'Subiendo...' : saving ? 'Guardando...' : 'Guardar cambios'}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

