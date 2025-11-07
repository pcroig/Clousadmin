// ========================================
// Bandeja de Entrada - Notificaciones Tab
// ========================================

'use client';

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
}

export function BandejaEntradaNotificaciones({
  notificaciones,
  onMarcarLeida,
}: BandejaEntradaNotificacionesProps) {
  
  // Iconos sin fondo - siempre gris oscuro según sistema de diseño
  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-gray-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {notificaciones.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No hay notificaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notificaciones.map((notificacion) => (
            <div
              key={notificacion.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => onMarcarLeida?.(notificacion.id)}
            >
              <div className="flex items-start gap-4">
                {/* Icono sin fondo - solo gris oscuro según sistema de diseño */}
                <div className="flex-shrink-0 pt-0.5">
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
                      <div className="w-2 h-2 bg-[#d97757] rounded-full ml-2 mt-2 flex-shrink-0" />
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
          ))}
        </div>
      )}
    </div>
  );
}
