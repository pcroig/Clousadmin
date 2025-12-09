// ========================================
// Bandeja de Entrada - Notificaciones Tab
// ========================================

'use client';

import { Bell, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { openPreferenciasModalFromUrl } from '@/lib/events/vacaciones';
import { obtenerIconoPorTipo } from '@/lib/notificaciones/helpers';
import { cn } from '@/lib/utils';
import { formatRelativeTimeShort } from '@/lib/utils/formatRelativeTime';

import type { NotificacionUI } from '@/types/Notificacion';
import type { MouseEvent } from 'react';

interface BandejaEntradaNotificacionesProps {
  notificaciones: NotificacionUI[];
  onMarcarLeida?: (id: string) => void;
}

export function BandejaEntradaNotificaciones({
  notificaciones,
  onMarcarLeida,
}: BandejaEntradaNotificacionesProps) {
  const router = useRouter();
  const [rechazandoEdicion, setRechazandoEdicion] = useState<string | null>(null);

  /**
   * Rechazar edición de fichaje desde la notificación
   */
  const handleRechazarEdicion = async (notifId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!confirm('¿Seguro que quieres rechazar esta edición? Se revertirán todos los cambios.')) {
      return;
    }

    setRechazandoEdicion(notifId);
    try {
      const response = await fetch(`/api/notificaciones/${notifId}/rechazar-edicion`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Edición rechazada correctamente');
        router.refresh();
        // Disparar evento para sincronizar tablas de fichajes
        window.dispatchEvent(new CustomEvent('fichaje-updated'));
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al rechazar la edición');
      }
    } catch (error) {
      console.error('[BandejaEntrada] Error al rechazar edición:', error);
      toast.error('Error al rechazar la edición');
    } finally {
      setRechazandoEdicion(null);
    }
  };

  /**
   * Corrige URLs antiguas de notificaciones que apuntan a lugares incorrectos
   */
  const corregirUrlNotificacion = (notificacion: NotificacionUI): string | undefined => {
    const accionUrl = notificacion.metadata?.accionUrl;
    if (!accionUrl) return undefined;

    // Corregir notificaciones de firma_completada que apuntan a /hr/documentos
    if (notificacion.tipo === 'firma_completada') {
      const metadata = notificacion.metadata as { solicitudId?: string } | undefined;
      const solicitudId = metadata?.solicitudId;
      if (solicitudId && accionUrl === '/hr/documentos') {
        return `/firma/solicitud/${solicitudId}`;
      }
    }

    // Corregir notificaciones de solicitud_creada que apuntan a /hr/solicitudes
    if (notificacion.tipo === 'solicitud_creada' && accionUrl === '/hr/solicitudes') {
      return '/hr/bandeja-entrada?tab=solicitudes';
    }

    // Corregir notificaciones de campañas con URLs viejas
    if (notificacion.tipo === 'campana_vacaciones_creada' || notificacion.tipo === 'campana_vacaciones_completada') {
      const metadata = notificacion.metadata as { campanaId?: string } | undefined;
      const campanaId = metadata?.campanaId;
      if (campanaId && accionUrl.includes('/vacaciones/campanas/')) {
        return `/hr/horario/ausencias?campana=${campanaId}`;
      }
      if (campanaId && accionUrl.includes('/empleado/vacaciones/campanas/')) {
        return `/empleado/horario/ausencias?campana=${campanaId}`;
      }
    }

    // Corregir notificaciones de onboarding_completado con URL vieja
    if (notificacion.tipo === 'onboarding_completado') {
      const metadata = notificacion.metadata as Record<string, unknown> | null | undefined;
      const empleadoId = metadata?.empleadoId as string | undefined;
      if (empleadoId && accionUrl === `/hr/empleados/${empleadoId}`) {
        return `/hr/organizacion/personas/${empleadoId}`;
      }
    }

    return accionUrl;
  };

  const handleClick = (notificacion: NotificacionUI) => {
    onMarcarLeida?.(notificacion.id);

    const accionUrl = corregirUrlNotificacion(notificacion);
    if (accionUrl) {
      if (openPreferenciasModalFromUrl(accionUrl)) {
        return;
      }
      router.push(accionUrl);
    }
  };

  const renderAccion = (notificacion: NotificacionUI) => {
    // NUEVA LÓGICA: Detectar notificaciones con botón de rechazo
    const metadata = notificacion.metadata as { accionBoton?: string; accionUrl?: string; accionTexto?: string; requiresModal?: boolean; requiresSignature?: boolean; requiresSelection?: boolean } | undefined;
    const accionBoton = metadata?.accionBoton;

    // Si es una notificación de edición con botón de rechazo
    if (accionBoton === 'rechazar_edicion') {
      const estaCargando = rechazandoEdicion === notificacion.id;

      return (
        <div className="flex gap-2 mt-2">
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={(e) => handleRechazarEdicion(notificacion.id, e)}
            disabled={estaCargando}
            className="gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            {estaCargando ? 'Rechazando...' : 'Rechazar edición'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onMarcarLeida?.(notificacion.id);
              const enlace = metadata?.accionUrl;
              if (enlace) {
                router.push(enlace);
              }
            }}
            disabled={estaCargando}
          >
            Ver cambios
          </Button>
        </div>
      );
    }

    // Lógica original para otros tipos de notificaciones
    const accionUrlOriginal = metadata?.accionUrl;
    const accionUrl = corregirUrlNotificacion(notificacion);
    const accionTexto = metadata?.accionTexto;
    const tieneAccionEspecial =
      metadata?.requiresModal ||
      metadata?.requiresSignature ||
      metadata?.requiresSelection;

    if (
      !accionUrlOriginal ||
      !accionTexto ||
      !tieneAccionEspecial
    ) {
      return null;
    }

    const handleAccion = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onMarcarLeida?.(notificacion.id);
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
        onClick={handleAccion}
        className="mt-2"
      >
        {accionTexto}
      </Button>
    );
  };

  return (
    <div>
      {notificaciones.length === 0 ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <EmptyState
            layout="inline"
            icon={Bell}
            title="Sin notificaciones"
            description="Te avisaremos aquí cuando haya novedades."
          />
        </div>
      ) : (
        <div className="divide-y divide-gray-200 border border-gray-200 rounded-2xl overflow-hidden">
          {notificaciones.map((notificacion) => {
            const Icon = obtenerIconoPorTipo(notificacion.tipo);

            return (
              <div
                key={notificacion.id}
                className={cn(
                  'py-4 px-2 sm:px-3 cursor-pointer transition-colors hover:bg-gray-50',
                  !notificacion.leida && 'bg-amber-50/25'
                )}
                onClick={() => handleClick(notificacion)}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    <Icon className="h-4 w-4 text-tertiary" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-900 leading-relaxed flex-1">
                        {notificacion.mensaje}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                        <span>{formatRelativeTimeShort(notificacion.fecha)}</span>
                        {!notificacion.leida && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                      </div>
                    </div>

                    {renderAccion(notificacion)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
