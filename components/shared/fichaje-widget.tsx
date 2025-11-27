// ========================================
// Fichaje Widget - Clock In/Out Widget
// ========================================
// Shows clocking with circular progress ring
// NUEVO MODELO: Consulta Fichaje completo con eventos

'use client';

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { calcularHorasObjetivoDesdeJornada, calcularProgresoEventos } from '@/lib/calculos/fichajes-cliente';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
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
      };
    };

const initialState: FichajeWidgetState = {
  status: 'sin_fichar',
  horaEntrada: null,
  horasAcumuladas: 0,
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

  const ultimoEvento = fichaje.eventos[fichaje.eventos.length - 1];

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


export function FichajeWidget({
  href = '/empleado/mi-espacio/fichajes',
}: FichajeWidgetProps) {
  const [state, dispatch] = useReducer(fichajeWidgetReducer, initialState);
  const [tick, setTick] = useState(0);
  const [horasObjetivoDia, setHorasObjetivoDia] = useState<number>(8);

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
            payload: { status: 'sin_fichar', horaEntrada: null, horasAcumuladas: 0 },
          });
          return;
        }

        const fichajeHoy = fichajes[0];
        const { horasAcumuladas, horaEnCurso } = calcularProgresoEventos(fichajeHoy.eventos);
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
          },
        });
      } catch (error) {
        console.error('[FichajeWidget] Error obteniendo estado:', error);
        dispatch({
          type: 'SET_DATA',
          payload: { status: 'sin_fichar', horaEntrada: null, horasAcumuladas: 0 },
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

  async function handleFichar(tipoOverride?: string) {
    if (state.loading) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
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

      const response = await fetch('/api/fichajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo }),
      });

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => null);
        toast.error(error?.error || 'Error al fichar');
        return;
      }

      // Actualizar estado después de fichar
      await obtenerEstadoActual();
      
      // Notificar a otros componentes (ej: tabla de fichajes)
      window.dispatchEvent(new CustomEvent('fichaje-updated'));
    } catch (error) {
      console.error('[FichajeWidget] Error al fichar:', error);
      toast.error('Error al fichar. Intenta de nuevo.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
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
      {/* Mobile: Sin header, solo contenido */}
      <div className="sm:hidden h-full">
        <Card className={`${MOBILE_DESIGN.widget.height.standard} flex flex-col overflow-hidden ${MOBILE_DESIGN.card.default}`}>
          <CardContent className={`flex-1 ${MOBILE_DESIGN.spacing.widget} flex flex-col`}>
            {/* Estado y Cronómetro juntos */}
            <div className={`${MOBILE_DESIGN.card.highlight} text-center mb-3`}>
              <div className={`${MOBILE_DESIGN.text.caption} mb-1`}>{getTituloEstado()}</div>
              <div className={`${MOBILE_DESIGN.text.display} text-gray-900`}>{tiempoTrabajado}</div>
              <div className={`${MOBILE_DESIGN.text.caption} mt-0.5`}>Horas trabajadas</div>
            </div>

            {/* Botones de acción */}
            <div className={`${MOBILE_DESIGN.spacing.items} mt-auto`}>
              {state.status === 'trabajando' ? (
                <>
                  <Button
                    variant="default"
                    className={`w-full ${MOBILE_DESIGN.button.primary}`}
                    onClick={() => handleFichar('pausa_inicio')}
                    disabled={state.loading}
                  >
                    Pausar
                  </Button>
                  <Button
                    variant="outline"
                    className={`w-full ${MOBILE_DESIGN.button.primary}`}
                    onClick={() => handleFichar('salida')}
                    disabled={state.loading}
                  >
                    Finalizar Jornada
                  </Button>
                </>
              ) : state.status === 'en_pausa' ? (
                <>
                  <Button
                    variant="default"
                    className={`w-full ${MOBILE_DESIGN.button.primary}`}
                    onClick={() => handleFichar('pausa_fin')}
                    disabled={state.loading}
                  >
                    Reanudar
                  </Button>
                  <Button
                    variant="outline"
                    className={`w-full ${MOBILE_DESIGN.button.primary}`}
                    onClick={() => handleFichar('salida')}
                    disabled={state.loading}
                  >
                    Finalizar Jornada
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  className={`w-full ${MOBILE_DESIGN.button.primary}`}
                  onClick={() => handleFichar()}
                  disabled={state.loading}
                >
                  {getTextoBoton()}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop: Con header y anillo */}
      <div className="hidden sm:block h-full">
        <WidgetCard title="Fichaje" href={href} contentClassName="px-6">
          <div className="grid grid-cols-2 gap-4 h-full min-h-0">
            {/* Estado y botones */}
            <div className="flex flex-col justify-between">
              <div>
                <h3 className="text-[24px] font-bold text-gray-900">{getTituloEstado()}</h3>
                <p className="text-[11px] text-gray-500 mt-1">
                  {state.status === 'trabajando' && `${formatearHorasMinutos(horasPorHacer)} restantes`}
                  {state.status === 'en_pausa' && 'En descanso'}
                  {state.status === 'sin_fichar' && 'Listo para comenzar'}
                  {state.status === 'finalizado' && 'Día completado'}
                </p>
              </div>
              <div className="space-y-2">
                {state.status === 'trabajando' ? (
                  <>
                    <Button
                      variant="default"
                      className="w-full font-semibold text-[13px]"
                      onClick={() => handleFichar('pausa_inicio')}
                      disabled={state.loading}
                    >
                      ⏸ Pausar
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full font-semibold text-[13px]"
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
                      className="w-full font-semibold text-[13px]"
                      onClick={() => handleFichar('pausa_fin')}
                      disabled={state.loading}
                    >
                      ▶ Reanudar
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full font-semibold text-[13px]"
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
                      className="w-full font-semibold text-[13px]"
                      onClick={() => handleFichar()}
                      disabled={state.loading}
                    >
                      {getTextoBoton()}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full font-semibold text-[13px]"
                      onClick={() => dispatch({ type: 'SET_MODAL', payload: true })}
                    >
                      + Añadir Manual
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Anillo de progreso */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 128 128">
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{tiempoTrabajado}</span>
                </div>
              </div>
              <div className="flex items-center justify-between w-full mt-2 px-2">
                <div className="text-center">
                  <div className="text-[11px] text-gray-900 font-semibold">{horasHechas}h</div>
                  <div className="text-[9px] text-gray-500">Hechas</div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] text-gray-900 font-semibold">{horasPorHacer}h</div>
                  <div className="text-[9px] text-gray-500">Por hacer</div>
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
    </div>
  );
}
