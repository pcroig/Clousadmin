// ========================================
// Fichaje Widget - Clock In/Out Widget
// ========================================
// Shows clocking with circular progress ring
// NUEVO MODELO: Consulta Fichaje completo con eventos

'use client';

import { AlertTriangle, Clock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { calcularHorasObjetivoDesdeJornada, calcularProgresoEventos } from '@/lib/calculos/fichajes-cliente';
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { toMadridDate } from '@/lib/utils/fechas';
import { formatearHorasMinutos, formatTiempoTrabajado } from '@/lib/utils/formatters';
import { parseJson } from '@/lib/utils/json';

import { FichajeModal } from './fichajes/fichaje-modal';
import { WidgetCard } from './widget-card';

interface FichajeWidgetProps {
  href?: string;
}

type EstadoFichaje = 'sin_fichar' | 'trabajando' | 'en_pausa' | 'finalizado';

interface Fichaje {
  id: string;
  fecha: string;
  estado: string;
  tipoFichaje?: 'ordinario' | 'extraordinario';
  horasTrabajadas: number | null;
  horasEsperadas?: number | string | null;
  eventos: Array<{
    id: string;
    tipo: string;
    hora: string | Date;
  }>;
}

interface EmpleadoActualResponse {
  id: string;
  jornada?: {
    horasSemanales?: number | string | null;
    config?: Record<string, unknown> | null;
  } | null;
}

interface FichajeWidgetState {
  status: EstadoFichaje;
  horaEntrada: Date | null;
  horasAcumuladas: number;
  horaEntradaDia: Date | null;
  horaSalidaDia: Date | null;
  tipoFichaje: 'ordinario' | 'extraordinario';
  fichajeId: string | null;
  eventos: Array<{ tipo: string; hora: string | Date }>; // Eventos del fichaje actual
  modalManual: boolean;
  loading: boolean;
  inicializando: boolean;
}

type FichajeWidgetAction =
  | { type: 'SET_INITIALIZING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_MODAL'; payload: boolean }
  | {
      type: 'SET_DATA';
      payload: {
        status: EstadoFichaje;
        horaEntrada: Date | null;
        horasAcumuladas: number;
        horaEntradaDia: Date | null;
        horaSalidaDia: Date | null;
        tipoFichaje?: 'ordinario' | 'extraordinario';
        fichajeId?: string | null;
        eventos?: Array<{ tipo: string; hora: string | Date }>;
      };
    };

const initialState: FichajeWidgetState = {
  status: 'sin_fichar',
  horaEntrada: null,
  horasAcumuladas: 0,
  horaEntradaDia: null,
  horaSalidaDia: null,
  tipoFichaje: 'ordinario',
  fichajeId: null,
  eventos: [],
  modalManual: false,
  loading: false,
  inicializando: true,
};

function fichajeWidgetReducer(
  state: FichajeWidgetState,
  action: FichajeWidgetAction
): FichajeWidgetState {
  switch (action.type) {
    case 'SET_INITIALIZING':
      return { ...state, inicializando: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_MODAL':
      return { ...state, modalManual: action.payload };
    case 'SET_DATA':
      return {
        ...state,
        status: action.payload.status,
        horaEntrada: action.payload.horaEntrada,
        horasAcumuladas: action.payload.horasAcumuladas,
        horaEntradaDia: action.payload.horaEntradaDia,
        horaSalidaDia: action.payload.horaSalidaDia,
        tipoFichaje: action.payload.tipoFichaje ?? state.tipoFichaje,
        fichajeId: action.payload.fichajeId ?? state.fichajeId,
        eventos: action.payload.eventos ?? state.eventos,
        inicializando: false,
        loading: false,
      };
    default:
      return state;
  }
}

function deriveEstadoDesdeFichaje(fichaje: Fichaje): EstadoFichaje {
  if (fichaje.estado === 'finalizado') {
    return 'finalizado';
  }

  if (!fichaje.eventos || fichaje.eventos.length === 0) {
    return 'sin_fichar';
  }

  // CRÍTICO: Ordenar eventos por hora antes de derivar estado
  // Los eventos pueden venir desordenados si se modificaron en el cliente
  const eventosOrdenados = [...fichaje.eventos].sort(
    (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime()
  );

  const ultimoEvento = eventosOrdenados[eventosOrdenados.length - 1];

  switch (ultimoEvento.tipo) {
    case 'entrada':
    case 'pausa_fin':
      return 'trabajando';
    case 'pausa_inicio':
      return 'en_pausa';
    case 'salida':
      return 'finalizado';
    default:
      return 'sin_fichar';
  }
}

const TIME_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
});

function obtenerEntradasSalidas(eventos: Array<{ tipo: string; hora: string | Date }>) {
  if (!eventos || eventos.length === 0) {
    return { horaEntradaDia: null, horaSalidaDia: null };
  }

  const ordenados = [...eventos].sort(
    (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime(),
  );

  let horaEntradaDia: Date | null = null;
  let horaSalidaDia: Date | null = null;

  for (const evento of ordenados) {
    const instante = new Date(evento.hora);
    if (Number.isNaN(instante.getTime())) {
      continue;
    }

    if (!horaEntradaDia && evento.tipo === 'entrada') {
      horaEntradaDia = instante;
    }

    if (evento.tipo === 'salida') {
      horaSalidaDia = instante;
    }
  }

  return { horaEntradaDia, horaSalidaDia };
}

const formatHoraCorta = (date: Date | null) => (date ? TIME_FORMATTER.format(date) : '--:--');


export function FichajeWidget({
  href = '/empleado/mi-espacio/fichajes',
}: FichajeWidgetProps) {
  const [state, dispatch] = useReducer(fichajeWidgetReducer, initialState);
  const [tick, setTick] = useState(0);
  const [horasObjetivoDia, setHorasObjetivoDia] = useState<number>(8);
  const [showExtraordinarioDialog, setShowExtraordinarioDialog] = useState(false);
  const [pendingFichajeTipo, setPendingFichajeTipo] = useState<string | null>(null);
  // NUEVO: Estados para caso 2 (completar descanso)
  const [showDescansoDialog, setShowDescansoDialog] = useState(false);
  const [infoDescanso, setInfoDescanso] = useState<{
    tienePausaInicio: boolean;
    tienePausaFin: boolean;
    fichajeId: string;
  } | null>(null);
  const [eventosActuales, setEventosActuales] = useState<Array<{ tipo: string; hora: string | Date }>>([]);

  useEffect(() => {
    if (state.status !== 'trabajando' || !state.horaEntrada) {
      return;
    }

    const interval = setInterval(() => {
      setTick((prev) => (prev + 1) % Number.MAX_SAFE_INTEGER);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.status, state.horaEntrada]);

  useEffect(() => {
    let cancelled = false;
    async function cargarHorasObjetivo() {
      try {
        const response = await fetch('/api/empleados/me');
        if (!response.ok) {
          return;
        }

        const payload = await parseJson<EmpleadoActualResponse>(response).catch(() => null);

        if (!payload?.jornada) {
          return;
        }

        const horasCalculadas = calcularHorasObjetivoDesdeJornada({
          jornada: {
            config: payload.jornada.config,
            horasSemanales: payload.jornada.horasSemanales,
          },
          fecha: toMadridDate(new Date()),
        });

        if (!cancelled && Number.isFinite(horasCalculadas) && horasCalculadas > 0) {
          setHorasObjetivoDia(Number(horasCalculadas.toFixed(2)));
        }
      } catch (error) {
        console.warn('[FichajeWidget] No se pudo cargar la jornada actual', error);
      }
    }

    cargarHorasObjetivo();

    return () => {
      cancelled = true;
    };
  }, []);

  const horasTotales = useMemo(() => {
    if (state.status === 'trabajando' && state.horaEntrada) {
      const diffHoras = (Date.now() - state.horaEntrada.getTime()) / (1000 * 60 * 60);
      const total = state.horasAcumuladas + (Number.isFinite(diffHoras) ? Math.max(diffHoras, 0) : 0);
      return Number(total.toFixed(2));
    }

    return Number(state.horasAcumuladas.toFixed(2));
  }, [state.status, state.horaEntrada, state.horasAcumuladas, tick]);

  const horasHechas = useMemo(() => Math.round(horasTotales * 100) / 100, [horasTotales]);
  const horasPorHacer = useMemo(
    () => {
      const resto = Number(horasObjetivoDia.toFixed(2)) - horasHechas;
      return Math.max(0, Math.round(resto * 100) / 100);
    },
    [horasHechas, horasObjetivoDia]
  );
  const tiempoTrabajado = useMemo(
    () => formatTiempoTrabajado(horasTotales * 60 * 60 * 1000),
    [horasTotales]
  );

  const obtenerEstadoActual = useCallback(
    async (options?: { initial?: boolean }) => {
      if (options?.initial) {
        dispatch({ type: 'SET_INITIALIZING', payload: true });
      }

      try {
        const hoy = new Date();
        const madridDate = toMadridDate(hoy);
        const fechaLocal = `${madridDate.getFullYear()}-${String(madridDate.getMonth() + 1).padStart(2, '0')}-${String(madridDate.getDate()).padStart(2, '0')}`;

        const response = await fetch(`/api/fichajes?fecha=${fechaLocal}&propios=1`, {
          cache: 'no-store',
        });

        const payload = await parseJson<unknown>(response).catch(() => null);
        if (!response.ok || !payload) {
          throw new Error(`Error obteniendo fichaje: ${response.status}`);
        }
        const fichajes = extractArrayFromResponse<Fichaje>(payload, { key: 'fichajes' });

        if (fichajes.length === 0) {
          dispatch({
            type: 'SET_DATA',
            payload: {
              status: 'sin_fichar',
              horaEntrada: null,
              horasAcumuladas: 0,
              horaEntradaDia: null,
              horaSalidaDia: null,
              tipoFichaje: 'ordinario',
              eventos: [],
            },
          });
          return;
        }

        const fichajeHoy = fichajes[0];
        const { horasAcumuladas, horaEnCurso } = calcularProgresoEventos(fichajeHoy.eventos);
        const { horaEntradaDia, horaSalidaDia } = obtenerEntradasSalidas(fichajeHoy.eventos);
        const horasEsperadas =
          typeof fichajeHoy.horasEsperadas === 'number'
            ? fichajeHoy.horasEsperadas
            : Number(fichajeHoy.horasEsperadas ?? 0);

        if (Number.isFinite(horasEsperadas) && horasEsperadas > 0) {
          setHorasObjetivoDia(Number(horasEsperadas.toFixed(2)));
        }

        dispatch({
          type: 'SET_DATA',
          payload: {
            status: deriveEstadoDesdeFichaje(fichajeHoy),
            horaEntrada: horaEnCurso,
            horasAcumuladas,
            horaEntradaDia,
            horaSalidaDia,
            tipoFichaje: fichajeHoy.tipoFichaje ?? 'ordinario',
            fichajeId: fichajeHoy.id,
            eventos: fichajeHoy.eventos, // Guardar eventos en el estado
          },
        });
      } catch (error) {
        console.error('[FichajeWidget] Error obteniendo estado:', error);
        dispatch({
          type: 'SET_DATA',
          payload: {
            status: 'sin_fichar',
            horaEntrada: null,
            horasAcumuladas: 0,
            horaEntradaDia: null,
            horaSalidaDia: null,
            tipoFichaje: 'ordinario',
            eventos: [],
          },
        });
      }
    },
    []
  );

  // Escuchar eventos globales de actualización
  useEffect(() => {
    function handleUpdate() {
      obtenerEstadoActual();
    }
    
    window.addEventListener('fichaje-updated', handleUpdate);
    return () => window.removeEventListener('fichaje-updated', handleUpdate);
  }, [obtenerEstadoActual]);

  // Obtener estado actual y datos al cargar
  useEffect(() => {
    obtenerEstadoActual({ initial: true });
  }, [obtenerEstadoActual]);

  async function handleFichar(tipoOverride?: string, forceExtraordinario: boolean = false, confirmarSinDescanso: boolean = false) {
    if (state.loading) return;

    // Determinar tipo de fichaje según estado actual
    let tipo = tipoOverride || 'entrada';

    if (!tipoOverride) {
      switch (state.status) {
        case 'sin_fichar':
        case 'finalizado':
          tipo = 'entrada';
          break;
        case 'trabajando':
          tipo = 'pausa_inicio';
          break;
        case 'en_pausa':
          tipo = 'pausa_fin';
          break;
      }
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Determinar tipo de fichaje: ordinario (default) o extraordinario (si forzado)
      const tipoFichaje = forceExtraordinario ? 'extraordinario' : 'ordinario';

      const response = await fetch('/api/fichajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          tipoFichaje,
          confirmarSinDescanso,
        }),
      });

      if (!response.ok) {
        const error = await parseJson<{
          error?: string;
          code?: string;
          tienePausaInicio?: boolean;
          tienePausaFin?: boolean;
          fichajeId?: string;
        }>(response).catch(() => null);

        // Si el backend rechaza por día no laborable, preguntar si quiere registrarlo como extraordinario
        if (error?.code === 'DIA_NO_LABORABLE' && !forceExtraordinario) {
          setPendingFichajeTipo(tipo);
          setShowExtraordinarioDialog(true);
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        // NUEVO: Dialog de descanso incompleto
        if (error?.code === 'DESCANSO_INCOMPLETO') {
          const fichajeId = error.fichajeId ?? state.fichajeId ?? '';

          // Usar eventos del estado si están disponibles, evitando fetch adicional
          setEventosActuales(state.eventos.length > 0 ? state.eventos : []);

          setInfoDescanso({
            tienePausaInicio: error.tienePausaInicio ?? false,
            tienePausaFin: error.tienePausaFin ?? false,
            fichajeId,
          });
          setShowDescansoDialog(true);
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        toast.error(error?.error || 'Error al fichar');
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Actualizar estado después de fichar
      await obtenerEstadoActual();

      // Notificar a otros componentes (ej: tabla de fichajes)
      window.dispatchEvent(new CustomEvent('fichaje-updated'));

      // Mostrar mensaje de éxito diferente para extraordinarios
      if (tipoFichaje === 'extraordinario') {
        toast.success('Fichaje extraordinario registrado (horas extra)');
      }
    } catch (error) {
      console.error('[FichajeWidget] Error al fichar:', error);
      toast.error('Error al fichar. Intenta de nuevo.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  function handleConfirmarExtraordinario() {
    setShowExtraordinarioDialog(false);
    if (pendingFichajeTipo) {
      handleFichar(pendingFichajeTipo, true); // forceExtraordinario = true
      setPendingFichajeTipo(null);
    }
  }

  function handleCancelarExtraordinario() {
    setShowExtraordinarioDialog(false);
    setPendingFichajeTipo(null);
  }

  function handleConfirmarSinDescanso() {
    setShowDescansoDialog(false);
    setInfoDescanso(null);
    handleFichar('salida', false, true);
  }

  function handleEditarEventos() {
    setShowDescansoDialog(false);
    dispatch({ type: 'SET_MODAL', payload: true });
  }

  function getTextoBoton() {
    if (state.loading) return 'Procesando...';
    
    switch (state.status) {
      case 'sin_fichar':
      case 'finalizado':
        return '▶ Iniciar Jornada';
      case 'trabajando':
        return '⏸ Pausar';
      case 'en_pausa':
        return '▶ Reanudar';
      default:
        return '▶ Fichar';
    }
  }

  function getTituloEstado() {
    switch (state.status) {
      case 'sin_fichar':
        return 'Sin fichar';
      case 'trabajando':
        return 'Trabajando';
      case 'en_pausa':
        return 'En pausa';
      case 'finalizado':
        return 'Jornada finalizada';
      default:
        return 'Fichaje';
    }
  }

  const porcentajeProgreso = useMemo(() => {
    if (horasObjetivoDia <= 0) {
      return 0;
    }
    const progreso = (horasHechas / horasObjetivoDia) * 100;
    return Math.max(0, Math.min(100, progreso));
  }, [horasHechas, horasObjetivoDia]);
  const circumference = 2 * Math.PI * 58;

  if (state.inicializando) {
    return (
      <WidgetCard title="Fichaje" href={href}>
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-gray-500">Cargando...</div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <div className="h-full">
      {/* Mobile: Card de fichaje mejorada */}
      <div className="sm:hidden">
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          {/* Estado + Cronómetro en misma altura */}
          <div className="flex items-center justify-between mb-3">
            {/* Izquierda: Icono + Estado + Tiempo restante (vertical) */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#d97757] flex-shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-900">{getTituloEstado()}</span>
                  {state.status === 'trabajando' && (
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  )}
                </div>
                {state.status === 'trabajando' && (
                  <span className="text-[10px] text-gray-500">
                    {state.tipoFichaje === 'extraordinario'
                      ? '⚡ Jornada extraordinaria'
                      : `${formatearHorasMinutos(horasPorHacer)} restantes`
                    }
                  </span>
                )}
              </div>
            </div>

            {/* Derecha: Cronómetro (menos grande, menos bold) */}
            <div className="text-xl font-medium text-gray-900">{tiempoTrabajado}</div>
          </div>

          {/* Botones de acción más compactos */}
          <div className="grid grid-cols-2 gap-2">
            {state.status === 'trabajando' ? (
              <>
                <Button
                  variant="outline"
                  className="h-11 text-xs font-medium border-2"
                  onClick={() => handleFichar('pausa_inicio')}
                  disabled={state.loading}
                >
                  Tienda
                </Button>
                <Button
                  variant="default"
                  className="h-11 text-xs font-medium bg-gray-900 hover:bg-gray-800"
                  onClick={() => handleFichar('salida')}
                  disabled={state.loading}
                >
                  Salida
                </Button>
              </>
            ) : state.status === 'en_pausa' ? (
              <>
                <Button
                  variant="default"
                  className="h-11 text-xs font-medium"
                  onClick={() => handleFichar('pausa_fin')}
                  disabled={state.loading}
                >
                  Reanudar
                </Button>
                <Button
                  variant="outline"
                  className="h-11 text-xs font-medium border-2"
                  onClick={() => handleFichar('salida')}
                  disabled={state.loading}
                >
                  Salida
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                className="col-span-2 h-11 text-xs font-medium"
                onClick={() => handleFichar()}
                disabled={state.loading}
              >
                {getTextoBoton()}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: Con header y anillo */}
      <div className="hidden sm:block h-full">
        <WidgetCard title="Fichaje" href={href} contentClassName="px-6">
          {/* Contenedor principal para las dos mitades */}
          <div className="flex flex-col md:flex-row gap-6 h-full min-h-0">
            {/* MITAD IZQUIERDA: Estado y botones coordinados */}
            <div className="flex-1 flex flex-col justify-between min-w-0 py-8">
              {/* Estado con descripción */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[24px] font-bold text-gray-900 leading-tight">{getTituloEstado()}</h3>
                </div>
                <p className="text-[12px] text-gray-500">
                  {state.status === 'trabajando' && (
                    state.tipoFichaje === 'extraordinario'
                      ? '⚡ Jornada extraordinaria'
                      : `${formatearHorasMinutos(horasPorHacer)} restantes`
                  )}
                  {state.status === 'en_pausa' && 'En descanso'}
                  {state.status === 'sin_fichar' && 'Listo para comenzar'}
                  {state.status === 'finalizado' && 'Día completado'}
                </p>
              </div>

              {/* Botones de acción */}
              <div className="space-y-2">
                {state.status === 'trabajando' ? (
                  <>
                    <Button
                      variant="default"
                      className="w-full font-semibold text-[12px] py-2"
                      onClick={() => handleFichar('pausa_inicio')}
                      disabled={state.loading}
                    >
                      ⏸ Pausar
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full font-semibold text-[12px] py-2"
                      onClick={() => handleFichar('salida')}
                      disabled={state.loading}
                    >
                      ⏹ Finalizar Jornada
                    </Button>
                  </>
                ) : state.status === 'en_pausa' ? (
                  <>
                    <Button
                      variant="default"
                      className="w-full font-semibold text-[12px] py-2"
                      onClick={() => handleFichar('pausa_fin')}
                      disabled={state.loading}
                    >
                      ▶ Reanudar
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full font-semibold text-[12px] py-2"
                      onClick={() => handleFichar('salida')}
                      disabled={state.loading}
                    >
                      ⏹ Finalizar Jornada
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="default"
                      className="w-full font-semibold text-[12px] py-2"
                      onClick={() => handleFichar()}
                      disabled={state.loading}
                    >
                      {getTextoBoton()}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full font-semibold text-[12px] py-2"
                      onClick={() => dispatch({ type: 'SET_MODAL', payload: true })}
                    >
                      Editar
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* MITAD DERECHA: Semicírculo con indicadores en vértices */}
            <div className="flex-1 flex items-center justify-center min-w-0">
              <div className="relative w-40 h-44">
                {/* SVG del semicírculo original */}
                <svg className="w-full h-40" viewBox="0 0 128 128">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="#EFEFED"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(circumference * 3) / 4} ${circumference}`}
                    strokeDashoffset={-circumference / 8}
                    strokeLinecap="round"
                    transform="rotate(90 64 64)"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="#d97757"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${((circumference * 3) / 4) * (porcentajeProgreso / 100)} ${circumference}`}
                    strokeDashoffset={-circumference / 8}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                    transform="rotate(90 64 64)"
                  />
                </svg>

                {/* Tiempo en el centro del semicírculo */}
                <div className="absolute inset-0 top-0 left-0 w-full h-40 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{tiempoTrabajado}</span>
                </div>

                {/* Indicador izquierdo (Horas hechas) - Debajo del vértice izquierdo */}
                <div className="absolute left-2 -bottom-2">
                  <div className="text-center">
                    <div className="text-[11px] text-gray-900 font-semibold">{formatHoraCorta(state.horaEntradaDia)}</div>
                    <div className="text-[9px] text-gray-500 whitespace-nowrap">Entrada</div>
                  </div>
                </div>

                {/* Indicador derecho (Por hacer) - Debajo del vértice derecho */}
                <div className="absolute right-2 -bottom-2">
                  <div className="text-center">
                    <div className="text-[11px] text-gray-900 font-semibold">{formatHoraCorta(state.horaSalidaDia)}</div>
                    <div className="text-[9px] text-gray-500 whitespace-nowrap">Salida</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </WidgetCard>
      </div>

      {/* Modal de fichaje manual */}
      <FichajeModal
        open={state.modalManual}
        onClose={() => dispatch({ type: 'SET_MODAL', payload: false })}
        onSuccess={() => {
          dispatch({ type: 'SET_MODAL', payload: false });
          obtenerEstadoActual();
          window.dispatchEvent(new CustomEvent('fichaje-updated'));
        }}
        contexto="empleado"
        modo="crear"
      />

      {/* Dialog de confirmación para fichajes extraordinarios */}
      <AlertDialog open={showExtraordinarioDialog} onOpenChange={setShowExtraordinarioDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Fichaje fuera de horario
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás fichando fuera de tu horario laboral ordinario. Este fichaje se registrará como
              <strong className="text-amber-700"> horas extraordinarias</strong>.
              <br />
              <br />
              ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelarExtraordinario}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExtraordinario}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Confirmar fichaje extraordinario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para descanso incompleto */}
      <AlertDialog open={showDescansoDialog} onOpenChange={setShowDescansoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Descanso incompleto
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Tu jornada requiere descanso pero{' '}
                {!infoDescanso?.tienePausaInicio && !infoDescanso?.tienePausaFin
                  ? 'no has registrado ninguna pausa'
                  : infoDescanso?.tienePausaInicio && !infoDescanso?.tienePausaFin
                    ? 'no has registrado el fin de la pausa'
                    : 'la pausa está incompleta'}
                .
              </p>

              {/* Mostrar eventos existentes */}
              {eventosActuales.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-2">Eventos registrados:</p>
                  <div className="space-y-1">
                    {eventosActuales.map((evento, idx) => {
                      const tipoLabel = {
                        entrada: 'Entrada',
                        pausa_inicio: 'Inicio de pausa',
                        pausa_fin: 'Fin de pausa',
                        salida: 'Salida'
                      }[evento.tipo] || evento.tipo;
                      const horaFormateada = new Date(evento.hora).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      return (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{tipoLabel}</span>
                          <span className="font-mono text-gray-900">{horaFormateada}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-sm">
                Puedes editar los eventos para corregir los horarios, o confirmar la jornada tal cual está.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleConfirmarSinDescanso}>
              Confirmar
            </Button>
            <AlertDialogAction onClick={handleEditarEventos}>
              Editar eventos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
