// ========================================
// Bandeja de Entrada - Tabs Component (Optimized with React Query)
// ========================================

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { BandejaEntradaSolicitudes } from './bandeja-entrada-solicitudes';
import { BandejaEntradaSolved } from './bandeja-entrada-solved';
import { BandejaEntradaNotificaciones } from './bandeja-entrada-notificaciones';
import { useAccionSolicitud } from '@/lib/hooks/useSolicitudes';
import { useQueryClient } from '@tanstack/react-query';

// Reutilizar tipos de componentes hijos
type SolicitudItem = Parameters<typeof BandejaEntradaSolicitudes>[0]['solicitudesPendientes'][0];
type SolvedItem = Parameters<typeof BandejaEntradaSolved>[0]['items'][0];
type NotificacionItem = Parameters<typeof BandejaEntradaNotificaciones>[0]['notificaciones'][0];

interface BandejaEntradaTabsProps {
  solicitudesPendientes: SolicitudItem[];
  solicitudesResueltas: SolicitudItem[];
  solvedStats: {
    fichajesActualizados: number;
    ausenciasRevisadas: number;
    nominasRevisadas: number;
  };
  solvedItems: SolvedItem[];
  notificaciones: NotificacionItem[];
}

type TabType = 'solicitudes' | 'auto-completed' | 'notificaciones';

export function BandejaEntradaTabsOptimized({
  solicitudesPendientes,
  solicitudesResueltas,
  solvedStats,
  solvedItems,
  notificaciones,
}: BandejaEntradaTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('solicitudes');
  const queryClient = useQueryClient();

  const handleAprobar = async (id: string) => {
    const solicitudPendiente = solicitudesPendientes.find((s) => s.id === id);
    if (!solicitudPendiente) {
      console.error('[BandejaEntradaTabs] Solicitud no encontrada:', { solicitudId: id });
      toast.error('Solicitud no encontrada');
      return;
    }

    // Determinar endpoint según tipo
    const esAusencia = solicitudPendiente.tipo === 'ausencia';
    const endpoint = esAusencia ? `/api/ausencias/${id}` : `/api/solicitudes/${id}`;

    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accion: 'aprobar',
        }),
      });

      if (response.ok) {
        // ✅ Invalidar queries en lugar de reload
        queryClient.invalidateQueries({ queryKey: ['solicitudes'] });
        queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
        queryClient.invalidateQueries({ queryKey: ['ausencias'] });
        
        toast.success(`${esAusencia ? 'Ausencia' : 'Solicitud'} aprobada correctamente`);
      } else {
        const error = await response.json();
        console.error('[BandejaEntradaTabs] Error al aprobar:', error);
        toast.error(error.error || 'Error al aprobar');
      }
    } catch (error) {
      console.error('[BandejaEntradaTabs] Error al aprobar:', error);
      toast.error('Error de red al aprobar');
    }
  };

  const handleRechazar = async (id: string) => {
    const solicitudPendiente = solicitudesPendientes.find((s) => s.id === id);
    if (!solicitudPendiente) {
      console.error('[BandejaEntradaTabs] Solicitud no encontrada:', { solicitudId: id });
      toast.error('Solicitud no encontrada');
      return;
    }

    const motivo = prompt('Motivo del rechazo (opcional):');
    if (motivo === null) return; // Usuario canceló

    const esAusencia = solicitudPendiente.tipo === 'ausencia';
    const endpoint = esAusencia ? `/api/ausencias/${id}` : `/api/solicitudes/${id}`;

    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accion: 'rechazar',
          motivoRechazo: motivo || undefined,
        }),
      });

      if (response.ok) {
        // ✅ Invalidar queries en lugar de reload
        queryClient.invalidateQueries({ queryKey: ['solicitudes'] });
        queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
        queryClient.invalidateQueries({ queryKey: ['ausencias'] });
        
        toast.success(`${esAusencia ? 'Ausencia' : 'Solicitud'} rechazada correctamente`);
      } else {
        const error = await response.json();
        console.error('[BandejaEntradaTabs] Error al rechazar:', error);
        toast.error(error.error || 'Error al rechazar');
      }
    } catch (error) {
      console.error('[BandejaEntradaTabs] Error al rechazar:', error);
      toast.error('Error de red al rechazar');
    }
  };

  const handleAutoAprobar = async () => {
    const confirmacion = confirm(
      `¿Estás seguro de que quieres auto-aprobar todas las solicitudes pendientes?\n\nSe aprobarán:\n- ${solicitudesPendientes.filter((s) => s.tipo === 'ausencia').length} ausencias\n- ${solicitudesPendientes.filter((s) => s.tipo !== 'ausencia').length} solicitudes de cambio`
    );

    if (!confirmacion) return;

    try {
      // Aprobar ausencias
      const ausenciasPendientes = solicitudesPendientes.filter((s) => s.tipo === 'ausencia');
      for (const ausencia of ausenciasPendientes) {
        await fetch(`/api/ausencias/${ausencia.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'aprobar' }),
        });
      }

      // Aprobar solicitudes de cambio
      const response = await fetch('/api/solicitudes/autoaprobar', {
        method: 'POST',
      });

      if (response.ok) {
        // ✅ Invalidar queries en lugar de reload
        queryClient.invalidateQueries({ queryKey: ['solicitudes'] });
        queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
        queryClient.invalidateQueries({ queryKey: ['ausencias'] });
        
        const data = await response.json();
        toast.success(
          `Auto-aprobación completada: ${data.ausenciasAprobadas || 0} ausencias y ${data.solicitudesAprobadas || 0} solicitudes`
        );
      } else {
        const error = await response.json();
        console.error('[BandejaEntradaTabs] Error en auto-aprobación:', error);
        toast.error(error.error || 'Error en auto-aprobación');
      }
    } catch (error) {
      console.error('[BandejaEntradaTabs] Error en auto-aprobación:', error);
      toast.error('Error de red en auto-aprobación');
    }
  };

  const totalPendientes = solicitudesPendientes.length;
  const totalNotificaciones = notificaciones.length;
  const notificacionesNoLeidas = notificaciones.filter((n) => !n.leida).length;

  return (
    <div className="space-y-6">
      {/* Header con tabs */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2 border-b">
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'solicitudes'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Solicitudes
            {totalPendientes > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                {totalPendientes}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('auto-completed')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'auto-completed'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Auto-completados
          </button>
          <button
            onClick={() => setActiveTab('notificaciones')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'notificaciones'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Notificaciones
            {notificacionesNoLeidas > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">
                {notificacionesNoLeidas}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'solicitudes' && totalPendientes > 0 && (
          <Button onClick={handleAutoAprobar} variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Auto-aprobar todo
          </Button>
        )}
      </div>

      {/* Content por tab */}
      {activeTab === 'solicitudes' && (
        <BandejaEntradaSolicitudes
          solicitudesPendientes={solicitudesPendientes}
          solicitudesResueltas={solicitudesResueltas}
          onAprobar={handleAprobar}
          onRechazar={handleRechazar}
        />
      )}

      {activeTab === 'auto-completed' && (
        <BandejaEntradaSolved stats={solvedStats} items={solvedItems} />
      )}

      {activeTab === 'notificaciones' && (
        <BandejaEntradaNotificaciones notificaciones={notificaciones} />
      )}
    </div>
  );
}

