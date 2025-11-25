'use client';

// ========================================
// Modal Editar Fichaje - Estilo Editar Ausencia
// ========================================

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';
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
import {
  Field,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FichajeEvento {
  id: string;
  tipo: string;
  hora: Date | string;
  editado?: boolean;
}

interface FichajeDia {
  id: string;
  fecha: Date | string;
  empleadoNombre: string;
  empleadoPuesto?: string;
  eventos: FichajeEvento[];
}

interface EditarFichajeModalProps {
  open: boolean;
  fichaje: FichajeEvento | null;
  fichajeDiaId?: string;
  onClose: () => void;
  onSave: (fichajeId: string, hora: string, tipo: string) => void;
}

export function EditarFichajeModal({ open, fichaje: _fichaje, fichajeDiaId, onClose, onSave: _onSave }: EditarFichajeModalProps) {
  const [cargando, setCargando] = useState(false);
  const [fichajeDia, setFichajeDia] = useState<FichajeDia | null>(null);
  const [eventos, setEventos] = useState<Array<{ id: string; tipo: string; hora: string; editado?: boolean; isNew?: boolean }>>([]);
  const [eventosOriginales, setEventosOriginales] = useState<Array<{ id: string; tipo: string; hora: string; editado?: boolean }>>([]);
  const [eventosEliminados, setEventosEliminados] = useState<string[]>([]);

  // Cargar fichaje completo del día
  useEffect(() => {
    async function cargarFichaje() {
      if (!open || !fichajeDiaId) return;
      setCargando(true);
      try {
        const res = await fetch(`/api/fichajes/${fichajeDiaId}`);
        if (!res.ok) return;
        const data = await res.json() as Record<string, any>;
        
        setFichajeDia({
          id: data.id,
          fecha: data.fecha,
          empleadoNombre: `${data.empleado?.nombre || ''} ${data.empleado?.apellidos || ''}`.trim(),
          empleadoPuesto: data.empleado?.puesto,
          eventos: data.eventos || [],
        });

        // Convertir eventos a formato editable
        const evs = (data.eventos || []).map(
          (e: { id: string; tipo: string; hora: string; editado?: boolean }) => ({
          id: e.id,
          tipo: e.tipo,
          hora: format(new Date(e.hora), "yyyy-MM-dd'T'HH:mm"),
          editado: e.editado,
          })
        );
        setEventos(evs);
        setEventosOriginales(evs);
        setEventosEliminados([]);
      } catch (e) {
        console.error('[EditarFichajeModal] Error cargando fichaje:', e);
      } finally {
        setCargando(false);
      }
    }
    cargarFichaje();
  }, [open, fichajeDiaId]);

  async function handleGuardarCambios() {
    if (!fichajeDiaId) return;
    
    setCargando(true);
    try {
      // 1. Eliminar eventos marcados para eliminación
      for (const eventoId of eventosEliminados) {
        await fetch(`/api/fichajes/eventos/${eventoId}`, { method: 'DELETE' });
      }

      // 2. Crear eventos nuevos
      for (const ev of eventos.filter((e) => e.isNew)) {
        await fetch('/api/fichajes/eventos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fichajeId: fichajeDiaId,
            tipo: ev.tipo,
            hora: new Date(ev.hora).toISOString(),
          }),
        });
      }

      // 3. Actualizar eventos modificados (los que existen y cambiaron)
      for (const ev of eventos.filter((e) => !e.isNew)) {
        const original = eventosOriginales.find((o) => o.id === ev.id);
        if (!original) continue;
        
        // Solo actualizar si cambió
        if (original.tipo !== ev.tipo || original.hora !== ev.hora) {
          await fetch(`/api/fichajes/eventos/${ev.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo: ev.tipo,
              hora: new Date(ev.hora).toISOString(),
            }),
          });
        }
      }
      
      toast.success('Cambios guardados correctamente');
      onClose();
    } catch (error) {
      console.error('Error guardando cambios:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setCargando(false);
    }
  }

  function handleEliminarEvento(id: string) {
    const evento = eventos.find((e) => e.id === id);
    if (!evento) return;
    
    // Si es un evento nuevo, simplemente quitarlo de la lista
    if (evento.isNew) {
      setEventos((prev) => prev.filter((e) => e.id !== id));
    } else {
      // Si es un evento existente, marcarlo para eliminación
      setEventos((prev) => prev.filter((e) => e.id !== id));
      setEventosEliminados((prev) => [...prev, id]);
    }
  }

  function handleAñadirEvento() {
    if (!fichajeDiaId || !fichajeDia) return;
    
    // Crear con hora actual del día del fichaje
    const fechaBase = new Date(fichajeDia.fecha);
    const ahora = new Date();
    fechaBase.setHours(ahora.getHours(), ahora.getMinutes(), 0, 0);

    // Generar ID temporal para el nuevo evento
    const tempId = `temp_${Date.now()}`;
    
    setEventos((prev) => [
      ...prev,
      {
        id: tempId,
        tipo: 'entrada',
        hora: format(fechaBase, "yyyy-MM-dd'T'HH:mm"),
        editado: false,
        isNew: true,
      },
    ]);
  }

  function actualizarEvento(id: string, campo: 'tipo' | 'hora', valor: string) {
    setEventos((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [campo]: valor } : e))
    );
  }

  if (!open || !fichajeDia) return null;

  const fechaFichaje = new Date(fichajeDia.fecha);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Fichaje</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cabecera: Empleado y Fecha */}
          <div className="space-y-1">
            <div className="text-lg font-semibold text-gray-900">
              {fichajeDia.empleadoNombre}
            </div>
            {fichajeDia.empleadoPuesto && (
              <div className="text-sm text-gray-500">{fichajeDia.empleadoPuesto}</div>
            )}
            <div className="text-sm text-gray-600 mt-2">
              Fecha: {format(fechaFichaje, 'dd/MM/yyyy', { locale: es })}
            </div>
          </div>

          {/* Eventos editables */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FieldLabel>Eventos del día</FieldLabel>
              <LoadingButton
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleAñadirEvento}
                loading={cargando}
              >
                <Plus className="w-4 h-4" />
                Añadir evento
              </LoadingButton>
            </div>

            {eventos.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No hay eventos registrados
              </div>
            ) : (
              <div className="space-y-2">
                {eventos.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
                  >
                    {/* Tipo */}
                    <div className="flex-1">
          <Field>
            <Select 
                          value={ev.tipo}
                          onValueChange={(val) => actualizarEvento(ev.id, 'tipo', val)}
            >
                          <SelectTrigger className="h-9 bg-white">
                            <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="pausa_inicio">Pausa Inicio</SelectItem>
                <SelectItem value="pausa_fin">Pausa Fin</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
              </SelectContent>
            </Select>
          </Field>
                    </div>

                    {/* Hora */}
                    <div className="flex-1">
          <Field>
            <Input
                          type="time"
                          value={ev.hora.split('T')[1] || ''}
                          onChange={(e) => {
                            const fechaParte = ev.hora.split('T')[0];
                            actualizarEvento(ev.id, 'hora', `${fechaParte}T${e.target.value}`);
                          }}
                          className="h-9 bg-white"
                        />
          </Field>
                    </div>

                    {/* Estado editado */}
                    {ev.editado && (
                      <span className="text-xs text-amber-600 whitespace-nowrap">
                        Editado
                      </span>
                    )}

                    {/* Eliminar */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEliminarEvento(ev.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
          )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={cargando}>
            Cancelar
          </Button>
          <LoadingButton onClick={handleGuardarCambios} loading={cargando}>
            Guardar Cambios
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
