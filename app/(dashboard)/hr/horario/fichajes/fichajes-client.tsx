'use client';

// ========================================
// Fichajes Client Component - Vista por Jornadas
// ========================================

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Check, ChevronLeft, ChevronRight, Clock, Filter, Plus } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CompactFilterBar } from '@/components/adaptive/CompactFilterBar';
import { MobileActionBar } from '@/components/adaptive/MobileActionBar';
import { MobilePageHeader } from '@/components/adaptive/MobilePageHeader';
import { ResponsiveContainer } from '@/components/adaptive/ResponsiveContainer';
import { CompensarHorasDialog } from '@/components/shared/compensar-horas-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

import { EditarFichajeModal } from './editar-fichaje-modal';
import { JornadasModal } from './jornadas-modal';
import { RevisionModal } from './revision-modal';



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
  };
}

interface JornadaDia {
  empleadoId: string;
  empleadoNombre: string;
  fecha: Date;
  fichaje: Fichaje;
  horasTrabajadas: number;
  horasEsperadas: number;
  horarioEntrada: string | null;
  horarioSalida: string | null;
  balance: number;
}

// Interfaz para el modal de edición (solo necesita el evento)
interface FichajeEventoParaEditar {
  id: string;
  tipo: string;
  hora: string;
  editado?: boolean;
}

export function FichajesClient({ initialState }: { initialState?: string }) {
  const [jornadas, setJornadas] = useState<JornadaDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstadoFichaje, setFiltroEstadoFichaje] = useState(initialState || 'todos'); // fichaje individual: confirmado/auto/rechazado
  const [rangoFechas, setRangoFechas] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [fechaBase, setFechaBase] = useState(new Date());
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  const [jornadasModal, setJornadasModal] = useState(false);
  const [revisionModal, setRevisionModal] = useState(false);
  const [cuadrandoFichajes, setCuadrandoFichajes] = useState(false);
  const [showCompensarHorasDialog, setShowCompensarHorasDialog] = useState(false);
  const [periodoCompensar, setPeriodoCompensar] = useState<{ mes: number; anio: number }>(() =>
    obtenerPeriodoDesdeFecha(new Date())
  );
  const [editarFichajeModal, setEditarFichajeModal] = useState<{
    open: boolean;
    fichaje: FichajeEventoParaEditar | null;
  }>({
    open: false,
    fichaje: null,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

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
      if (!grupos[f.fecha]) {
        grupos[f.fecha] = [];
      }
      grupos[f.fecha].push(f);
    });

    return Object.entries(grupos).map(([fecha, fichajesDelDia]) => {
      const eventosOrdenados = fichajesDelDia
        .flatMap<FichajeEvento>((registro) => registro.eventos)
        .sort(
          (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime()
        );

      let horasTrabajadas = 0;
      const fichaje = fichajesDelDia[0];
      if (fichaje.horasTrabajadas !== null && fichaje.horasTrabajadas !== undefined) {
        const valor = fichaje.horasTrabajadas;
        horasTrabajadas = typeof valor === 'string' ? parseFloat(valor) : valor;
        if (Number.isNaN(horasTrabajadas)) {
          horasTrabajadas = calcularHorasTrabajadas(eventosOrdenados);
        }
      } else {
        horasTrabajadas = calcularHorasTrabajadas(eventosOrdenados);
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

      return {
        empleadoId: fichaje.empleado.id,
        empleadoNombre: `${fichaje.empleado.nombre} ${fichaje.empleado.apellidos}`,
        fecha: new Date(fecha),
        fichaje,
        horasTrabajadas,
        horasEsperadas,
        horarioEntrada,
        horarioSalida,
        balance,
      };
    }).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }, [calcularHorasTrabajadas]);

  const fetchFichajes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Calcular rango de fechas según selección
      const { inicio, fin } = calcularRangoFechas(fechaBase, rangoFechas);
      params.append('fechaInicio', inicio.toISOString().split('T')[0]);
      params.append('fechaFin', fin.toISOString().split('T')[0]);

      if (filtroEstadoFichaje !== 'todos') {
        params.append('estado', filtroEstadoFichaje);
      }

      const response = await fetch(`/api/fichajes?${params}`);
      const payload = await response.json();

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
  }, [agruparPorJornada, fechaBase, rangoFechas, filtroEstadoFichaje]);

  useEffect(() => {
    fetchFichajes();
  }, [fetchFichajes]);

  function calcularRangoFechas(fecha: Date, rango: 'dia' | 'semana' | 'mes') {
    const inicio = new Date(fecha);
    const fin = new Date(fecha);

    switch (rango) {
      case 'dia':
        // Mismo día
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      case 'semana':
        // Inicio de semana (lunes)
        const diaSemana = fecha.getDay();
        const diffInicio = diaSemana === 0 ? -6 : 1 - diaSemana;
        inicio.setDate(fecha.getDate() + diffInicio);
        inicio.setHours(0, 0, 0, 0);
        // Fin de semana (domingo)
        fin.setDate(inicio.getDate() + 6);
        fin.setHours(23, 59, 59, 999);
        break;
      case 'mes':
        // Primer día del mes
        inicio.setDate(1);
        inicio.setHours(0, 0, 0, 0);
        // Último día del mes
        fin.setMonth(fecha.getMonth() + 1, 0);
        fin.setHours(23, 59, 59, 999);
        break;
    }

    return { inicio, fin };
  }

  // NUEVO MODELO: Los fichajes ya vienen agrupados (un fichaje por día con eventos)
  // useEffect(() => {
  //   fetchFichajes();
  // }, [filtroEstadoFichaje, rangoFechas, fechaBase]);

  // useEffect(() => {
  //   fetchFichajes();
  // }, [filtroEstadoFichaje, rangoFechas, fechaBase]);

  async function handleCuadrarFichajes() {
    setCuadrandoFichajes(true);
    
    try {
      console.log('[Cuadrar fichajes] Abriendo modal de revisión...');
      
      // Abrir modal de revisión directamente
      setRevisionModal(true);
      
    } catch (error) {
      console.error('[Cuadrar fichajes] Error:', error);
      toast.error('Error al abrir cuadre de fichajes. Revisa la consola para más detalles.');
    } finally {
      setCuadrandoFichajes(false);
    }
  }

  async function handleEditarFichajeDesdeRevision({ fichajeId, empleadoId, fecha }: { fichajeId: string; empleadoId: string; fecha: string }) {
    setRevisionModal(false);

    const fechaIso = new Date(fecha).toISOString();
    const rowKey = `${empleadoId}_${fechaIso}`;

    setTimeout(() => {
      const rowElement = document.getElementById(rowKey);
      rowElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);

    try {
      const response = await fetch(`/api/fichajes/${fichajeId}`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const eventos = Array.isArray(data.eventos) ? data.eventos : [];
      if (eventos.length === 0) {
        return;
      }

      const eventoSalida = eventos.find((evento: FichajeEvento) => evento.tipo === 'salida');
      const eventoObjetivo = eventoSalida || eventos[eventos.length - 1];

      if (eventoObjetivo) {
        setEditarFichajeModal({
          open: true,
          fichaje: {
            id: eventoObjetivo.id,
            tipo: eventoObjetivo.tipo,
            hora: eventoObjetivo.hora,
            editado: Boolean(eventoObjetivo.editado),
          },
        });
      }
    } catch (error) {
      console.error('[Fichajes] Error al abrir edición desde revisión:', error);
    }
  }

  async function handleEditarFichaje(fichajeId: string, hora: string, tipo: string) {
    try {
      const response = await fetch(`/api/fichajes/${fichajeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hora,
          tipo,
        }),
      });

      if (response.ok) {
        toast.success('Fichaje actualizado correctamente');
        fetchFichajes(); // Recargar fichajes
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al actualizar fichaje');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar fichaje');
    }
  }

  const handleAbrirCompensacion = () => {
    setPeriodoCompensar(obtenerPeriodoDesdeFecha(fechaBase));
    setShowCompensarHorasDialog(true);
  };

  const openEditarModalFromJornada = (jornada: JornadaDia) => {
    const eventos = jornada.fichaje.eventos;
    if (!eventos || eventos.length === 0) {
      return;
    }
    const eventoSalida = eventos.find((e: FichajeEvento) => e.tipo === 'salida');
    const target = eventoSalida || eventos[eventos.length - 1];
    if (!target) {
      return;
    }
    setEditarFichajeModal({
      open: true,
      fichaje: {
        id: target.id,
        tipo: target.tipo,
        hora: target.hora,
        editado: Boolean(target.editado),
      },
    });
  };

  // Funciones de navegación de fechas - definidas antes de su uso
  const goToPreviousPeriod = useCallback(() => {
    setFechaBase((prev) => {
      const nueva = new Date(prev);
      if (rangoFechas === 'dia') nueva.setDate(nueva.getDate() - 1);
      else if (rangoFechas === 'semana') nueva.setDate(nueva.getDate() - 7);
      else nueva.setMonth(nueva.getMonth() - 1);
      return nueva;
    });
  }, [rangoFechas]);

  const goToNextPeriod = useCallback(() => {
    setFechaBase((prev) => {
      const nueva = new Date(prev);
      if (rangoFechas === 'dia') nueva.setDate(nueva.getDate() + 1);
      else if (rangoFechas === 'semana') nueva.setDate(nueva.getDate() + 7);
      else nueva.setMonth(nueva.getMonth() + 1);
      return nueva;
    });
  }, [rangoFechas]);

  const resetToToday = useCallback(() => {
    setFechaBase(new Date());
  }, []);

  const periodLabel = useMemo(() => {
    if (rangoFechas === 'dia') {
      return format(fechaBase, 'dd MMM', { locale: es });
    }
    if (rangoFechas === 'semana') {
      return `Sem ${format(fechaBase, 'w', { locale: es })}`;
    }
    return format(fechaBase, 'MMM yyyy', { locale: es });
  }, [fechaBase, rangoFechas]);

  // Filtrar jornadas por búsqueda de empleado y estado de fichaje
  const jornadasFiltradas = useMemo(() => {
    let filtradas = busquedaEmpleado
      ? jornadas.filter(j => 
          j.empleadoNombre.toLowerCase().includes(busquedaEmpleado.toLowerCase())
        )
      : jornadas;

    // Aplicar filtro de estado de fichaje
    if (filtroEstadoFichaje !== 'todos') {
      filtradas = filtradas.filter(jornada => 
        jornada.fichaje.estado === filtroEstadoFichaje
      );
    }

    return filtradas;
  }, [jornadas, busquedaEmpleado, filtroEstadoFichaje]);

  // Fichajes que requieren atención (no completados ni aprobados)
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

  const hasActiveFilters = useMemo(() => 
    filtroEstadoFichaje !== 'todos' || Boolean(busquedaEmpleado),
    [filtroEstadoFichaje, busquedaEmpleado]
  );

  const FiltersForm = ({ layout }: { layout: 'desktop' | 'mobile' }) => {
    const inputClassName = layout === 'desktop' ? 'w-[200px]' : 'w-full';
    const selectClassName = layout === 'desktop' ? 'w-[200px]' : 'w-full';
    return (
      <div className={layout === 'desktop' ? 'flex items-center gap-3 flex-wrap' : 'space-y-3'}>
        <Input
          placeholder="Buscar empleado..."
          value={busquedaEmpleado}
          onChange={(e) => setBusquedaEmpleado(e.target.value)}
          className={inputClassName}
        />
        <Select value={filtroEstadoFichaje} onValueChange={setFiltroEstadoFichaje}>
          <SelectTrigger className={selectClassName}>
            <SelectValue placeholder="Estado del fichaje" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="en_curso">En curso</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="revisado">Revisado</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
          </SelectContent>
        </Select>
        <div className={layout === 'desktop' ? 'flex items-center gap-2' : 'flex flex-wrap gap-2'}>
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
      </div>
    );
  };

  const DesktopDateControls = (
    <div className="flex items-center gap-2">
      <Select value={rangoFechas} onValueChange={(v) => setRangoFechas(v as 'dia' | 'semana' | 'mes')}>
        <SelectTrigger className="w-[120px]">
          <Calendar className="w-4 h-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dia">Día</SelectItem>
          <SelectItem value="semana">Semana</SelectItem>
          <SelectItem value="mes">Mes</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={goToPreviousPeriod} title="Período anterior">
        ←
      </Button>
      <span className="text-sm font-medium min-w-[160px] text-center">{periodLabel}</span>
      <Button variant="outline" size="sm" onClick={goToNextPeriod} title="Próximo período">
        →
      </Button>
      <Button variant="outline" size="sm" onClick={resetToToday}>
        Hoy
      </Button>
      {cuadrandoFichajes && <div className="text-sm text-gray-600 ml-2">Cuadrando...</div>}
    </div>
  );

  const MobileDateControls = (
    <div className="space-y-3">
      <Select value={rangoFechas} onValueChange={(v) => setRangoFechas(v as 'dia' | 'semana' | 'mes')}>
        <SelectTrigger className="w-full">
          <Calendar className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Rango" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dia">Día</SelectItem>
          <SelectItem value="semana">Semana</SelectItem>
          <SelectItem value="mes">Mes</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={goToPreviousPeriod} className="flex-1">
          Anterior
        </Button>
        <span className="text-sm font-semibold text-gray-900">{periodLabel}</span>
        <Button variant="outline" onClick={goToNextPeriod} className="flex-1">
          Siguiente
        </Button>
      </div>
      <Button variant="ghost" onClick={resetToToday} className="w-full text-gray-600">
        Ir a hoy
      </Button>
      {cuadrandoFichajes && <div className="text-sm text-gray-600">Cuadrando fichajes...</div>}
    </div>
  );

  const emptyStateMessage = busquedaEmpleado ? 'No se encontraron empleados' : 'No hay fichajes';

  const renderDesktopTable = () => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto px-2 sm:px-4">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>Empleado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Horas Trabajadas</TableHead>
              <TableHead>Horas Esperadas</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : jornadasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  {emptyStateMessage}
                </TableCell>
              </TableRow>
            ) : (
              jornadasFiltradas.map((jornada) => {
                const key = `${jornada.empleadoId}_${jornada.fecha.toISOString()}`;
                return (
                  <React.Fragment key={key}>
                    <TableRow
                      id={key}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openEditarModalFromJornada(jornada)}
                    >
                      <TableCell />
                      <TableCell>
                        <div className="font-medium text-gray-900">{jornada.empleadoNombre}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {format(jornada.fecha, 'dd MMM yyyy', { locale: es })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {formatearHorasMinutos(jornada.horasTrabajadas)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatearHorasMinutos(jornada.horasEsperadas)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {jornada.horarioEntrada && jornada.horarioSalida
                            ? `${jornada.horarioEntrada} - ${jornada.horarioSalida}`
                            : jornada.horarioEntrada
                            ? `${jornada.horarioEntrada} - ...`
                            : 'Sin datos'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-sm font-medium ${
                            jornada.balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {Number.isFinite(jornada.balance) && jornada.balance !== 0
                            ? `${jornada.balance > 0 ? '+' : '-'}${formatearHorasMinutos(
                                Math.abs(jornada.balance),
                              )}`
                            : '0h 0m'}
                        </span>
                      </TableCell>
                      <TableCell>{getFichajeBadge(jornada.fichaje.estado)}</TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  const renderMobileList = () => {
    if (loading) {
      return (
        <Card className="p-4">
          <p className="text-sm text-gray-500">Cargando fichajes...</p>
        </Card>
      );
    }

    if (jornadasFiltradas.length === 0) {
      return (
        <Card className="p-4">
          <p className="text-sm text-gray-500">{emptyStateMessage}</p>
        </Card>
      );
    }

    return (
      <div className="space-y-3 pb-4">
        {jornadasFiltradas.map((jornada) => {
          const key = `${jornada.empleadoId}_${jornada.fecha.toISOString()}`;
          return (
            <Card
              key={key}
              className="p-4 space-y-3"
              onClick={() => openEditarModalFromJornada(jornada)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">{jornada.empleadoNombre}</p>
                  <p className="text-sm text-gray-500">
                    {format(jornada.fecha, 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
                {getFichajeBadge(jornada.fichaje.estado)}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                <div>
                  <p className="text-xs text-gray-500">Horas trabajadas</p>
                  <p className="font-medium">{formatearHorasMinutos(jornada.horasTrabajadas)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Horas esperadas</p>
                  <p>{formatearHorasMinutos(jornada.horasEsperadas)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Horario</p>
                  <p>
                    {jornada.horarioEntrada && jornada.horarioSalida
                      ? `${jornada.horarioEntrada} - ${jornada.horarioSalida}`
                      : jornada.horarioEntrada
                      ? `${jornada.horarioEntrada} - ...`
                      : 'Sin datos'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Balance</p>
                  <p className={jornada.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {Number.isFinite(jornada.balance) && jornada.balance !== 0
                      ? `${jornada.balance > 0 ? '+' : '-'}${formatearHorasMinutos(
                          Math.abs(jornada.balance),
                        )}`
                      : '0h 0m'}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  function getFichajeBadge(estado: string) {
    const variants: Record<string, { label: string; className: string }> = {
      en_curso: { label: 'En curso', className: 'bg-yellow-100 text-yellow-800' },
      finalizado: { label: 'Finalizado', className: 'bg-green-100 text-green-800' },
      revisado: { label: 'Revisado', className: 'bg-green-50 text-green-700 border-green-200 border' },
      pendiente: { label: 'Pendiente', className: 'bg-gray-100 text-gray-800' },
      // Estados legacy (compatibilidad temporal con datos existentes)
      pendiente_revision: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      aprobado: { label: 'Finalizado', className: 'bg-green-100 text-green-800' },
      rechazado: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      confirmado: { label: 'Finalizado', className: 'bg-green-100 text-green-800' },
      auto: { label: 'Finalizado', className: 'bg-green-100 text-green-800' },
    };

    const variant = variants[estado] || variants.en_curso;
    return (
      <Badge className={variant.className + ' text-xs'}>
        {variant.label}
      </Badge>
    );
  }

  return (
    <ResponsiveContainer variant="page" className="h-full w-full flex flex-col overflow-hidden">
      {isMobile ? (
        <>
          {/* Action Bar - 48px */}
          <MobileActionBar
            title="Fichajes"
            primaryAction={{
              icon: Plus,
              label: 'Cuadrar fichajes',
              onClick: handleCuadrarFichajes,
            }}
            secondaryActions={[
              {
                icon: Calendar,
                label: 'Gestionar jornadas',
                onClick: () => setJornadasModal(true),
              },
            ]}
            overflowActions={[
              {
                icon: Clock,
                label: 'Compensar horas',
                onClick: handleAbrirCompensacion,
              },
            ]}
            className="mb-3"
          />

          {/* Filters Bar - 44px + Date Controls inline - 40px = 84px total */}
          <div className="flex-shrink-0 mb-3 space-y-2">
            <CompactFilterBar
              searchValue={busquedaEmpleado}
              onSearchChange={setBusquedaEmpleado}
              searchPlaceholder="Buscar empleado..."
              activeFiltersCount={filtroEstadoFichaje !== 'todos' ? 1 : 0}
              filtersContent={
                <>
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
                          <SelectItem value="en_curso">En curso</SelectItem>
                          <SelectItem value="finalizado">Finalizado</SelectItem>
                          <SelectItem value="revisado">Revisado</SelectItem>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
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
                </>
              }
              filtersTitle="Filtros de fichajes"
            />

            {/* Date Controls - Compact inline */}
            <div className="flex items-center justify-between gap-2 px-2">
              <div className="flex items-center gap-1">
                <Select 
                  value={rangoFechas} 
                  onValueChange={(v) => setRangoFechas(v as 'dia' | 'semana' | 'mes')}
                >
                  <SelectTrigger className="w-24 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dia">Día</SelectItem>
                    <SelectItem value="semana">Semana</SelectItem>
                    <SelectItem value="mes">Mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={goToPreviousPeriod}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium text-gray-900 min-w-[120px] text-center">
                  {periodLabel}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={goToNextPeriod}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetToToday}
                className="h-8 px-2 text-xs"
              >
                Hoy
              </Button>
            </div>
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
              <Button onClick={handleCuadrarFichajes} className="bg-gray-900 text-white hover:bg-gray-800">
                + Cuadrar fichajes
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <FiltersForm layout="desktop" />
            {DesktopDateControls}
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
      <EditarFichajeModal
        open={editarFichajeModal.open}
        fichaje={editarFichajeModal.fichaje}
        fichajeDiaId={(() => {
          // Inferir el fichaje del día a partir del evento seleccionado buscando en jornadas cargadas
          const evt = editarFichajeModal.fichaje;
          if (!evt) return undefined;
          const match = jornadas.find(j => j.fichaje.eventos.some(e => e.id === evt.id));
          return match?.fichaje.id;
        })()}
        onClose={() => setEditarFichajeModal({ open: false, fichaje: null })}
        onSave={handleEditarFichaje}
      />

      {/* Modal Revisión de Fichajes */}
      <RevisionModal
        open={revisionModal}
        onClose={() => setRevisionModal(false)}
        onReviewed={() => {
          fetchFichajes(); // Recargar fichajes después de revisar
        }}
        onEditFichaje={handleEditarFichajeDesdeRevision}
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
  const referencia = new Date(fecha);
  return {
    mes: referencia.getMonth() + 1,
    anio: referencia.getFullYear(),
  };
}
