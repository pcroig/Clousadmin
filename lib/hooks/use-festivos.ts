// ========================================
// Custom Hook: useFestivos
// ========================================
// Hook centralizado para cargar y gestionar festivos con revalidación automática

'use client';

import { useCallback, useEffect, useState } from 'react';

import { parseJson } from '@/lib/utils/json';

interface Festivo {
  fecha: string;
  nombre: string;
}

interface UseFestivosOptions {
  empleadoId?: string;
  /** Intervalo de revalidación en milisegundos (default: 60000 = 1 minuto) */
  revalidateInterval?: number;
  /** Si es false, no carga festivos automáticamente al montar */
  enabled?: boolean;
}

interface UseFestivosReturn {
  festivos: Festivo[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para cargar festivos activos con revalidación automática.
 *
 * @example
 * ```tsx
 * const { festivos, isLoading, refetch } = useFestivos({
 *   empleadoId: 'abc123',
 *   revalidateInterval: 60000, // Revalida cada minuto
 * });
 * ```
 */
export function useFestivos(options: UseFestivosOptions = {}): UseFestivosReturn {
  const {
    empleadoId,
    revalidateInterval = 60000, // Default: 1 minuto
    enabled = true,
  } = options;

  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cargarFestivos = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        // Cargar festivos activos de empresa
        const festivosResponse = await fetch('/api/festivos?activo=true', {
          signal,
        });
        const festivosData = await parseJson<{ festivos?: Festivo[] }>(festivosResponse).catch(
          () => null
        );
        const festivosEmpresa = festivosData?.festivos || [];

        // Si hay empleadoId, cargar festivos personalizados
        if (empleadoId) {
          const festivosPersonalizadosResponse = await fetch(
            `/api/empleados/${empleadoId}/festivos`,
            {
              signal,
            }
          );

          let festivosPersonalizados: Festivo[] = [];
          if (festivosPersonalizadosResponse.ok) {
            festivosPersonalizados = await parseJson<Festivo[]>(
              festivosPersonalizadosResponse
            ).catch(() => []);
          }

          // Combinar: festivos de empresa que NO tienen personalización + festivos personalizados
          const fechasPersonalizadas = new Set(festivosPersonalizados.map((f) => f.fecha));
          const festivosEmpresaFiltrados = festivosEmpresa.filter(
            (f) => !fechasPersonalizadas.has(f.fecha)
          );

          const festivosCombinados = [...festivosEmpresaFiltrados, ...festivosPersonalizados];
          setFestivos(festivosCombinados);
        } else {
          setFestivos(festivosEmpresa);
        }

        setIsLoading(false);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[useFestivos] Error cargando festivos:', err);
          setError(err);
          setIsLoading(false);
        }
      }
    },
    [empleadoId]
  );

  // Carga inicial
  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    cargarFestivos(controller.signal);
    return () => controller.abort();
  }, [cargarFestivos, enabled]);

  // Polling: revalidar periódicamente
  useEffect(() => {
    if (!enabled || !revalidateInterval) return;

    const intervalId = setInterval(() => {
      cargarFestivos();
    }, revalidateInterval);

    return () => clearInterval(intervalId);
  }, [cargarFestivos, enabled, revalidateInterval]);

  // Escuchar eventos de actualización de festivos (desde otras pestañas/componentes)
  useEffect(() => {
    if (!enabled) return;

    const handleFestivosUpdated = () => {
      console.info('[useFestivos] Festivos actualizados, recargando...');
      cargarFestivos();
    };

    // Escuchar evento personalizado
    window.addEventListener('festivos:updated', handleFestivosUpdated);

    // Escuchar storage events (para sincronizar entre pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'festivos:lastUpdate') {
        handleFestivosUpdated();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('festivos:updated', handleFestivosUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [cargarFestivos, enabled]);

  const refetch = useCallback(async () => {
    await cargarFestivos();
  }, [cargarFestivos]);

  return {
    festivos,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Emite un evento global para notificar que los festivos fueron actualizados.
 * Otros componentes que usen useFestivos() se revalidarán automáticamente.
 */
export function notifyFestivosUpdated(): void {
  // Emitir evento personalizado
  const event = new CustomEvent('festivos:updated');
  window.dispatchEvent(event);

  // Actualizar localStorage para sincronizar entre pestañas
  localStorage.setItem('festivos:lastUpdate', Date.now().toString());
}
