// ========================================
// Notificaciones Widget
// ========================================
// Shows list of notifications with status indicators

'use client';

import { memo } from 'react';
import { Bell, AlertCircle, FileSignature, FileText } from 'lucide-react';
import { WidgetCard } from './widget-card';
import { EmptyState } from './empty-state';

export interface Notificacion {
  id: string;
  tipo: 'aprobada' | 'rechazada' | 'pendiente' | 'info';
  mensaje: string;
  fecha: Date;
  icono?: 'entrada' | 'salida' | 'ausencia' | 'solicitud' | 'firma' | 'documento';
  ctaUrl?: string;
  ctaTexto?: string;
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
  const notificacionesMostradas = notificaciones.slice(0, maxItems);

  const renderIcon = (notif: Notificacion) => {
    switch (notif.icono) {
      case 'firma':
        return <FileSignature className="w-5 h-5 text-gray-600" />;
      case 'documento':
        return <FileText className="w-5 h-5 text-gray-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <WidgetCard
      title="Notificaciones"
      href={href}
      titleIcon={<Bell className="w-4 h-4" />}
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
          notificacionesMostradas.map((notif) => (
            <div
              key={notif.id}
              className="flex items-start gap-3 py-2.5 border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors px-2 -mx-2"
            >
              <div className="flex items-center justify-center flex-shrink-0 pt-1">
                {renderIcon(notif)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-gray-900 font-medium line-clamp-2 mb-0.5">
                  {notif.mensaje}
                </p>
                <p className="text-[11px] text-gray-500">
                  {notif.fecha.toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
                {notif.ctaUrl && notif.ctaTexto && (
                  <a
                    href={notif.ctaUrl}
                    className="text-[11px] text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    {notif.ctaTexto}
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </WidgetCard>
  );
});
