'use client';

// ========================================
// Fichajes Client Component - Vista por Jornadas
// ========================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Check, Clock } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CompactFilterBar } from '@/components/adaptive/CompactFilterBar';
import { PageMobileHeader } from '@/components/layout/page-mobile-header';
import { EmpleadoHoverCard } from '@/components/empleado/empleado-hover-card';
import { AvatarCell, DataTable, type Column } from '@/components/shared/data-table';
import { CompensarHorasDialog } from '@/components/shared/compensar-horas-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { FichajeModal } from '@/components/shared/fichajes/fichaje-modal';
import { DataFilters, type FilterOption } from '@/components/shared/filters/data-filters';
import { DateRangeControls } from '@/components/shared/filters/date-range-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EstadoFichaje } from '@/lib/constants/enums';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { extraerHoraDeISO, formatearHorasMinutos } from '@/lib/utils/formatters';
import { calcularRangoFechas, obtenerEtiquetaPeriodo, toMadridDate } from '@/lib/utils/fechas';
import { parseJson } from '@/lib/utils/json';

import { JornadasModal } from './jornadas-modal';

// NUEVO MODELO: Fichaje tiene eventos dentro
interface FichajeEvento {
  id: string;
  tipo: string;
  hora: string;
  editado: boolean;
  motivoEdicion: string | null;
}

interface Fichaje {
  id: string;
  fecha: string;
  estado: string;
  horasTrabajadas: number | string | null; // Prisma Decimal se serializa como string
  horasEnPausa: number | string | null; // Prisma Decimal se serializa como string
  horasEsperadas?: number | string | null;
  balance?: number | string | null;
  autoCompletado: boolean;
  eventos: FichajeEvento[];
  empleado: {
    id: string;
    nombre: string;
    apellidos: string;
    puesto: string;
    equipoId?: string | null;
    equipo?: {
      id: string;
      nombre: string;
    } | null;
    email?: string | null;
    fotoUrl?: string | null;
  };
}

interface JornadaDia {
  empleadoId: string;
  empleadoNombre: string;
  equipoId?: string | null;
  equipoNombre?: string | null;
  fecha: Date;
  fichaje: Fichaje;
  horasTrabajadas: number;
  horasEsperadas: number;
  horarioEntrada: string | null;
  horarioSalida: string | null;
  balance: number;
}

const ESTADO_OPTIONS: FilterOption[] = [
  { value: 'en_curso', label: 'En curso' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'finalizado', label: 'Finalizado' },
];

const FICHAJE_ESTADO_VARIANTS: Record<string, { label: string; className: string }> = {
  en_curso: { label: 'En curso', className: 'bg-blue-100 text-blue-800' },
  pendiente: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
  finalizado: { label: 'Finalizado', className: 'bg-gray-100 text-gray-800' },
};

const getFichajeEstadoLabel = (estado: string): string =>
  (FICHAJE_ESTADO_VARIANTS[estado] ?? FICHAJE_ESTADO_VARIANTS.en_curso).label;

export function FichajesClient({ initialState }: { initialState?: string }) {
  const router = useRouter();
  const [jornadas, setJornadas] = useState<JornadaDia[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros State
  const [filtroEstadoFichaje, setFiltroEstadoFichaje] = useState(initialState || 'todos');
  const [filtroEquipo, setFiltroEquipo] = useState('todos');
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  const [equiposOptions, setEquiposOptions] = useState<FilterOption[]>([]);
  
  // Date State
  const [rangoFechas, setRangoFechas] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [fechaBase, setFechaBase] = useState(new Date());

  // Modals
  const [jornadasModal, setJornadasModal] = useState(false);
  const [showCompensarHorasDialog, setShowCompensarHorasDialog] = useState(false);
  const [periodoCompensar, setPeriodoCompensar] = useState<{ mes: number; anio: number }>(() =>
    obtenerPeriodoDesdeFecha(new Date())
  );
  const [editarFichajeModal, setEditarFichajeModal] = useState<{
    open: boolean;
    fichajeDiaId: string | null;
  }>({
    open: false,
    fichajeDiaId: null,
  });
  
  const isMobile = useIsMobile();

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
        console.error('[Fichajes] Error cargando equipos', error);
      }
    }
    loadEquipos();
  }, []);

  const calcularHorasTrabajadas = useCallback((eventos: FichajeEvento[]): number => {
    let horasTotales = 0;
    let inicioTrabajo: Date | null = null;

    for (const evento of eventos) {
      const hora = new Date(evento.hora);

      switch (evento.tipo) {
        case 'entrada':
          inicioTrabajo = hora;
          break;

        case 'pausa_inicio':
          if (inicioTrabajo) {
            const tiempoTrabajado = (hora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
            horasTotales += tiempoTrabajado;
            inicioTrabajo = null;
          }
          break;

        case 'pausa_fin':
          inicioTrabajo = hora;
          break;

        case 'salida':
          if (inicioTrabajo) {
            const tiempoTrabajado = (hora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
            horasTotales += tiempoTrabajado;
            inicioTrabajo = null;
          }
          break;
      }
    }

    return Math.round(horasTotales * 100) / 100;
  }, []);

  const obtenerFechaReferencia = useCallback((fichaje: Fichaje): Date => {
    const primerEvento = fichaje.eventos?.[0];
    if (primerEvento?.hora) {
      const horaEvento =
        typeof primerEvento.hora === 'string' ? new Date(primerEvento.hora) : primerEvento.hora;
      return toMadridDate(horaEvento);
    }

    return toMadridDate(fichaje.fecha);
  }, []);

  const agruparPorJornada = useCallback((fichajes: Fichaje[]): JornadaDia[] => {
    const grupos: Record<string, Fichaje[]> = {};

    fichajes.forEach(f => {
      // Normalizar fecha a string YYYY-MM-DD para usar como key
      const fechaReferencia = obtenerFechaReferencia(f);
      const fechaKey = format(fechaReferencia, 'yyyy-MM-dd');
      
      if (!grupos[fechaKey]) {
        grupos[fechaKey] = [];
      }
      grupos[fechaKey].push(f);
    });

    return Object.entries(grupos).map(([fecha, fichajesDelDia]) => {
      const eventosOrdenados = (
        fichajesDelDia.flatMap((registro) => registro.eventos) as FichajeEvento[]
      ).sort(
          (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime()
        );

      let horasTrabajadas = 0;
      const fichaje = fichajesDelDia[0];
      if (fichaje.horasTrabajadas !== null && fichaje.horasTrabajadas !== undefined) {
        const valor = fichaje.horasTrabajadas;
        horasTrabajadas = typeof valor === 'string' ? parseFloat(valor) : valor;
        if (Number.isNaN(horasTrabajadas)) {
          horasTrabajadas = calcularHorasTrabajadas(eventosOrdenados) ?? 0;
        }
      } else {
        horasTrabajadas = calcularHorasTrabajadas(eventosOrdenados) ?? 0;
      }

      const entrada = eventosOrdenados.find(e => e.tipo === 'entrada');
      const salida = eventosOrdenados.find(e => e.tipo === 'salida');

      // Extraer hora directamente del ISO string para evitar desfases de zona horaria
      const horarioEntrada = entrada ? extraerHoraDeISO(entrada.hora) : null;
      const horarioSalida = salida ? extraerHoraDeISO(salida.hora) : null;

      const horasEsperadas = (() => {
        const valor = (fichaje as { horasEsperadas?: number | string | null }).horasEsperadas;
        if (valor === null || valor === undefined) {
          return 0;
        }
        const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
        return Number.isFinite(numero) ? numero : 0;
      })();

      const balance = (() => {
        const valor = (fichaje as { balance?: number | string | null }).balance;
        if (valor === null || valor === undefined) {
          return Math.round((horasTrabajadas - horasEsperadas) * 100) / 100;
        }
        const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
        return Number.isFinite(numero)
          ? numero
          : Math.round((horasTrabajadas - horasEsperadas) * 100) / 100;
      })();

      // Convertir fecha string a Date usando toMadridDate para evitar desfases de zona horaria
      const fechaDate = toMadridDate(fecha);
      
      return {
        empleadoId: fichaje.empleado.id,
        empleadoNombre: `${fichaje.empleado.nombre} ${fichaje.empleado.apellidos}`,
        equipoId: fichaje.empleado.equipoId ?? null,
        equipoNombre: fichaje.empleado.equipo?.nombre ?? null,
        fecha: fechaDate,
        fichaje,
        horasTrabajadas,
        horasEsperadas,
        horarioEntrada,
        horarioSalida,
        balance,
      };
    }).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }, [calcularHorasTrabajadas, obtenerFechaReferencia]);

  const fetchFichajes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Calcular rango de fechas según selección
      const { inicio, fin } = calcularRangoFechas(fechaBase, rangoFechas);
      // Usar format local para evitar desfases de zona horaria que introduce toISOString()
      params.append('fechaInicio', format(inicio, 'yyyy-MM-dd'));
      params.append('fechaFin', format(fin, 'yyyy-MM-dd'));

      if (filtroEstadoFichaje !== 'todos') {
        params.append('estado', filtroEstadoFichaje);
      }
      if (filtroEquipo !== 'todos') {
        params.append('equipoId', filtroEquipo);
      }

      const response = await fetch(`/api/fichajes?${params}`);
      const payload =
        (await parseJson<Record<string, unknown>>(response).catch(() => undefined)) ?? {};

      if (!response.ok) {
        const errorMessage =
          (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string')
            ? payload.error
            : 'No se pudieron cargar los fichajes';
        toast.error(errorMessage);
        setJornadas([]);
        return;
      }

      const fichajes = extractArrayFromResponse<Fichaje>(payload, { key: 'fichajes' });
      const jornadasAgrupadas = agruparPorJornada(fichajes);
      setJornadas(jornadasAgrupadas);
    } catch (error) {
      console.error('Error fetching fichajes:', error);
    } finally {
      setLoading(false);
    }
  }, [agruparPorJornada, fechaBase, filtroEquipo, filtroEstadoFichaje, rangoFechas]);

  useEffect(() => {
    fetchFichajes();
  }, [fetchFichajes]);

  // Listener para refrescar en tiempo real
  useEffect(() => {
    function handleRealtimeUpdate() {
      fetchFichajes();
    }
    window.addEventListener('fichaje-updated', handleRealtimeUpdate);
    return () => window.removeEventListener('fichaje-updated', handleRealtimeUpdate);
  }, [fetchFichajes]);

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

  // Filtrar jornadas por búsqueda de empleado
  // El filtro de estado y equipo YA se aplica en backend, pero mantenemos búsqueda local por si acaso
  // para la responsividad inmediata mientras carga o si el backend devuelve más de lo necesario.
  const jornadasFiltradas = useMemo(() => {
    let filtradas = jornadas;

    if (busquedaEmpleado) {
      filtradas = filtradas.filter(j => 
        j.empleadoNombre.toLowerCase().includes(busquedaEmpleado.toLowerCase())
      );
    }

    // Nota: Filtros de estado y equipo aplicados en servidor (fetchFichajes)
    
    return filtradas;
  }, [jornadas, busquedaEmpleado]);

  const resolveEmpleadoHoverInfo = useCallback((jornada: JornadaDia) => {
    const empleado = jornada.fichaje?.empleado;

    return {
      id: empleado?.id ?? jornada.empleadoId,
      nombre: empleado?.nombre ?? jornada.empleadoNombre,
      apellidos: empleado?.apellidos ?? null,
      puesto: empleado?.puesto ?? null,
      equipoNombre: empleado?.equipo?.nombre ?? jornada.equipoNombre ?? null,
      email: empleado?.email ?? null,
      fotoUrl: empleado?.fotoUrl ?? undefined,
    };
  }, []);

  const handleVerDetalles = useCallback((fichajeId: string) => {
    setEditarFichajeModal({
      open: true,
      fichajeDiaId: fichajeId,
    });
  }, [setEditarFichajeModal]);

  const handleAbrirCompensacion = () => {
    setPeriodoCompensar(obtenerPeriodoDesdeFecha(fechaBase));
    setShowCompensarHorasDialog(true);
  };

  const renderMobileList = () => (
    <div className="space-y-4 pb-20">
      {jornadasFiltradas.length === 0 ? (
        <EmptyState
          layout="inline"
          icon={Clock}
          title={busquedaEmpleado ? 'No se encontraron empleados' : 'No hay fichajes'}
          description={
            busquedaEmpleado
              ? 'Prueba con otro nombre o restablece los filtros.'
              : 'Cambia el periodo o ajusta los filtros para ver registros.'
          }
        />
      ) : (
        jornadasFiltradas.map((jornada) => {
          return (
          <Card
            key={`${jornada.empleadoId}-${jornada.fecha.toISOString()}`}
            className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition"
            onClick={() => handleVerDetalles(jornada.fichaje.id)}
          >
            <div className="flex justify-between items-start">
              <div>
                <EmpleadoHoverCard
                  empleado={resolveEmpleadoHoverInfo(jornada)}
                  estado={{ label: getFichajeEstadoLabel(jornada.fichaje.estado) }}
                  triggerClassName="font-medium text-gray-900"
                >
                  {jornada.empleadoNombre}
                </EmpleadoHoverCard>
                <p className="text-xs text-gray-500">{format(jornada.fecha, 'EEEE, d MMM', { locale: es })}</p>
              </div>
              <EstadoBadge estado={jornada.fichaje.estado} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 py-2 border-t border-gray-100 mt-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">Horario</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm font-medium">
                    {jornada.horarioEntrada || '--:--'} - {jornada.horarioSalida || '--:--'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Horas</p>
                <div className="text-sm">
                  <span className="font-bold text-gray-900">{formatearHorasMinutos(jornada.horasTrabajadas)}</span>
                  <span className="text-gray-600"> / {formatearHorasMinutos(jornada.horasEsperadas)}</span>
                </div>
              </div>
            </div>

            {jornada.balance !== 0 && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                <span className="text-gray-500">Balance diario</span>
                <span className={`font-medium ${jornada.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {jornada.balance > 0 ? '+' : ''}{formatearHorasMinutos(jornada.balance)}
                </span>
              </div>
            )}
          </Card>
        );})
      )}
    </div>
  );

  const columns = useMemo<Column<JornadaDia>[]>(() => [
    {
      id: 'empleado',
      header: 'Empleado',
      priority: 'high',
      cell: (jornada) => (
        <EmpleadoHoverCard
          empleado={resolveEmpleadoHoverInfo(jornada)}
          estado={{ label: getFichajeEstadoLabel(jornada.fichaje.estado) }}
          triggerClassName="block"
          side="right"
        >
          <AvatarCell
            nombre={jornada.fichaje.empleado?.nombre ?? jornada.empleadoNombre}
            apellidos={jornada.fichaje.empleado?.apellidos ?? undefined}
            fotoUrl={jornada.fichaje.empleado?.fotoUrl ?? undefined}
            subtitle={jornada.fichaje.empleado?.puesto ?? undefined}
            compact
          />
        </EmpleadoHoverCard>
      ),
    },
    {
      id: 'fecha',
      header: 'Fecha',
      align: 'center',
      priority: 'medium',
      cell: (jornada) => (
        <span className="text-sm text-gray-600">
          {format(jornada.fecha, 'dd MMM', { locale: es })}
        </span>
      ),
    },
    {
      id: 'horas',
      header: 'Horas',
      align: 'center',
      cell: (jornada) => (
        <span className="text-sm text-gray-600">
          <span className="font-bold text-gray-900">{formatearHorasMinutos(jornada.horasTrabajadas)}</span>
          {' / '}
          {formatearHorasMinutos(jornada.horasEsperadas)}
        </span>
      ),
    },
    {
      id: 'horario',
      header: 'Horario',
      align: 'center',
      priority: 'low',
      cell: (jornada) => (
        <span className="text-sm text-gray-600">
          {jornada.horarioEntrada ? `${jornada.horarioEntrada} - ${jornada.horarioSalida || '...'}` : '—'}
        </span>
      ),
    },
    {
      id: 'balance',
      header: 'Balance',
      align: 'center',
      cell: (jornada) => (
        <span
          className={`text-sm font-medium ${
            jornada.balance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {jornada.balance > 0 ? '+' : ''}
          {formatearHorasMinutos(jornada.balance)}
        </span>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      align: 'center',
      cell: (jornada) => <EstadoBadge estado={jornada.fichaje.estado} />,
    },
  ], [resolveEmpleadoHoverInfo]);

  const desktopEmptyTitle = busquedaEmpleado ? 'No se encontraron empleados' : 'No hay fichajes';
  const desktopEmptyDescription = busquedaEmpleado
    ? 'Prueba con otro nombre o restablece los filtros.'
    : 'Cambia el periodo o ajusta los filtros para ver registros.';

  function EstadoBadge({ estado }: { estado: string }) {
    const variant = FICHAJE_ESTADO_VARIANTS[estado] || FICHAJE_ESTADO_VARIANTS.en_curso;
    return (
      <Badge className={variant.className + ' text-xs'}>
        {variant.label}
      </Badge>
    );
  }

  return (
    <div className="h-full w-full flex flex-col px-1 py-1 sm:max-w-[1800px] sm:mx-auto sm:px-8 sm:py-6">
      {isMobile ? (
        <>
          <PageMobileHeader
            title="Fichajes"
            actions={[
              {
                label: 'Cuadrar',
                onClick: () => router.push('/hr/horario/fichajes/cuadrar'),
                icon: Check,
                isPrimary: true,
                isSpecialAction: true,
              },
              {
                icon: Calendar,
                label: 'Gestionar jornadas',
                onClick: () => setJornadasModal(true),
              },
              {
                icon: Clock,
                label: 'Compensar horas',
                onClick: handleAbrirCompensacion,
              },
            ]}
          />

          {/* Navegación de período + filtros */}
          <div className="flex-shrink-0 mb-3 space-y-3">
            <DateRangeControls
              variant="mobile"
              range={rangoFechas}
              label={periodLabel}
              onRangeChange={setRangoFechas}
              onNavigate={(direction) => (direction === 'prev' ? goToPreviousPeriod() : goToNextPeriod())}
            />

            {/* Búsqueda y filtros */}
            <CompactFilterBar
              searchValue={busquedaEmpleado}
              onSearchChange={setBusquedaEmpleado}
              searchPlaceholder="Buscar empleado..."
              activeFiltersCount={(filtroEstadoFichaje !== 'todos' ? 1 : 0) + (filtroEquipo !== 'todos' ? 1 : 0)}
              filtersContent={
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Estado del fichaje
                    </label>
                    <Select value={filtroEstadoFichaje} onValueChange={setFiltroEstadoFichaje}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Estado del fichaje" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {ESTADO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Equipo
                    </label>
                    <Select value={filtroEquipo} onValueChange={setFiltroEquipo}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los equipos</SelectItem>
                        <SelectItem value="sin_equipo">Sin equipo asignado</SelectItem>
                        {equiposOptions.map((equipo) => (
                          <SelectItem key={equipo.value} value={equipo.value}>
                            {equipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              }
              filtersTitle="Filtros"
            />
          </div>

          {/* Table - Ocupa el resto del viewport (70-80%) */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {renderMobileList()}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Fichajes</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setJornadasModal(true)} className="border-gray-200">
                <Clock className="w-4 h-4 mr-2" />
                Gestionar Jornadas
              </Button>
              <Button variant="outline" className="border-gray-200" onClick={handleAbrirCompensacion}>
                <Clock className="w-4 h-4 mr-2" />
                Compensar horas
              </Button>
              <Button asChild className="bg-gray-900 text-white hover:bg-gray-800">
                <Link href="/hr/horario/fichajes/cuadrar">+ Cuadrar fichajes</Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <DataFilters
              searchQuery={busquedaEmpleado}
              onSearchChange={setBusquedaEmpleado}
              estadoValue={filtroEstadoFichaje}
              onEstadoChange={setFiltroEstadoFichaje}
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
              data={jornadasFiltradas}
              onRowClick={(jornada) => handleVerDetalles(jornada.fichaje.id)}
              getRowId={(jornada) => `${jornada.empleadoId}-${jornada.fecha.toISOString()}`}
              emptyContent={
                <EmptyState
                  layout="table"
                  icon={Clock}
                  title={desktopEmptyTitle}
                  description={desktopEmptyDescription}
                />
              }
            />
          </div>
        </>
      )}

      {/* Modal Gestionar Jornadas */}
      <JornadasModal 
        open={jornadasModal} 
        onClose={() => setJornadasModal(false)} 
      />

      {/* Modal Editar Fichaje */}
      <FichajeModal
        open={editarFichajeModal.open}
        fichajeDiaId={editarFichajeModal.fichajeDiaId ?? undefined}
        onClose={() => setEditarFichajeModal({ open: false, fichajeDiaId: null })}
        onSuccess={() => {
          setEditarFichajeModal({ open: false, fichajeDiaId: null });
          fetchFichajes();
        }}
        contexto="hr_admin"
        modo="editar"
      />

      {showCompensarHorasDialog && (
        <CompensarHorasDialog
          context="fichajes"
          mesInicial={periodoCompensar.mes}
          anioInicial={periodoCompensar.anio}
          isOpen={showCompensarHorasDialog}
          onClose={() => setShowCompensarHorasDialog(false)}
        />
      )}
    </div>
  );
}

function obtenerPeriodoDesdeFecha(fecha: Date) {
  const referencia = toMadridDate(fecha);
  return {
    mes: referencia.getMonth() + 1,
    anio: referencia.getFullYear(),
  };
}
