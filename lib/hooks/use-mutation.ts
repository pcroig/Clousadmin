// ========================================
// Hook: useMutation - Para operaciones POST/PATCH/DELETE
// ========================================
// Hook especializado para mutaciones (crear, actualizar, eliminar)

'use client';

import { useCallback, useState } from 'react';

import { parseJson } from '@/lib/utils/json';

export interface UseMutationOptions<TData, _TVariables> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

export interface UseMutationReturn<TData, TVariables> {
  mutate: (url: string, variables: TVariables, options?: RequestInit) => Promise<TData | null>;
  mutateAsync: (url: string, variables: TVariables, options?: RequestInit) => Promise<TData>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook para manejar mutaciones (POST, PATCH, DELETE)
 * 
 * @example
 * ```tsx
 * const { mutate, loading, error } = useMutation<Ausencia, CreateAusenciaData>();
 * 
 * const handleCreate = async () => {
 *   const result = await mutate('/api/ausencias', {
 *     tipo: 'vacaciones',
 *     fechaInicio: '2025-02-01',
 *   });
 * };
 * ```
 */
export function useMutation<TData = unknown, TVariables = unknown>(
  options?: UseMutationOptions<TData, TVariables>
): UseMutationReturn<TData, TVariables> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (
      url: string,
      variables: TVariables,
      fetchOptions?: RequestInit
    ): Promise<TData | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          method: fetchOptions?.method || 'POST',
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions?.headers,
          },
          body: JSON.stringify(variables),
        });

        if (!response.ok) {
          const errorData = await parseJson<{ error?: string }>(response).catch(() => ({
            error: 'Error desconocido',
          }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await parseJson<TData>(response);
        setLoading(false);

        if (options?.onSuccess) {
          options.onSuccess(data);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Error desconocido');
        setError(error);
        setLoading(false);

        if (options?.onError) {
          options.onError(error);
        } else {
          console.error('[useMutation]', error);
        }

        return null;
      }
    },
    [options]
  );

  const mutateAsync = useCallback(
    async (
      url: string,
      variables: TVariables,
      fetchOptions?: RequestInit
    ): Promise<TData> => {
      const result = await mutate(url, variables, fetchOptions);
      if (!result) {
        throw error || new Error('Error en la mutación');
      }
      return result;
    },
    [mutate, error]
  );

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return {
    mutate,
    mutateAsync,
    loading,
    error,
    reset,
  };
}

















