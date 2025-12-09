/**
 * Hook personalizado para gestión reactiva de carpetas
 * Proporciona actualizaciones automáticas sin necesidad de router.refresh()
 */

'use client';

import { useCallback } from 'react';
import useSWR, { type KeyedMutator } from 'swr';
import { toast } from 'sonner';

import { parseJson } from '@/lib/utils/json';

// ========================================
// Types
// ========================================

export interface Carpeta {
  id: string;
  nombre: string;
  esSistema: boolean;
  compartida: boolean;
  asignadoA?: string | null;
  empleadoId?: string | null;
  empleado?: {
    id: string;
    nombre: string;
    apellidos: string;
  } | null;
  numeroDocumentos?: number;
  numeroSubcarpetas?: number;
}

interface CarpetasResponse {
  carpetas: Carpeta[];
}

interface UseCarpetasOptions {
  enabled?: boolean;
}

interface UseCarpetasReturn {
  carpetas: Carpeta[];
  isLoading: boolean;
  error: Error | null;
  mutate: KeyedMutator<CarpetasResponse>;
  createCarpeta: (data: CreateCarpetaData) => Promise<Carpeta>;
  updateCarpeta: (carpetaId: string, data: UpdateCarpetaData) => Promise<void>;
  deleteCarpeta: (carpetaId: string) => Promise<void>;
}

interface CreateCarpetaData {
  nombre: string;
  compartida?: boolean;
  asignadoA?: string;
  documentos?: File[];
}

interface UpdateCarpetaData {
  nombre?: string;
  compartida?: boolean;
  asignadoA?: string;
}

// ========================================
// Fetcher con manejo de errores
// ========================================

async function fetcherCarpetas(url: string): Promise<CarpetasResponse> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await parseJson<{ error?: string }>(response).catch(() => null);
      throw new Error(errorData?.error || 'Error al cargar carpetas');
    }

    return parseJson<CarpetasResponse>(response);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error de red al cargar carpetas');
  }
}

// ========================================
// Hook principal
// ========================================

export function useCarpetas(options: UseCarpetasOptions = {}): UseCarpetasReturn {
  const { enabled = true } = options;

  const url = enabled ? '/api/carpetas' : null;

  const { data, error, mutate, isLoading } = useSWR<CarpetasResponse>(
    url,
    fetcherCarpetas,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  // ========================================
  // Mutaciones con optimistic updates
  // ========================================

  const createCarpeta = useCallback(async (createData: CreateCarpetaData): Promise<Carpeta> => {
    try {
      const formData = new FormData();
      formData.append('nombre', createData.nombre);

      if (createData.compartida !== undefined) {
        formData.append('compartida', String(createData.compartida));
      }

      if (createData.asignadoA) {
        formData.append('asignadoA', createData.asignadoA);
      }

      if (createData.documentos && createData.documentos.length > 0) {
        createData.documentos.forEach((file) => {
          formData.append('documentos', file);
        });
      }

      const response = await fetch('/api/carpetas', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await parseJson<{ error?: string }>(response);
        throw new Error(errorData.error || 'Error al crear carpeta');
      }

      const result = await parseJson<{ success: boolean; carpeta: Carpeta }>(response);

      if (!result.success || !result.carpeta) {
        throw new Error('Respuesta inválida del servidor');
      }

      // Optimistic update - agregar nueva carpeta a la lista
      if (data) {
        await mutate(
          {
            carpetas: [result.carpeta, ...data.carpetas],
          },
          false
        );
      }

      // Revalidar datos del servidor
      await mutate();
      toast.success('Carpeta creada correctamente');

      return result.carpeta;
    } catch (error) {
      await mutate();
      const message = error instanceof Error ? error.message : 'Error al crear carpeta';
      toast.error(message);
      throw error;
    }
  }, [data, mutate]);

  const updateCarpeta = useCallback(async (
    carpetaId: string,
    updateData: UpdateCarpetaData
  ): Promise<void> => {
    if (!data) return;

    // Optimistic update
    const carpetasActualizadas = data.carpetas.map((carpeta) =>
      carpeta.id === carpetaId ? { ...carpeta, ...updateData } : carpeta
    );
    await mutate(
      { carpetas: carpetasActualizadas },
      false
    );

    try {
      const response = await fetch(`/api/carpetas/${carpetaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await parseJson<{ error?: string }>(response);
        throw new Error(errorData.error || 'Error al actualizar carpeta');
      }

      await mutate();
      toast.success('Carpeta actualizada correctamente');
    } catch (error) {
      await mutate();
      const message = error instanceof Error ? error.message : 'Error al actualizar carpeta';
      toast.error(message);
      throw error;
    }
  }, [data, mutate]);

  const deleteCarpeta = useCallback(async (carpetaId: string): Promise<void> => {
    if (!data) return;

    // Optimistic update
    const carpetasActualizadas = data.carpetas.filter((carpeta) => carpeta.id !== carpetaId);
    await mutate(
      { carpetas: carpetasActualizadas },
      false
    );

    try {
      const response = await fetch(`/api/carpetas/${carpetaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await parseJson<{ error?: string }>(response);
        throw new Error(errorData.error || 'Error al eliminar carpeta');
      }

      await mutate();
      toast.success('Carpeta eliminada correctamente');
    } catch (error) {
      await mutate();
      const message = error instanceof Error ? error.message : 'Error al eliminar carpeta';
      toast.error(message);
      throw error;
    }
  }, [data, mutate]);

  return {
    carpetas: data?.carpetas || [],
    isLoading,
    error: error || null,
    mutate,
    createCarpeta,
    updateCarpeta,
    deleteCarpeta,
  };
}
