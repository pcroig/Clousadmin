'use client';

import { format } from 'date-fns';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { FechaCalendar } from '@/components/shared/fecha-calendar';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { ResponsiveDatePicker } from '@/components/shared/responsive-date-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogScrollableContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parseJson } from '@/lib/utils/json';

interface FestivoEmpresa {
  id: string;
  fecha: string;
  nombre: string;
  tipo: string;
}

interface FestivoPersonalizado {
  id?: string;
  festivoEmpresaId: string;
  fecha: string;
  nombre: string;
}

interface FestivoApiResponse {
  id: string;
  festivoEmpresaId: string;
  fecha: string;
  nombre: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
}

interface EmpleadoOption {
  id: string;
  nombre: string;
  apellidos: string;
}

interface FestivosPersonalizadosModalProps {
  open: boolean;
  onClose: () => void;
  empleadoId: string;
  contexto: 'empleado' | 'manager' | 'hr_admin';
  onSuccess?: () => void;
}

interface DraftFestivo extends FestivoPersonalizado {
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
}

export function FestivosPersonalizadosModal({
  open,
  onClose,
  empleadoId,
  contexto,
  onSuccess,
}: FestivosPersonalizadosModalProps) {
  const [festivosEmpresa, setFestivosEmpresa] = useState<FestivoEmpresa[]>([]);
  const [originalFestivos, setOriginalFestivos] = useState<Map<string, DraftFestivo>>(new Map());
  const [draftFestivos, setDraftFestivos] = useState<Map<string, DraftFestivo>>(new Map());
  const [editingFestivoId, setEditingFestivoId] = useState<string | null>(null);
  const [editingFecha, setEditingFecha] = useState('');
  const [editingNombre, setEditingNombre] = useState('');
  const [empleados, setEmpleados] = useState<EmpleadoOption[]>([]);
  const [copiarDialogOpen, setCopiarDialogOpen] = useState(false);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const parseDateValue = (value?: string) => (value ? new Date(`${value}T00:00:00`) : undefined);
  const handleDateSelect = (date: Date | undefined) => {
    setEditingFecha(date ? format(date, 'yyyy-MM-dd') : '');
  };

  const isHR = contexto === 'hr_admin';

  const cargarDatos = useCallback(async () => {
    if (!empleadoId) return;
    setLoading(true);
    try {
      const [festivosEmpresaRes, festivosPersonalizadosRes] = await Promise.all([
        fetch('/api/festivos?activo=true'),
        fetch(`/api/empleados/${empleadoId}/festivos`),
      ]);

      if (festivosEmpresaRes.ok) {
        const data = await parseJson<{ festivos: FestivoEmpresa[] }>(festivosEmpresaRes);
        setFestivosEmpresa(data.festivos || []);
      }

      if (festivosPersonalizadosRes.ok) {
        const data = await parseJson<FestivoApiResponse[]>(festivosPersonalizadosRes);
        const original = new Map<string, DraftFestivo>();
        data.forEach((f) => {
          original.set(f.festivoEmpresaId, {
            id: f.id,
            festivoEmpresaId: f.festivoEmpresaId,
            fecha: f.fecha,
            nombre: f.nombre,
            estado: f.estado,
          });
        });
        setOriginalFestivos(original);
        setDraftFestivos(new Map(original));
      }

      if (isHR) {
        const empleadosRes = await fetch('/api/empleados?activos=true');
        if (empleadosRes.ok) {
          const data = await parseJson<{ data: EmpleadoOption[] }>(empleadosRes);
          const otros = (data.data || []).filter((emp) => emp.id !== empleadoId);
          setEmpleados(otros);
        }
      }
    } catch (error) {
      console.error('Error cargando festivos personalizados:', error);
      toast.error('Error al cargar festivos personalizados');
    } finally {
      setLoading(false);
    }
  }, [empleadoId, isHR]);

  useEffect(() => {
    if (open) {
      cargarDatos();
    }
  }, [open, cargarDatos]);

  const yearsAvailable = useMemo(() => {
    const years = new Set<number>();
    festivosEmpresa.forEach((festivo) => {
      const year = new Date(festivo.fecha).getFullYear();
      if (!Number.isNaN(year)) {
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [festivosEmpresa]);

  useEffect(() => {
    if (yearsAvailable.length === 0) return;
    if (!yearsAvailable.includes(selectedYear)) {
      setSelectedYear(yearsAvailable[yearsAvailable.length - 1]);
    }
  }, [yearsAvailable, selectedYear]);

  const festivosFiltrados = useMemo(
    () =>
      festivosEmpresa.filter(
        (festivo) => new Date(festivo.fecha).getFullYear() === selectedYear,
      ),
    [festivosEmpresa, selectedYear],
  );

  const hasChanges = useMemo(() => {
    if (originalFestivos.size !== draftFestivos.size) return true;
    for (const [festivoEmpresaId, draft] of draftFestivos.entries()) {
      const original = originalFestivos.get(festivoEmpresaId);
      if (!original) return true;
      if (original.fecha !== draft.fecha || original.nombre !== draft.nombre) {
        return true;
      }
    }
    return false;
  }, [draftFestivos, originalFestivos]);

  const startEditing = (festivoEmpresa: FestivoEmpresa) => {
    const existingDraft = draftFestivos.get(festivoEmpresa.id);
    setEditingFestivoId(festivoEmpresa.id);
    setEditingFecha(existingDraft?.fecha ?? festivoEmpresa.fecha);
    setEditingNombre(existingDraft?.nombre ?? festivoEmpresa.nombre);
  };

  const cancelEditing = () => {
    setEditingFestivoId(null);
    setEditingFecha('');
    setEditingNombre('');
  };

  const applyEditing = () => {
    if (!editingFestivoId) return;
    if (!editingFecha || !editingNombre.trim()) {
      toast.error('Completa fecha y nombre');
      return;
    }
    setDraftFestivos((prev) => {
      const next = new Map(prev);
      const original = originalFestivos.get(editingFestivoId);
      next.set(editingFestivoId, {
        festivoEmpresaId: editingFestivoId,
        fecha: editingFecha,
        nombre: editingNombre.trim(),
        id: original?.id,
        estado: original?.estado,
      });
      return next;
    });
    cancelEditing();
  };

  const removeDraft = (festivoEmpresaId: string) => {
    setDraftFestivos((prev) => {
      const next = new Map(prev);
      next.delete(festivoEmpresaId);
      return next;
    });
    if (editingFestivoId === festivoEmpresaId) {
      cancelEditing();
    }
  };

  const handleGuardar = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const toDelete: string[] = [];
      const toCreate: DraftFestivo[] = [];
      const processed = new Set<string>();

      originalFestivos.forEach((original, festivoEmpresaId) => {
        const draft = draftFestivos.get(festivoEmpresaId);
        processed.add(festivoEmpresaId);
        if (!draft) {
          if (original.id) {
            toDelete.push(original.id);
          }
          return;
        }
        if (original.fecha !== draft.fecha || original.nombre !== draft.nombre) {
          if (original.id) {
            toDelete.push(original.id);
          }
          toCreate.push({ ...draft, id: undefined });
        }
      });

      draftFestivos.forEach((draft, festivoEmpresaId) => {
        if (processed.has(festivoEmpresaId)) return;
        toCreate.push(draft);
      });

      for (const festivoId of toDelete) {
        const response = await fetch(`/api/empleados/${empleadoId}/festivos/${festivoId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error('Error eliminando festivo personalizado');
        }
      }

      for (const draft of toCreate) {
        const response = await fetch(`/api/empleados/${empleadoId}/festivos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            festivoEmpresaId: draft.festivoEmpresaId,
            fecha: draft.fecha,
            nombre: draft.nombre,
          }),
        });
        if (!response.ok) {
          throw new Error('Error creando festivo personalizado');
        }
      }

      toast.success('Cambios guardados');
      await cargarDatos();
      onSuccess?.();

      if (isHR && draftFestivos.size > 0 && empleados.length > 0) {
        setEmpleadosSeleccionados([]);
        setCopiarDialogOpen(true);
      }
    } catch (error) {
      console.error('Error guardando festivos personalizados:', error);
      toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleCopiarConfiguracion = async () => {
    if (empleadosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un empleado');
      return;
    }
    setSaving(true);
    try {
      for (const empleadoDestinoId of empleadosSeleccionados) {
        for (const draft of draftFestivos.values()) {
          const response = await fetch(`/api/empleados/${empleadoDestinoId}/festivos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              festivoEmpresaId: draft.festivoEmpresaId,
              fecha: draft.fecha,
              nombre: draft.nombre,
            }),
          });
          if (!response.ok) {
            throw new Error('Error copiando configuración');
          }
        }
      }
      toast.success('Festivos copiados correctamente');
      setCopiarDialogOpen(false);
    } catch (error) {
      console.error('Error copiando festivos:', error);
      toast.error('Error al copiar configuración');
    } finally {
      setSaving(false);
    }
  };


const renderDraftView = (festivoEmpresa: FestivoEmpresa, draft: DraftFestivo) => (
  <div className="flex items-center gap-3 flex-wrap">
    <div className="flex items-center gap-2 text-gray-400">
      <div className="opacity-50">
        <FechaCalendar date={new Date(festivoEmpresa.fecha)} size="sm" />
      </div>
      <span className="text-sm">{festivoEmpresa.nombre}</span>
    </div>
    <span className="text-gray-300 text-sm">→</span>
    <div className="flex items-center gap-2">
      <FechaCalendar date={new Date(draft.fecha)} size="sm" />
      <span className="text-sm font-medium text-gray-900">{draft.nombre}</span>
    </div>
  </div>
);

  const renderOriginalView = (festivoEmpresa: FestivoEmpresa) => (
    <div>
      <p className="text-sm font-medium text-gray-900">{festivoEmpresa.nombre}</p>
      <div className="mt-0.5">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {festivoEmpresa.tipo === 'nacional' ? 'Nacional' : 'Empresa'}
        </Badge>
      </div>
    </div>
  );

const renderEditingView = () => (
    <div className="flex flex-wrap gap-3">
      <div className="flex-1 min-w-[180px]">
        <Label className="text-xs text-gray-600">Nueva fecha</Label>
        <ResponsiveDatePicker
          date={parseDateValue(editingFecha)}
          onSelect={handleDateSelect}
          placeholder="Seleccionar fecha"
          label="Seleccionar fecha de festivo"
          className="text-sm mt-1"
        />
      </div>
      <div className="flex-1 min-w-[200px]">
        <Label className="text-xs text-gray-600">Nombre del festivo</Label>
        <Input
          type="text"
          value={editingNombre}
          onChange={(e) => setEditingNombre(e.target.value)}
          placeholder="Ej: San José - Valencia"
          className="text-sm mt-1"
        />
      </div>
      <div className="flex items-center gap-2 mt-1">
        <Button size="sm" onClick={applyEditing}>
          Listo
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelEditing}>
          Cancelar
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogScrollableContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Personalizar festivos</DialogTitle>
            <InfoTooltip
              side="bottom"
              content={
                <p className="text-xs leading-relaxed">
                  Útil para festivos locales o autonómicos. Ejemplo: reemplazar &quot;Día de la
                  Constitución (6 dic)&quot; por &quot;San José (19 marzo)&quot;.
                </p>
              }
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configura festivos específicos por empleado y aplica los cambios cuando estés listo.
          </p>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-3">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-500">Cargando festivos…</div>
            ) : festivosEmpresa.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No hay festivos configurados</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Año</p>
                    <p className="text-xs text-gray-500">Solo se muestran los festivos del año seleccionado.</p>
                  </div>
                  <div className="min-w-[160px]">
                    <Label className="sr-only">Año</Label>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => setSelectedYear(parseInt(value, 10))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona año" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearsAvailable.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {festivosFiltrados.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    No hay festivos configurados para {selectedYear}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {festivosFiltrados.map((festivoEmpresa) => {
                  const draft = draftFestivos.get(festivoEmpresa.id);
                  const isEditing = editingFestivoId === festivoEmpresa.id;

                  return (
                    <div
                      key={festivoEmpresa.id}
                      className="rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {!draft && !isEditing && (
                          <div className="flex-shrink-0">
                            <FechaCalendar date={new Date(festivoEmpresa.fecha)} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {isEditing
                            ? renderEditingView()
                            : draft
                            ? renderDraftView(festivoEmpresa, draft)
                            : renderOriginalView(festivoEmpresa)}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {draft ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditing(festivoEmpresa)}
                                className="text-gray-500 hover:text-gray-700"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeDraft(festivoEmpresa.id)}
                                className="text-red-600 hover:bg-red-50"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(festivoEmpresa)}
                              className="text-xs h-7 px-2"
                            >
                              Personalizar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
          <Button onClick={handleGuardar} disabled={!hasChanges || saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogScrollableContent>

      {isHR && (
        <CopiarConfigDialog
          open={copiarDialogOpen}
          onClose={() => setCopiarDialogOpen(false)}
          empleados={empleados}
          empleadosSeleccionados={empleadosSeleccionados}
          onSeleccionChange={setEmpleadosSeleccionados}
          onCopiar={handleCopiarConfiguracion}
          disabled={saving}
        />
      )}
    </Dialog>
  );
}

interface CopiarConfigDialogProps {
  open: boolean;
  onClose: () => void;
  empleados: EmpleadoOption[];
  empleadosSeleccionados: string[];
  onSeleccionChange: (ids: string[]) => void;
  onCopiar: () => Promise<void> | void;
  disabled: boolean;
}

function CopiarConfigDialog({
  open,
  onClose,
  empleados,
  empleadosSeleccionados,
  onSeleccionChange,
  onCopiar,
  disabled,
}: CopiarConfigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogScrollableContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copiar configuración</DialogTitle>
          <p className="text-xs text-gray-500">
            Aplica estos festivos personalizados a otros empleados.
          </p>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-3">
            {empleados.length === 0 ? (
              <p className="text-sm text-gray-500">No hay otros empleados disponibles.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {empleados.map((empleado) => {
                  const checked = empleadosSeleccionados.includes(empleado.id);
                  return (
                    <label
                      key={empleado.id}
                      className="flex items-center gap-3 rounded border border-gray-200 p-3 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          onSeleccionChange(
                            checked
                              ? empleadosSeleccionados.filter((id) => id !== empleado.id)
                              : [...empleadosSeleccionados, empleado.id],
                          );
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900"
                      />
                      <span>
                        {empleado.nombre} {empleado.apellidos}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <Button variant="outline" onClick={onClose} disabled={disabled}>
                Cancelar
              </Button>
              <Button onClick={onCopiar} disabled={disabled || empleadosSeleccionados.length === 0}>
                Copiar
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogScrollableContent>
    </Dialog>
  );
}
