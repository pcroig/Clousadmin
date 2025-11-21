'use client';

// ========================================
// React Query Hooks - Notificaciones
// ========================================
// Custom hooks para gestionar notificaciones con React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { extractArrayFromResponse } from '@/lib/utils/api-response';

// ========================================
// TYPES
// ========================================

export interface Notificacion {
  id: string;
  empresaId: string;
  usuarioId: string;
  eventoNominaId?: string | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  metadata?: Record<string, unknown>;
  leida: boolean;
  createdAt: string;
}

export interface NotificacionesFiltros {
  leida?: boolean;
  tipo?: string;
  limit?: number;
  page?: number;
}

// ========================================
// QUERY KEYS
// ========================================

export const notificacionesKeys = {
  all: ['notificaciones'] as const,
  lists: () => [...notificacionesKeys.all, 'list'] as const,
  list: (filtros?: NotificacionesFiltros) =>
    [...notificacionesKeys.lists(), filtros] as const,
  count: () => [...notificacionesKeys.all, 'count'] as const,
};

// ========================================
// HOOKS
// ========================================

/**
 * Hook para obtener notificaciones con filtros opcionales
 */
export function useNotificaciones(filtros?: NotificacionesFiltros) {
  return useQuery({
    queryKey: notificacionesKeys.list(filtros),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros?.leida !== undefined) params.set('leida', String(filtros.leida));
      if (filtros?.tipo) params.set('tipo', filtros.tipo);
      if (filtros?.limit) params.set('limit', String(filtros.limit));
      if (filtros?.page) params.set('page', String(filtros.page));

      const res = await fetch(`/api/notificaciones?${params}`);
      if (!res.ok) throw new Error('Error al cargar notificaciones');
      const payload = await res.json();
      return extractArrayFromResponse<Notificacion>(payload, { key: 'notificaciones' });
    },
  });
}

/**
 * Hook para obtener el conteo de notificaciones no leídas
 */
export function useNotificacionesNoLeidas() {
  return useQuery({
    queryKey: notificacionesKeys.count(),
    queryFn: async () => {
      const res = await fetch('/api/notificaciones?count=true');
      if (!res.ok) throw new Error('Error al cargar conteo');
      const data = await res.json();
      if (typeof data.count === 'number') {
        return data.count;
      }
      if (typeof data?.metrics?.noLeidas === 'number') {
        return data.metrics.noLeidas as number;
      }
      if (typeof data?.noLeidas === 'number') {
        return data.noLeidas as number;
      }
      return 0;
    },
    refetchInterval: 30000, // Refetch cada 30 segundos
  });
}

/**
 * Hook para marcar una notificación como leída
 */
export function useMarcarLeida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notificaciones/${id}/marcar-leida`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Error al marcar como leída');
      return res.json();
    },
    onSuccess: () => {
      // Invalidar queries de notificaciones para refrescar
      queryClient.invalidateQueries({ queryKey: notificacionesKeys.all });
    },
  });
}

/**
 * Hook para marcar todas las notificaciones como leídas
 */
export function useMarcarTodasLeidas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notificaciones/marcar-todas-leidas', {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Error al marcar todas como leídas');
      return res.json();
    },
    onSuccess: () => {
      // Invalidar queries de notificaciones para refrescar
      queryClient.invalidateQueries({ queryKey: notificacionesKeys.all });
    },
  });
}

