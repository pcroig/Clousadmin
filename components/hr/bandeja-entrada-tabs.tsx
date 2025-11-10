// ========================================
// Bandeja de Entrada - Tabs Component
// ========================================

'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { BandejaEntradaSolicitudes } from './bandeja-entrada-solicitudes';
import { BandejaEntradaSolved } from './bandeja-entrada-solved';
import { BandejaEntradaNotificaciones } from './bandeja-entrada-notificaciones';
import { ejecutarAccionSolicitud } from '@/lib/services/solicitudes-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const router = useRouter();
  const [autoApproveLoading, setAutoApproveLoading] = useState(false);

  const ausenciasPendientes = useMemo(
    () => solicitudesPendientes.filter((s) => s.tipo === 'ausencia'),
    [solicitudesPendientes],
  );
  const solicitudesCambioPendientes = useMemo(
    () => solicitudesPendientes.filter((s) => s.tipo !== 'ausencia'),
    [solicitudesPendientes],
  );

  const handleAprobar = async (id: string) => {
    // Determinar el tipo de solicitud (ausencia o cambio_datos)
    const solicitudPendiente = solicitudesPendientes.find((s) => s.id === id);
    if (!solicitudPendiente) {
      console.error('[BandejaEntradaTabs] Solicitud no encontrada:', { solicitudId: id });
      return;
    }

    const resultado = await ejecutarAccionSolicitud({
      solicitudId: id,
      tipo: solicitudPendiente.tipo,
      accion: 'aprobar',
    });

    if (resultado.ok) {
      toast.success('Solicitud aprobada correctamente');
      router.refresh();
      return;
    }

    console.error('[BandejaEntradaTabs] Error al aprobar solicitud:', {
      solicitudId: id,
      tipo: solicitudPendiente.tipo,
      endpoint: resultado.endpoint,
      error: resultado.error,
      data: resultado.data,
    });
    toast.error('Error al aprobar la solicitud');
  };

  const handleRechazar = async (id: string) => {
    // Determinar el tipo de solicitud (ausencia o cambio_datos)
    const solicitudPendiente = solicitudesPendientes.find((s) => s.id === id);
    if (!solicitudPendiente) {
      console.error('[BandejaEntradaTabs] Solicitud no encontrada:', { solicitudId: id });
      return;
    }

    const motivo = prompt('Motivo del rechazo (opcional):');

    const resultado = await ejecutarAccionSolicitud({
      solicitudId: id,
      tipo: solicitudPendiente.tipo,
      accion: 'rechazar',
      motivoRechazo: motivo || undefined,
    });

    if (resultado.ok) {
      toast.success('Solicitud rechazada correctamente');
      router.refresh();
      return;
    }

    console.error('[BandejaEntradaTabs] Error al rechazar solicitud:', {
      solicitudId: id,
      tipo: solicitudPendiente.tipo,
      endpoint: resultado.endpoint,
      motivo,
      error: resultado.error,
      data: resultado.data,
    });
    toast.error('Error al rechazar la solicitud');
  };

  const handleMarcarLeida = async (id: string) => {
    try {
      const response = await fetch(`/api/notificaciones/${id}/marcar-leida`, {
        method: 'PATCH',
      });

      if (response.ok) {
        toast.success('Notificación marcada como leída');
        router.refresh();
      } else {
        console.error('[BandejaEntradaTabs] Error al marcar notificación como leída:', {
          notificacionId: id,
          status: response.status,
        });
        toast.error('No se pudo marcar la notificación como leída');
      }
    } catch (error) {
      console.error('[BandejaEntradaTabs] Error al marcar notificación como leída:', {
        notificacionId: id,
        error,
      });
      toast.error('Error de red al actualizar la notificación');
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      const response = await fetch('/api/notificaciones/marcar-todas-leidas', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Todas las notificaciones han sido marcadas como leídas');
        router.refresh();
      } else {
        console.error('Error al marcar todas las notificaciones como leídas');
        toast.error('No se pudieron marcar todas las notificaciones como leídas');
      }
    } catch (error) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
      toast.error('Error de red al actualizar las notificaciones');
    }
  };

  const handleAutoaprobar = async () => {
    if (autoApproveLoading) return;

    setAutoApproveLoading(true);
    try {
      const response = await fetch('/api/solicitudes/autoaprobar', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Solicitudes auto-aprobadas correctamente');
        router.refresh();
      } else {
        const error = await response.json();
        console.error('Error al auto-aprobar:', error);
        toast.error(error.error || 'Error al auto-aprobar las solicitudes');
      }
    } catch (error) {
      console.error('Error al auto-aprobar:', error);
      toast.error('Error de red al auto-aprobar las solicitudes');
    } finally {
      setAutoApproveLoading(false);
    }
  };

  const notificacionesNoLeidas = notificaciones.filter((n) => !n.leida).length;

  return (
    <div className="space-y-6">
      {/* Header with Tabs and Actions */}
      <div className="border-b border-gray-200 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('solicitudes')}
              className={`relative pb-3 px-2 text-sm font-medium transition-colors ${
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
              className={`relative pb-3 px-2 text-sm font-medium transition-colors ${
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
              className={`relative pb-3 px-2 text-sm font-medium transition-colors ${
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

          <div className="flex items-center gap-2">
            {activeTab === 'solicitudes' && solicitudesPendientes.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-gray-300"
                    disabled={autoApproveLoading}
                  >
                    Autoaprobar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Auto-aprobar solicitudes pendientes</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Se aprobarán automáticamente todas las solicitudes pendientes:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>{ausenciasPendientes.length} ausencias</li>
                          <li>{solicitudesCambioPendientes.length} solicitudes de cambio</li>
                        </ul>
                        <p className="font-medium text-amber-600">Esta acción no se puede deshacer.</p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={autoApproveLoading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        onClick={handleAutoaprobar}
                        disabled={autoApproveLoading}
                      >
                        {autoApproveLoading ? 'Auto-aprobando...' : 'Confirmar auto-aprobación'}
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {activeTab === 'notificaciones' && notificacionesNoLeidas > 0 && (
              <Button
                variant="outline"
                onClick={handleMarcarTodasLeidas}
                className="border-gray-300"
              >
                Marcar leídas ({notificacionesNoLeidas})
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir ajustes de la bandeja"
              className="text-gray-500 hover:text-gray-700"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-6">
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
          />
        )}
      </div>
    </div>
  );
}
