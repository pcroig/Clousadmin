// ========================================
// Bandeja de Entrada - Notificaciones Tab
// ========================================

'use client';

import { Bell, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';

interface NotificacionItem {
  id: string;
  tipo: 'success' | 'error' | 'warning' | 'info';
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
}

interface BandejaEntradaNotificacionesProps {
  notificaciones: NotificacionItem[];
  onMarcarLeida?: (id: string) => void;
}

export function BandejaEntradaNotificaciones({
  notificaciones,
  onMarcarLeida,
}: BandejaEntradaNotificacionesProps) {
  const getIcon = (tipo: NotificacionItem['tipo']) => {
    switch (tipo) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-gray-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFecha = (fecha: Date) =>
    formatRelativeTime(fecha, { locale: 'es', minimalUnit: 'minute', style: 'short' });

  return (
    <div className="space-y-4">
      {notificaciones.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No hay notificaciones</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {notificaciones.map((notificacion) => (
            <div
              key={notificacion.id}
              className="p-4 cursor-pointer transition-colors hover:bg-gray-50"
              onClick={() => onMarcarLeida?.(notificacion.id)}
            >
              <div className="flex items-start gap-3">
                <div className="pt-1">{getIcon(notificacion.tipo)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">{notificacion.titulo}</p>
                    {!notificacion.leida && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{notificacion.mensaje}</p>
                  <p className="text-xs text-gray-500">{formatFecha(notificacion.fecha)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
