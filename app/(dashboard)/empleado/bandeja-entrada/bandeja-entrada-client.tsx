// ========================================
// Empleado - Bandeja de Entrada Client Component
// ========================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, Info } from 'lucide-react';

interface Notificacion {
  id: string;
  tipo: 'aprobada' | 'rechazada' | 'pendiente' | 'info';
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
  metadata?: Record<string, unknown>;
}

interface BandejaEntradaEmpleadoClientProps {
  notificaciones: Notificacion[];
}

export function BandejaEntradaEmpleadoClient({
  notificaciones,
}: BandejaEntradaEmpleadoClientProps) {
  const [filtro, setFiltro] = useState<'todas' | 'aprobada' | 'rechazada' | 'pendiente'>('todas');

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
    filtro === 'todas'
      ? notificaciones
      : notificaciones.filter((n) => n.tipo === filtro);

  // Iconos sin fondo - siempre gris oscuro según sistema de diseño
  const getIcono = (tipo: string) => {
    switch (tipo) {
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
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-gray-600 mt-1">
          Mantente al día con el estado de tus solicitudes
        </p>
      </div>

      {/* Filtros y botón Leer todas */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setFiltro('todas')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filtro === 'todas'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas ({contadores.todas})
          </button>
          <button
            onClick={() => setFiltro('aprobada')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filtro === 'aprobada'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Aprobadas ({contadores.aprobada})
          </button>
          <button
            onClick={() => setFiltro('pendiente')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filtro === 'pendiente'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pendientes ({contadores.pendiente})
          </button>
          <button
            onClick={() => setFiltro('rechazada')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filtro === 'rechazada'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Rechazadas ({contadores.rechazada})
          </button>
        </div>

        {/* Botón Leer todas */}
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

      {/* Lista de notificaciones */}
      <div className="flex-1 min-h-0 overflow-hidden">
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
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => handleMarcarLeida(notif.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Icono sin fondo - solo gris oscuro según sistema de diseño */}
                  <div className="flex-shrink-0 pt-0.5">
                    {getIcono(notif.tipo)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {notif.titulo}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notif.mensaje}
                        </p>
                        {renderAccion(notif.metadata)}
                      </div>
                      {!notif.leida && (
                        <div className="w-2 h-2 bg-[#d97757] rounded-full ml-2 mt-2 flex-shrink-0" />
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
  );
}

function renderAccion(metadata?: Record<string, unknown>) {
  if (!metadata || typeof metadata.url !== 'string') {
    return null;
  }

  return (
    <div className="mt-3">
      <Button
        asChild
        variant="outline"
        size="sm"
        onClick={(event) => event.stopPropagation()}
      >
        <Link href={metadata.url}>Ver detalle</Link>
      </Button>
    </div>
  );
}
