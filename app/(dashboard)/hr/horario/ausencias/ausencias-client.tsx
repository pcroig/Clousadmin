'use client';

// ========================================
// Ausencias Client Component
// ========================================

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Edit2, Paperclip, Plus, Settings } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CompactFilterBar } from '@/components/adaptive/CompactFilterBar';
import { EmpleadoHoverCard } from '@/components/empleado/empleado-hover-card';
import { PageMobileHeader } from '@/components/layout/page-mobile-header';
import { AvatarCell, type Column, DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { DataFilters, type FilterOption } from '@/components/shared/filters/data-filters';
import { DateRangeControls } from '@/components/shared/filters/date-range-controls';
import { LoadingButton } from '@/components/shared/loading-button';
import { TableHeader as PageHeader } from '@/components/shared/table-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EstadoAusencia } from '@/lib/constants/enums';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { calcularRangoFechas, obtenerEtiquetaPeriodo } from '@/lib/utils/fechas';
import { getAusenciaEstadoLabel } from '@/lib/utils/formatters';
import { parseJson } from '@/lib/utils/json';

import { EditarAusenciaModal, type EditarAusencia } from '@/components/ausencias/editar-ausencia-modal';

import { CrearCampanaModal } from './crear-campana-modal';
import { GestionarAusenciasModal } from './gestionar-ausencias-modal';

interface Ausencia {
  id: string;
  empleadoId: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  createdAt: string;
  diasLaborables: number;
  diasSolicitados?: number;
  medioDia: boolean;
  periodo?: string | null;
  estado: string;
  motivo: string | null;
  motivoRechazo: string | null;
  justificanteUrl?: string | null;
  documentoId?: string | null;
  empleado: {
    nombre: string;
    apellidos: string;
    puesto: string;
    email?: string | null;
    equipo?: { id: string; nombre: string } | null;
    equipoNombre?: string | null;
    fotoUrl?: string | null;
  };
}

interface Campana {
  id: string;
  titulo: string;
  estado: string;
  fechaInicioObjetivo: string;
  fechaFinObjetivo: string;
  totalEmpleadosAsignados: number;
  empleadosCompletados: number;
  _count: {
    preferencias: number;
  };
}

const getInitialMonthDate = (): Date => {
  const initialDate = new Date();
  initialDate.setHours(0, 0, 0, 0);
  initialDate.setDate(1);
  return initialDate;
};

interface AusenciasClientProps {
  initialCampanasExpanded?: boolean;
  campanasEnabled: boolean;
}

const ESTADO_OPTIONS: FilterOption[] = [
  { value: EstadoAusencia.pendiente, label: getAusenciaEstadoLabel(EstadoAusencia.pendiente) },
  { value: EstadoAusencia.confirmada, label: getAusenciaEstadoLabel(EstadoAusencia.confirmada) },
  { value: EstadoAusencia.completada, label: getAusenciaEstadoLabel(EstadoAusencia.completada) },
  { value: EstadoAusencia.rechazada, label: getAusenciaEstadoLabel(EstadoAusencia.rechazada) },
];

/**
 * Convierte un objeto Ausencia a EditarAusencia para el modal compartido
 */
const convertirAusenciaParaEdicion = (ausencia: Ausencia): EditarAusencia => ({
  id: ausencia.id,
  empleadoId: ausencia.empleadoId,
  tipo: ausencia.tipo,
  fechaInicio: ausencia.fechaInicio,
  fechaFin: ausencia.fechaFin,
  createdAt: ausencia.createdAt,
  medioDia: ausencia.medioDia,
  periodo: ausencia.periodo,
  estado: ausencia.estado,
  motivo: ausencia.motivo,
  justificanteUrl: ausencia.justificanteUrl,
  documentoId: ausencia.documentoId,
  diasSolicitados: ausencia.diasSolicitados,
  empleado: {
    nombre: ausencia.empleado.nombre,
    apellidos: ausencia.empleado.apellidos,
    puesto: ausencia.empleado.puesto,
  }
});

export function AusenciasClient({
  initialCampanasExpanded: _initialCampanasExpanded,
  campanasEnabled,
}: AusenciasClientProps) {
  const isMobile = useIsMobile();
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [campanaActiva, setCampanaActiva] = useState<Campana | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroEquipo, setFiltroEquipo] = useState('todos');
  const [equiposOptions, setEquiposOptions] = useState<FilterOption[]>([]);
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  
  // Date State
  const [rangoFechas, setRangoFechas] = useState<'dia' | 'semana' | 'mes'>('mes');
  const [fechaBase, setFechaBase] = useState<Date>(() => getInitialMonthDate());
  
  // Modals
  const [gestionarModal, setGestionarModal] = useState(false);
  const [crearCampanaModal, setCrearCampanaModal] = useState(false);
  const [rechazarModal, setRechazarModal] = useState<{ open: boolean; ausenciaId: string | null }>({
    open: false,
    ausenciaId: null
  });
  const [editarModal, setEditarModal] = useState<{ open: boolean; ausencia: EditarAusencia | null }>({
    open: false,
    ausencia: null
  });
  const [crearModal, setCrearModal] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // Load Equipos
  useEffect(() => {
    async function loadEquipos() {
      try {
        const response = await fetch('/api/organizacion/equipos');
        if (response.ok) {
          const data = await parseJson<Array<{ id: string; nombre: string }>>(response).catch(() => []);
          if (Array.isArray(data)) {
            setEquiposOptions(data.map(e => ({ label: e.nombre, value: e.id })));
          }
        }
      } catch (error) {
        console.error('[Ausencias] Error cargando equipos', error);
      }
    }
    loadEquipos();
  }, []);

  const goToPreviousPeriod = useCallback(() => {
    const nuevaFecha = new Date(fechaBase);
    if (rangoFechas === 'dia') {
      nuevaFecha.setDate(nuevaFecha.getDate() - 1);
    } else if (rangoFechas === 'semana') {
      nuevaFecha.setDate(nuevaFecha.getDate() - 7);
    } else {
      nuevaFecha.setMonth(nuevaFecha.getMonth() - 1);
    }
    setFechaBase(nuevaFecha);
  }, [fechaBase, rangoFechas]);

  const goToNextPeriod = useCallback(() => {
    const nuevaFecha = new Date(fechaBase);
    if (rangoFechas === 'dia') {
      nuevaFecha.setDate(nuevaFecha.getDate() + 1);
    } else if (rangoFechas === 'semana') {
      nuevaFecha.setDate(nuevaFecha.getDate() + 7);
    } else {
      nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
    }
    setFechaBase(nuevaFecha);
  }, [fechaBase, rangoFechas]);

  const periodLabel = useMemo(
    () => obtenerEtiquetaPeriodo(fechaBase, rangoFechas),
    [fechaBase, rangoFechas]
  );

  const fetchAusencias = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const { inicio, fin } = calcularRangoFechas(fechaBase, rangoFechas);
      params.append('fechaInicio', format(inicio, 'yyyy-MM-dd'));
      params.append('fechaFin', format(fin, 'yyyy-MM-dd'));

      if (filtroEstado !== 'todos') {
        params.append('estado', filtroEstado);
      }
      if (filtroEquipo !== 'todos') {
        params.append('equipoId', filtroEquipo);
      }
      if (busquedaEmpleado) {
        params.append('search', busquedaEmpleado);
      }

      const response = await fetch(`/api/ausencias?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar las ausencias');
      }
      
      const data = await response.json() as Record<string, unknown>;
      setAusencias(
        extractArrayFromResponse<Ausencia>(data, { key: 'ausencias' })
      );
    } catch (error) {
      console.error('[fetchAusencias] Error:', error);
      toast.error('No se pudieron cargar las ausencias');
      setAusencias([]);
    } finally {
      setLoading(false);
    }
  }, [busquedaEmpleado, filtroEquipo, filtroEstado, fechaBase, rangoFechas]);

  const fetchCampanaActiva = useCallback(async () => {
    if (!campanasEnabled) {
      setCampanaActiva(null);
      return;
    }

    try {
      const response = await fetch('/api/campanas-vacaciones');
      if (response.ok) {
        const data = (await response.json()) as Campana | null;
        setCampanaActiva(data);
      } else {
        setCampanaActiva(null);
      }
    } catch (error) {
      console.error('Error fetching campaña activa:', error);
      setCampanaActiva(null);
    }
  }, [campanasEnabled]);

  useEffect(() => {
    fetchAusencias();
  }, [fetchAusencias]);

  useEffect(() => {
    if (!campanasEnabled) {
      return;
    }
    fetchCampanaActiva();
  }, [campanasEnabled, fetchCampanaActiva]);

  async function _handleAprobar(id: string) {
    try {
      const response = await fetch(`/api/ausencias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'aprobar' }),
      });

      const data = await response.json() as { error?: string } | unknown;
      
      if (response.ok) {
        toast.success('Ausencia aprobada correctamente');
        fetchAusencias();
      } else {
        const errorData = data as { error?: string };
        toast.error(errorData.error || 'Error al aprobar la ausencia');
      }
    } catch (error) {
      console.error('[handleAprobar] Error:', error);
      toast.error('Error de conexión al aprobar la ausencia');
    }
  }

  async function handleRechazar() {
    if (!rechazarModal.ausenciaId || !motivoRechazo.trim()) return;

    try {
      const response = await fetch(`/api/ausencias/${rechazarModal.ausenciaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'rechazar',
          motivoRechazo: motivoRechazo,
        }),
      });

      const data = await response.json() as { error?: string } | unknown;

      if (response.ok) {
        toast.success('Ausencia rechazada correctamente');
        setRechazarModal({ open: false, ausenciaId: null });
        setMotivoRechazo('');
        fetchAusencias();
      } else {
        const errorData = data as { error?: string };
        toast.error(errorData.error || 'Error al rechazar la ausencia');
      }
    } catch (error) {
      console.error('[handleRechazar] Error:', error);
      toast.error('Error de conexión al rechazar la ausencia');
    }
  }

  function getEstadoBadge(estado: string) {
    const variants: Record<string, { label: string; className: string }> = {
      pendiente: { label: getAusenciaEstadoLabel(EstadoAusencia.pendiente), className: 'bg-yellow-100 text-yellow-800' },
      confirmada: { label: getAusenciaEstadoLabel(EstadoAusencia.confirmada), className: 'bg-green-100 text-green-800' },
      completada: { label: getAusenciaEstadoLabel(EstadoAusencia.completada), className: 'bg-gray-100 text-gray-800' },
      rechazada: { label: getAusenciaEstadoLabel(EstadoAusencia.rechazada), className: 'bg-red-100 text-red-800' },
    };

    const variant = variants[estado] || variants.pendiente;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  }

  function getTipoBadge(tipo: string) {
    const tipos: Record<string, string> = {
      vacaciones: 'Vacaciones',
      enfermedad: 'Enfermedad',
      enfermedad_familiar: 'Enfermedad Familiar',
      maternidad_paternidad: 'Maternidad/Paternidad',
      otro: 'Otro',
    };
    return tipos[tipo] || tipo;
  }

const SOLICITUD_DATETIME_FORMAT = 'd MMM yyyy';

const formatSolicitudFecha = (value?: string | null) => {
  if (!value) {
    return 'Fecha no disponible';
  }
  try {
    return format(new Date(value), SOLICITUD_DATETIME_FORMAT, { locale: es });
  } catch {
    return 'Fecha no disponible';
  }
};

const renderJustificanteLink = (
  ausencia: Ausencia,
  options: { stopPropagation?: boolean; size?: 'sm' | 'default' } = {}
) => {
  // Support both documentoId (new, preferred) and justificanteUrl (legacy)
  if (!ausencia.documentoId && !ausencia.justificanteUrl) {
    return null;
  }

  const { stopPropagation = false, size = 'sm' } = options;
  const handleClick = stopPropagation
    ? (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
      }
    : undefined;

  // Use API endpoint to avoid S3 AccessDenied errors
  const justificanteUrl = ausencia.documentoId
    ? `/api/documentos/${ausencia.documentoId}/preview`
    : ausencia.justificanteUrl!;

  return (
    <Button
      variant="link"
      size={size}
      className="px-0"
      onClick={handleClick}
      asChild
    >
      <a href={justificanteUrl} target="_blank" rel="noopener noreferrer">
        Ver justificante
      </a>
    </Button>
  );
};

  // Mobile list renderer
  const renderMobileList = () => {
    if (ausencias.length === 0) {
      return (
        <EmptyState
          layout="inline"
          icon={CalendarIcon}
          title={busquedaEmpleado ? 'No se encontraron ausencias' : 'No hay ausencias registradas'}
          description={
            busquedaEmpleado
              ? 'Prueba con otro nombre o restablece los filtros.'
              : 'Cambia el periodo o ajusta los filtros para ver registros.'
          }
        />
      );
    }

    return (
      <div className="space-y-4 pb-20">
        {ausencias.map((ausencia) => (
          <Card
            key={ausencia.id}
            className="p-4 space-y-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none"
            role="button"
            tabIndex={0}
            onClick={() => setEditarModal({ open: true, ausencia: convertirAusenciaParaEdicion(ausencia) })}
            onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setEditarModal({ open: true, ausencia: convertirAusenciaParaEdicion(ausencia) });
              }
            }}
          >
            <div className="flex justify-between items-start">
              <div>
          <EmpleadoHoverCard
            empleado={{
              id: ausencia.empleadoId,
              nombre: ausencia.empleado.nombre,
              apellidos: ausencia.empleado.apellidos,
              puesto: ausencia.empleado.puesto,
              email: ausencia.empleado.email,
              equipoNombre: ausencia.empleado.equipoNombre ?? ausencia.empleado.equipo?.nombre ?? null,
              fotoUrl: ausencia.empleado.fotoUrl,
            }}
                  estado={{
                    label: getAusenciaEstadoLabel(ausencia.estado),
                    description: getTipoBadge(ausencia.tipo),
                  }}
                  triggerClassName="text-gray-900 font-medium"
                >
                  {ausencia.empleado.nombre} {ausencia.empleado.apellidos}
                </EmpleadoHoverCard>
              </div>
              {getEstadoBadge(ausencia.estado)}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
              <div>
                <p className="text-xs text-gray-500">Tipo</p>
                <p>{getTipoBadge(ausencia.tipo)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fechas</p>
                <p>
                  {format(new Date(ausencia.fechaInicio), 'dd MMM', { locale: es })} -{' '}
                  {format(new Date(ausencia.fechaFin), 'dd MMM', { locale: es })}
                  {ausencia.createdAt && (
                    <span className="text-xs text-gray-500 ml-2">
                      Solicitada {format(new Date(ausencia.createdAt), 'd MMM', { locale: es })}
                    </span>
                  )}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Motivo</p>
                <p className="text-gray-800">{ausencia.motivo || 'Sin motivo'}</p>
              </div>
            </div>
            {ausencia.justificanteUrl && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Paperclip className="h-3.5 w-3.5" />
                {renderJustificanteLink(ausencia, { stopPropagation: true })}
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const renderCampaignCard = () => {
    if (!campanasEnabled) {
      return null;
    }

    if (!campanaActiva) return null;
    return (
      <Card className="mb-6 p-4 bg-blue-50 border-blue-100">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="font-medium text-blue-900">{campanaActiva.titulo}</h3>
            <p className="text-sm text-blue-700">
              Objetivo: {format(new Date(campanaActiva.fechaInicioObjetivo), 'd MMM')} -{' '}
              {format(new Date(campanaActiva.fechaFinObjetivo), 'd MMM yyyy', { locale: es })}
            </p>
          </div>
          <Badge className="bg-blue-200 text-blue-800 hover:bg-blue-300">Activa</Badge>
        </div>
        <div className="flex gap-4 text-sm text-blue-800">
          <div>
            <span className="font-bold">{campanaActiva._count.preferencias}</span> solicitudes
          </div>
          <div>
            <span className="font-bold">
              {Math.round((campanaActiva.empleadosCompletados / campanaActiva.totalEmpleadosAsignados) * 100) || 0}%
            </span>{' '}
            completado
          </div>
        </div>
      </Card>
    );
  };

  // Definición de columnas para DataTable
  const columns: Column<Ausencia>[] = [
    {
      id: 'empleado',
      header: 'Empleado',
      priority: 'high',
      width: '200px',
      cell: (ausencia) => (
        <EmpleadoHoverCard
          empleado={{
            id: ausencia.empleadoId,
            nombre: ausencia.empleado.nombre,
            apellidos: ausencia.empleado.apellidos,
            puesto: ausencia.empleado.puesto,
            email: ausencia.empleado.email,
            equipoNombre: ausencia.empleado.equipoNombre ?? ausencia.empleado.equipo?.nombre ?? null,
            fotoUrl: ausencia.empleado.fotoUrl,
          }}
          estado={{
            label: getAusenciaEstadoLabel(ausencia.estado),
            description: getTipoBadge(ausencia.tipo),
          }}
          triggerClassName="block"
          side="right"
        >
          <AvatarCell
            nombre={ausencia.empleado.nombre}
            apellidos={ausencia.empleado.apellidos}
            fotoUrl={ausencia.empleado.fotoUrl ?? undefined}
            subtitle={ausencia.empleado.puesto ?? undefined}
            compact
          />
        </EmpleadoHoverCard>
      ),
    },
    {
      id: 'tipo',
      header: 'Tipo',
      priority: 'high',
      width: '130px',
      cell: (ausencia) => (
        <span className="text-sm font-semibold text-gray-900">{getTipoBadge(ausencia.tipo)}</span>
      ),
    },
    {
      id: 'fechas',
      header: 'Fechas',
      align: 'center',
      priority: 'medium',
      width: '220px',
      cell: (ausencia) => (
        <div className="flex items-center justify-center gap-2">
          <div className="text-sm font-medium text-gray-900">
            {format(new Date(ausencia.fechaInicio), 'dd MMM', { locale: es })} -{' '}
            {format(new Date(ausencia.fechaFin), 'dd MMM', { locale: es })}
          </div>
          {ausencia.createdAt && (
            <span className="text-xs text-gray-500">
              Solicitada {format(new Date(ausencia.createdAt), 'd MMM', { locale: es })}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      align: 'center',
      priority: 'medium',
      width: '180px',
      cell: (ausencia) =>
        ausencia.estado === EstadoAusencia.pendiente ? (
          <div className="flex justify-center items-center gap-2 h-6">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={(event) => {
                event.stopPropagation();
                _handleAprobar(ausencia.id);
              }}
            >
              Aprobar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={(event) => {
                event.stopPropagation();
                setRechazarModal({ open: true, ausenciaId: ausencia.id });
              }}
            >
              Rechazar
            </Button>
          </div>
        ) : (
          <div className="flex justify-center items-center h-6">
            {getEstadoBadge(ausencia.estado)}
          </div>
        ),
    },
    {
      id: 'justificante',
      header: 'Justificante',
      align: 'center',
      priority: 'low',
      width: '110px',
      cell: (ausencia) =>
        ausencia.justificanteUrl ? (
          renderJustificanteLink(ausencia, { stopPropagation: true, size: 'sm' })
        ) : null,
    },
    {
      id: 'acciones',
      header: '',
      align: 'right',
      priority: 'low',
      width: '60px',
      cell: (ausencia) => (
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
          title="Editar ausencia"
          aria-label="Editar ausencia"
          onClick={(event) => {
            event.stopPropagation();
            setEditarModal({ open: true, ausencia: convertirAusenciaParaEdicion(ausencia) });
          }}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const desktopEmptyTitle = busquedaEmpleado ? 'No se encontraron ausencias' : 'No hay ausencias registradas';
  const desktopEmptyDescription = busquedaEmpleado
    ? 'Prueba con otro nombre o restablece los filtros.'
    : 'Cambia el periodo o ajusta los filtros para ver registros.';

  const mobileActions = campanasEnabled
    ? [
        {
          label: 'Campaña',
          onClick: () => setCrearCampanaModal(true),
          isPrimary: true,
        },
        {
          icon: Settings,
          label: 'Gestionar ausencias',
          onClick: () => setGestionarModal(true),
        },
      ]
    : [
        {
          icon: Settings,
          label: 'Gestionar ausencias',
          onClick: () => setGestionarModal(true),
        },
      ];

  return (
    <div className="h-full w-full flex flex-col sm:max-w-[1800px] sm:mx-auto sm:px-8 sm:py-6">
      {isMobile ? (
        <>
          <PageMobileHeader
            title="Ausencias"
            actions={mobileActions}
          />

          {/* Filtros */}
          <div className="flex-shrink-0 mb-3">
            <DataFilters
              searchQuery={busquedaEmpleado}
              onSearchChange={setBusquedaEmpleado}
              searchPlaceholder="Buscar empleado..."
              estadoValue={filtroEstado}
              onEstadoChange={setFiltroEstado}
              estadoOptions={ESTADO_OPTIONS}
              equipoValue={filtroEquipo}
              onEquipoChange={setFiltroEquipo}
              equipoOptions={equiposOptions}
            />
          </div>

          {renderCampaignCard()}

          <div className="flex-1 min-h-0 overflow-y-auto">
            {renderMobileList()}
          </div>
        </>
      ) : (
        <>
          <PageHeader
            title="Ausencias"
            actionButton={{
              label: '+ Crear Ausencia',
              onClick: () => setCrearModal(true),
            }}
            secondaryActionButton={
              campanasEnabled
                ? {
                    label: '+ Nueva Campaña',
                    onClick: () => setCrearCampanaModal(true),
                    variant: 'outline',
                  }
                : {
                    label: 'Gestionar ausencias',
                    onClick: () => setGestionarModal(true),
                    variant: 'outline',
                  }
            }
          />
          
          {renderCampaignCard()}

          <div className="flex items-center justify-between mb-6 gap-4">
            <DataFilters
              searchQuery={busquedaEmpleado}
              onSearchChange={setBusquedaEmpleado}
              estadoValue={filtroEstado}
              onEstadoChange={setFiltroEstado}
              estadoOptions={ESTADO_OPTIONS}
              equipoValue={filtroEquipo}
              onEquipoChange={setFiltroEquipo}
              equipoOptions={equiposOptions}
            />

            <DateRangeControls
              range={rangoFechas}
              label={periodLabel}
              onRangeChange={setRangoFechas}
              onNavigate={(direction) => (direction === 'prev' ? goToPreviousPeriod() : goToNextPeriod())}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <DataTable
              columns={columns}
              data={ausencias}
              onRowClick={(ausencia) => setEditarModal({ open: true, ausencia: convertirAusenciaParaEdicion(ausencia) })}
              getRowId={(ausencia) => ausencia.id}
              emptyContent={
                <EmptyState
                  layout="table"
                  icon={CalendarIcon}
                  title={desktopEmptyTitle}
                  description={desktopEmptyDescription}
                />
              }
            />
          </div>
        </>
      )}

      {/* Modal Rechazar */}
      <Dialog open={rechazarModal.open} onOpenChange={(open) => setRechazarModal({ open, ausenciaId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Ausencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="motivo">Motivo del rechazo *</Label>
              <Input
                id="motivo"
                placeholder="Explica el motivo del rechazo"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarModal({ open: false, ausenciaId: null })}>
              Cancelar
            </Button>
            <Button
              onClick={handleRechazar}
              disabled={!motivoRechazo.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Rechazar Ausencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Ausencia - Shared Component */}
      <EditarAusenciaModal
        open={editarModal.open}
        ausencia={editarModal.ausencia}
        onClose={() => setEditarModal({ open: false, ausencia: null })}
        onSuccess={fetchAusencias}
        contexto="hr_admin"
      />

      {/* Modal Crear Ausencia - Using Unified Component */}
      <EditarAusenciaModal
        open={crearModal}
        ausencia={null}
        onClose={() => setCrearModal(false)}
        onSuccess={fetchAusencias}
        contexto="hr_admin"
      />

      {/* Modal Crear Campaña */}
      {campanasEnabled && (
        <CrearCampanaModal
          open={crearCampanaModal}
          onClose={() => setCrearCampanaModal(false)}
          onCreated={() => {
            fetchCampanaActiva();
            toast.success('Campaña creada correctamente');
          }}
        />
      )}

      {/* Modal Gestionar Ausencias */}
      <GestionarAusenciasModal
        open={gestionarModal}
        onClose={() => setGestionarModal(false)}
        onSaved={() => {
          setGestionarModal(false);
          fetchAusencias();
        }}
      />
    </div>
  );
}
