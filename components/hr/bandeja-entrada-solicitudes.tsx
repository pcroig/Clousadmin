// ========================================
// Bandeja de Entrada - Solicitudes Tab
// ========================================

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MoreVertical, Check, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SolicitudItem {
  id: string;
  empleado: {
    nombre: string;
    apellidos: string;
    avatar?: string;
  };
  tipo: 'ausencia' | 'cambio_datos';
  detalles: string;
  fechaLimite: Date;
  fechaCreacion: Date;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fechaResolucion?: Date;
  metadata?: {
    tipoAusencia?: string;
    fechaInicio?: Date;
    fechaFin?: Date;
  };
}

interface BandejaEntradaSolicitudesProps {
  solicitudesPendientes: SolicitudItem[];
  solicitudesResueltas: SolicitudItem[];
  onAprobar: (id: string) => void;
  onRechazar: (id: string) => void;
}

type VistaType = 'pendientes' | 'resueltas';

export function BandejaEntradaSolicitudes({
  solicitudesPendientes,
  solicitudesResueltas,
  onAprobar,
  onRechazar,
}: BandejaEntradaSolicitudesProps) {
  const [vista, setVista] = useState<VistaType>('pendientes');
  const getInitials = (nombre: string, apellidos: string) => {
    return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
  };

  // Determinar qué solicitudes mostrar
  const solicitudesActuales = vista === 'pendientes' ? solicitudesPendientes : solicitudesResueltas;

  return (
    <div className="space-y-4">
      {/* Toggle entre Pendientes y Resueltas */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setVista('pendientes')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            vista === 'pendientes'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pendientes ({solicitudesPendientes.length})
        </button>
        <button
          onClick={() => setVista('resueltas')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            vista === 'resueltas'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Resueltas ({solicitudesResueltas.length})
        </button>
      </div>

      {/* Lista de solicitudes */}
      {solicitudesActuales.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {vista === 'pendientes' ? 'No hay solicitudes pendientes' : 'No hay solicitudes resueltas'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitudesActuales.map((solicitud) => (
            <div key={solicitud.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Avatar className="h-12 w-12 rounded-lg">
                  <AvatarImage src={solicitud.empleado.avatar} />
                  <AvatarFallback className="bg-stone-200 text-stone-700 rounded-lg">
                    {getInitials(
                      solicitud.empleado.nombre,
                      solicitud.empleado.apellidos
                    )}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        La solicitud de {solicitud.tipo === 'ausencia' ? 'ausencia' : 'cambio'} de{' '}
                        <span className="font-semibold">
                          {solicitud.empleado.nombre} {solicitud.empleado.apellidos}
                        </span>{' '}
                        {solicitud.estado === 'pendiente' && 'está pendiente'}
                        {solicitud.estado === 'aprobada' && 'fue aprobada'}
                        {solicitud.estado === 'rechazada' && 'fue rechazada'}
                      </p>
                      {/* Estado badge */}
                      {solicitud.estado !== 'pendiente' && (
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            solicitud.estado === 'aprobada'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {solicitud.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {solicitud.estado === 'pendiente' ? 'Fecha límite: ' : 'Resuelta: '}
                        {(solicitud.estado === 'pendiente'
                          ? solicitud.fechaLimite
                          : solicitud.fechaResolucion || solicitud.fechaCreacion
                        ).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="text-sm text-gray-600">
                    <p>
                      {solicitud.fechaCreacion.toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      - {solicitud.metadata?.tipoAusencia || solicitud.tipo}
                    </p>
                    {solicitud.metadata?.fechaInicio && solicitud.metadata?.fechaFin && (
                      <p className="text-gray-500">
                        {solicitud.metadata.tipoAusencia} de{' '}
                        {solicitud.metadata.fechaInicio.toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}{' '}
                        a{' '}
                        {solicitud.metadata.fechaFin.toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Solo mostrar botones de acción para solicitudes pendientes */}
                  {solicitud.estado === 'pendiente' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onRechazar(solicitud.id)}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-green-600 hover:bg-green-50 hover:text-green-700"
                        onClick={() => onAprobar(solicitud.id)}
                      >
                        <Check className="h-5 w-5" />
                      </Button>
                    </>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                      <DropdownMenuItem>Ver empleado</DropdownMenuItem>
                      {solicitud.estado === 'pendiente' && (
                        <DropdownMenuItem className="text-red-600">
                          Archivar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
