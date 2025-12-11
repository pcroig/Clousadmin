'use client';

// ========================================
// Lista de Festivos
// ========================================

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarPlus, Trash2, AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { FechaCalendar } from '@/components/shared/fecha-calendar';
import { ResponsiveDatePicker } from '@/components/shared/responsive-date-picker';
import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { notifyFestivosUpdated } from '@/lib/hooks/use-festivos';
import { parseJson } from '@/lib/utils/json';

import type { Festivo, FestivoEditorState } from '@/types/festivos';

interface ListaFestivosProps {
  año?: number;
  onUpdate?: () => void;
  refreshToken?: number;
  editorState: FestivoEditorState | null;
  onEditorClose: () => void;
  onCreateRequest: () => void;
  onEditRequest: (festivo: Festivo) => void;
  showCreateButton?: boolean;
  onImportRequest?: (año?: number) => void; // Para unificar con botón importar existente
}

export function ListaFestivos({
  año,
  onUpdate,
  refreshToken = 0,
  editorState,
  onEditorClose,
  onCreateRequest,
  onEditRequest,
  showCreateButton = true,
  onImportRequest,
}: ListaFestivosProps) {
  const añoActual = new Date().getFullYear();
  const [añoSeleccionado, setAñoSeleccionado] = useState(año || añoActual);
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [formFecha, setFormFecha] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formActivo, setFormActivo] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const parseDateValue = (value?: string) => (value ? new Date(`${value}T00:00:00`) : undefined);
  const handleFormFechaSelect = (date: Date | undefined) => {
    setFormFecha(date ? format(date, 'yyyy-MM-dd') : '');
  };

  const esCreando = useMemo(
    () => editorState?.mode === 'crear',
    [editorState]
  );

  // Detectar si faltan festivos nacionales (esperamos ~10 festivos nacionales por año)
  const festivosNacionales = useMemo(
    () => festivos.filter(f => f.tipo === 'nacional'),
    [festivos]
  );

  const faltanFestivos = festivosNacionales.length < 10;

  const cargarFestivos = useCallback(async () => {
    setCargando(true);
    try {
      const url = `/api/festivos?año=${añoSeleccionado}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await parseJson<{ festivos?: Festivo[] }>(response);
        setFestivos(data.festivos || []);
      }
    } catch (error) {
      console.error('Error cargando festivos:', error);
    } finally {
      setCargando(false);
    }
  }, [añoSeleccionado]);

  useEffect(() => {
    cargarFestivos();
  }, [cargarFestivos, refreshToken]);

  // Limpiar formulario cuando se cierra el editor sin guardar
  useEffect(() => {
    if (!editorState) {
      setFormFecha('');
      setFormNombre('');
      setFormActivo(true);
      return;
    }

    if (editorState.mode === 'crear') {
      setFormFecha(editorState.fecha ?? '');
      setFormNombre('');
      setFormActivo(true);
    }
  }, [editorState]);

  async function handleEliminar(festivo: Festivo) {
    if (!confirm(`¿Eliminar el festivo "${festivo.nombre}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/festivos/${festivo.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Festivo eliminado correctamente');
        await cargarFestivos();
        onUpdate?.();
        notifyFestivosUpdated(); // Notificar a otros componentes
      } else {
        const error = await parseJson<{ error?: string }>(response).catch(() => null);
        toast.error(error?.error || 'Error al eliminar festivo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar festivo');
    }
  }

  async function handleToggleActivo(festivo: Festivo) {
    setTogglingId(festivo.id);
    try {
      const nuevoEstado = !festivo.activo;

      const response = await fetch(`/api/festivos/${festivo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoEstado }),
      });

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => null);
        throw new Error(error?.error || 'Error al actualizar festivo');
      }

      toast.success(`Festivo ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`);
      await cargarFestivos();
      onUpdate?.();
      notifyFestivosUpdated(); // Notificar a otros componentes
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar festivo');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCrearFestivo() {
    if (!editorState || editorState.mode !== 'crear') return;

    // Validaciones
    if (!formFecha || !formNombre) {
      toast.error('Completa la fecha y el nombre del festivo');
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch('/api/festivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: formFecha,
          nombre: formNombre,
          activo: formActivo,
        }),
      });

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => null);
        throw new Error(error?.error || 'Error al crear festivo');
      }

      toast.success('Festivo creado correctamente');
      await cargarFestivos();
      onUpdate?.();
      notifyFestivosUpdated(); // Notificar a otros componentes
      onEditorClose();
    } catch (error) {
      console.error('Error guardando festivo:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar festivo');
    } finally {
      setGuardando(false);
    }
  }

  async function handleImportarFestivosNacionales() {
    if (!confirm(`¿Importar festivos nacionales de España para el año ${añoSeleccionado}?\n\nEsto importará aproximadamente 10 festivos nacionales.`)) {
      return;
    }

    setImportando(true);
    try {
      const response = await fetch(
        `/api/festivos/importar-nacionales?añoInicio=${añoSeleccionado}&añoFin=${añoSeleccionado}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => null);
        throw new Error(error?.error || 'Error al importar festivos');
      }

      const data = await parseJson<{
        importados?: number;
        omitidos?: number;
        message?: string;
      }>(response);

      toast.success(
        data.message ||
          `Festivos importados: ${data.importados || 0} nuevos, ${data.omitidos || 0} ya existían`
      );
      await cargarFestivos();
      onUpdate?.();
      notifyFestivosUpdated(); // Notificar a otros componentes
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al importar festivos');
    } finally {
      setImportando(false);
    }
  }

  function handleCancelar() {
    // Limpiar formulario
    setFormFecha('');
    setFormNombre('');
    setFormActivo(true);
    // Cerrar editor
    onEditorClose();
  }

  function parseFechaString(fechaStr: string): Date {
    try {
      const fecha =
        fechaStr.length === 10 ? parseISO(`${fechaStr}T00:00:00`) : parseISO(fechaStr);
      return fecha;
    } catch {
      return new Date();
    }
  }

  const mostrarTablaVacia = !festivos.length && !editorState;

  // Generar años para el selector (año actual - 1 hasta año actual + 3)
  const añosDisponibles = Array.from({ length: 5 }, (_, i) => añoActual - 1 + i);

  return (
    <div className="space-y-3">
      {/* Alerta si faltan festivos */}
      {faltanFestivos && !cargando && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-orange-900">
              Solo {festivosNacionales.length} festivos nacionales para {añoSeleccionado}
            </p>
            <p className="text-orange-700 text-xs mt-1">
              Se esperan 10 festivos nacionales de España.{' '}
              {onImportRequest ? (
                <button
                  onClick={() => onImportRequest(añoSeleccionado)}
                  className="underline hover:no-underline font-medium"
                >
                  Haz click en "Importar"
                </button>
              ) : (
                <button
                  onClick={handleImportarFestivosNacionales}
                  className="underline hover:no-underline font-medium"
                  disabled={importando}
                >
                  {importando ? 'Importando...' : 'Importar festivos nacionales'}
                </button>
              )}
            </p>
          </div>
        </div>
      )}

      {cargando ? (
        <div className="text-center py-4 text-gray-500">Cargando festivos...</div>
      ) : mostrarTablaVacia ? (
        <div className="text-center py-8 text-gray-500">
          <p>No hay festivos registrados para {añoSeleccionado}</p>
          <p className="text-sm mt-2">Importa festivos nacionales o crea festivos personalizados</p>
        </div>
      ) : (
        <div className="rounded-md border max-h-80 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="w-[140px]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Año:</span>
                    <Select
                      value={añoSeleccionado.toString()}
                      onValueChange={(value) => setAñoSeleccionado(parseInt(value))}
                    >
                      <SelectTrigger className="h-7 w-[90px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {añosDisponibles.map((año) => (
                          <SelectItem key={año} value={año.toString()}>
                            {año}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Fila de creación - solo cuando editorState.mode === 'crear' */}
              {esCreando && (
                <TableRow className="bg-muted/40">
                  <TableCell>
                    <Label htmlFor="fechaFestivo" className="sr-only">
                      Fecha
                    </Label>
                    <ResponsiveDatePicker
                      date={parseDateValue(formFecha)}
                      onSelect={handleFormFechaSelect}
                      placeholder="Seleccionar fecha"
                      label="Seleccionar fecha de festivo"
                    />
                  </TableCell>
                  <TableCell>
                    <Label htmlFor="nombreFestivo" className="sr-only">
                      Nombre
                    </Label>
                    <Input
                      id="nombreFestivo"
                      value={formNombre}
                      onChange={(event) => setFormNombre(event.target.value)}
                      maxLength={100}
                      placeholder="Ej: Día de la empresa"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="activoFestivo"
                          checked={formActivo}
                          onCheckedChange={setFormActivo}
                          disabled={guardando}
                        />
                        <Label
                          htmlFor="activoFestivo"
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          {formActivo ? 'Activo' : 'Inactivo'}
                        </Label>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancelar} disabled={guardando}>
                          Cancelar
                        </Button>
                        <LoadingButton
                          size="sm"
                          onClick={handleCrearFestivo}
                          loading={guardando}
                        >
                          Crear
                        </LoadingButton>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Lista de festivos existentes */}
              {festivos.map((festivo) => (
                <TableRow key={festivo.id} className={!festivo.activo ? 'opacity-60' : ''}>
                  <TableCell>
                    <FechaCalendar date={parseFechaString(festivo.fecha)} className="scale-75" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{festivo.nombre}</span>
                      <span className="text-xs text-muted-foreground capitalize">{festivo.tipo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`activo-${festivo.id}`}
                          checked={festivo.activo}
                          onCheckedChange={() => handleToggleActivo(festivo)}
                          disabled={togglingId === festivo.id}
                        />
                        <Label
                          htmlFor={`activo-${festivo.id}`}
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          {festivo.activo ? 'Activo' : 'Inactivo'}
                        </Label>
                      </div>
                      {festivo.tipo !== 'nacional' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEliminar(festivo)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar festivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
