'use client';

// ========================================
// Lista de Festivos
// ========================================

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
}: ListaFestivosProps) {
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [formFecha, setFormFecha] = useState('');
  const [formNombre, setFormNombre] = useState('');

  const esEdicionNacional = useMemo(
    () => editorState?.mode === 'editar' && editorState.festivo?.tipo === 'nacional',
    [editorState]
  );

  const cargarFestivos = useCallback(async () => {
    setCargando(true);
    try {
      const url = año ? `/api/festivos?año=${año}` : '/api/festivos';
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
  }, [año]);

  useEffect(() => {
    cargarFestivos();
  }, [cargarFestivos, refreshToken]);

  useEffect(() => {
    if (!editorState) {
      setFormFecha('');
      setFormNombre('');
      return;
    }

    if (editorState.mode === 'crear') {
      setFormFecha(editorState.fecha ?? '');
      setFormNombre('');
    } else if (editorState.festivo) {
      setFormFecha(editorState.festivo.fecha);
      setFormNombre(editorState.festivo.nombre);
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
      } else {
        const error = await parseJson<{ error?: string }>(response).catch(() => null);
        toast.error(error?.error || 'Error al eliminar festivo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar festivo');
    }
  }

  async function handleGuardarFestivo() {
    if (!editorState) return;

    if (!formFecha || !formNombre) {
      toast.error('Completa la fecha y el nombre del festivo');
      return;
    }

    setGuardando(true);
    try {
      if (editorState.mode === 'crear') {
        const response = await fetch('/api/festivos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: formFecha,
            nombre: formNombre,
            activo: true,
          }),
        });

        if (!response.ok) {
          const error = await parseJson<{ error?: string }>(response).catch(() => null);
          throw new Error(error?.error || 'Error al crear festivo');
        }

        toast.success('Festivo creado correctamente');
      } else if (editorState.festivo) {
        const response = await fetch(`/api/festivos/${editorState.festivo.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: formFecha,
            nombre: formNombre,
            activo: true,
          }),
        });

        if (!response.ok) {
          const error = await parseJson<{ error?: string }>(response).catch(() => null);
          throw new Error(error?.error || 'Error al actualizar festivo');
        }

        toast.success('Festivo actualizado correctamente');
      }

      await cargarFestivos();
      onUpdate?.();
      onEditorClose();
    } catch (error) {
      console.error('Error guardando festivo:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar festivo');
    } finally {
      setGuardando(false);
    }
  }

  function formatFecha(fechaStr: string): string {
    try {
      const fecha =
        fechaStr.length === 10 ? parseISO(`${fechaStr}T00:00:00`) : parseISO(fechaStr);
      return format(fecha, 'd MMM', { locale: es });
    } catch {
      return fechaStr;
    }
  }

  const mostrarTablaVacia = !festivos.length && !editorState;

  return (
    <div className="space-y-3">
      {showCreateButton && (
        <div className="flex justify-end">
          <Button size="icon" variant="outline" onClick={onCreateRequest} title="Añadir festivo">
            <CalendarPlus className="h-4 w-4" />
            <span className="sr-only">Añadir festivo</span>
          </Button>
        </div>
      )}

      {cargando ? (
        <div className="text-center py-4 text-gray-500">Cargando festivos...</div>
      ) : mostrarTablaVacia ? (
        <div className="text-center py-8 text-gray-500">
          <p>No hay festivos registrados</p>
          <p className="text-sm mt-2">Importa un archivo o crea festivos personalizados</p>
        </div>
      ) : (
        <div className="rounded-md border max-h-80 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white">
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editorState && (
                <TableRow className="bg-muted/40">
                  <TableCell>
                    <Label htmlFor="fechaFestivo" className="sr-only">
                      Fecha
                    </Label>
                    <Input
                      id="fechaFestivo"
                      type="date"
                      value={formFecha}
                      onChange={(event) => setFormFecha(event.target.value)}
                      disabled={esEdicionNacional}
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
                      disabled={esEdicionNacional}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={onEditorClose} disabled={guardando}>
                        Cancelar
                      </Button>
                      <LoadingButton
                        size="sm"
                        onClick={handleGuardarFestivo}
                        loading={guardando}
                      >
                        {editorState.mode === 'crear' ? 'Crear' : 'Guardar'}
                      </LoadingButton>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {festivos.map((festivo) => (
                <TableRow key={festivo.id}>
                  <TableCell className="font-medium">{formatFecha(festivo.fecha)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{festivo.nombre}</span>
                      <span className="text-xs text-muted-foreground capitalize">{festivo.tipo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditRequest(festivo)}
                        title="Editar festivo"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEliminar(festivo)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Quitar festivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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






