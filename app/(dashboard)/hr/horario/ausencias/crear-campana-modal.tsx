'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldLabel } from '@/components/ui/field';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';
import { LoadingButton } from '@/components/shared/loading-button';

interface CrearCampanaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  solapamientoMaximoPct: number;
}

interface Equipo {
  id: string;
  nombre: string;
}

export function CrearCampanaModal({
  open,
  onClose,
  onCreated,
  solapamientoMaximoPct,
}: CrearCampanaModalProps) {
  const [cargando, setCargando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [alcance, setAlcance] = useState<'todos' | 'equipos'>('todos');
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    if (open) {
      cargarEquipos();
      // Reset form
      setTitulo('');
      setAlcance('todos');
      setEquiposSeleccionados([]);
      setFechaInicio('');
      setFechaFin('');
    }
  }, [open]);

  async function cargarEquipos() {
    try {
      const res = await fetch('/api/organizacion/equipos');
      if (res.ok) {
        const data = await res.json();
        setEquipos(data);
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

    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);

    if (isNaN(fechaInicioDate.getTime()) || isNaN(fechaFinDate.getTime())) {
      toast.error('Las fechas no son válidas');
      return;
    }

    if (fechaFinDate < fechaInicioDate) {
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
          fechaInicioObjetivo: fechaInicio,
          fechaFinObjetivo: fechaFin,
        }),
      });

      if (res.ok) {
        toast.success('Campaña creada correctamente. Se han enviado notificaciones a los empleados.');
        onCreated();
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al crear campaña');
      }
    } catch (e) {
      console.error('Error creando campaña:', e);
      toast.error('Error al crear campaña');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Campaña de Vacaciones</DialogTitle>
        </DialogHeader>

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

          <Field>
            <FieldLabel>Fecha inicio objetivo</FieldLabel>
            <Input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
            />
          </Field>

          <Field>
            <FieldLabel>Fecha fin objetivo</FieldLabel>
            <Input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              required
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
                      <li>El sistema usará IA para cuadrar las vacaciones respetando el {solapamientoMaximoPct}% de solapamiento máximo</li>
                      <li>Los empleados recibirán la propuesta y podrán aceptarla o solicitar cambios</li>
                    </ol>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={cargando}>
            Cancelar
          </Button>
          <LoadingButton onClick={handleCrear} loading={cargando}>
            Crear Campaña
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

