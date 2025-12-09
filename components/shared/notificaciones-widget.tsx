// ========================================
// Notificaciones Widget
// ========================================
// Widget para mostrar notificaciones con categorías e iconos dinámicos

'use client';

import { Bell, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useState, type MouseEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { openPreferenciasModalFromUrl } from '@/lib/events/vacaciones';
import { obtenerIconoPorTipo } from '@/lib/notificaciones/helpers';
import { formatRelativeTimeShort } from '@/lib/utils/formatRelativeTime';

import { EmptyState } from './empty-state';
import { WidgetCard } from './widget-card';


import type { NotificacionUI } from '@/types/Notificacion';

interface NotificacionesWidgetProps {
  notificaciones: NotificacionUI[];
  maxItems?: number;
  altura?: 'normal' | 'doble'; // 'normal' = 280px (1 fila), 'doble' = 580px (2 filas)
  href?: string; // URL de redirección personalizable
}

type FiltroNotificaciones = 'todas' | 'no_leidas' | 'leidas';

export const NotificacionesWidget = memo(function NotificacionesWidget({
  notificaciones,
  maxItems = 5,
  altura: _altura = 'normal',
  href = '/empleado/bandeja-entrada',
}: NotificacionesWidgetProps) {
  const router = useRouter();
  const [marcandoLeidas, setMarcandoLeidas] = useState(false);
  const [filtro, setFiltro] = useState<FiltroNotificaciones>('no_leidas');

  // Filtrar notificaciones según el filtro
  const notificacionesFiltradas = notificaciones.filter(n => {
    if (filtro === 'no_leidas') return !n.leida;
    if (filtro === 'leidas') return n.leida;
    return true; // 'todas'
  });

  const notificacionesMostradas = notificacionesFiltradas.slice(0, maxItems);
  const tieneNotificaciones = notificacionesMostradas.length > 0;
  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida);

  const handleMarcarTodasLeidas = useCallback(async () => {
    setMarcandoLeidas(true);
    try {
      const response = await fetch('/api/notificaciones/marcar-todas-leidas', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Todas las notificaciones marcadas como leídas');
        router.refresh();
      } else {
        const errorData = (await response.json().catch(() => ({ error: 'Error desconocido' }))) as { error?: string };
        toast.error(errorData.error || 'No se pudieron marcar las notificaciones');
      }
    } catch (error) {
      console.error('[NotificacionesWidget] Error al marcar como leídas:', error);
      toast.error('Error al marcar las notificaciones como leídas');
    } finally {
      setMarcandoLeidas(false);
    }
  }, [router]);

  /**
   * Corrige URLs antiguas de notificaciones que apuntan a lugares incorrectos
   */
  const corregirUrlNotificacion = useCallback((notif: NotificacionUI): string | undefined => {
    const accionUrl = notif.metadata?.accionUrl;
    if (!accionUrl) return undefined;

    // Corregir notificaciones de firma_completada que apuntan a /hr/documentos
    if (notif.tipo === 'firma_completada') {
      const solicitudId = notif.metadata?.solicitudId as string | undefined;
      if (solicitudId && accionUrl === '/hr/documentos') {
        return `/firma/solicitud/${solicitudId}`;
      }
    }

    // Corregir notificaciones de solicitud_creada que apuntan a /hr/solicitudes
    if (notif.tipo === 'solicitud_creada' && accionUrl === '/hr/solicitudes') {
      return '/hr/bandeja-entrada?tab=solicitudes';
    }

    // Corregir notificaciones de campañas con URLs viejas
    if (notif.tipo === 'campana_vacaciones_creada' || notif.tipo === 'campana_vacaciones_completada') {
      const campanaId = notif.metadata?.campanaId as string | undefined;
      if (campanaId && accionUrl.includes('/vacaciones/campanas/')) {
        return `/hr/horario/ausencias?campana=${campanaId}`;
      }
      if (campanaId && accionUrl.includes('/empleado/vacaciones/campanas/')) {
        return `/empleado/horario/ausencias?campana=${campanaId}`;
      }
    }

    // Corregir notificaciones de onboarding_completado con URL vieja
    if (notif.tipo === 'onboarding_completado') {
      const empleadoId = notif.metadata?.empleadoId as string | undefined;
      if (empleadoId && accionUrl === `/hr/empleados/${empleadoId}`) {
        return `/hr/organizacion/personas/${empleadoId}`;
      }
    }

    return accionUrl;
  }, []);

  const handleClick = useCallback(async (notif: NotificacionUI) => {
    // Marcar como leída si no lo está
    if (!notif.leida) {
      try {
        await fetch(`/api/notificaciones/${notif.id}/marcar-leida`, {
          method: 'PATCH',
        });
        // No esperamos la respuesta para mejorar UX
      } catch (error) {
        console.error('[NotificacionesWidget] Error al marcar como leída:', error);
      }
    }

    // Si tiene URL de acción, navegar allí
    const accionUrl = corregirUrlNotificacion(notif);
    if (accionUrl) {
      if (openPreferenciasModalFromUrl(accionUrl)) {
        router.refresh(); // Refrescar para actualizar el estado
        return;
      }
      router.push(accionUrl);
    } else {
      // Si no, ir a la bandeja de entrada
      router.push(href);
    }
  }, [router, href, corregirUrlNotificacion]);

  const renderNotificacion = (notif: NotificacionUI) => {
    const IconComponent = obtenerIconoPorTipo(notif.tipo);

    // Determinar si tiene acción especial
    const tieneAccionEspecial =
      notif.metadata?.requiresModal ||
      notif.metadata?.requiresSignature ||
      notif.metadata?.requiresSelection;

    const accionUrlOriginal = notif.metadata?.accionUrl;
    const accionUrl = corregirUrlNotificacion(notif);
    const accionTexto = notif.metadata?.accionTexto;

    const renderAccion = () => {
      if (!tieneAccionEspecial || !accionUrlOriginal || !accionTexto) {
        return null;
      }

      const handleAccion = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (accionUrl && openPreferenciasModalFromUrl(accionUrl)) {
          return;
        }
        if (accionUrl) {
          router.push(accionUrl);
        }
      };

      return (
        <Button
          type="button"
          size="sm"
          variant="default"
          className="mt-1 h-7 px-2 text-[11px]"
          onClick={handleAccion}
        >
          {accionTexto}
        </Button>
      );
    };

    return (
      <div
        key={notif.id}
        onClick={() => handleClick(notif)}
        className="flex items-start gap-3 py-3 border-b border-gray-200 last:border-0 transition-colors px-2 -mx-2 hover:bg-gray-50 cursor-pointer"
      >
        <div className="flex items-center justify-center flex-shrink-0 pt-0.5">
          <IconComponent className="w-4 h-4 text-tertiary" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] text-gray-900 line-clamp-2 flex-1">
              {notif.mensaje}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 shrink-0">
              <span>{formatRelativeTimeShort(notif.fecha)}</span>
            </div>
          </div>

          {renderAccion()}
        </div>
      </div>
    );
  };

  return (
    <WidgetCard
      title="Notificaciones"
      href={href}
      useScroll={tieneNotificaciones}
      headerAction={
        <div className="flex items-center gap-2">
          {notificacionesNoLeidas.length > 0 && filtro !== 'leidas' && (
            <button
              onClick={handleMarcarTodasLeidas}
              disabled={marcandoLeidas}
              className="px-2 py-1 text-[11px] sm:text-xs font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
              title="Marcar todas como leídas"
            >
              Marcar leídas
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-8 w-8 rounded-md hover:bg-gray-100 flex items-center justify-center transition-colors"
                aria-label="Filtrar notificaciones"
              >
                <Filter className="h-4 w-4 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFiltro('todas')}>
                Todas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFiltro('no_leidas')}>
                No leídas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFiltro('leidas')}>
                Leídas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        {!tieneNotificaciones ? (
          <div className="flex h-full min-h-full flex-1 items-center justify-center py-6">
            <EmptyState
              layout="widget"
              icon={Bell}
              title="Sin notificaciones"
              description="Aquí verás las últimas novedades en cuanto aparezcan."
            />
          </div>
        ) : (
          <div className="space-y-0">
          {notificacionesMostradas.map(renderNotificacion)}
          </div>
        )}
      </div>
    </WidgetCard>
  );
});
