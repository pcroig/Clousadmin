// ========================================
// Bandeja de Entrada - Solicitudes Tab
// ========================================

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreVertical, Check, X, ClipboardList } from 'lucide-react';
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
  fechaCreacion: Date;
  estado: SolicitudEstado;
  fechaResolucion?: Date;
  metadata?: {
    tipoAusencia?: string;
    fechaInicio?: Date;
    fechaFin?: Date;
    tipoCambioDatos?: string;
    camposCambiados?: Record<string, unknown>;
  };
}

interface BandejaEntradaSolicitudesProps {
  solicitudesPendientes: SolicitudItem[];
  solicitudesResueltas: SolicitudItem[];
  onAprobar: (id: string) => void;
  onRechazar: (id: string) => void;
}

type VistaType = 'pendientes' | 'resueltas';

import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';
import { EmptyState } from '@/components/shared/empty-state';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const PERIOD_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
});

const DEFAULT_RELATIVE_OPTIONS = {
  locale: 'es',
  minimalUnit: 'minute' as const,
  style: 'short' as const,
};

const DEADLINE_RELATIVE_OPTIONS = {
  locale: 'es',
  minimalUnit: 'day' as const,
  style: 'short' as const,
};

const capitalize = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase('es-ES') + value.slice(1);
};

const toTitleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('es-ES') + word.slice(1).toLocaleLowerCase())
    .join(' ');

const humanize = (value: string) =>
  value
    .split('_')
    .map((segment) => segment.toLocaleLowerCase('es-ES'))
    .join(' ');

const humanizeKey = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLocaleLowerCase('es-ES');

const CAMBIO_TIPO_LABELS: Record<string, string> = {
  datos_personales: 'datos personales',
  datos_bancarios: 'datos bancarios',
  datos_laborales: 'datos laborales',
  datos_contacto: 'datos de contacto',
  datos_fiscales: 'datos fiscales',
  documento: 'documentación',
};

const CAMPO_CAMBIO_LABELS: Record<string, string> = {
  direccion: 'dirección',
  telefono: 'teléfono',
  email: 'correo electrónico',
  correo: 'correo electrónico',
  iban: 'IBAN',
  entidad: 'entidad bancaria',
  banco: 'banco',
  titularCuenta: 'titular de la cuenta',
  salarioBrutoAnual: 'salario bruto anual',
  salarioBrutoMensual: 'salario bruto mensual',
  categoriaProfesional: 'categoría profesional',
  grupoCotizacion: 'grupo de cotización',
  puestoId: 'puesto',
  jornadaId: 'jornada asignada',
  equipoIds: 'equipos',
  fechaAlta: 'fecha de alta',
  estadoCivil: 'estado civil',
  numeroHijos: 'número de hijos',
  nif: 'NIF',
  nss: 'NSS',
};

const getCambioCategoria = (tipo?: string) => {
  if (!tipo) return 'datos personales';
  const normalized = tipo.toLocaleLowerCase('es-ES');
  return CAMBIO_TIPO_LABELS[normalized] || humanizeKey(normalized);
};

const formatCampoEtiqueta = (campo: string) =>
  CAMPO_CAMBIO_LABELS[campo] || toTitleCase(humanizeKey(campo));

const formatCamposCambios = (campos?: Record<string, unknown>) => {
  if (!campos) return null;
  const keys = Object.keys(campos);
  if (keys.length === 0) return null;
  const etiquetas = keys.map((campo) => formatCampoEtiqueta(campo));
  const MAX_LABELS = 2;
  if (etiquetas.length <= MAX_LABELS) {
    return etiquetas.join(', ');
  }
  const visibles = etiquetas.slice(0, MAX_LABELS).join(', ');
  const restantes = etiquetas.length - MAX_LABELS;
  return `${visibles} (+${restantes} más)`;
};

const getTipoCambioValor = (solicitud: SolicitudItem) => {
  if (solicitud.metadata?.tipoCambioDatos) {
    return solicitud.metadata.tipoCambioDatos;
  }
  const match = solicitud.detalles.match(/cambio de\s+(.+)/i);
  if (match) {
    return match[1].trim().replace(/\.$/, '');
  }
  return solicitud.detalles;
};

const formatDate = (date: Date) => DATE_FORMATTER.format(date);

const getSolicitudTitulo = (solicitud: SolicitudItem) => {
  if (solicitud.tipo === 'ausencia') {
    const detalle = solicitud.metadata?.tipoAusencia
      ? toTitleCase(humanize(solicitud.metadata.tipoAusencia))
      : 'Ausencia';
    return `${detalle} · ${solicitud.empleado.nombre} ${solicitud.empleado.apellidos}`;
  }

  const categoria = toTitleCase(getCambioCategoria(getTipoCambioValor(solicitud)));
  return `Actualización de ${categoria} · ${solicitud.empleado.nombre} ${solicitud.empleado.apellidos}`;
};

const formatPeriodo = (inicio?: Date, fin?: Date) => {
  if (!inicio || !fin) return null;
  const mismoAnyo = inicio.getFullYear() === fin.getFullYear();
  const inicioTexto = mismoAnyo ? PERIOD_FORMATTER.format(inicio) : formatDate(inicio);
  const finTexto = formatDate(fin);
  return `${inicioTexto} – ${finTexto}`;
};

const getSolicitudDescripcion = (solicitud: SolicitudItem) => {
  const partes: string[] = [];

  const relativaCreacion = formatRelativeTime(solicitud.fechaCreacion, DEFAULT_RELATIVE_OPTIONS);
  partes.push(relativaCreacion);

  if (solicitud.estado === 'en_curso') {
    if (solicitud.metadata?.fechaFin) {
      const relativaFin = formatRelativeTime(
        solicitud.metadata.fechaFin,
        DEADLINE_RELATIVE_OPTIONS,
      );
      partes.push(`Termina ${relativaFin.toLocaleLowerCase('es-ES')}`);
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
    const relativaCierre = formatRelativeTime(fechaCierre, DEFAULT_RELATIVE_OPTIONS);
    partes.push(`${estadoLabel} ${relativaCierre.toLocaleLowerCase('es-ES')}`);
  }

  if (solicitud.metadata?.fechaInicio && solicitud.metadata?.fechaFin) {
    const periodo = formatPeriodo(solicitud.metadata.fechaInicio, solicitud.metadata.fechaFin);
    if (periodo) {
      partes.push(`Periodo ${periodo}`);
    }
  }

  if (solicitud.tipo === 'cambio_datos') {
    const categoria = toTitleCase(getCambioCategoria(getTipoCambioValor(solicitud)));
    partes.push(`Área ${categoria}`);
    const camposResumen = formatCamposCambios(solicitud.metadata?.camposCambiados);
    if (camposResumen) {
      partes.push(`Campos ${camposResumen}`);
    }
  }

  return partes.join(' · ');
};

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
  const emptyStateCopy = vista === 'pendientes'
    ? {
        title: 'Sin solicitudes pendientes',
        description: 'Cuando un empleado envíe una solicitud aparecerá aquí para que la revises.',
      }
    : {
        title: 'Sin solicitudes resueltas',
        description: 'Gestiona una solicitud pendiente para verla en este listado.',
      };

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
        <EmptyState
          icon={ClipboardList}
          title={emptyStateCopy.title}
          description={emptyStateCopy.description}
          className="py-10"
        />
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

                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{titulo}</p>
                    <p className="text-sm text-gray-600">{descripcion}</p>
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
