// ========================================
// Hook: useApi - Manejo centralizado de llamadas API
// ========================================
// Hook reutilizable para fetch con loading, error y data states

'use client';

import { useState, useCallback, useRef } from 'react';

export interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  immediate?: boolean; // Ejecutar inmediatamente al montar
}

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface UseApiReturn<T> extends UseApiState<T> {
  execute: (url: string, options?: RequestInit) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook para manejar llamadas API con estados de loading, error y data
 * 
 * Utiliza refs para almacenar callbacks opcionales, evitando que cambios
 * en el objeto options causen recreación de execute y ciclos infinitos.
 * 
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useApi<Ausencia[]>();
 * 
 * useEffect(() => {
 *   execute('/api/ausencias');
 * }, [execute]);
 * ```
 * 
 * @example Con callbacks
 * ```tsx
 * const { execute } = useApi<SaldoAusencias>({
 *   onSuccess: (data) => setSaldo(data),
 * });
 * ```
 */
export function useApi<T = any>(
  options?: UseApiOptions<T>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  // Almacenar callbacks en refs individuales para evitar dependencias
  // Esto previene ciclos infinitos cuando options se recrea en cada render
  const onSuccessRef = useRef(options?.onSuccess);
  const onErrorRef = useRef(options?.onError);
  
  // Actualizar refs directamente sin useEffect para mejor rendimiento
  // Las refs se actualizan sincrónicamente durante el render
  onSuccessRef.current = options?.onSuccess;
  onErrorRef.current = options?.onError;

  const execute = useCallback(
    async (url: string, fetchOptions?: RequestInit): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions?.headers,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        setState({ data, loading: false, error: null });

        // Usar la ref para acceder a la callback más reciente sin dependencias
        if (onSuccessRef.current) {
          onSuccessRef.current(data);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Error desconocido');
        setState({ data: null, loading: false, error });

        // Usar la ref para acceder a la callback más reciente sin dependencias
        if (onErrorRef.current) {
          onErrorRef.current(error);
        } else {
          console.error('[useApi]', error);
        }

        return null;
      }
    },
    [] // Sin dependencias - execute es completamente estable
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}


