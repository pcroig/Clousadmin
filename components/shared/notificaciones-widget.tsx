// ========================================
// Notificaciones Widget
// ========================================
// Widget para mostrar notificaciones con categorías e iconos dinámicos

'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { WidgetCard } from './widget-card';
import { EmptyState } from './empty-state';
import { obtenerIconoPorTipo } from '@/lib/notificaciones/helpers';
import { obtenerCategoria, type TipoNotificacion } from '@/lib/notificaciones';
import { cn } from '@/lib/utils';

/**
 * Notificación para mostrar en el widget
 */
export interface Notificacion {
  id: string;
  tipo: TipoNotificacion; // Tipo específico de notificación
  titulo?: string; // Título opcional (si no se proporciona, se usa el mensaje)
  mensaje: string;
  fecha: Date;
  leida?: boolean;
  metadata?: {
    accionUrl?: string;
    accionTexto?: string;
    requiresModal?: boolean;
    requiresSignature?: boolean;
    requiresSelection?: boolean;
    prioridad?: 'baja' | 'normal' | 'alta' | 'critica';
  };
}

interface NotificacionesWidgetProps {
  notificaciones: Notificacion[];
  maxItems?: number;
  altura?: 'normal' | 'doble'; // 'normal' = 280px (1 fila), 'doble' = 580px (2 filas)
  href?: string; // URL de redirección personalizable
}

export const NotificacionesWidget = memo(function NotificacionesWidget({
  notificaciones,
  maxItems = 5,
  altura = 'normal',
  href = '/empleado/bandeja-entrada',
}: NotificacionesWidgetProps) {
  const router = useRouter();
  const notificacionesMostradas = notificaciones.slice(0, maxItems);

  const handleClick = (notif: Notificacion) => {
    // Si tiene URL de acción, navegar allí
    if (notif.metadata?.accionUrl) {
      router.push(notif.metadata.accionUrl);
    } else {
      // Si no, ir a la bandeja de entrada
      router.push(href);
    }
  };

  const renderNotificacion = (notif: Notificacion) => {
    const IconComponent = obtenerIconoPorTipo(notif.tipo);

    // Determinar si tiene acción especial
    const tieneAccionEspecial =
      notif.metadata?.requiresModal ||
      notif.metadata?.requiresSignature ||
      notif.metadata?.requiresSelection;

    const accionUrl = notif.metadata?.accionUrl;
    const accionTexto = notif.metadata?.accionTexto;

    return (
      <div
        key={notif.id}
        onClick={() => handleClick(notif)}
        className="flex items-start gap-3 py-3 border-b border-gray-200 last:border-0 transition-colors px-2 -mx-2 hover:bg-gray-50 cursor-pointer"
      >
        {/* Icono según categoría/tipo */}
        <div className="flex items-center justify-center flex-shrink-0 pt-1">
          <IconComponent className="w-4 h-4 text-tertiary" />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {/* Título (opcional) */}
          {notif.titulo && (
            <p className="text-[13px] text-gray-900 font-semibold line-clamp-1 mb-0.5">
              {notif.titulo}
            </p>
          )}

          {/* Mensaje */}
          <p className="text-[13px] text-gray-700 font-medium line-clamp-2 mb-0.5">
            {notif.mensaje}
          </p>

          {/* Fecha */}
          <p className="text-[11px] text-gray-500">
            {notif.fecha.toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>

          {/* CTA / Acción especial */}
          {accionUrl && accionTexto && (
            <a
              href={accionUrl}
              className={cn(
                'text-[11px] hover:underline mt-1 inline-flex items-center gap-1 font-medium',
                tieneAccionEspecial
                  ? 'text-blue-700 bg-blue-100 px-2 py-0.5 rounded'
                  : 'text-blue-600'
              )}
            >
              {accionTexto}
              {tieneAccionEspecial && ' →'}
            </a>
          )}
        </div>

        {/* Indicador de no leída */}
        {!notif.leida && (
          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: '#d97757' }} />
        )}
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
