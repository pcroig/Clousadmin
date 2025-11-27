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
import { MobileActionBar } from '@/components/adaptive/MobileActionBar';
import { ResponsiveContainer } from '@/components/adaptive/ResponsiveContainer';
import { CompensarHorasDialog } from '@/components/shared/compensar-horas-dialog';
import { FichajeModal } from '@/components/shared/fichajes/fichaje-modal';
import { DataFilters, type FilterOption } from '@/components/shared/filters/data-filters';
import { DateRangeControls } from '@/components/shared/filters/date-range-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EstadoFichaje } from '@/lib/constants/enums';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { formatearHorasMinutos } from '@/lib/utils/formatters';
import { calcularRangoFechas, toMadridDate } from '@/lib/utils/fechas';
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
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'revisado', label: 'Revisado' },
  { value: 'pendiente', label: 'Pendiente' },
];

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

  const agruparPorJornada = useCallback((fichajes: Fichaje[]): JornadaDia[] => {
    const grupos: Record<string, Fichaje[]> = {};

    fichajes.forEach(f => {
      // Normalizar fecha a string YYYY-MM-DD para usar como key
      const fechaKey = f.fecha instanceof Date 
        ? format(toMadridDate(f.fecha), 'yyyy-MM-dd')
        : typeof f.fecha === 'string'
        ? format(toMadridDate(f.fecha), 'yyyy-MM-dd')
        : format(toMadridDate(new Date(f.fecha)), 'yyyy-MM-dd');
      
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

      const horarioEntrada = entrada ? format(new Date(entrada.hora), 'HH:mm') : null;
      const horarioSalida = salida ? format(new Date(salida.hora), 'HH:mm') : null;

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
      const fechaDate = typeof fecha === 'string' ? toMadridDate(fecha) : fecha instanceof Date ? toMadridDate(fecha) : new Date(fecha);
      
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
  }, [calcularHorasTrabajadas]);

  // Listener para refrescar en tiempo real
  useEffect(() => {
    function handleRealtimeUpdate() {
      fetchFichajes();
    }
    window.addEventListener('fichaje-updated', handleRealtimeUpdate);
    return () => window.removeEventListener('fichaje-updated', handleRealtimeUpdate);
  }, []);

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

  const periodLabel = useMemo(() => {
    switch (rangoFechas) {
      case 'dia':
        return format(fechaBase, 'dd MMM', { locale: es });
      case 'semana':
        return `Sem ${format(fechaBase, 'w', { locale: es })}`;
      default:
        return format(fechaBase, 'MMM yyyy', { locale: es });
    }
  }, [fechaBase, rangoFechas]);

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

  // Stats Counters
  const fichajesRevisados = useMemo(() => 
    jornadasFiltradas.filter(j => j.fichaje.estado === 'revisado').length,
    [jornadasFiltradas]
  );

  const fichajesPendientesRevision = useMemo(() => 
    jornadasFiltradas.filter(j => 
      j.fichaje.estado === EstadoFichaje.pendiente || 
      j.fichaje.estado === 'pendiente_revision' || // Legacy
      j.fichaje.estado === EstadoFichaje.en_curso ||
      j.fichaje.estado === 'rechazado' // Legacy - tratar como pendiente
    ).length,
    [jornadasFiltradas]
  );

  const obtenerTiempoPendiente = useCallback(
    (jornada: JornadaDia) => Math.max(jornada.horasEsperadas - jornada.horasTrabajadas, 0),
    []
  );

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
        <div className="text-center py-10 text-gray-500">
          {busquedaEmpleado ? 'No se encontraron empleados' : 'No hay fichajes'}
        </div>
      ) : (
        jornadasFiltradas.map((jornada) => {
          const tiempoPendiente = obtenerTiempoPendiente(jornada);
          return (
          <Card
            key={`${jornada.empleadoId}-${jornada.fecha.toISOString()}`}
            className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition"
            onClick={() => handleVerDetalles(jornada.fichaje.id)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900">{jornada.empleadoNombre}</h3>
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
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Trabajado</p>
                  <div className="text-sm font-medium">
                    {formatearHorasMinutos(jornada.horasTrabajadas)}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tiempo pendiente</p>
                  <div className={`text-sm font-medium ${tiempoPendiente > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {tiempoPendiente > 0 ? formatearHorasMinutos(tiempoPendiente) : 'Sin pendientes'}
                  </div>
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

  const renderDesktopTable = () => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Horas Trabajadas</TableHead>
              <TableHead>Tiempo pendiente</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jornadasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                  {busquedaEmpleado ? 'No se encontraron empleados' : 'No hay fichajes'}
                </TableCell>
              </TableRow>
            ) : (
              jornadasFiltradas.map((jornada) => {
                const tiempoPendiente = obtenerTiempoPendiente(jornada);
                return (
                <TableRow
                  key={`${jornada.empleadoId}-${jornada.fecha.toISOString()}`}
                  className="cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => handleVerDetalles(jornada.fichaje.id)}
                >
                  <TableCell className="font-medium text-gray-900">
                    <div>{jornada.empleadoNombre}</div>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {format(jornada.fecha, 'dd MMM', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-900">
                      {formatearHorasMinutos(jornada.horasTrabajadas)}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {tiempoPendiente > 0 ? formatearHorasMinutos(tiempoPendiente) : 'Sin pendientes'}
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs">
                    {jornada.horarioEntrada ? (
                      <span>
                        {jornada.horarioEntrada} - {jornada.horarioSalida || '...'}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm ${
                        jornada.balance >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}
                    >
                      {jornada.balance > 0 ? '+' : ''}{formatearHorasMinutos(jornada.balance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={jornada.fichaje.estado} />
                  </TableCell>
                </TableRow>
              );})
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  function EstadoBadge({ estado }: { estado: string }) {
    const variants: Record<string, { label: string; className: string }> = {
      en_curso: { label: 'En curso', className: 'bg-blue-100 text-blue-800' },
      finalizado: { label: 'Finalizado', className: 'bg-gray-100 text-gray-800' },
      revisado: { label: 'Revisado', className: 'bg-green-100 text-green-800' },
      pendiente: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      rechazado: { label: 'Rechazado', className: 'bg-red-100 text-red-800' },
      pendiente_revision: { label: 'Pendiente Rev.', className: 'bg-orange-100 text-orange-800' }
    };

    const variant = variants[estado] || variants.en_curso;
    return (
      <Badge className={variant.className + ' text-xs'}>
        {variant.label}
      </Badge>
    );
  }

  return (
    <ResponsiveContainer variant="page" className="h-full w-full flex flex-col overflow-hidden p-4 md:p-6">
      {isMobile ? (
        <>
          <MobileActionBar
            title="Fichajes"
            primaryAction={{
              label: 'Cuadrar',
              onClick: () => router.push('/hr/horario/fichajes/cuadrar'),
              display: 'label',
            }}
            secondaryActions={[
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
            className="mb-3"
          />

          {/* Navegación de período + filtros en una línea */}
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
                  {fichajesRevisados > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">
                        {fichajesRevisados} fichajes revisados
                      </span>
                    </div>
                  )}
                  {fichajesPendientesRevision > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700 font-medium">
                        {fichajesPendientesRevision} pendientes de revisión
                      </span>
                    </div>
                  )}
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
            >
              <div className="flex items-center gap-2">
                {fichajesRevisados > 0 && (
                  <Badge className="bg-green-50 text-green-700 border border-green-200">
                    {fichajesRevisados} revisados
                  </Badge>
                )}
                {fichajesPendientesRevision > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {fichajesPendientesRevision} pendientes
                  </Badge>
                )}
              </div>
            </DataFilters>
            
            <DateRangeControls
              range={rangoFechas}
              label={periodLabel}
              onRangeChange={setRangoFechas}
              onNavigate={(direction) => (direction === 'prev' ? goToPreviousPeriod() : goToNextPeriod())}
            />
          </div>
          <div className="flex-1 overflow-y-auto">{renderDesktopTable()}</div>
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
    </ResponsiveContainer>
  );
}

function obtenerPeriodoDesdeFecha(fecha: Date) {
  const referencia = toMadridDate(fecha);
  return {
    mes: referencia.getMonth() + 1,
    anio: referencia.getFullYear(),
  };
}
