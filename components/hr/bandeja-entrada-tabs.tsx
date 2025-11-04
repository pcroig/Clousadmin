// ========================================
// Bandeja de Entrada - Tabs Component
// ========================================

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BandejaEntradaSolicitudes } from './bandeja-entrada-solicitudes';
import { BandejaEntradaSolved } from './bandeja-entrada-solved';
import { BandejaEntradaNotificaciones } from './bandeja-entrada-notificaciones';

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

export function BandejaEntradaTabs({
  solicitudesPendientes,
  solicitudesResueltas,
  solvedStats,
  solvedItems,
  notificaciones,
}: BandejaEntradaTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('solicitudes');

  const handleAprobar = async (id: string) => {
    // Determinar el tipo de solicitud (ausencia o cambio_datos)
    const solicitudPendiente = solicitudesPendientes.find((s) => s.id === id);
    if (!solicitudPendiente) {
      console.error('[BandejaEntradaTabs] Solicitud no encontrada:', { solicitudId: id });
      return;
    }

    const endpoint =
      solicitudPendiente.tipo === 'ausencia'
        ? `/api/ausencias/${id}`
        : `/api/solicitudes/${id}`;

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
        // Recargar la página para actualizar los datos
        window.location.reload();
      } else {
        const error = await response.json();
        console.error('[BandejaEntradaTabs] Error al aprobar solicitud:', {
          solicitudId: id,
          tipo: solicitudPendiente.tipo,
          endpoint,
          error,
        });
        alert('Error al aprobar la solicitud');
      }
    } catch (error) {
      console.error('[BandejaEntradaTabs] Error al aprobar solicitud:', {
        solicitudId: id,
        tipo: solicitudPendiente.tipo,
        endpoint,
        error,
      });
      alert('Error al aprobar la solicitud');
    }
  };

  const handleRechazar = async (id: string) => {
    // Determinar el tipo de solicitud (ausencia o cambio_datos)
    const solicitudPendiente = solicitudesPendientes.find((s) => s.id === id);
    if (!solicitudPendiente) {
      console.error('[BandejaEntradaTabs] Solicitud no encontrada:', { solicitudId: id });
      return;
    }

    const motivo = prompt('Motivo del rechazo (opcional):');

    const endpoint =
      solicitudPendiente.tipo === 'ausencia'
        ? `/api/ausencias/${id}`
        : `/api/solicitudes/${id}`;

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
        // Recargar la página para actualizar los datos
        window.location.reload();
      } else {
        const error = await response.json();
        console.error('[BandejaEntradaTabs] Error al rechazar solicitud:', {
          solicitudId: id,
          tipo: solicitudPendiente.tipo,
          endpoint,
          motivo,
          error,
        });
        alert('Error al rechazar la solicitud');
      }
    } catch (error) {
      console.error('[BandejaEntradaTabs] Error al rechazar solicitud:', {
        solicitudId: id,
        tipo: solicitudPendiente.tipo,
        endpoint,
        motivo,
        error,
      });
      alert('Error al rechazar la solicitud');
    }
  };

  const handleMarcarLeida = async (id: string) => {
    try {
      const response = await fetch(`/api/notificaciones/${id}/marcar-leida`, {
        method: 'PATCH',
      });

      if (response.ok) {
        // Recargar la página para actualizar las notificaciones
        window.location.reload();
      } else {
        console.error('[BandejaEntradaTabs] Error al marcar notificación como leída:', {
          notificacionId: id,
          status: response.status,
        });
      }
    } catch (error) {
      console.error('[BandejaEntradaTabs] Error al marcar notificación como leída:', {
        notificacionId: id,
        error,
      });
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      const response = await fetch('/api/notificaciones/marcar-todas-leidas', {
        method: 'POST',
      });

      if (response.ok) {
        // Recargar la página para actualizar las notificaciones
        window.location.reload();
      } else {
        console.error('Error al marcar todas las notificaciones como leídas');
      }
    } catch (error) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
    }
  };

  const handleAutoaprobar = async () => {
    const confirmar = window.confirm(
      `¿Estás seguro de que quieres auto-aprobar ${solicitudesPendientes.length} solicitudes pendientes?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      const response = await fetch('/api/solicitudes/autoaprobar', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        // Recargar la página para actualizar los datos
        window.location.reload();
      } else {
        const error = await response.json();
        console.error('Error al auto-aprobar:', error);
        alert('Error al auto-aprobar las solicitudes');
      }
    } catch (error) {
      console.error('Error al auto-aprobar:', error);
      alert('Error al auto-aprobar las solicitudes');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs and Autoaprobar button */}
      <div className="flex items-center justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`pb-3 px-2 text-sm font-medium transition-colors relative ${
              activeTab === 'solicitudes'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Solicitudes
            {activeTab === 'solicitudes' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('auto-completed')}
            className={`pb-3 px-2 text-sm font-medium transition-colors relative ${
              activeTab === 'auto-completed'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Auto-completed
            {activeTab === 'auto-completed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('notificaciones')}
            className={`pb-3 px-2 text-sm font-medium transition-colors relative ${
              activeTab === 'notificaciones'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Notificaciones
            {activeTab === 'notificaciones' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
            )}
          </button>
        </div>

        {/* Autoaprobar button - only show on Solicitudes tab */}
        {activeTab === 'solicitudes' && solicitudesPendientes.length > 0 && (
          <Button
            variant="outline"
            onClick={handleAutoaprobar}
            className="border-gray-300"
          >
            Autoaprobar
          </Button>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
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
          <BandejaEntradaNotificaciones
            notificaciones={notificaciones}
            onMarcarLeida={handleMarcarLeida}
            onMarcarTodasLeidas={handleMarcarTodasLeidas}
          />
        )}
      </div>
    </div>
  );
}
