// ========================================
// Bandeja de Entrada - Solicitudes Tab
// ========================================

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreVertical, Check, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SolicitudEstado =
  | 'pendiente'
  | 'confirmada'
  | 'completada'
  | 'rechazada'
  | 'pendiente_aprobacion'
  | 'en_curso'
  | 'auto_aprobada'
  | 'cancelada';

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
  estado: SolicitudEstado;
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

const DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const capitalize = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase('es-ES') + value.slice(1);
};

const humanize = (value: string) =>
  value
    .split('_')
    .map((segment) => capitalize(segment))
    .join(' ');

const formatDate = (date: Date) => DATE_FORMATTER.format(date);

const getSolicitudTitulo = (solicitud: SolicitudItem) => {
  if (solicitud.tipo === 'ausencia') {
    const detalle = solicitud.metadata?.tipoAusencia
      ? humanize(solicitud.metadata.tipoAusencia)
      : 'Ausencia';
    return `${detalle} · ${solicitud.empleado.nombre} ${solicitud.empleado.apellidos}`;
  }

  const mapaTitulo: Record<SolicitudItem['tipo'], string> = {
    ausencia: 'Ausencia',
    cambio_datos: 'Cambio de datos personales',
  };

  return `${mapaTitulo[solicitud.tipo] || humanize(solicitud.tipo)} · ${solicitud.empleado.nombre} ${solicitud.empleado.apellidos}`;
};

const getSolicitudDescripcion = (solicitud: SolicitudItem) => {
  const partes: string[] = [];

  partes.push(`Solicitada el ${formatDate(solicitud.fechaCreacion)}`);

  if (solicitud.estado === 'pendiente' || solicitud.estado === 'pendiente_aprobacion') {
    partes.push(`Revisar antes del ${formatDate(solicitud.fechaLimite)}`);
  } else if (solicitud.estado === 'en_curso') {
    if (solicitud.metadata?.fechaFin) {
      partes.push(`En curso · Termina el ${formatDate(solicitud.metadata.fechaFin)}`);
    } else {
      partes.push('En curso');
    }
  } else {
    const fechaCierre = solicitud.fechaResolucion || solicitud.fechaCreacion;
    const estadoLabel =
      solicitud.estado === 'rechazada'
        ? 'Rechazada'
        : solicitud.estado === 'completada'
          ? 'Completada'
          : solicitud.estado === 'cancelada'
            ? 'Cancelada'
            : 'Aprobada';
    partes.push(`${estadoLabel} el ${formatDate(fechaCierre)}`);
  }

  if (solicitud.metadata?.fechaInicio && solicitud.metadata?.fechaFin) {
    partes.push(
      `Del ${formatDate(solicitud.metadata.fechaInicio)} al ${formatDate(solicitud.metadata.fechaFin)}`,
    );
  }

  return partes.join(' · ');
};

const getEstadoPillClasses = (estado: SolicitudItem['estado']) => {
  switch (estado) {
    case 'pendiente':
    case 'pendiente_aprobacion':
    case 'en_curso':
      return 'bg-amber-100 text-amber-700';
    case 'confirmada':
    case 'completada':
    case 'auto_aprobada':
      return 'bg-emerald-100 text-emerald-700';
    case 'rechazada':
    case 'cancelada':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const estadoLabels: Record<SolicitudEstado, string> = {
  pendiente: 'Pendiente',
  pendiente_aprobacion: 'Pendiente',
  en_curso: 'En curso',
  confirmada: 'Confirmada',
  completada: 'Completada',
  auto_aprobada: 'Auto-aprobada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
};

const getEstadoLabel = (estado: SolicitudItem['estado']) => estadoLabels[estado];

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
          {solicitudesActuales.map((solicitud) => {
            const titulo = getSolicitudTitulo(solicitud);
            const descripcion = getSolicitudDescripcion(solicitud);

            return (
              <div key={solicitud.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={solicitud.empleado.avatar} />
                    <AvatarFallback className="bg-stone-200 text-stone-700">
                      {getInitials(solicitud.empleado.nombre, solicitud.empleado.apellidos)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-900">{titulo}</p>
                        <p className="text-sm text-gray-600">{descripcion}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${getEstadoPillClasses(solicitud.estado)}`}
                      >
                        {getEstadoLabel(solicitud.estado)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(solicitud.estado === 'pendiente' || solicitud.estado === 'pendiente_aprobacion') && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => onRechazar(solicitud.id)}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
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
                        {(solicitud.estado === 'pendiente' || solicitud.estado === 'pendiente_aprobacion') && (
                          <DropdownMenuItem className="text-red-600">Archivar</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
