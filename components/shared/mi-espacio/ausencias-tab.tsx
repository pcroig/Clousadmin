'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronRight, Edit, Info, Paperclip, Settings } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EditarAusenciaModal, type EditarAusencia } from '@/components/ausencias/editar-ausencia-modal';
import { FestivosPersonalizadosModal } from '@/components/ausencias/festivos-personalizados-modal';
import { SolicitarAusenciaModal } from '@/components/empleado/solicitar-ausencia-modal';
import { FechaCalendar } from '@/components/shared/fecha-calendar';
import { MetricsCard } from '@/components/shared/metrics-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PeriodoMedioDiaValue } from '@/lib/constants/enums';
import { obtenerNombreDia } from '@/lib/utils/fechas';
import { parseJson } from '@/lib/utils/json';

interface Ausencia {
  id: string;
  empleadoId?: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  diasLaborables: number;
  estado: string;
  motivo: string | null;
  justificanteUrl?: string | null;
  documentoId?: string | null;
  createdAt?: string;
  medioDia?: boolean;
  periodo?: PeriodoMedioDiaValue | null;
  empleado?: {
    nombre: string;
    apellidos: string;
    puesto: string;
  };
}

interface SaldoResponse {
  diasTotales: number;
  diasUsados: number;
  diasPendientes: number;
  diasDisponibles: number;
  carryOverDisponible?: number;
  carryOverExpiraEn?: string | Date | null;
  diasDesdeHorasCompensadas?: number;
  horasCompensadas?: number;
}

interface AusenciasResponse {
  ausencias?: Ausencia[];
  data?: Ausencia[];
  error?: string;
}

interface SaldoApiResponse {
  data?: SaldoResponse;
  diasTotales?: number;
  diasUsados?: number;
  diasPendientes?: number;
  diasDisponibles?: number;
  carryOverDisponible?: number;
  carryOverExpiraEn?: string | Date | null;
  diasDesdeHorasCompensadas?: number;
  horasCompensadas?: number;
}

interface CalendarioLaboralResponse {
  diasLaborables?: Partial<DiasLaborables>;
}

interface FestivosResponse {
  festivos?: { fecha: string; nombre: string }[];
}

type DiasLaborables = {
  lunes: boolean;
  martes: boolean;
  miercoles: boolean;
  jueves: boolean;
  viernes: boolean;
  sabado: boolean;
  domingo: boolean;
};

interface MiEspacioAusenciasTabProps {
  empleadoId: string;
  contexto?: 'empleado' | 'manager' | 'hr_admin';
  externalModalOpen?: boolean;
  onExternalModalOpenChange?: (open: boolean) => void;
}

export function AusenciasTab({
  empleadoId,
  contexto = 'empleado',
  externalModalOpen,
  onExternalModalOpenChange,
}: MiEspacioAusenciasTabProps) {
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [saldo, setSaldo] = useState<SaldoResponse | null>(null);
  const [diasLaborables, setDiasLaborables] = useState<DiasLaborables>({
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: false,
    domingo: false,
  });
  const [festivos, setFestivos] = useState<{ fecha: string; nombre: string }[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [tooltipData, setTooltipData] = useState<{
    date: Date;
    ausencia: Ausencia | null;
    position: { top: number; left: number };
  } | null>(null);
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const solicitudModalOpen = externalModalOpen ?? internalModalOpen;
  const [listaAusenciasTab, setListaAusenciasTab] = useState<'proximas' | 'pasadas'>('proximas');
  const [ausenciaParaEditar, setAusenciaParaEditar] = useState<Ausencia | null>(null);
  const [editandoDiasPersonalizados, setEditandoDiasPersonalizados] = useState(false);
  const [diasPersonalizadosInput, setDiasPersonalizadosInput] = useState<string>('');
  const [festivosModalOpen, setFestivosModalOpen] = useState(false);
  const [empleadoNombre, setEmpleadoNombre] = useState<string>('');
  const ausenciaModalData = useMemo<EditarAusencia | null>(() => {
    if (!ausenciaParaEditar) {
      return null;
    }

    return {
      id: ausenciaParaEditar.id,
      empleadoId: ausenciaParaEditar.empleadoId ?? empleadoId,
      tipo: ausenciaParaEditar.tipo,
      fechaInicio: ausenciaParaEditar.fechaInicio,
      fechaFin: ausenciaParaEditar.fechaFin,
      createdAt: ausenciaParaEditar.createdAt ?? new Date().toISOString(),
      medioDia: Boolean(ausenciaParaEditar.medioDia),
      periodo: ausenciaParaEditar.periodo ?? null,
      estado: ausenciaParaEditar.estado,
      motivo: ausenciaParaEditar.motivo ?? null,
      justificanteUrl: ausenciaParaEditar.justificanteUrl ?? null,
      documentoId: ausenciaParaEditar.documentoId ?? null,
      empleado: ausenciaParaEditar.empleado ?? {
        nombre: empleadoNombre || '',
        apellidos: '',
        puesto: '',
      },
    };
  }, [ausenciaParaEditar, empleadoId, empleadoNombre]);

  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const puedeSolicitar = contexto === 'empleado' || contexto === 'manager';
  const puedeRegistrar = contexto === 'hr_admin';
  const puedeAccionar = puedeSolicitar || puedeRegistrar;

  const cargarAusencias = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(`/api/ausencias?empleadoId=${empleadoId}`, {
          signal,
        });
        const payload = await parseJson<AusenciasResponse>(response).catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Error al cargar ausencias');
        }
        const normalized =
          Array.isArray(payload?.ausencias)
            ? payload?.ausencias
            : Array.isArray(payload?.data)
            ? payload?.data
            : [];
        setAusencias(normalized);
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error cargando ausencias:', error);
        }
      }
    },
    [empleadoId],
  );

  // Cargar ausencias
  useEffect(() => {
    const controller = new AbortController();
    cargarAusencias(controller.signal);
    return () => controller.abort();
  }, [cargarAusencias]);

  const cargarSaldo = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(`/api/ausencias/saldo?empleadoId=${empleadoId}`, {
          signal,
        });
        const payload = await parseJson<SaldoApiResponse>(response).catch(() => null);
        if (!response.ok) {
          throw new Error('Error al cargar saldo de ausencias');
        }
        if (payload?.data) {
          setSaldo({
            ...payload.data,
            carryOverDisponible: payload.data.carryOverDisponible ?? 0,
            carryOverExpiraEn: payload.data.carryOverExpiraEn ?? null,
            diasDesdeHorasCompensadas: payload.data.diasDesdeHorasCompensadas ?? 0,
            horasCompensadas: payload.data.horasCompensadas ?? 0,
          });
        } else if (
          typeof payload?.diasTotales === 'number' &&
          typeof payload?.diasUsados === 'number'
        ) {
          setSaldo({
            diasTotales: payload.diasTotales,
            diasUsados: payload.diasUsados,
            diasPendientes: payload.diasPendientes ?? 0,
            diasDisponibles: payload.diasDisponibles ?? 0,
            carryOverDisponible: payload.carryOverDisponible ?? 0,
            carryOverExpiraEn: payload.carryOverExpiraEn ?? null,
            diasDesdeHorasCompensadas: payload.diasDesdeHorasCompensadas ?? 0,
            horasCompensadas: payload.horasCompensadas ?? 0,
          });
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error cargando saldo de ausencias:', error);
        }
      }
    },
    [empleadoId],
  );

  useEffect(() => {
    const controller = new AbortController();
    cargarSaldo(controller.signal);
    return () => controller.abort();
  }, [cargarSaldo]);

  // Cargar nombre del empleado si es HR Admin
  useEffect(() => {
    if (contexto === 'hr_admin' && empleadoId) {
      const cargarEmpleado = async () => {
        try {
          const response = await fetch(`/api/empleados/${empleadoId}`);
          const data = await parseJson<{ nombre?: string; apellidos?: string }>(response);
          if (data.nombre && data.apellidos) {
            setEmpleadoNombre(`${data.nombre} ${data.apellidos}`);
          }
        } catch (error) {
          console.error('Error cargando empleado:', error);
        }
      };
      cargarEmpleado();
    }
  }, [contexto, empleadoId]);

  // Cargar calendario laboral y festivos
  useEffect(() => {
    const controller = new AbortController();

    async function cargarCalendarioLaboral() {
      try {
        // Cargar días laborables
        const diasResponse = await fetch('/api/empresa/calendario-laboral', {
          signal: controller.signal,
        });
        const diasData = await parseJson<CalendarioLaboralResponse>(diasResponse).catch(() => null);
        if (diasResponse.ok && diasData?.diasLaborables) {
          setDiasLaborables((prev) => ({
            ...prev,
            ...diasData.diasLaborables,
          }));
        }

        // Cargar festivos activos
        const festivosResponse = await fetch('/api/festivos?activo=true', {
          signal: controller.signal,
        });
        const festivosData = await parseJson<FestivosResponse>(festivosResponse).catch(() => null);
        if (festivosResponse.ok) {
          setFestivos(festivosData?.festivos || []);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error cargando calendario laboral:', error);
        }
      }
    }

    cargarCalendarioLaboral();

    return () => controller.abort();
  }, []);

  // Calcular saldo de ausencias
  const calcularSaldo = useCallback((): SaldoResponse => {
    const diasTotales = 22; // Ejemplo: podria venir de la API
    const diasUsados = ausencias
      .filter((a) => a.estado === 'approved' || a.estado === 'auto_aprobada')
      .reduce((sum, a) => sum + (a.diasLaborables || 0), 0);
    const diasPendientes = ausencias
      .filter((a) => a.estado === 'pending' || a.estado === 'pendiente_aprobacion')
      .reduce((sum, a) => sum + (a.diasLaborables || 0), 0);
    const diasDisponibles = diasTotales - diasUsados - diasPendientes;

    return {
      diasTotales,
      diasUsados,
      diasPendientes,
      diasDisponibles,
      carryOverDisponible: 0,
      carryOverExpiraEn: null,
      diasDesdeHorasCompensadas: 0,
      horasCompensadas: 0,
    };
  }, [ausencias]);

  const saldoResumen = useMemo<SaldoResponse>(() => {
    if (saldo) {
      return {
        ...saldo,
        carryOverDisponible: saldo.carryOverDisponible ?? 0,
        carryOverExpiraEn: saldo.carryOverExpiraEn ?? null,
        diasDesdeHorasCompensadas: saldo.diasDesdeHorasCompensadas ?? 0,
        horasCompensadas: saldo.horasCompensadas ?? 0,
      };
    }
    return calcularSaldo();
  }, [saldo, calcularSaldo]);

  // Formatear horas para mostrar
  const formatearHoras = (horas: number) => {
    const h = Math.floor(Math.abs(horas));
    const m = Math.round((Math.abs(horas) - h) * 60);
    return `${h}h ${m > 0 ? ` ${m}m` : ''}`;
  };

  // Próximas ausencias
  const proximasAusencias = ausencias
    .filter((a) => new Date(a.fechaInicio) >= new Date())
    .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())
    .slice(0, 5);

  const ausenciasPasadas = ausencias
    .filter((a) => new Date(a.fechaInicio) < new Date())
    .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime())
    .slice(0, 5);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'approved':
      case 'auto_aprobada':
        return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      case 'pending':
      case 'pendiente_aprobacion':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  // Función para verificar si un día es laborable
  const esDiaLaborable = (date: Date) => {
    const nombreDia = obtenerNombreDia(date) as keyof typeof diasLaborables;
    return diasLaborables[nombreDia];
  };

  // Función para verificar si un día es festivo
  const esFestivo = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return festivos.some((f) => f.fecha === dateStr);
  };

  // Función para verificar si un día tiene ausencia
  const tieneAusencia = (date: Date) => {
    return ausencias.some((ausencia) => {
      const inicio = new Date(ausencia.fechaInicio);
      const fin = new Date(ausencia.fechaFin);
      return date >= inicio && date <= fin;
    });
  };

  // Obtener ausencia de un día específico
  const getAusenciaDelDia = (date: Date): Ausencia | null => {
    const ausencia = ausencias.find((a) => {
      const inicio = new Date(a.fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(a.fechaFin);
      fin.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return checkDate >= inicio && checkDate <= fin;
    });
    return ausencia || null;
  };

  // Handler para click en día del calendario
  const handleDayClick = (
    date: Date | undefined,
    _modifiers?: unknown,
    event?: React.MouseEvent<Element, MouseEvent>
  ) => {
    if (!date || !event) return;

    setSelectedDate(date);

    const ausencia = getAusenciaDelDia(date);

    if (!calendarContainerRef.current) {
      setTooltipData({ date, ausencia, position: { top: 0, left: 0 } });
      return;
    }

    const containerRect = calendarContainerRef.current.getBoundingClientRect();
    const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    const tooltipWidth = 260;
    const tooltipHeight = 160;

    let left = buttonRect.left - containerRect.left + buttonRect.width / 2 - tooltipWidth / 2;
    let top = buttonRect.bottom - containerRect.top + 12;

    if (left + tooltipWidth > containerRect.width) {
      left = containerRect.width - tooltipWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }

    if (top + tooltipHeight > containerRect.height) {
      top = buttonRect.top - containerRect.top - tooltipHeight - 12;
    }

    if (!esDiaLaborable(date) && !ausencia) {
      setTooltipData({
        date,
        ausencia: null,
        position: { top, left },
      });
      return;
    }

    setTooltipData({
      date,
      ausencia,
      position: { top, left },
    });
  };

  // Modificadores para el calendario
  const modifiers = {
    ausencia: (date: Date) => tieneAusencia(date),
    festivo: (date: Date) => esFestivo(date),
    noLaborable: (date: Date) => !esDiaLaborable(date),
  };

  const modifiersClassNames = {
    ausencia: 'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-[#d97757]/20 after:border-2 after:border-[#d97757] after:opacity-80 after:rounded-md after:transition-opacity hover:after:opacity-100 cursor-pointer',
    festivo: 'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-red-50 after:border after:border-red-300 after:opacity-90 after:rounded-md',
    noLaborable: 'bg-gray-50 text-gray-400',
  };

  const handleOpenSolicitud = () => {
    if (!puedeAccionar) {
      return;
    }
    setTooltipData(null);
    if (onExternalModalOpenChange) {
      onExternalModalOpenChange(true);
    } else {
      setInternalModalOpen(true);
    }
  };

  const handleEditarDiasPersonalizados = async () => {
    if (!editandoDiasPersonalizados) {
      setDiasPersonalizadosInput(saldo?.diasTotales?.toString() || '');
      setEditandoDiasPersonalizados(true);
      return;
    }

    try {
      const dias = diasPersonalizadosInput.trim() === '' ? null : parseInt(diasPersonalizadosInput, 10);
      
      if (dias !== null && (isNaN(dias) || dias < 0 || dias > 365)) {
        toast.error('Los días deben estar entre 0 y 365');
        return;
      }

      const response = await fetch(`/api/empleados/${empleadoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diasAusenciasPersonalizados: dias }),
      });

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || 'Error al actualizar días personalizados');
      }

      toast.success(dias === null ? 'Días personalizados eliminados. Se usará el mínimo global.' : 'Días personalizados actualizados correctamente');
      setEditandoDiasPersonalizados(false);
      cargarSaldo();
    } catch (error) {
      console.error('Error actualizando días personalizados:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar días personalizados');
    }
  };

  const handleCancelarEdicion = () => {
    setEditandoDiasPersonalizados(false);
    setDiasPersonalizadosInput('');
  };

  const renderAusenciaCard = (ausencia: Ausencia, isPast = false) => (
    <div
      key={ausencia.id}
      className={`flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-3 text-left transition ${
        isPast ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <FechaCalendar date={new Date(ausencia.fechaInicio)} />
        {new Date(ausencia.fechaFin).toDateString() !== new Date(ausencia.fechaInicio).toDateString() && (
          <>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <FechaCalendar date={new Date(ausencia.fechaFin)} />
          </>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">
          {ausencia.tipo || 'Ausencia'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {puedeAccionar && new Date(ausencia.fechaInicio) > new Date() && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:text-gray-700"
            onClick={() => setAusenciaParaEditar(ausencia)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {ausencia.justificanteUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              window.open(ausencia.justificanteUrl!, '_blank', 'noopener,noreferrer');
            }}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        )}
        {getEstadoBadge(ausencia.estado)}
      </div>
    </div>
  );

  const listaActual =
    listaAusenciasTab === 'proximas'
      ? { data: proximasAusencias, empty: 'No hay ausencias próximas', isPast: false }
      : { data: ausenciasPasadas, empty: 'No hay ausencias pasadas recientes', isPast: true };

  return (
    <>
      {/* MOBILE VERSION */}
      <div className="sm:hidden space-y-3">
        {/* Métricas de Saldo */}
        <MetricsCard
          metrics={[
            {
              value: saldoResumen.diasDisponibles.toFixed(0),
              label: 'Días Disponibles',
              color: 'green',
              size: 'large',
            },
            {
              value: saldoResumen.diasTotales,
              label: 'Acumulados',
            },
            {
              value: saldoResumen.diasUsados.toFixed(0),
              label: 'Utilizados',
            },
            ...(saldoResumen.horasCompensadas && saldoResumen.horasCompensadas > 0
              ? [
                  {
                    value: `+${saldoResumen.diasDesdeHorasCompensadas?.toFixed(1)} días`,
                    label: 'De horas compensadas',
                    color: 'blue' as const,
                  },
                ]
              : []),
          ]}
        />

        {/* Lista de Ausencias - Mobile */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Ausencias</h3>
            <div className="inline-flex rounded-full border border-gray-200 p-0.5 text-xs font-medium">
              <button
                onClick={() => setListaAusenciasTab('proximas')}
                className={`rounded-full px-2 py-0.5 transition ${
                  listaAusenciasTab === 'proximas'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Próximas
              </button>
              <button
                onClick={() => setListaAusenciasTab('pasadas')}
                className={`rounded-full px-2 py-0.5 transition ${
                  listaAusenciasTab === 'pasadas'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Historial
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {listaActual.data.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-500">{listaActual.empty}</p>
            ) : (
              listaActual.data.map((ausencia) => renderAusenciaCard(ausencia, listaActual.isPast))
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP VERSION */}
      <div className="hidden sm:grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Columna izquierda */}
        <div className="space-y-6">
          {/* Card de saldo */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-semibold text-gray-900">Saldo de ausencias</h3>
              {contexto === 'hr_admin' && !editandoDiasPersonalizados && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-500 hover:text-gray-700"
                    onClick={handleEditarDiasPersonalizados}
                    title="Editar días personalizados"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-500 hover:text-gray-700"
                    onClick={() => setFestivosModalOpen(true)}
                    title="Gestionar festivos personalizados"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <span className="text-xs text-gray-500">
              Ene {new Date().getFullYear()} - Dic {new Date().getFullYear()}
            </span>
          </div>
          {editandoDiasPersonalizados && contexto === 'hr_admin' && (
            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-gray-700 mb-2">
                Editar días personalizados para este empleado (deja vacío para usar el mínimo global)
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={diasPersonalizadosInput}
                  onChange={(e) => setDiasPersonalizadosInput(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Días personalizados"
                  min="0"
                  max="365"
                />
                <Button
                  size="sm"
                  onClick={handleEditarDiasPersonalizados}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelarEdicion}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-center gap-1.5">
                <div className="text-2xl font-bold text-gray-900">{saldoResumen.diasTotales}</div>
                {(saldoResumen.diasDesdeHorasCompensadas ?? 0) > 0 && (
                  <>
                    <span className="text-base font-normal text-gray-500">
                      (+{saldoResumen.diasDesdeHorasCompensadas?.toFixed(1)})
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-blue-600 hover:text-blue-700">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            Incluye {saldoResumen.diasDesdeHorasCompensadas?.toFixed(1)} días ({formatearHoras(saldoResumen.horasCompensadas ?? 0)}) 
                            de horas extra compensadas por HR como días de ausencia.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">Días acumulados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{saldoResumen.diasDisponibles.toFixed(1)}</div>
              <div className="text-xs text-gray-500 mt-1">Días disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{saldoResumen.diasUsados.toFixed(1)}</div>
              <div className="text-xs text-gray-500 mt-1">Días utilizados</div>
            </div>
          </div>
        </div>

        {/* Ausencias listado */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Ausencias</h3>
            </div>
            <div className="inline-flex rounded-full border border-gray-200 p-1 text-xs font-medium">
              <button
                onClick={() => setListaAusenciasTab('proximas')}
                className={`rounded-full px-3 py-1 transition ${
                  listaAusenciasTab === 'proximas'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Próximas
              </button>
              <button
                onClick={() => setListaAusenciasTab('pasadas')}
                className={`rounded-full px-3 py-1 transition ${
                  listaAusenciasTab === 'pasadas'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Historial
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {listaActual.data.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">{listaActual.empty}</p>
            ) : (
              listaActual.data.map((ausencia) => renderAusenciaCard(ausencia, listaActual.isPast))
            )}
          </div>
        </div>
      </div>

      {/* Columna derecha - Calendario */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Calendario</h3>
          {puedeAccionar && (
            <Button size="sm" onClick={handleOpenSolicitud}>
              {puedeRegistrar ? 'Registrar ausencia' : 'Solicitar ausencia'}
            </Button>
          )}
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-white border-2 border-gray-300"></div>
            <span className="text-gray-600">Laborable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-50 border border-gray-200"></div>
            <span className="text-gray-600">No laborable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#d97757]/20 border-2 border-[#d97757]"></div>
            <span className="text-gray-600">Ausencia</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-50 border border-red-300"></div>
            <span className="text-gray-600">Festivo</span>
          </div>
        </div>

        {/* Calendario de 2 meses */}
        <div className="relative flex justify-center overflow-x-auto" ref={calendarContainerRef}>
          <Calendar
            mode="single"
            selected={selectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            onDayClick={handleDayClick}
            onSelect={setSelectedDate}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            numberOfMonths={2}
            className="rounded-lg border-0"
            locale={es}
          />

          {tooltipData && (
            <div
              className="absolute z-20 max-w-[260px] rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
              style={{
                top: tooltipData.position.top,
                left: tooltipData.position.left,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">
                  {format(tooltipData.date, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                </p>
                <button
                  onClick={() => setTooltipData(null)}
                  aria-label="Cerrar"
                  className="text-gray-400 transition hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="mt-3 space-y-3 text-sm text-gray-700">
                {tooltipData.ausencia ? (
                  <>
                    <div>
                      <span className="text-xs text-gray-500">Tipo</span>
                      <p className="font-medium text-gray-900">{tooltipData.ausencia.tipo}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-gray-500">Inicio</span>
                        <p>{new Date(tooltipData.ausencia.fechaInicio).toLocaleDateString('es-ES')}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Fin</span>
                        <p>{new Date(tooltipData.ausencia.fechaFin).toLocaleDateString('es-ES')}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Días laborables</span>
                      <p>
                        {tooltipData.ausencia.diasLaborables}{' '}
                        {tooltipData.ausencia.diasLaborables === 1 ? 'día' : 'días'}
                      </p>
                    </div>
                    {tooltipData.ausencia.motivo && (
                      <div>
                        <span className="text-xs text-gray-500">Motivo</span>
                        <p>{tooltipData.ausencia.motivo}</p>
                      </div>
                    )}
                  </>
                ) : esDiaLaborable(tooltipData.date) && puedeAccionar ? (
                  <>
                    <p className="text-sm text-gray-600">Día laborable disponible</p>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleOpenSolicitud}
                    >
                      {puedeRegistrar ? 'Registrar ausencia' : 'Solicitar ausencia'}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Día no laborable</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {puedeAccionar && (
        <>
          <SolicitarAusenciaModal
            open={solicitudModalOpen}
            onClose={() => {
              if (onExternalModalOpenChange) {
                onExternalModalOpenChange(false);
              } else {
                setInternalModalOpen(false);
              }
            }}
            onSuccess={async () => {
              if (onExternalModalOpenChange) {
                onExternalModalOpenChange(false);
              } else {
                setInternalModalOpen(false);
              }
              await Promise.all([cargarAusencias(), cargarSaldo()]);
            }}
            saldoDisponible={saldoResumen.diasDisponibles}
            contexto={contexto}
            empleadoIdDestino={puedeRegistrar ? empleadoId : undefined}
          />
          
          <EditarAusenciaModal
            open={Boolean(ausenciaModalData)}
            ausencia={ausenciaModalData}
            onClose={() => setAusenciaParaEditar(null)}
            onSuccess={async () => {
              setAusenciaParaEditar(null);
              await Promise.all([cargarAusencias(), cargarSaldo()]);
            }}
            contexto={contexto}
          />

          {contexto === 'hr_admin' && (
            <FestivosPersonalizadosModal
              open={festivosModalOpen}
              onClose={() => setFestivosModalOpen(false)}
              empleadoId={empleadoId}
              empleadoNombre={empleadoNombre}
            />
          )}
        </>
      )}
      </div>
    </>
  );
}
