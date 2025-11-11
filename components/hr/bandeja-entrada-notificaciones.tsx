// ========================================
// Bandeja de Entrada - Notificaciones Tab
// ========================================

'use client';

import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

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
  onMarcarTodasLeidas?: () => void;
}

export function BandejaEntradaNotificaciones({
  notificaciones,
  onMarcarLeida,
  onMarcarTodasLeidas,
}: BandejaEntradaNotificacionesProps) {
  const notificacionesNoLeidas = notificaciones.filter((n) => !n.leida).length;

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
    new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(fecha);

  return (
    <div className="space-y-4">
      {/* Bot\u00f3n "Leer todas" */}
      {notificacionesNoLeidas > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onMarcarTodasLeidas}
            className="text-sm"
          >
            Leer todas ({notificacionesNoLeidas})
          </Button>
        </div>
      )}

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
