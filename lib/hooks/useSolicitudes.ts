'use client';

// ========================================
// React Query Hooks - Solicitudes
// ========================================
// Custom hooks para gestionar solicitudes de cambio con React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ========================================
// TYPES
// ========================================

export interface SolicitudCambio {
  id: string;
  empresaId: string;
  empleadoId: string;
  aprobadorId?: string | null;
  tipo: string;
  camposCambiados: any;
  motivo?: string | null;
  estado: string;
  motivoRechazo?: string | null;
  fechaRespuesta?: string | null;
  revisionIA?: any;
  revisadaPorIA: boolean;
  requiereAprobacionManual: boolean;
  createdAt: string;
  updatedAt: string;
  empleado?: {
    nombre: string;
    apellidos: string;
    email?: string;
    fotoUrl?: string | null;
  };
}

export interface SolicitudCreateInput {
  tipo: 'cambio_datos' | 'fichaje_correccion' | 'ausencia_modificacion' | 'documento';
  camposCambiados: Record<string, any>;
  motivo?: string;
}

export interface SolicitudAccionInput {
  accion: 'aprobar' | 'rechazar';
  motivoRechazo?: string;
}

// ========================================
// QUERY KEYS
// ========================================

export const solicitudesKeys = {
  all: ['solicitudes'] as const,
  lists: () => [...solicitudesKeys.all, 'list'] as const,
  list: (estado?: string) => [...solicitudesKeys.lists(), estado] as const,
  detail: (id: string) => [...solicitudesKeys.all, 'detail', id] as const,
};

// ========================================
// HOOKS
// ========================================

/**
 * Hook para obtener solicitudes con filtro opcional de estado
 */
export function useSolicitudes(estado?: string) {
  return useQuery({
    queryKey: solicitudesKeys.list(estado),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (estado) params.set('estado', estado);

      const res = await fetch(`/api/solicitudes?${params}`);
      if (!res.ok) throw new Error('Error al cargar solicitudes');
      return res.json() as Promise<SolicitudCambio[]>;
    },
  });
}

/**
 * Hook para obtener una solicitud específica
 */
export function useSolicitud(id: string) {
  return useQuery({
    queryKey: solicitudesKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/solicitudes/${id}`);
      if (!res.ok) throw new Error('Error al cargar solicitud');
      return res.json() as Promise<SolicitudCambio>;
    },
    enabled: !!id, // Solo ejecutar si hay ID
  });
}

/**
 * Hook para crear una solicitud
 */
export function useCrearSolicitud() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SolicitudCreateInput) => {
      const res = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear solicitud');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidar queries de solicitudes para refrescar
      queryClient.invalidateQueries({ queryKey: solicitudesKeys.all });
    },
  });
}

/**
 * Hook para aprobar o rechazar una solicitud
 */
export function useAccionSolicitud(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SolicitudAccionInput) => {
      const res = await fetch(`/api/solicitudes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al procesar solicitud');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidar queries de solicitudes y notificaciones
      queryClient.invalidateQueries({ queryKey: solicitudesKeys.all });
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });
}

/**
 * Hook para auto-aprobar todas las solicitudes pendientes
 */
export function useAutoAprobarSolicitudes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/solicitudes/autoaprobar', {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al auto-aprobar solicitudes');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidar queries de solicitudes y notificaciones
      queryClient.invalidateQueries({ queryKey: solicitudesKeys.all });
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });
}

