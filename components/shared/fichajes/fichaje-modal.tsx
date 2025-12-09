'use client';

// ========================================
// Modal Unificado de Fichajes - Crear y Editar
// ========================================
// Modal único para crear/editar fichajes con múltiples eventos
// Permite añadir varios eventos en una sola operación
// Según el contexto, permite cambiar fecha y empleado o no

import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';


import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogScrollableContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { extraerHoraDeISO } from '@/lib/utils/formatters';
import { parseJson } from '@/lib/utils/json';

export type TipoEventoFichaje = 'entrada' | 'pausa_inicio' | 'pausa_fin' | 'salida';

const EVENT_OPTIONS: Array<{ label: string; value: TipoEventoFichaje }> = [
  { label: 'Entrada', value: 'entrada' },
  { label: 'Inicio de pausa', value: 'pausa_inicio' },
  { label: 'Fin de pausa', value: 'pausa_fin' },
  { label: 'Salida', value: 'salida' },
];

interface EventoFichaje {
  id: string;
  tipo: TipoEventoFichaje;
  hora: string; // HH:mm
  editado?: boolean;
  isNew?: boolean;
  origen?: 'registrado' | 'propuesto'; // Para diferenciar visualmente
}

// Evento propuesto que viene de la API (puede ser propuesto o registrado para flexibilidad)
export interface EventoPropuesto {
  tipo: string;
  hora: string;
  origen: 'registrado' | 'propuesto';
}

interface FichajeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  
  // Contexto de uso
  contexto: 'empleado' | 'manager' | 'hr_admin';
  
  // Para edición: ID del fichaje del día
  fichajeDiaId?: string;
  
  // Para creación: empleadoId (solo para HR/Manager)
  empleadoId?: string;
  
  // Modo: si no se pasa fichajeDiaId, es creación; si se pasa, es edición
  modo?: 'crear' | 'editar';
  
  // NUEVO: Eventos propuestos para pre-cargar (desde cuadrar fichajes)
  eventosPropuestos?: EventoPropuesto[];
  
  // NUEVO: Fecha del fichaje (para cuadrar fichajes)
  fechaFichaje?: string;
  
  // NUEVO: Nombre del empleado (para mostrar en cuadrar fichajes)
  empleadoNombreProp?: string;
}

export function FichajeModal({
  open,
  onClose,
  onSuccess,
  contexto,
  fichajeDiaId,
  empleadoId,
  modo: modoExplicito,
  eventosPropuestos,
  fechaFichaje,
  empleadoNombreProp,
}: FichajeModalProps) {
  const modo = modoExplicito ?? (fichajeDiaId ? 'editar' : 'crear');
  const operaDirecto = contexto === 'hr_admin' || contexto === 'manager';
  const puedeEditarFecha = operaDirecto && modo === 'crear';
  const _puedeEditarEmpleado = contexto === 'hr_admin' && modo === 'crear';

  // Estado general
  const [cargando, setCargando] = useState(false);
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState('');
  
  // Datos del fichaje (si modo editar)
  const [empleadoNombre, setEmpleadoNombre] = useState('');
  const [empleadoPuesto, setEmpleadoPuesto] = useState('');
  
  // Eventos
  const [eventos, setEventos] = useState<EventoFichaje[]>([]);
  const [eventosOriginales, setEventosOriginales] = useState<EventoFichaje[]>([]);
  const [eventosEliminados, setEventosEliminados] = useState<string[]>([]);

  // Cargar fichaje si es modo editar
  useEffect(() => {
    async function cargarFichaje() {
      if (modo !== 'editar' || !fichajeDiaId || !open) return;
      
      setCargando(true);
      try {
        const res = await fetch(`/api/fichajes/${fichajeDiaId}`);
        if (!res.ok) {
          throw new Error('Error al cargar el fichaje');
        }
        
        const data = await parseJson<{
          id: string;
          fecha: string;
          empleado?: { nombre: string; apellidos: string; puesto?: string };
          eventos?: Array<{ id: string; tipo: string; hora: string; editado?: boolean }>;
        }>(res);

        // Usar fecha proporcionada si existe (para cuadrar fichajes), o la del fichaje
        setFecha(fechaFichaje || data.fecha.split('T')[0]);
        
        // Usar nombre proporcionado si existe (para cuadrar fichajes)
        setEmpleadoNombre(
          empleadoNombreProp || (data.empleado
            ? `${data.empleado.nombre} ${data.empleado.apellidos}`.trim()
            : '')
        );
        setEmpleadoPuesto(data.empleado?.puesto || '');

        // Eventos registrados (existentes en BD)
        const eventosRegistrados = (data.eventos || []).map((e) => ({
          id: e.id,
          tipo: e.tipo as TipoEventoFichaje,
          hora: extraerHoraDeISO(e.hora) || '00:00',
          editado: e.editado,
          origen: 'registrado' as const,
        }));
        
        // PUNTO 6: Pre-cargar eventos propuestos si se proporcionan
        const eventosPropuestosFormateados: EventoFichaje[] = (eventosPropuestos || []).map((ep, idx) => ({
          id: `propuesto_${Date.now()}_${idx}`,
          tipo: ep.tipo as TipoEventoFichaje,
          hora: extraerHoraDeISO(ep.hora) || '00:00',
          isNew: true, // Marcar como nuevo para que se cree al guardar
          origen: 'propuesto' as const,
        }));
        
        // Combinar: primero registrados, luego propuestos
        const todosEventos = [...eventosRegistrados, ...eventosPropuestosFormateados];
        
        setEventos(todosEventos);
        setEventosOriginales(eventosRegistrados); // Solo los registrados son "originales"
        setEventosEliminados([]);
      } catch (error) {
        console.error('[FichajeModal] Error cargando fichaje:', error);
        toast.error('Error al cargar el fichaje');
      } finally {
        setCargando(false);
      }
    }
    
    cargarFichaje();
  }, [modo, fichajeDiaId, open, eventosPropuestos, fechaFichaje, empleadoNombreProp]);

  // Resetear al abrir en modo crear
  useEffect(() => {
    if (open && modo === 'crear') {
      setFecha(new Date().toISOString().split('T')[0]);
      setMotivo('');
      setEventos([
        {
          id: `temp_${Date.now()}`,
          tipo: 'entrada',
          hora: format(new Date(), 'HH:mm'),
          isNew: true,
        },
      ]);
      setEventosOriginales([]);
      setEventosEliminados([]);
    }
  }, [open, modo]);

  function handleAñadirEvento() {
    const fechaSeleccionada = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaSeleccionada.setHours(0, 0, 0, 0);

    if (fechaSeleccionada > hoy) {
      toast.error('No puedes añadir eventos en fechas futuras');
      return;
    }

    const tempId = `temp_${Date.now()}`;
    setEventos((prev) => [
      ...prev,
      {
        id: tempId,
        tipo: 'entrada',
        hora: format(new Date(), 'HH:mm'),
        isNew: true,
      },
    ]);
  }

  function handleEliminarEvento(id: string) {
    const evento = eventos.find((e) => e.id === id);
    if (!evento) return;

    if (evento.isNew) {
      setEventos((prev) => prev.filter((e) => e.id !== id));
    } else {
      setEventos((prev) => prev.filter((e) => e.id !== id));
      setEventosEliminados((prev) => [...prev, id]);
    }
  }

  function actualizarEvento(id: string, campo: 'tipo' | 'hora', valor: string) {
    setEventos((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [campo]: valor } : e))
    );
  }

  async function handleGuardar() {
    // Validaciones
    if (eventos.length === 0) {
      toast.error('Debes añadir al menos un evento');
      return;
    }

    // Validar que no sea una fecha futura (permitir hoy, bloquear mañana+)
    const fechaSeleccionada = new Date(fecha);
    const hoy = new Date();
    fechaSeleccionada.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    if (fechaSeleccionada > hoy) {
      toast.error('No puedes registrar fichajes en fechas futuras');
      return;
    }

    for (const ev of eventos) {
      if (!ev.hora) {
        toast.error('Todos los eventos deben tener una hora');
        return;
      }

      const fechaHora = new Date(`${fecha}T${ev.hora}:00`);
      if (fechaHora > new Date()) {
        toast.error('No puedes registrar eventos en el futuro');
        return;
      }
    }

    setCargando(true);

    try {
      if (modo === 'editar') {
        await guardarEdicion();
      } else {
        await guardarCreacion();
      }

      toast.success(
        modo === 'editar'
          ? 'Fichaje actualizado correctamente'
          : operaDirecto
            ? 'Fichaje creado correctamente'
            : 'Solicitud de fichaje creada correctamente'
      );
      
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('[FichajeModal] Error al guardar:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al guardar el fichaje'
      );
    } finally {
      setCargando(false);
    }
  }

  async function guardarEdicion() {
    if (!fichajeDiaId) return;

    // 1. Eliminar eventos marcados
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
          hora: new Date(`${fecha}T${ev.hora}:00`).toISOString(),
          motivoEdicion: motivo || undefined,
          esEdicionManual: true, // Marcar como edición manual (no fichaje en tiempo real)
        }),
      });
    }

    // 3. Actualizar eventos modificados
    for (const ev of eventos.filter((e) => !e.isNew)) {
      const original = eventosOriginales.find((o) => o.id === ev.id);
      if (!original) continue;

      if (original.tipo !== ev.tipo || original.hora !== ev.hora) {
        await fetch(`/api/fichajes/eventos/${ev.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: ev.tipo,
            hora: new Date(`${fecha}T${ev.hora}:00`).toISOString(),
            motivoEdicion: motivo || undefined,
          }),
        });
      }
    }
  }

  async function guardarCreacion() {
    if (operaDirecto) {
      // Crear fichaje directo
      const targetEmpleadoId = empleadoId;
      if (!targetEmpleadoId) {
        throw new Error('No se ha especificado el empleado para el fichaje');
      }

      // Verificar si ya existe fichaje del día
      const resFichajes = await fetch(
        `/api/fichajes?fecha=${fecha}&empleadoId=${targetEmpleadoId}`
      );
      
      if (!resFichajes.ok) {
        throw new Error('Error al verificar fichajes existentes');
      }

      const dataFichajes = await parseJson<{ data?: Array<{ id: string }> }>(resFichajes);
      const fichajes = dataFichajes?.data || [];

      let fichajeId = fichajes[0]?.id;

      // Si no existe, crear con el primer evento
      if (!fichajeId && eventos.length > 0) {
        const primerEvento = eventos[0];
        const resCrear = await fetch('/api/fichajes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha,
            tipo: primerEvento.tipo,
            hora: new Date(`${fecha}T${primerEvento.hora}:00`).toISOString(),
            empleadoId: targetEmpleadoId,
          }),
        });

        if (!resCrear.ok) {
          throw new Error('Error al crear el fichaje');
        }

        const dataCrear = await parseJson<{ fichajeId?: string }>(resCrear);
        const nuevoFichajeId = typeof dataCrear.fichajeId === 'string' ? dataCrear.fichajeId : undefined;

        if (!nuevoFichajeId) {
          throw new Error('No se obtuvo el ID del fichaje creado');
        }

        fichajeId = nuevoFichajeId;
      }

      // Añadir el resto de eventos (o todos si ya existía el fichaje)
      const eventosParaAñadir = fichajeId && fichajes.length > 0 ? eventos : eventos.slice(1);

      for (const ev of eventosParaAñadir) {
        await fetch('/api/fichajes/eventos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fichajeId,
            tipo: ev.tipo,
            hora: new Date(`${fecha}T${ev.hora}:00`).toISOString(),
            motivoEdicion: motivo || undefined,
            esEdicionManual: true, // Marcar como edición manual (no fichaje en tiempo real)
          }),
        });
      }
    } else {
      // Crear solicitud (empleado)
      // Por ahora solo soportamos un evento en solicitudes
      const primerEvento = eventos[0];
      
      await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'fichaje_manual',
          camposCambiados: {
            fecha,
            tipo: primerEvento.tipo,
            hora: new Date(`${fecha}T${primerEvento.hora}:00`).toISOString(),
            motivo: motivo || 'Fichaje manual',
          },
          motivo: motivo || 'Fichaje manual',
        }),
      });
    }
  }

  const titulo = modo === 'editar' ? 'Editar Fichaje' : 'Añadir Fichaje';
  const descripcion =
    modo === 'editar'
      ? 'Modifica, añade o elimina eventos del fichaje'
      : operaDirecto
        ? 'Registra uno o varios eventos de fichaje'
        : 'Solicita un fichaje indicando los eventos';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogScrollableContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <p className="text-sm text-gray-500">{descripcion}</p>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4 py-2">
          {/* Info del empleado (solo en modo editar) */}
          {modo === 'editar' && empleadoNombre && (
            <div className="space-y-1 pb-3 border-b">
              <div className="text-base font-semibold text-gray-900">
                {empleadoNombre}
              </div>
              {empleadoPuesto && (
                <div className="text-sm text-gray-500">{empleadoPuesto}</div>
              )}
            </div>
          )}

          {/* Fecha */}
          <Field>
            <FieldLabel>Fecha</FieldLabel>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={!puedeEditarFecha}
              max={new Date().toISOString().split('T')[0]}
              className="bg-white"
            />
          </Field>

          {/* Eventos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FieldLabel>Eventos</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAñadirEvento}
                disabled={cargando}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Añadir evento
              </Button>
            </div>

            {eventos.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No hay eventos. Haz clic en &quot;Añadir evento&quot; para comenzar.
              </div>
            ) : (
              <div className="space-y-2">
                {eventos.map((ev) => {
                  // PUNTO 6: Diferenciar visualmente eventos registrados vs propuestos
                  const esPropuesto = ev.origen === 'propuesto';
                  const esRegistrado = ev.origen === 'registrado' || (!ev.origen && !ev.isNew);
                  
                  return (
                    <div
                      key={ev.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg ${
                        esPropuesto 
                          ? 'bg-tertiary-50 border-tertiary-200' // Color terciario para propuestos
                          : esRegistrado
                            ? 'bg-white border-gray-200' // Blanco para registrados
                            : 'bg-gray-50 border-gray-200' // Gris para nuevos añadidos manualmente
                      }`}
                    >
                      {/* Indicador de origen */}
                      {esPropuesto && (
                        <span className="text-[10px] font-medium text-tertiary-600 bg-tertiary-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                          Propuesto
                        </span>
                      )}
                      {esRegistrado && (
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                          Registrado
                        </span>
                      )}
                      
                      {/* Tipo */}
                      <div className="flex-1">
                        <Select
                          value={ev.tipo}
                          onValueChange={(valor) =>
                            actualizarEvento(ev.id, 'tipo', valor as TipoEventoFichaje)
                          }
                          disabled={cargando}
                        >
                          <SelectTrigger className={`h-9 ${esPropuesto ? 'bg-tertiary-50' : 'bg-white'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EVENT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Hora */}
                      <div className="flex-1">
                        <Input
                          type="time"
                          value={ev.hora}
                          onChange={(e) =>
                            actualizarEvento(ev.id, 'hora', e.target.value)
                          }
                          disabled={cargando}
                          className={`h-9 ${esPropuesto ? 'bg-tertiary-50' : 'bg-white'}`}
                        />
                      </div>

                      {/* Indicador editado */}
                      {ev.editado && (
                        <span className="text-xs text-amber-600 whitespace-nowrap">
                          Editado
                        </span>
                      )}

                      {/* Botón eliminar */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEliminarEvento(ev.id)}
                        disabled={cargando}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 w-9"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Motivo */}
          <Field>
            <FieldLabel>Motivo (opcional)</FieldLabel>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Olvidé fichar al entrar"
              rows={3}
              disabled={cargando}
              className="bg-white"
            />
          </Field>
        </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={cargando}
          >
            Cancelar
          </Button>
          <LoadingButton onClick={handleGuardar} loading={cargando}>
            {modo === 'editar'
              ? 'Guardar cambios'
              : operaDirecto
                ? 'Guardar fichaje'
                : 'Crear solicitud'}
          </LoadingButton>
        </DialogFooter>
      </DialogScrollableContent>
    </Dialog>
  );
}

