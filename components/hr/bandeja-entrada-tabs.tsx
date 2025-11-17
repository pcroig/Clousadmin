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
import { iconButtonClasses } from '@/lib/design-system';

type SolicitudPendiente = Parameters<
  typeof BandejaEntradaSolicitudes
>[0]['solicitudesPendientes'][number];
type SolicitudResuelta = Parameters<
  typeof BandejaEntradaSolicitudes
>[0]['solicitudesResueltas'][number];
type SolvedItem = Parameters<typeof BandejaEntradaSolved>[0]['items'][number];
type NotificacionItem = Parameters<
  typeof BandejaEntradaNotificaciones
>[0]['notificaciones'][number];

interface BandejaEntradaTabsProps {
  solicitudesPendientes: SolicitudPendiente[];
  solicitudesResueltas: SolicitudResuelta[];
  solvedStats: {
    fichajesActualizados: number;
    ausenciasRevisadas: number;
    nominasRevisadas: number;
  };
  solvedItems: SolvedItem[];
  notificaciones: NotificacionItem[];
  header?: {
    title: string;
    description?: string;
  };
}

type TabType = 'solicitudes' | 'auto-completed' | 'notificaciones';

export function BandejaEntradaTabs({
  solicitudesPendientes,
  solicitudesResueltas,
  solvedStats,
  solvedItems,
  notificaciones,
  header,
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

  const notificacionesNoLeidas = useMemo(
    () => notificaciones.filter((n) => !n.leida).length,
    [notificaciones],
  );

  const handleAprobar = async (id: string) => {
    const solicitudPendiente = solicitudesPendientes.find((s) => s.id === id);
    if (!solicitudPendiente) {
      console.error('[BandejaEntradaTabs] Solicitud no encontrada:', { solicitudId: id });
      toast.error('No encontramos la solicitud, recarga la página.');
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
    toast.error('No se pudo aprobar la solicitud');
  };

  const handleRechazar = async (id: string) => {
    const solicitudPendiente = solicitudesPendientes.find((s) => s.id === id);
    if (!solicitudPendiente) {
      console.error('[BandejaEntradaTabs] Solicitud no encontrada:', { solicitudId: id });
      toast.error('No encontramos la solicitud, recarga la página.');
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
    toast.error('No se pudo rechazar la solicitud');
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
        toast.error('No se pudo actualizar la notificación');
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
        console.error('[BandejaEntradaTabs] Error al marcar todas las notificaciones como leídas');
        toast.error('No se pudieron marcar todas como leídas');
      }
    } catch (error) {
      console.error('[BandejaEntradaTabs] Error al marcar todas las notificaciones como leídas:', error);
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
        console.error('[BandejaEntradaTabs] Error al auto-aprobar:', error);
        toast.error(error.error || 'No se pudieron auto-aprobar las solicitudes');
      }
    } catch (error) {
      console.error('[BandejaEntradaTabs] Error al auto-aprobar:', error);
      toast.error('Error de red al auto-aprobar las solicitudes');
    } finally {
      setAutoApproveLoading(false);
    }
  };

  const actionButtons = (
    <>
      {activeTab === 'solicitudes' && solicitudesPendientes.length > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 text-sm"
              disabled={autoApproveLoading}
            >
              Aprobar todas
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aprobar todas las solicitudes pendientes</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Se aprobarán todas las solicitudes pendientes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{ausenciasPendientes.length} ausencias</li>
                    <li>{solicitudesCambioPendientes.length} solicitudes de cambio</li>
                  </ul>
                  <p className="font-medium text-amber-600">
                    Esta acción no se puede deshacer.
                  </p>
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
                  {autoApproveLoading ? 'Aprobando...' : 'Confirmar aprobación'}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {activeTab === 'notificaciones' && notificacionesNoLeidas > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="border-gray-300 text-sm"
          onClick={handleMarcarTodasLeidas}
        >
          Leer todas ({notificacionesNoLeidas})
        </Button>
      )}

      <button
        type="button"
        className={iconButtonClasses.default}
        aria-label="Abrir ajustes de la bandeja"
      >
        <Settings className="h-4 w-4" />
      </button>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {header ? (
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{header.title}</h1>
            {header.description && (
              <p className="mt-1 text-sm text-gray-600">{header.description}</p>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {actionButtons}
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex flex-wrap items-center gap-6">
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`border-b-2 pb-3 px-2 text-sm font-medium transition-colors ${
              activeTab === 'solicitudes'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Solicitudes
          </button>

          <button
            onClick={() => setActiveTab('auto-completed')}
            className={`border-b-2 pb-3 px-2 text-sm font-medium transition-colors ${
              activeTab === 'auto-completed'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Auto-completed
          </button>

          <button
            onClick={() => setActiveTab('notificaciones')}
            className={`border-b-2 pb-3 px-2 text-sm font-medium transition-colors ${
              activeTab === 'notificaciones'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Notificaciones
          </button>
        </nav>
      </div>

      <div className="pt-4">
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
