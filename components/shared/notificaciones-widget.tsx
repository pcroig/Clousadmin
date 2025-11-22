// ========================================
// Notificaciones Widget
// ========================================
// Widget para mostrar notificaciones con categorías e iconos dinámicos

'use client';

import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, type MouseEvent } from 'react';

import { Button } from '@/components/ui/button';
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

export const NotificacionesWidget = memo(function NotificacionesWidget({
  notificaciones,
  maxItems = 5,
  altura: _altura = 'normal',
  href = '/empleado/bandeja-entrada',
}: NotificacionesWidgetProps) {
  const router = useRouter();
  const notificacionesMostradas = notificaciones.slice(0, maxItems);

  const handleClick = (notif: NotificacionUI) => {
    // Si tiene URL de acción, navegar allí
    if (notif.metadata?.accionUrl) {
      router.push(notif.metadata.accionUrl);
    } else {
      // Si no, ir a la bandeja de entrada
      router.push(href);
    }
  };

  const renderNotificacion = (notif: NotificacionUI) => {
    const IconComponent = obtenerIconoPorTipo(notif.tipo);

    // Determinar si tiene acción especial
    const tieneAccionEspecial =
      notif.metadata?.requiresModal ||
      notif.metadata?.requiresSignature ||
      notif.metadata?.requiresSelection;

    const accionUrl = notif.metadata?.accionUrl;
    const accionTexto = notif.metadata?.accionTexto;

    const renderAccion = () => {
      if (!tieneAccionEspecial || !accionUrl || !accionTexto) {
        return null;
      }

      const handleAccion = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        router.push(accionUrl);
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
            <p className="text-[13px] text-gray-900 font-semibold line-clamp-1">
              {notif.titulo || 'Notificación'}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 shrink-0">
              <span>{formatRelativeTimeShort(notif.fecha)}</span>
              {!notif.leida && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            </div>
          </div>

          <p className="text-[13px] text-gray-700 line-clamp-2">
            {notif.mensaje}
          </p>

          {renderAccion()}
        </div>
      </div>
    );
  };

  return (
    <WidgetCard
      title="Notificaciones"
      href={href}
      contentClassName="overflow-y-auto"
    >
      <div className="space-y-0">
        {notificacionesMostradas.length === 0 ? (
          <EmptyState
            layout="widget"
            icon={Bell}
            title="Sin notificaciones"
            description="Aquí verás las últimas novedades en cuanto aparezcan."
          />
        ) : (
          notificacionesMostradas.map(renderNotificacion)
        )}
      </div>
    </WidgetCard>
  );
});
