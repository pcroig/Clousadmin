/**
 * Hook personalizado para gestión reactiva de documentos
 * Proporciona actualizaciones automáticas sin necesidad de router.refresh()
 */

'use client';

import { useCallback, useMemo } from 'react';
import useSWR, { type KeyedMutator } from 'swr';
import { toast } from 'sonner';

import { parseJson } from '@/lib/utils/json';

// ========================================
// Types
// ========================================

export interface Documento {
  id: string;
  nombre: string;
  tipoDocumento: string;
  mimeType: string;
  tamano: number;
  createdAt: string;
  firmado: boolean;
  firmadoEn: string | null;
  empleado?: {
    id: string;
    nombre: string;
    apellidos: string;
  } | null;
}

interface DocumentosResponse {
  data: Documento[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface UseDocumentosOptions {
  carpetaId?: string;
  empleadoId?: string;
  tipoDocumento?: string;
  enabled?: boolean;
}

interface UseDocumentosReturn {
  documentos: Documento[];
  isLoading: boolean;
  error: Error | null;
  mutate: KeyedMutator<DocumentosResponse>;
  deleteDocumento: (documentoId: string) => Promise<void>;
  updateDocumento: (documentoId: string, data: Partial<Pick<Documento, 'nombre'>>) => Promise<void>;
  moveDocumento: (documentoId: string, nuevaCarpetaId: string) => Promise<void>;
}

// ========================================
// Fetcher con manejo de errores
// ========================================

async function fetcherDocumentos(url: string): Promise<DocumentosResponse> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await parseJson<{ error?: string }>(response).catch(() => null);
      throw new Error(errorData?.error || 'Error al cargar documentos');
    }

    return parseJson<DocumentosResponse>(response);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error de red al cargar documentos');
  }
}

// ========================================
// Hook principal
// ========================================

export function useDocumentos(options: UseDocumentosOptions = {}): UseDocumentosReturn {
  const { carpetaId, empleadoId, tipoDocumento, enabled = true } = options;

  // Memoizar URL para evitar reconstrucciones innecesarias
  const url = useMemo(() => {
    if (!enabled) return null;

    const params = new URLSearchParams();
    if (carpetaId) params.set('carpetaId', carpetaId);
    if (empleadoId) params.set('empleadoId', empleadoId);
    if (tipoDocumento) params.set('tipoDocumento', tipoDocumento);

    const queryString = params.toString();
    return `/api/documentos${queryString ? `?${queryString}` : ''}`;
  }, [enabled, carpetaId, empleadoId, tipoDocumento]);

  const { data, error, mutate, isLoading } = useSWR<DocumentosResponse>(
    url,
    fetcherDocumentos,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  // ========================================
  // Mutaciones con optimistic updates
  // ========================================

  const deleteDocumento = useCallback(
    async (documentoId: string): Promise<void> => {
      if (!data) return;

      // Optimistic update
      const documentosActualizados = data.data.filter((doc) => doc.id !== documentoId);
      await mutate(
        { ...data, data: documentosActualizados },
        false // No revalidar todavía
      );

      try {
        const response = await fetch(`/api/documentos/${documentoId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await parseJson<{ error?: string }>(response);
          throw new Error(errorData.error || 'Error al eliminar documento');
        }

        // Revalidar datos del servidor
        await mutate();
        toast.success('Documento eliminado correctamente');
      } catch (error) {
        // Revertir cambios optimistas en caso de error
        await mutate();
        const message = error instanceof Error ? error.message : 'Error al eliminar documento';
        toast.error(message);
        throw error;
      }
    },
    [data, mutate]
  );

  const updateDocumento = useCallback(
    async (
      documentoId: string,
      updateData: Partial<Pick<Documento, 'nombre'>>
    ): Promise<void> => {
      if (!data) return;

      // Optimistic update
      const documentosActualizados = data.data.map((doc) =>
        doc.id === documentoId ? { ...doc, ...updateData } : doc
      );
      await mutate(
        { ...data, data: documentosActualizados },
        false
      );

      try {
        const response = await fetch(`/api/documentos/${documentoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorData = await parseJson<{ error?: string }>(response);
          throw new Error(errorData.error || 'Error al actualizar documento');
        }

        await mutate();
        toast.success('Documento actualizado correctamente');
      } catch (error) {
        await mutate();
        const message = error instanceof Error ? error.message : 'Error al actualizar documento';
        toast.error(message);
        throw error;
      }
    },
    [data, mutate]
  );

  const moveDocumento = useCallback(
    async (documentoId: string, nuevaCarpetaId: string): Promise<void> => {
      if (!data) return;

      // Optimistic update - remover de la lista actual
      const documentosActualizados = data.data.filter((doc) => doc.id !== documentoId);
      await mutate(
        { ...data, data: documentosActualizados },
        false
      );

      try {
        const response = await fetch(`/api/documentos/${documentoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ carpetaId: nuevaCarpetaId }),
        });

        if (!response.ok) {
          const errorData = await parseJson<{ error?: string }>(response);
          throw new Error(errorData.error || 'Error al mover documento');
        }

        await mutate();
        toast.success('Documento movido correctamente');
      } catch (error) {
        await mutate();
        const message = error instanceof Error ? error.message : 'Error al mover documento';
        toast.error(message);
        throw error;
      }
    },
    [data, mutate]
  );

  return {
    documentos: data?.data || [],
    isLoading,
    error: error || null,
    mutate,
    deleteDocumento,
    updateDocumento,
    moveDocumento,
  };
}
