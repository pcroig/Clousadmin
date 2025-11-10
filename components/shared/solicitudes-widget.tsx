// ========================================
// Solicitudes Widget - Requests Widget
// ========================================
// Shows pending requests with approval buttons (for HR/Managers)

'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { WidgetCard } from './widget-card';
import {
  ejecutarAccionSolicitud,
  type SolicitudAccion,
  type SolicitudTipo,
} from '@/lib/services/solicitudes-actions';

export interface Solicitud {
  id: string;
  tipo: SolicitudTipo;
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
  dashboardHref?: string;
}

export const SolicitudesWidget = memo(function SolicitudesWidget({
  solicitudes,
  maxItems = 8,
  dashboardHref = '/hr/bandeja-entrada',
}: SolicitudesWidgetProps) {
  const router = useRouter();
  const [accionEnCurso, setAccionEnCurso] = useState<{
    id: string;
    accion: SolicitudAccion;
  } | null>(null);

  const solicitudesMap = useMemo(() => {
    const map = new Map<string, Solicitud>();
    for (const solicitud of solicitudes) {
      map.set(solicitud.id, solicitud);
    }
    return map;
  }, [solicitudes]);

  const solicitudesMostradas = useMemo(
    () => solicitudes.slice(0, maxItems),
    [solicitudes, maxItems]
  );

  const ejecutarAccion = useCallback(
    async (solicitudId: string, accion: SolicitudAccion) => {
      const solicitud = solicitudesMap.get(solicitudId);
      if (!solicitud) {
        toast.error('Solicitud no encontrada');
        return;
      }

      setAccionEnCurso({ id: solicitudId, accion });
      try {
        const resultado = await ejecutarAccionSolicitud({
          solicitudId,
          tipo: solicitud.tipo,
          accion,
        });

        if (resultado.ok) {
          const tipoLabel = solicitud.tipo === 'ausencia' ? 'Ausencia' : 'Solicitud';
          const accionLabel = accion === 'aprobar' ? 'aprobada' : 'rechazada';
          toast.success(`${tipoLabel} ${accionLabel} correctamente`);
          router.refresh();
        } else {
          toast.error(
            resultado.error ||
              `No se pudo ${accion === 'aprobar' ? 'aprobar' : 'rechazar'} la solicitud`
          );
          console.error('[SolicitudesWidget] Error al procesar solicitud:', {
            solicitudId,
            accion,
            endpoint: resultado.endpoint,
            error: resultado.error,
            data: resultado.data,
          });
        }
      } catch (error) {
        console.error('[SolicitudesWidget] Error inesperado al procesar solicitud:', {
          solicitudId,
          accion,
          error,
        });
        toast.error('Error inesperado al procesar la solicitud');
      } finally {
        setAccionEnCurso(null);
      }
    },
    [router, solicitudesMap]
  );

  const handleAprobar = useCallback(
    (solicitudId: string) => ejecutarAccion(solicitudId, 'aprobar'),
    [ejecutarAccion]
  );

  const handleRechazar = useCallback(
    (solicitudId: string) => ejecutarAccion(solicitudId, 'rechazar'),
    [ejecutarAccion]
  );

  return (
    <WidgetCard
      title="Solicitudes"
      href={dashboardHref}
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
          solicitudesMostradas.map((solicitud) => {
            const estaProcesando = accionEnCurso?.id === solicitud.id;

            return (
              <div
                key={solicitud.id}
                className="py-2.5 border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors px-2 -mx-2"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-[13px] font-semibold text-stone-700 flex-shrink-0">
                    {solicitud.empleado.nombre
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[13px] text-gray-900 leading-tight">
                        <span className="font-semibold">{solicitud.empleado.nombre}</span>
                        {' solicita '}
                        <span className="font-normal text-gray-600">
                          {solicitud.descripcion.toLowerCase()}
                        </span>
                      </p>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAprobar(solicitud.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors group disabled:opacity-50 disabled:pointer-events-none"
                          title="Aprobar"
                          aria-disabled={estaProcesando}
                          disabled={estaProcesando}
                        >
                          <CheckCircle className="w-4 h-4 text-gray-600 group-hover:text-success transition-colors" />
                        </button>
                        <button
                          onClick={() => handleRechazar(solicitud.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors group disabled:opacity-50 disabled:pointer-events-none"
                          title="Rechazar"
                          aria-disabled={estaProcesando}
                          disabled={estaProcesando}
                        >
                          <XCircle className="w-4 h-4 text-gray-600 group-hover:text-error transition-colors" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {solicitudes.length > maxItems && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <Link href={dashboardHref} className="block text-center">
            <span className="text-[13px] text-blue-600 hover:text-blue-700 font-medium">
              Ver todas ({solicitudes.length})
            </span>
          </Link>
        </div>
      )}
    </WidgetCard>
  );
});
