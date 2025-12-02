// ========================================
// Empleado - Bandeja de Entrada Client Component
// ========================================

'use client';

import { CheckCircle2, Clock, FileSignature, Info, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { PageMobileHeader } from '@/components/layout/page-mobile-header';
import { Button } from '@/components/ui/button';

interface Solicitud {
  id: string;
  tipo: 'ausencia' | 'cambio_datos';
  titulo: string;
  detalles: string;
  estado: string;
  fechaCreacion: Date;
  fechaResolucion: Date | null;
}

interface Notificacion {
  id: string;
  tipo: 'aprobada' | 'rechazada' | 'pendiente' | 'info';
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
  metadata?: Record<string, unknown>;
  icono?: 'firma' | 'documento' | 'alerta';
}

interface BandejaEntradaEmpleadoClientProps {
  solicitudes: Solicitud[];
  notificaciones: Notificacion[];
}

export function BandejaEntradaEmpleadoClient({
  notificaciones,
}: BandejaEntradaEmpleadoClientProps) {
  const [filtroNotif, setFiltroNotif] = useState<'todas' | 'aprobada' | 'rechazada' | 'pendiente'>(
    'todas',
  );

  const notificacionesNoLeidas = notificaciones.filter((n) => !n.leida).length;

  const handleMarcarLeida = async (id: string) => {
    try {
      const response = await fetch(`/api/notificaciones/${id}/marcar-leida`, {
        method: 'PATCH',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        console.error('Error al marcar notificación como leída');
      }
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      const response = await fetch('/api/notificaciones/marcar-todas-leidas', {
        method: 'POST',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        console.error('Error al marcar todas las notificaciones como leídas');
      }
    } catch (error) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
    }
  };

  const notificacionesFiltradas =
    filtroNotif === 'todas'
      ? notificaciones
      : notificaciones.filter((n) => n.tipo === filtroNotif);

  // Iconos sin fondo - siempre gris oscuro según sistema de diseño
  const getIcono = (notif: Notificacion) => {
    const metaIcono =
      notif.metadata && typeof notif.metadata.icono === 'string'
        ? (notif.metadata.icono as string)
        : undefined;
    const iconoPreferido = notif.icono || metaIcono;
    if (iconoPreferido === 'firma') {
      return <FileSignature className="w-5 h-5 text-gray-600" />;
    }

    switch (notif.tipo) {
      case 'aprobada':
        return <CheckCircle2 className="w-5 h-5 text-gray-600" />;
      case 'rechazada':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      case 'pendiente':
        return <Clock className="w-5 h-5 text-gray-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const contadores = {
    todas: notificaciones.length,
    aprobada: notificaciones.filter((n) => n.tipo === 'aprobada').length,
    rechazada: notificaciones.filter((n) => n.tipo === 'rechazada').length,
    pendiente: notificaciones.filter((n) => n.tipo === 'pendiente').length,
  };

  return (
    <div className="h-full w-full flex flex-col px-1 py-1 sm:max-w-[1800px] sm:mx-auto sm:px-8 sm:py-6">
      {/* Mobile Header - sin fondo */}
      <PageMobileHeader title="Bandeja de entrada" />

      {/* Desktop Header */}
      <div className="hidden sm:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-gray-600 mt-1">
          Mantente al día con tus notificaciones
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-3">
        {/* Filtros - Desktop only */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFiltroNotif('todas')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filtroNotif === 'todas'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas ({contadores.todas})
            </button>
            <button
              onClick={() => setFiltroNotif('aprobada')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filtroNotif === 'aprobada'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Aprobadas ({contadores.aprobada})
            </button>
            <button
              onClick={() => setFiltroNotif('pendiente')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filtroNotif === 'pendiente'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Pendientes ({contadores.pendiente})
            </button>
            <button
              onClick={() => setFiltroNotif('rechazada')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filtroNotif === 'rechazada'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Rechazadas ({contadores.rechazada})
            </button>
          </div>

          {/* Botón Leer todas - Desktop */}
          {notificacionesNoLeidas > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarcarTodasLeidas}
              className="text-sm"
            >
              Leer todas ({notificacionesNoLeidas})
            </Button>
          )}
        </div>

        {/* Toggle Tabs - Mobile */}
        <div className="sm:hidden space-y-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-full border border-gray-200 p-0.5 text-xs font-medium">
              <button
                onClick={() => setFiltroNotif('todas')}
                className={`rounded-full px-3 py-1 transition ${
                  filtroNotif === 'todas'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFiltroNotif('aprobada')}
                className={`rounded-full px-3 py-1 transition ${
                  filtroNotif === 'aprobada'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Aprobadas
              </button>
              <button
                onClick={() => setFiltroNotif('pendiente')}
                className={`rounded-full px-3 py-1 transition ${
                  filtroNotif === 'pendiente'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setFiltroNotif('rechazada')}
                className={`rounded-full px-3 py-1 transition ${
                  filtroNotif === 'rechazada'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Rechazadas
              </button>
            </div>
            {notificacionesNoLeidas > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarcarTodasLeidas}
                className="text-sm"
              >
                Leer todas
              </Button>
            )}
          </div>
        </div>

        {/* Lista de notificaciones */}
        {notificacionesFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Info className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay notificaciones</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notificacionesFiltradas.map((notif) => (
              <div
                key={notif.id}
                className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => handleMarcarLeida(notif.id)}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Icono */}
                  <div className="flex-shrink-0 pt-0.5">{getIcono(notif)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{notif.titulo}</p>
                        <p className="text-sm text-gray-600 mt-1">{notif.mensaje}</p>
                        {renderAccion(notif.metadata)}
                      </div>
                      {!notif.leida && (
                        <div className="w-2 h-2 bg-[#d97757] rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {notif.fecha.toLocaleDateString('es-ES', {
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
      </div>
    </div>
  );
}

function renderAccion(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return null;
  }

  const accionUrl =
    typeof metadata.accionUrl === 'string'
      ? (metadata.accionUrl as string)
      : typeof metadata.url === 'string'
      ? (metadata.url as string)
      : undefined;

  if (!accionUrl) {
    return null;
  }

  const accionTexto =
    typeof metadata.accionTexto === 'string' ? (metadata.accionTexto as string) : 'Ver detalle';

  return (
    <div className="mt-3">
      <Button
        asChild
        variant="outline"
        size="sm"
        onClick={(event) => event.stopPropagation()}
      >
        <Link href={accionUrl}>{accionTexto}</Link>
      </Button>
    </div>
  );
}

// Placeholder removido - código duplicado que causaba errores de compilación
