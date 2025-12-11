'use client';

// ========================================
// Modal de Edición de Fichajes
// ========================================
// Modal UNIFICADO para editar fichajes existentes con múltiples eventos
// Permite modificar horas, añadir y eliminar eventos
// La fecha y tipo de evento son SOLO LECTURA
// SISTEMA: Edición por lotes con aprobación optimista (HR) o edición directa (empleados)

import { format } from 'date-fns';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';


import { ResponsiveDatePicker } from '@/components/shared/responsive-date-picker';
import { LoadingButton } from '@/components/shared/loading-button';
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
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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

  // ID del fichaje del día (REQUERIDO)
  fichajeDiaId?: string;

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
  eventosPropuestos,
  fechaFichaje,
  empleadoNombreProp,
}: FichajeModalProps) {
  const operaDirecto = contexto === 'hr_admin' || contexto === 'manager';

  // Estado general
  const [cargando, setCargando] = useState(false);
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState('');
  const parseDateValue = (value?: string) => (value ? new Date(`${value}T00:00:00`) : undefined);
  
  // Datos del fichaje (si modo editar)
  const [empleadoNombre, setEmpleadoNombre] = useState('');
  const [empleadoPuesto, setEmpleadoPuesto] = useState('');
  
  // Eventos
  const [eventos, setEventos] = useState<EventoFichaje[]>([]);
  const [eventosOriginales, setEventosOriginales] = useState<EventoFichaje[]>([]);
  const [eventosEliminados, setEventosEliminados] = useState<string[]>([]);

  // Validación de secuencia y completitud
  const [errorSecuencia, setErrorSecuencia] = useState<string | null>(null);
  const [advertenciaIncompletitud, setAdvertenciaIncompletitud] = useState<string | null>(null);

  // FASE C.2: Confirmación salida sin descanso
  const [mostrarConfirmacionSinDescanso, setMostrarConfirmacionSinDescanso] = useState(false);

  // FASE C.3: Datos de jornada para calcular horas esperadas
  const [horasEsperadas, setHorasEsperadas] = useState<number | null>(null);
  const [requiereDescanso, setRequiereDescanso] = useState(false);

  // Cargar fichaje al abrir
  useEffect(() => {
    async function cargarFichaje() {
      // CRÍTICO: Validar que fichajeDiaId existe
      if (!open) return;

      if (!fichajeDiaId) {
        console.error('[FichajeModal] fichajeDiaId es requerido');
        toast.error('Error: No se puede abrir el modal sin ID de fichaje');
        onClose();
        return;
      }

      setCargando(true);
      try {
        const res = await fetch(`/api/fichajes/${fichajeDiaId}`);
        if (!res.ok) {
          throw new Error('Error al cargar el fichaje');
        }

        const data = await parseJson<{
          id: string;
          fecha: string;
          estado?: string;
          empleado?: {
            nombre: string;
            apellidos: string;
            puesto?: string;
            jornada?: {
              id: string;
              horasSemanales: number;
              config: Record<string, unknown>;
            };
          };
          eventos?: Array<{ id: string; tipo: string; hora: string; editado?: boolean }>;
        }>(res);

        // VALIDACIÓN: Si el fichaje está rechazado, no permitir edición
        if (data.estado === 'rechazado') {
          toast.error('Este fichaje fue rechazado por HR y no se puede editar');
          onClose();
          return;
        }

        // Usar fecha proporcionada si existe (para cuadrar fichajes), o la del fichaje
        setFecha(fechaFichaje || data.fecha.split('T')[0]);

        // Usar nombre proporcionado si existe (para cuadrar fichajes)
        setEmpleadoNombre(
          empleadoNombreProp || (data.empleado
            ? `${data.empleado.nombre} ${data.empleado.apellidos}`.trim()
            : '')
        );
        setEmpleadoPuesto(data.empleado?.puesto || '');

        // FASE C.3: Calcular horas esperadas y si requiere descanso
        if (data.empleado?.jornada) {
          const jornada = data.empleado.jornada;
          const config = jornada.config as any;
          const fechaObj = new Date(data.fecha);
          const nombreDia = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][fechaObj.getDay()];
          const configDia = config[nombreDia];

          // Calcular horas esperadas del día
          if (config.tipo === 'fija' && configDia?.activo !== false && configDia?.entrada && configDia?.salida) {
            const [hE, mE] = configDia.entrada.split(':').map(Number);
            const [hS, mS] = configDia.salida.split(':').map(Number);
            let horas = (hS * 60 + mS - (hE * 60 + mE)) / 60;

            // Restar descanso si existe
            if (configDia.pausa_inicio && configDia.pausa_fin) {
              const [hPI, mPI] = configDia.pausa_inicio.split(':').map(Number);
              const [hPF, mPF] = configDia.pausa_fin.split(':').map(Number);
              horas -= (hPF * 60 + mPF - (hPI * 60 + mPI)) / 60;
            }
            setHorasEsperadas(horas);
            setRequiereDescanso(!!(configDia.pausa_inicio && configDia.pausa_fin));
          } else if (config.tipo === 'flexible') {
            // Calcular días activos
            const diasActivos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
              .filter(d => config[d]?.activo !== false).length;
            setHorasEsperadas(jornada.horasSemanales / (diasActivos || 5));
            setRequiereDescanso(!!(config.descansoMinimo && config.descansoMinimo !== '00:00'));
          }
        }

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

        // CRÍTICO: Ordenar eventos por hora antes de establecerlos
        const eventosOrdenados = todosEventos.sort((a, b) => {
          const horaA = new Date(`2000-01-01T${a.hora}:00`).getTime();
          const horaB = new Date(`2000-01-01T${b.hora}:00`).getTime();
          return horaA - horaB;
        });

        setEventos(eventosOrdenados);
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
  }, [fichajeDiaId, open, eventosPropuestos, fechaFichaje, empleadoNombreProp, onClose]);

  // Serializar eventos para dependencia del useEffect
  const eventosKey = useMemo(
    () => eventos.map(e => `${e.id}-${e.hora}-${e.tipo}`).join(','),
    [eventos]
  );

  // Limpiar validaciones cuando cambian los eventos (se han reordenado/modificado)
  useEffect(() => {
    // Solo limpiar si hay mensajes de error/advertencia visibles
    // Esto permite al usuario ver qué está mal mientras edita
    if (errorSecuencia || advertenciaIncompletitud) {
      setErrorSecuencia(null);
      setAdvertenciaIncompletitud(null);
    }
  }, [eventosKey, errorSecuencia, advertenciaIncompletitud]);

  // Limpiar validaciones y resetear estado al cerrar el modal
  useEffect(() => {
    if (!open) {
      setErrorSecuencia(null);
      setAdvertenciaIncompletitud(null);
      // CRÍTICO: Resetear estado para evitar mostrar datos del fichaje anterior
      setEventos([]);
      setEventosOriginales([]);
      setEventosEliminados([]);
      setMotivo('');
      setEmpleadoNombre('');
      setEmpleadoPuesto('');
    }
  }, [open]);

  // Helper: Ordenar eventos por hora
  const ordenarEventos = (eventosParaOrdenar: EventoFichaje[]): EventoFichaje[] => {
    return [...eventosParaOrdenar].sort((a, b) => {
      const horaA = new Date(`2000-01-01T${a.hora}:00`).getTime();
      const horaB = new Date(`2000-01-01T${b.hora}:00`).getTime();
      return horaA - horaB;
    });
  };

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
    const nuevoEvento: EventoFichaje = {
      id: tempId,
      tipo: 'entrada',
      hora: format(new Date(), 'HH:mm'),
      isNew: true,
    };

    // CRÍTICO: Reordenar automáticamente después de añadir
    setEventos((prev) => ordenarEventos([...prev, nuevoEvento]));
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

  // FASE C: Actualizar evento - permite cambiar hora y tipo (solo para nuevos)
  function actualizarEvento(id: string, campo: 'hora' | 'tipo', valor: string) {
    setEventos((prev) => {
      const eventosActualizados = prev.map((e) => (e.id === id ? { ...e, [campo]: valor } : e));

      // CRÍTICO: Reordenar siempre que se actualice la hora
      return ordenarEventos(eventosActualizados);
    });
  }

  // FASE C: Función auxiliar para validar secuencia y completitud
  // Validaciones críticas: No permitir configuraciones imposibles
  function validarEventos(): { errorSecuencia: string | null; advertenciaIncompletitud: string | null } {
    if (eventos.length === 0) {
      return { errorSecuencia: null, advertenciaIncompletitud: null };
    }

    // FASE C: Validar duplicados (configuraciones imposibles)
    const conteoTipos = eventos.reduce((acc, e) => {
      acc[e.tipo] = (acc[e.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // ❌ BLOQUEAR: Dos entradas
    if (conteoTipos['entrada'] > 1) {
      return {
        errorSecuencia: '❌ Configuración imposible: No puede haber dos entradas en el mismo día',
        advertenciaIncompletitud: null
      };
    }

    // ❌ BLOQUEAR: Dos salidas
    if (conteoTipos['salida'] > 1) {
      return {
        errorSecuencia: '❌ Configuración imposible: No puede haber dos salidas en el mismo día',
        advertenciaIncompletitud: null
      };
    }

    // ❌ BLOQUEAR: Múltiples pausas
    const numPausasInicio = conteoTipos['pausa_inicio'] || 0;
    const numPausasFin = conteoTipos['pausa_fin'] || 0;

    if (numPausasInicio > 1 || numPausasFin > 1) {
      return {
        errorSecuencia: '❌ El sistema actual no soporta múltiples pausas en un día. Por favor, registra solo una pausa.',
        advertenciaIncompletitud: null
      };
    }

    if (numPausasInicio !== numPausasFin) {
      return {
        errorSecuencia: '❌ Cada pausa_inicio debe tener su pausa_fin correspondiente',
        advertenciaIncompletitud: null
      };
    }

    // Ordenar eventos por hora
    const eventosOrdenados = [...eventos].sort((a, b) => {
      const horaA = new Date(`2000-01-01T${a.hora}:00`).getTime();
      const horaB = new Date(`2000-01-01T${b.hora}:00`).getTime();
      return horaA - horaB;
    });

    // ❌ VALIDAR: Pausas deben estar dentro de la jornada laboral
    const entrada = eventosOrdenados.find(e => e.tipo === 'entrada');
    const salida = eventosOrdenados.find(e => e.tipo === 'salida');
    const pausaInicio = eventosOrdenados.find(e => e.tipo === 'pausa_inicio');
    const pausaFin = eventosOrdenados.find(e => e.tipo === 'pausa_fin');

    if (pausaInicio && entrada) {
      const horaEntrada = new Date(`2000-01-01T${entrada.hora}:00`).getTime();
      const horaPausaInicio = new Date(`2000-01-01T${pausaInicio.hora}:00`).getTime();

      if (horaPausaInicio <= horaEntrada) {
        return {
          errorSecuencia: '❌ La pausa debe iniciar después de la entrada',
          advertenciaIncompletitud: null
        };
      }
    }

    if (pausaFin && salida) {
      const horaSalida = new Date(`2000-01-01T${salida.hora}:00`).getTime();
      const horaPausaFin = new Date(`2000-01-01T${pausaFin.hora}:00`).getTime();

      if (horaPausaFin >= horaSalida) {
        return {
          errorSecuencia: '❌ La pausa debe finalizar antes de la salida',
          advertenciaIncompletitud: null
        };
      }
    }

    // Validar secuencia
    let estadoEsperado = 'sin_fichar';
    let errorEncontrado: string | null = null;

    for (let i = 0; i < eventosOrdenados.length; i++) {
      const evento = eventosOrdenados[i];
      const anterior = eventosOrdenados[i - 1];

      // Validar que la hora sea posterior al evento anterior
      if (anterior && evento.hora < anterior.hora) {
        errorEncontrado = `El evento ${evento.tipo} tiene una hora anterior al evento ${anterior.tipo}`;
        break;
      }

      // Validar transiciones de estado
      switch (evento.tipo) {
        case 'entrada':
          if (estadoEsperado !== 'sin_fichar' && estadoEsperado !== 'finalizado') {
            errorEncontrado = 'Ya existe una entrada activa';
          }
          estadoEsperado = 'trabajando';
          break;

        case 'pausa_inicio':
          if (estadoEsperado !== 'trabajando') {
            // FASE C: ❌ BLOQUEAR pausa sin entrada
            errorEncontrado = '❌ Configuración imposible: Debe haber una entrada antes de iniciar pausa';
          }
          estadoEsperado = 'en_pausa';
          break;

        case 'pausa_fin':
          if (estadoEsperado !== 'en_pausa') {
            // FASE C: ❌ BLOQUEAR pausa_fin sin pausa_inicio
            errorEncontrado = '❌ Configuración imposible: Debe haber inicio de pausa antes del fin de pausa';
          }
          estadoEsperado = 'trabajando';
          break;

        case 'salida':
          if (estadoEsperado === 'sin_fichar' || estadoEsperado === 'finalizado') {
            // FASE C: ❌ BLOQUEAR salida sin entrada
            errorEncontrado = '❌ Configuración imposible: Debe haber una entrada antes de la salida';
          }
          // ✅ PERMITIR salida desde 'en_pausa' (se reanuda implícitamente)
          estadoEsperado = 'finalizado';
          break;
      }

      if (errorEncontrado) break;
    }

    // Validar completitud (no bloquea, solo advierte)
    let advertencia: string | null = null;
    if (!errorEncontrado) {
      const tipos = eventosOrdenados.map(e => e.tipo);
      const faltantes: string[] = [];

      if (!tipos.includes('entrada')) faltantes.push('entrada');
      if (!tipos.includes('salida')) faltantes.push('salida');

      if (faltantes.length > 0) {
        advertencia = `El fichaje quedará incompleto. Faltan: ${faltantes.join(', ')}`;
      }
    }

    return { errorSecuencia: errorEncontrado, advertenciaIncompletitud: advertencia };
  }

  // FASE C.3: Calcular horas trabajadas en tiempo real
  const horasTrabajadas = useMemo(() => {
    if (eventos.length === 0) return null;

    const tipos = eventos.map(e => e.tipo);
    if (!tipos.includes('entrada') || !tipos.includes('salida')) return null;

    const entrada = eventos.find(e => e.tipo === 'entrada');
    const salida = eventos.find(e => e.tipo === 'salida');
    if (!entrada || !salida) return null;

    const horaEntrada = new Date(`2000-01-01T${entrada.hora}:00`);
    const horaSalida = new Date(`2000-01-01T${salida.hora}:00`);

    let trabajadoMs = horaSalida.getTime() - horaEntrada.getTime();
    if (trabajadoMs < 0) return null;

    // Restar pausas
    const pausas = eventos.filter(e => e.tipo === 'pausa_inicio');
    const finsPausa = eventos.filter(e => e.tipo === 'pausa_fin');

    for (let i = 0; i < Math.min(pausas.length, finsPausa.length); i++) {
      const inicio = new Date(`2000-01-01T${pausas[i].hora}:00`);
      const fin = new Date(`2000-01-01T${finsPausa[i].hora}:00`);
      trabajadoMs -= (fin.getTime() - inicio.getTime());
    }

    return Math.max(0, trabajadoMs / (1000 * 60 * 60)); // Convertir a horas
  }, [eventos]);

  // FASE C.2: Verificar si falta descanso cuando hay salida
  const faltaDescanso = useMemo(() => {
    if (!requiereDescanso) return false;

    const tipos = eventos.map(e => e.tipo);
    const tieneSalida = tipos.includes('salida');
    const tieneDescansoCompleto =
      tipos.includes('pausa_inicio') && tipos.includes('pausa_fin');

    return tieneSalida && !tieneDescansoCompleto;
  }, [eventos, requiereDescanso]);

  async function handleGuardar() {
    // Validaciones
    if (eventos.length === 0) {
      toast.error('Debes añadir al menos un evento');
      return;
    }

    // EJECUTAR validación SOLO al intentar guardar
    const validacion = validarEventos();
    setErrorSecuencia(validacion.errorSecuencia);
    setAdvertenciaIncompletitud(validacion.advertenciaIncompletitud);

    // CRÍTICO: Bloquear guardado si la secuencia es inválida
    if (validacion.errorSecuencia) {
      toast.error(validacion.errorSecuencia);
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

    // FASE C.2: Verificar si falta descanso antes de guardar
    if (faltaDescanso) {
      setMostrarConfirmacionSinDescanso(true);
      return;
    }

    setCargando(true);

    try {
      await guardarEdicion();

      // Mensaje diferenciado según el rol
      if (operaDirecto) {
        toast.success('Fichaje actualizado correctamente');
      } else {
        toast.success('Fichaje actualizado. Pendiente de aprobación de HR.');
      }

      // CRÍTICO: Pequeño delay antes de disparar evento global
      // Esto asegura que el backend haya terminado de procesar antes del refetch
      await new Promise(resolve => setTimeout(resolve, 150));

      // Disparar evento global para sincronizar todas las tablas
      window.dispatchEvent(new CustomEvent('fichaje-updated'));

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

  // FASE C.2: Manejar confirmación de salida sin descanso
  async function handleConfirmarSinDescanso() {
    setMostrarConfirmacionSinDescanso(false);
    setCargando(true);

    try {
      await guardarEdicion();

      // Mensaje diferenciado según el rol
      if (operaDirecto) {
        toast.success('Fichaje actualizado correctamente');
      } else {
        toast.success('Fichaje actualizado. Pendiente de aprobación de HR.');
      }

      await new Promise(resolve => setTimeout(resolve, 150));
      window.dispatchEvent(new CustomEvent('fichaje-updated'));

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

    // Determinar si el usuario es HR Admin (puede editar por lotes)
    const esHRAdmin = operaDirecto;

    // Si es HR Admin, usar el sistema de edición por lotes
    if (esHRAdmin) {
      const cambios: any[] = [];

      // 1. Eventos eliminados
      for (const eventoId of eventosEliminados) {
        cambios.push({
          accion: 'eliminar',
          eventoId,
        });
      }

      // 2. Eventos nuevos (crear)
      for (const ev of eventos.filter((e) => e.isNew)) {
        cambios.push({
          accion: 'crear',
          tipo: ev.tipo,
          hora: new Date(`${fecha}T${ev.hora}:00`).toISOString(),
        });
      }

      // 3. Eventos modificados (editar)
      for (const ev of eventos.filter((e) => !e.isNew)) {
        const original = eventosOriginales.find((o) => o.id === ev.id);
        if (!original) continue;

        if (original.tipo !== ev.tipo || original.hora !== ev.hora) {
          cambios.push({
            accion: 'editar',
            eventoId: ev.id,
            tipo: ev.tipo !== original.tipo ? ev.tipo : undefined,
            hora:
              ev.hora !== original.hora
                ? new Date(`${fecha}T${ev.hora}:00`).toISOString()
                : undefined,
          });
        }
      }

      // Si no hay cambios, no hacer nada
      if (cambios.length === 0) {
        throw new Error('No hay cambios que guardar');
      }

      // Usar motivo o uno por defecto
      const motivoFinal = motivo || 'Corrección de fichaje';

      // Llamar al endpoint de edición por lotes
      const res = await fetch('/api/fichajes/editar-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fichajeId: fichajeDiaId,
          cambios,
          motivo: motivoFinal,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' })) as { message?: string };
        throw new Error(errorData.message || 'Error al guardar la edición');
      }
    } else {
      // FLUJO EMPLEADO: Edición optimista transaccional

      // Preparar cambios
      const eventosEditados = eventos.filter((e) => !e.isNew).filter((ev) => {
        const original = eventosOriginales.find((o) => o.id === ev.id);
        return original && (original.tipo !== ev.tipo || original.hora !== ev.hora);
      }).map((ev) => ({
        id: ev.id,
        tipo: ev.tipo,
        hora: new Date(`${fecha}T${ev.hora}:00`).toISOString(),
      }));

      const eventosNuevos = eventos.filter((e) => e.isNew).map((ev) => ({
        tipo: ev.tipo,
        hora: new Date(`${fecha}T${ev.hora}:00`).toISOString(),
      }));

      // Detalles para auditoría
      const detalles = {
        eventosOriginales: eventosOriginales.map((e) => ({
          id: e.id,
          tipo: e.tipo,
          hora: e.hora,
          editado: e.editado || false,
        })),
        eventosEditados: eventos.map((ev) => ({
          id: ev.id,
          tipo: ev.tipo,
          hora: ev.hora,
          editado: true,
          isNew: ev.isNew,
        })),
        cambiosRealizados: {
          eliminados: eventosEliminados.map((id) => ({
            id,
            evento: eventosOriginales.find((e) => e.id === id),
          })),
          editados: eventosEditados.map((ev) => {
            const original = eventosOriginales.find((o) => o.id === ev.id);
            return {
              id: ev.id,
              anterior: original,
              nuevo: { tipo: ev.tipo, hora: ev.hora },
            };
          }),
          nuevos: eventosNuevos,
        },
        origen: faltaDescanso ? 'completar_descanso' : 'edicion_empleado',
      };

      // Llamar endpoint transaccional (todo o nada)
      const res = await fetch('/api/fichajes/editar-optimista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fichajeId: fichajeDiaId,
          motivo: motivo || 'Edición de fichaje por empleado',
          cambios: {
            eliminados: eventosEliminados,
            nuevos: eventosNuevos,
            editados: eventosEditados,
          },
          detalles,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' })) as { message?: string };
        throw new Error(errorData.message || 'Error al guardar la edición');
      }
    }
  }


  const titulo = 'Editar Fichaje';
  const descripcion = 'Modifica, añade o elimina eventos del fichaje';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogScrollableContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <p className="text-sm text-gray-500">{descripcion}</p>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4 py-2">
          {/* Info del empleado */}
          {empleadoNombre && (
            <div className="space-y-1 pb-3 border-b">
              <div className="text-base font-semibold text-gray-900">
                {empleadoNombre}
              </div>
              {empleadoPuesto && (
                <div className="text-sm text-gray-500">{empleadoPuesto}</div>
              )}
            </div>
          )}

          {/* Fecha - SOLO LECTURA */}
          <Field>
            <FieldLabel>Fecha</FieldLabel>
            <ResponsiveDatePicker
              date={parseDateValue(fecha)}
              onSelect={(date) => setFecha(date ? format(date, 'yyyy-MM-dd') : '')}
              placeholder="Seleccionar fecha"
              label="Fecha de fichaje"
              className="bg-gray-50"
              disabled
              toDate={new Date()}
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
                      {/* Indicador de origen - SOLO mostrar propuesto */}
                      {esPropuesto && (
                        <span className="text-[10px] font-medium text-tertiary-600 bg-tertiary-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                          Propuesto
                        </span>
                      )}
                      
                      {/* FASE C: Tipo - Selectable para nuevos, read-only para existentes */}
                      <div className="flex-1">
                        {ev.isNew ? (
                          <select
                            value={ev.tipo}
                            onChange={(e) => actualizarEvento(ev.id, 'tipo' as 'hora', e.target.value as TipoEventoFichaje)}
                            disabled={cargando}
                            className="h-9 w-full px-3 py-2 border rounded-md bg-white text-sm"
                          >
                            {EVENT_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className={`h-9 px-3 py-2 border rounded-md bg-gray-50 text-sm flex items-center ${
                            esPropuesto ? 'bg-tertiary-50' : 'bg-gray-50'
                          }`}>
                            {EVENT_OPTIONS.find(opt => opt.value === ev.tipo)?.label || ev.tipo}
                          </div>
                        )}
                      </div>

                      {/* Hora - EDITABLE */}
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
                        <Badge className="bg-gray-100 text-gray-800 text-xs whitespace-nowrap">
                          Editado
                        </Badge>
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

          {/* FASE C.3: Indicador de horas trabajadas vs esperadas */}
          {horasTrabajadas !== null && horasEsperadas !== null && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <span className="text-sm font-medium text-blue-900">
                  Horas trabajadas: {horasTrabajadas.toFixed(2)}h
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-700">
                  Esperadas: {horasEsperadas.toFixed(2)}h
                </span>
                {horasTrabajadas < horasEsperadas && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                    -{(horasEsperadas - horasTrabajadas).toFixed(2)}h
                  </span>
                )}
                {horasTrabajadas > horasEsperadas && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                    +{(horasTrabajadas - horasEsperadas).toFixed(2)}h
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error de secuencia (BLOQUEA guardado) */}
          {errorSecuencia && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Secuencia de eventos inválida</p>
                <p className="text-sm text-red-700">{errorSecuencia}</p>
                <p className="text-xs text-red-600 mt-1">
                  Corrige la secuencia antes de guardar.
                </p>
              </div>
            </div>
          )}

          {/* Advertencia de incompletitud (NO bloquea, solo advierte) */}
          {!errorSecuencia && advertenciaIncompletitud && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">Fichaje incompleto</p>
                <p className="text-sm text-yellow-700">{advertenciaIncompletitud}</p>
                <p className="text-xs text-yellow-600 mt-1">
                  Puedes guardarlo así, el fichaje quedará pendiente.
                </p>
              </div>
            </div>
          )}

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
            Guardar cambios
          </LoadingButton>
        </DialogFooter>
      </DialogScrollableContent>

      {/* FASE C.2: Dialog de confirmación salida sin descanso */}
      <Dialog open={mostrarConfirmacionSinDescanso} onOpenChange={setMostrarConfirmacionSinDescanso}>
        <DialogScrollableContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar salida sin descanso</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">
                    Has registrado una salida sin descanso
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    La jornada de este empleado requiere un descanso. ¿Deseas guardar el fichaje sin descanso de todas formas?
                  </p>
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMostrarConfirmacionSinDescanso(false)}
              disabled={cargando}
            >
              Editar fichaje
            </Button>
            <LoadingButton onClick={handleConfirmarSinDescanso} loading={cargando}>
              Confirmar y guardar
            </LoadingButton>
          </DialogFooter>
        </DialogScrollableContent>
      </Dialog>
    </Dialog>
  );
}

