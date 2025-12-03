// ========================================
// Solicitudes Widget - Requests Widget
// ========================================
// Shows pending requests with approval buttons (for HR/Managers)

'use client';

import { CheckCircle, ClipboardList, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmpleadoHoverCard } from '@/components/empleado/empleado-hover-card';
import { EmployeeAvatar } from '@/components/shared/employee-avatar';
import {
  ejecutarAccionSolicitud,
  type SolicitudAccion,
  type SolicitudTipo,
} from '@/lib/services/solicitudes-actions';

import { EmptyState } from './empty-state';
import { WidgetCard } from './widget-card';

export interface Solicitud {
  id: string;
  tipo: SolicitudTipo;
  empleado: {
    nombre: string;
    apellidos?: string | null;
    fotoUrl?: string | null;
    avatar?: string | null;
    email?: string | null;
    puesto?: string | null;
    equipo?: string | null;
    equipoNombre?: string | null;
  };
  descripcion: string;
  fecha: Date;
  prioridad?: 'alta' | 'media' | 'baja';
  estadoLabel?: string;
}

interface SolicitudesWidgetProps {
  solicitudes: Solicitud[];
  maxItems?: number;
  dashboardHref?: string;
}

export const SolicitudesWidget = memo(function SolicitudesWidget({
  solicitudes,
  maxItems = 8,
  dashboardHref = '/hr/bandeja-entrada?tab=solicitudes',
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

  const handleAprobarTodas = useCallback(async () => {
    if (solicitudes.length === 0) return;

    const confirmacion = window.confirm(
      `¿Estás seguro de que quieres aprobar todas las ${solicitudes.length} solicitudes pendientes?`
    );

    if (!confirmacion) return;

    setAccionEnCurso({ id: 'todas', accion: 'aprobar' });
    let aprobadas = 0;
    let errores = 0;

    for (const solicitud of solicitudes) {
      try {
        const resultado = await ejecutarAccionSolicitud({
          solicitudId: solicitud.id,
          tipo: solicitud.tipo,
          accion: 'aprobar',
        });

        if (resultado.ok) {
          aprobadas++;
        } else {
          errores++;
        }
      } catch (error) {
        console.error('[SolicitudesWidget] Error al aprobar solicitud:', error);
        errores++;
      }
    }

    setAccionEnCurso(null);

    if (aprobadas > 0) {
      toast.success(`${aprobadas} solicitudes aprobadas correctamente`);
    }
    if (errores > 0) {
      toast.error(`${errores} solicitudes no pudieron ser aprobadas`);
    }

    router.refresh();
  }, [solicitudes, router]);

  return (
    <WidgetCard
      title="Solicitudes"
      href={dashboardHref}
      badge={solicitudes.length > 0 ? solicitudes.length : undefined}
      useScroll
      headerAction={
        solicitudes.length > 0 ? (
          <button
            onClick={handleAprobarTodas}
            disabled={accionEnCurso !== null}
            className="px-2 py-1 text-[11px] sm:text-xs font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
            title="Aprobar todas"
          >
            Aprobar todas
          </button>
        ) : undefined
      }
    >
      <div className="flex h-full flex-col">
        {solicitudesMostradas.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              layout="widget"
              icon={ClipboardList}
              title="Sin solicitudes pendientes"
              description="Todo al día por ahora."
            />
          </div>
        ) : (
          <>
            <div className="space-y-0">
              {solicitudesMostradas.map((solicitud) => {
                const estaProcesando = accionEnCurso?.id === solicitud.id;
                const hoverCardProps = {
                  empleado: {
                    nombre: solicitud.empleado.nombre,
                    apellidos: solicitud.empleado.apellidos,
                    puesto: solicitud.empleado.puesto,
                    email: solicitud.empleado.email,
                    equipo: solicitud.empleado.equipo,
                    equipoNombre: solicitud.empleado.equipoNombre,
                    fotoUrl: solicitud.empleado.fotoUrl ?? solicitud.empleado.avatar,
                  },
                  estado: solicitud.estadoLabel
                    ? {
                        label: solicitud.estadoLabel,
                        description: solicitud.descripcion,
                      }
                    : undefined,
                } as const;

                return (
                  <div
                    key={solicitud.id}
                    onClick={() => router.push(dashboardHref)}
                    className="py-3 border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors px-2 -mx-2 cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <EmpleadoHoverCard {...hoverCardProps} triggerClassName="flex-shrink-0">
                        <EmployeeAvatar
                          nombre={solicitud.empleado.nombre}
                          apellidos={solicitud.empleado.apellidos}
                          fotoUrl={solicitud.empleado.fotoUrl}
                          size="sm"
                        />
                      </EmpleadoHoverCard>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-[13px] text-gray-900 leading-tight">
                            <EmpleadoHoverCard
                              {...hoverCardProps}
                              triggerClassName="font-semibold text-gray-900"
                            >
                              <span className="font-semibold">{solicitud.empleado.nombre} {solicitud.empleado.apellidos || ''}</span>
                            </EmpleadoHoverCard>
                            {' solicita '}
                            <span className="font-normal text-gray-600">
                              {solicitud.descripcion.toLowerCase()}
                            </span>
                          </p>
                          <div className="flex flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
              })}
            </div>
            {solicitudes.length > maxItems && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <Link href={dashboardHref} className="block text-center">
                  <span className="text-[13px] text-primary hover:text-primary/80 font-medium">
                    Ver todas ({solicitudes.length})
                  </span>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </WidgetCard>
  );
});
