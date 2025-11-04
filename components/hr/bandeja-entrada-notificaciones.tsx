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
  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getColorClasses = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

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
        <div className="bg-white rounded-lg border border-gray-200">
          {notificaciones.map((notificacion, index) => (
            <div key={notificacion.id}>
              <div
                className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${
                  !notificacion.leida ? 'border-l-4 border-l-blue-500' : 'pl-[20px]'
                }`}
                onClick={() => onMarcarLeida?.(notificacion.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${getColorClasses(notificacion.tipo)}`}>
                    {getIcon(notificacion.tipo)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {notificacion.titulo}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notificacion.mensaje}
                        </p>
                      </div>
                      {!notificacion.leida && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-2" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {notificacion.fecha.toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
              {/* Separador entre notificaciones */}
              {index < notificaciones.length - 1 && (
                <div className="border-b border-gray-200" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
