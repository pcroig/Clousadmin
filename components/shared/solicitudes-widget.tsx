// ========================================
// Solicitudes Widget - Requests Widget
// ========================================
// Shows pending requests with approval buttons (for HR/Managers)

'use client';

import { memo } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { WidgetCard } from './widget-card';

export interface Solicitud {
  id: string;
  tipo: 'ausencia' | 'cambio_datos' | 'documento';
  empleado: {
    nombre: string;
    avatar?: string;
  };
  descripcion: string;
  fecha: Date;
  prioridad?: 'alta' | 'media' | 'baja';
}

interface SolicitudesWidgetProps {
  solicitudes: Solicitud[];
  maxItems?: number;
}

export const SolicitudesWidget = memo(function SolicitudesWidget({
  solicitudes,
  maxItems = 8,
}: SolicitudesWidgetProps) {
  const handleAprobar = (solicitudId: string) => {
    // TODO: Implementar con Server Action
    // Por ahora es placeholder, se implementará más adelante
  };

  const handleRechazar = (solicitudId: string) => {
    // TODO: Implementar con Server Action
    // Por ahora es placeholder, se implementará más adelante
  };
  const solicitudesMostradas = solicitudes.slice(0, maxItems);

  return (
    <WidgetCard
      title="Solicitudes"
      href="/hr/bandeja-entrada"
      height="h-[580px]"
      badge={solicitudes.length > 0 ? solicitudes.length : undefined}
      contentClassName="pb-4 overflow-y-auto"
    >
      <div className="space-y-0">
        {solicitudesMostradas.length === 0 ? (
          <div className="text-[13px] text-gray-500 text-center py-8">
            No hay solicitudes pendientes
          </div>
        ) : (
          solicitudesMostradas.map((solicitud) => (
            <div
              key={solicitud.id}
              className="py-2.5 border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors px-2 -mx-2"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-[13px] font-semibold text-stone-700 flex-shrink-0">
                  {solicitud.empleado.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[13px] text-gray-900 leading-tight">
                      <span className="font-semibold">{solicitud.empleado.nombre}</span>
                      {' solicita '}
                      <span className="font-normal text-gray-600">{solicitud.descripcion.toLowerCase()}</span>
                    </p>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAprobar(solicitud.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors group"
                        title="Aprobar"
                      >
                        <CheckCircle className="w-4 h-4 text-gray-600 group-hover:text-success transition-colors" />
                      </button>
                      <button
                        onClick={() => handleRechazar(solicitud.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors group"
                        title="Rechazar"
                      >
                        <XCircle className="w-4 h-4 text-gray-600 group-hover:text-error transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {solicitudes.length > maxItems && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <Link href="/hr/bandeja-entrada" className="block text-center">
            <span className="text-[13px] text-blue-600 hover:text-blue-700 font-medium">
              Ver todas ({solicitudes.length})
            </span>
          </Link>
        </div>
      )}
    </WidgetCard>
  );
});
