'use client';

import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import { ResponsiveDatePicker } from '@/components/shared/responsive-date-picker';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { parseJson } from '@/lib/utils/json';


interface CrearCampanaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface Equipo {
  id: string;
  nombre: string;
}

export function CrearCampanaModal({
  open,
  onClose,
  onCreated,
}: CrearCampanaModalProps) {
  const [cargando, setCargando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [alcance, setAlcance] = useState<'todos' | 'equipos'>('todos');
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>([]);
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
  const [fechaFin, setFechaFin] = useState<Date | undefined>();
  const [limitarSolapamiento, setLimitarSolapamiento] = useState(false);
  const [solapamientoPct, setSolapamientoPct] = useState('30');

  useEffect(() => {
    if (open) {
      cargarEquipos();
      // Reset form
      setTitulo('');
      setAlcance('todos');
      setEquiposSeleccionados([]);
      setFechaInicio(undefined);
      setFechaFin(undefined);
      setLimitarSolapamiento(false);
      setSolapamientoPct('30');
    }
  }, [open]);

  async function cargarEquipos() {
    try {
      const res = await fetch('/api/organizacion/equipos');
      if (res.ok) {
        const data = await parseJson<Equipo[]>(res);
        setEquipos(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error cargando equipos:', e);
    }
  }

  async function handleCrear() {
    if (!titulo.trim()) {
      toast.error('El título es obligatorio');
      return;
    }

    if (alcance === 'equipos' && equiposSeleccionados.length === 0) {
      toast.error('Debes seleccionar al menos un equipo');
      return;
    }

    if (!fechaInicio || !fechaFin) {
      toast.error('Debes indicar fecha de inicio y fin del período objetivo');
      return;
    }

    let solapamientoMaximoPct: number | undefined;
    if (alcance === 'equipos' && limitarSolapamiento) {
      const pct = parseInt(solapamientoPct, 10);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        toast.error('El porcentaje de solapamiento debe estar entre 0 y 100');
        return;
      }
      solapamientoMaximoPct = pct;
    }

    if (fechaFin < fechaInicio) {
      toast.error('La fecha de fin debe ser posterior o igual a la fecha de inicio');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch('/api/campanas-vacaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          alcance,
          equipoIds: alcance === 'equipos' ? equiposSeleccionados : undefined,
          solapamientoMaximoPct,
          fechaInicioObjetivo: fechaInicio.toISOString().split('T')[0],
          fechaFinObjetivo: fechaFin.toISOString().split('T')[0],
        }),
      });

      if (res.ok) {
        toast.success('Campaña creada correctamente. Se han enviado notificaciones a los empleados.');
        onCreated();
        onClose();
      } else {
        const error = await parseJson<{ error?: string }>(res).catch(() => ({
          error: 'Error desconocido',
        }));
        toast.error(error.error || 'Error al crear campaña');
      }
    } catch (e) {
      console.error('Error creando campaña:', e);
      toast.error('Error al crear campaña');
    } finally {
      setCargando(false);
    }
  }

  const today = new Date();

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Crear Campaña de Vacaciones"
      complexity="complex"
      footer={
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={cargando}
            className="flex-1"
          >
            Cancelar
          </Button>
          <LoadingButton
            onClick={handleCrear}
            loading={cargando}
            className="flex-1"
          >
            Crear Campaña
          </LoadingButton>
        </div>
      }
    >
      <div className="space-y-4">
          <Field>
            <FieldLabel>Título de la campaña</FieldLabel>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Vacaciones Verano 2025"
              maxLength={200}
            />
          </Field>

          <Field>
            <FieldLabel>Alcance</FieldLabel>
            <Select value={alcance} onValueChange={(v) => setAlcance(v as 'todos' | 'equipos')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los empleados</SelectItem>
                <SelectItem value="equipos">Equipos específicos</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {alcance === 'equipos' && (
            <Field>
              <FieldLabel>Seleccionar equipos</FieldLabel>
              <SearchableMultiSelect
                items={equipos.map((e) => ({ value: e.id, label: e.nombre }))}
                values={equiposSeleccionados}
                onChange={setEquiposSeleccionados}
                placeholder="Buscar equipos..."
                emptyMessage="No se encontraron equipos"
              />
              {equiposSeleccionados.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {equiposSeleccionados.length} equipo{equiposSeleccionados.length !== 1 ? 's' : ''} seleccionado{equiposSeleccionados.length !== 1 ? 's' : ''}
                </p>
              )}
            </Field>
          )}

          {alcance === 'equipos' && (
            <Field>
              <div className="flex items-center justify-between">
                <div>
                  <FieldLabel>Limitar solapamiento por equipo</FieldLabel>
                  <p className="text-xs text-gray-500">
                    Opcional. Define qué porcentaje máximo del equipo puede ausentarse simultáneamente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Desactivado</span>
                  <Switch
                    checked={limitarSolapamiento}
                    onCheckedChange={setLimitarSolapamiento}
                  />
                  <span className="text-xs text-gray-900 font-medium">Activado</span>
                </div>
              </div>
              {limitarSolapamiento && (
                <div className="mt-3 flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={solapamientoPct}
                    onChange={(e) => setSolapamientoPct(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-gray-600">% máximo por equipo</span>
                </div>
              )}
            </Field>
          )}

          <Field>
            <FieldLabel>Fecha inicio objetivo</FieldLabel>
            <ResponsiveDatePicker
              date={fechaInicio}
              onSelect={setFechaInicio}
              placeholder="Seleccionar fecha"
              label="Fecha inicio objetivo"
              fromDate={today}
            />
          </Field>

          <Field>
            <FieldLabel>Fecha fin objetivo</FieldLabel>
            <ResponsiveDatePicker
              date={fechaFin}
              onSelect={setFechaFin}
              placeholder="Seleccionar fecha"
              label="Fecha fin objetivo"
              fromDate={fechaInicio || today}
              disabled={(date) => fechaInicio ? date < fechaInicio : false}
            />
          </Field>

          <div className="flex items-start gap-2 pt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-gray-400 hover:text-gray-600">
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">¿Cómo funciona?</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Los empleados recibirán una notificación para indicar sus preferencias</li>
                      <li>Podrán seleccionar días ideales, prioritarios y alternativos</li>
                      <li>Cuando todos completen o cuando tú decidas, podrás cerrar la campaña</li>
                      <li>
                        El sistema usará IA para cuadrar las vacaciones respetando el límite
                        de solapamiento que definas (si está activado)
                      </li>
                      <li>Los empleados recibirán la propuesta y podrán aceptarla o solicitar cambios</li>
                    </ol>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
    </ResponsiveDialog>
  );
}

