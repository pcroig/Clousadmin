// ========================================
// Fichaje Bar Mobile - Barra compacta de fichaje para HR/Manager dashboard mobile
// ========================================

'use client';

import { Clock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { calcularHorasTrabajadas } from '@/lib/calculos/fichajes-cliente';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import { cn } from '@/lib/utils';
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { formatTiempoTrabajado } from '@/lib/utils/formatters';
import { parseJson } from '@/lib/utils/json';

import type { FichajeEvento } from '@prisma/client';

type EstadoFichaje = 'sin_fichar' | 'trabajando' | 'en_pausa' | 'finalizado';

interface Fichaje {
  id: string;
  fecha: string;
  estado: string;
  eventos: Array<{
    id: string;
    tipo: string;
    hora: string | Date;
  }>;
}

interface FichajeBarState {
  status: EstadoFichaje;
  horaEntrada: Date | null;
  eventos: FichajeEvento[];
  loading: boolean;
  inicializando: boolean;
}

type FichajeBarAction =
  | { type: 'SET_INITIALIZING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | {
      type: 'SET_DATA';
      payload: {
        status: EstadoFichaje;
        horaEntrada: Date | null;
        eventos: FichajeEvento[];
      };
    };

const initialState: FichajeBarState = {
  status: 'sin_fichar',
  horaEntrada: null,
  eventos: [],
  loading: false,
  inicializando: true,
};

function fichajeBarReducer(
  state: FichajeBarState,
  action: FichajeBarAction
): FichajeBarState {
  switch (action.type) {
    case 'SET_INITIALIZING':
      return { ...state, inicializando: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_DATA':
      return {
        ...state,
        status: action.payload.status,
        horaEntrada: action.payload.horaEntrada,
        eventos: action.payload.eventos,
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

function mapearEventosFichaje(fichaje: Fichaje): FichajeEvento[] {
  return (fichaje.eventos || []).map((evento) => ({
    id: evento.id,
    tipo: evento.tipo as FichajeEvento['tipo'],
    hora: new Date(evento.hora),
    fichajeId: fichaje.id,
    ubicacion: null,
    editado: false,
    motivoEdicion: null,
    horaOriginal: null,
    editadoPor: null,
    createdAt: new Date(evento.hora),
  }));
}

/**
 * Barra horizontal compacta de fichaje para mobile (HR/Manager dashboard)
 * Muestra tiempo trabajado + botón de fichar en una sola línea
 * Sin card, diseño minimalista
 * 
 * @example
 * <FichajeBarMobile href="/hr/horario/fichajes" />
 */
export function FichajeBarMobile() {
  const [state, dispatch] = useReducer(fichajeBarReducer, initialState);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (state.status !== 'trabajando' || !state.horaEntrada) {
      return;
    }

    const interval = setInterval(() => {
      setTick((prev) => (prev + 1) % Number.MAX_SAFE_INTEGER);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.status, state.horaEntrada]);

  const horasTotales = useMemo(() => {
    // Dependemos de `tick` para recalcular cada segundo cuando el usuario está trabajando
    void tick;

    if (state.eventos.length === 0) {
      return 0;
    }
    return calcularHorasTrabajadas(state.eventos);
  }, [state.eventos, tick]);

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
        const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

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
            payload: { status: 'sin_fichar', horaEntrada: null, eventos: [] },
          });
          return;
        }

        const fichajeHoy = fichajes[0];
        const eventosFormateados = mapearEventosFichaje(fichajeHoy);
        const entrada = fichajeHoy.eventos.find((e) => e.tipo === 'entrada');

        dispatch({
          type: 'SET_DATA',
          payload: {
            status: deriveEstadoDesdeFichaje(fichajeHoy),
            horaEntrada: entrada ? new Date(entrada.hora) : null,
            eventos: eventosFormateados,
          },
        });
      } catch (error) {
        console.error('[FichajeBarMobile] Error obteniendo estado:', error);
        dispatch({
          type: 'SET_DATA',
          payload: { status: 'sin_fichar', horaEntrada: null, eventos: [] },
        });
      }
    },
    []
  );

  useEffect(() => {
    obtenerEstadoActual({ initial: true });
  }, [obtenerEstadoActual]);

  async function handleFichar() {
    if (state.loading) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      let tipo = 'entrada';

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

      await obtenerEstadoActual();
    } catch (error) {
      console.error('[FichajeBarMobile] Error al fichar:', error);
      toast.error('Error al fichar. Intenta de nuevo.');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  function getTextoBoton() {
    if (state.loading) return '...';

    switch (state.status) {
      case 'sin_fichar':
      case 'finalizado':
        return 'Fichar';
      case 'trabajando':
        return 'Pausar';
      case 'en_pausa':
        return 'Reanudar';
      default:
        return 'Fichar';
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
        return 'Finalizado';
      default:
        return 'Fichaje';
    }
  }

  if (state.inicializando) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className={cn(MOBILE_DESIGN.text.caption)}>Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white rounded-lg border border-gray-200">
      {/* Tiempo trabajado */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Clock className="h-5 w-5 text-gray-600 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className={cn(MOBILE_DESIGN.text.displayLarge, 'text-gray-900 leading-none')}>
            {tiempoTrabajado}
          </p>
          <p className={cn(MOBILE_DESIGN.text.tiny, 'mt-0.5')}>
            {getTituloEstado()}
          </p>
        </div>
      </div>

      {/* Botón fichar */}
      <Button
        onClick={handleFichar}
        disabled={state.loading}
        className={cn(MOBILE_DESIGN.button.secondary, 'flex-shrink-0')}
        size="sm"
      >
        {getTextoBoton()}
      </Button>
    </div>
  );
}

