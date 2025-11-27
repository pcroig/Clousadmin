'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, CircleSlash2, Clock, Edit2, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SolicitarAusenciaModal } from '@/components/empleado/solicitar-ausencia-modal';
import { DataFilters, type FilterOption } from '@/components/shared/filters/data-filters';
import { DateRangeControls } from '@/components/shared/filters/date-range-controls';
import { FichajeModal } from '@/components/shared/fichajes/fichaje-modal';
import { LoadingButton } from '@/components/shared/loading-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { parseJson } from '@/lib/utils/json';

interface EventoPropuesto {
  tipo: string;
  hora: string;
  origen: 'registrado' | 'propuesto';
}

interface FichajeRevision {
  id: string;
  fichajeId: string;
  empleadoId: string;
  empleadoNombre: string;
  equipoId?: string | null;
  equipoNombre?: string | null;
  fecha: string;
  eventos: EventoPropuesto[];
  eventosRegistrados: EventoPropuesto[];
  razon: string;
  eventosFaltantes: string[];
  tieneEventosRegistrados?: boolean;
}

interface EditarFichajeModalState {
  open: boolean;
  fichajeDiaId: string | null;
}

const EVENT_LABELS: Record<string, string> = {
  entrada: 'Entrada',
  pausa_inicio: 'Inicio pausa',
  pausa_fin: 'Fin pausa',
  salida: 'Salida',
};

const ESTADO_OPTIONS: FilterOption[] = [
  { value: 'sin_eventos', label: 'Sin fichajes' },
  { value: 'con_eventos', label: 'Incompletos' },
];

const toDate = (value: string): Date => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export function CuadrarFichajesClient() {
  const [loading, setLoading] = useState(true);
  const [fichajesRevision, setFichajesRevision] = useState<FichajeRevision[]>([]);
  const [processing, setProcessing] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({});
  
  // Filters State
  const [equiposOptions, setEquiposOptions] = useState<FilterOption[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroEquipo, setFiltroEquipo] = useState('todos');
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  
  // Date State
  const [fechaBase, setFechaBase] = useState(new Date());
  const [rangoFechas, setRangoFechas] = useState<'dia' | 'semana' | 'mes'>('semana');
  
  // Modals
  const [editarFichajeModal, setEditarFichajeModal] = useState<EditarFichajeModalState>({
    open: false,
    fichajeDiaId: null,
  });
  const [ausenciaModal, setAusenciaModal] = useState<{ open: boolean; empleadoId?: string; fecha?: Date }>({
    open: false,
  });
  
  const isMobile = useIsMobile();

  useEffect(() => {
    async function loadEquipos() {
      try {
        const response = await fetch('/api/organizacion/equipos');
        if (!response.ok) return;
        const data = await parseJson<Array<{ id: string; nombre: string }>>(response).catch(() => []);
        if (Array.isArray(data)) {
          setEquiposOptions(data.map(e => ({ label: e.nombre, value: e.id })));
        }
      } catch (error) {
        console.error('[Cuadrar fichajes] Error cargando equipos', error);
      }
    }

    loadEquipos();
  }, []);

  const calcularRangoFechas = useCallback((fecha: Date, rango: 'dia' | 'semana' | 'mes') => {
    const inicio = new Date(fecha);
    const fin = new Date(fecha);

    switch (rango) {
      case 'dia': {
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      }
      case 'semana': {
        const diaSemana = fecha.getDay();
        const diffInicio = diaSemana === 0 ? -6 : 1 - diaSemana;
        inicio.setDate(fecha.getDate() + diffInicio);
        inicio.setHours(0, 0, 0, 0);
        fin.setDate(inicio.getDate() + 6);
        fin.setHours(23, 59, 59, 999);
        break;
      }
      case 'mes': {
        inicio.setDate(1);
        inicio.setHours(0, 0, 0, 0);
        fin.setMonth(fecha.getMonth() + 1, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      }
    }

    return { inicio, fin };
  }, []);

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

  const fetchFichajesRevision = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const { inicio, fin } = calcularRangoFechas(fechaBase, rangoFechas);
      params.append('fechaInicio', inicio.toISOString().split('T')[0]);
      params.append('fechaFin', fin.toISOString().split('T')[0]);
      if (filtroEquipo !== 'todos') {
        params.append('equipoId', filtroEquipo);
      }
      if (busquedaEmpleado) {
        params.append('search', busquedaEmpleado);
      }

      const response = await fetch(`/api/fichajes/revision?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const fichajes: FichajeRevision[] = Array.isArray(data.fichajes)
        ? (data.fichajes as FichajeRevision[])
        : [];

      setFichajesRevision(fichajes);

      const estadoInicial: Record<string, boolean> = {};
      fichajes.forEach((f) => {
        estadoInicial[f.id] = false;
      });
      setSeleccionados(estadoInicial);
    } catch (error) {
      console.error('[Cuadrar fichajes] Error obteniendo datos:', error);
      toast.error('No se pudieron cargar los fichajes pendientes');
    } finally {
      setLoading(false);
    }
  }, [busquedaEmpleado, calcularRangoFechas, fechaBase, filtroEquipo, rangoFechas]);

  useEffect(() => {
    fetchFichajesRevision();
  }, [fetchFichajesRevision]);

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function handleSeleccionarTodos() {
    if (fichajesFiltrados.length === 0) {
      return;
    }
    const todosSeleccionados = fichajesFiltrados.every((f) => seleccionados[f.id]);
    const actualizado: Record<string, boolean> = { ...seleccionados };

    fichajesFiltrados.forEach((f) => {
      actualizado[f.id] = !todosSeleccionados;
    });

    setSeleccionados(actualizado);
  }

  async function handleActualizarSeleccionados() {
    setProcessing(true);
    try {
      const seleccion = Object.entries(seleccionados)
        .filter(([_, checked]) => checked)
        .map(([id]) => id);

      if (seleccion.length === 0) {
        toast.error('Selecciona al menos un fichaje para actualizar');
        return;
      }

      const response = await fetch('/api/fichajes/cuadrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fichajeIds: seleccion }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(typeof error.error === 'string' ? error.error : 'Error al actualizar fichajes');
      }

      const resultado = (await response.json()) as Record<string, unknown>;
      const cuadrados = typeof resultado.cuadrados === 'number' ? resultado.cuadrados : 0;
      const errores = Array.isArray(resultado.errores) ? resultado.errores : [];

      toast.success(
        `Fichajes cuadrados: ${cuadrados}` + (errores.length ? `. Con incidencias: ${errores.length}` : '')
      );

      await fetchFichajesRevision();
    } catch (error) {
      console.error('[Cuadrar fichajes] Error actualizando:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar fichajes');
    } finally {
      setProcessing(false);
    }
  }

  async function handleDescartarDiasVacios() {
    const ids = fichajesFiltrados.filter((f) => f.eventosRegistrados.length === 0).map((f) => f.fichajeId);

    if (ids.length === 0) {
      toast.info('No hay días sin fichajes para descartar');
      return;
    }

    try {
      const response = await fetch('/api/fichajes/cuadrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descartarIds: ids }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(typeof error.error === 'string' ? error.error : 'No se pudieron descartar los días');
      }

      toast.success(`${ids.length} día(s) sin fichajes descartados`);
      fetchFichajesRevision();
    } catch (error) {
      console.error('[Cuadrar fichajes] Error descartando días', error);
      toast.error(error instanceof Error ? error.message : 'Error al descartar días');
    }
  }

  const totalSeleccionados = Object.values(seleccionados).filter(Boolean).length;

  const fichajesFiltrados = useMemo(() => {
    return fichajesRevision.filter((fichaje) => {
      const esVacio = fichaje.eventosRegistrados.length === 0;

      if (filtroEstado === 'sin_eventos' && !esVacio) {
        return false;
      }

      if (filtroEstado === 'con_eventos' && esVacio) {
        return false;
      }

      if (filtroEquipo !== 'todos') {
        const equipoActual = fichaje.equipoId ?? 'sin_equipo';
        if (filtroEquipo === 'sin_equipo') {
          if (equipoActual !== 'sin_equipo' && equipoActual !== null) {
            return false;
          }
        } else if (equipoActual !== filtroEquipo) {
          return false;
        }
      }

      if (busquedaEmpleado) {
        const nombreNormalizado = fichaje.empleadoNombre.toLowerCase();
        if (!nombreNormalizado.includes(busquedaEmpleado.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [busquedaEmpleado, filtroEquipo, filtroEstado, fichajesRevision]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/hr/horario/fichajes" className="text-sm text-gray-500 hover:text-gray-900">
            ← Volver a fichajes
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">Revisión de fichajes pendientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Revisa los fichajes incompletos, ajusta los eventos y ciérralos para mantener el registro al día.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span>
            Pendientes:{' '}
            <span className="font-semibold text-gray-900">{fichajesFiltrados.length}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={handleSeleccionarTodos}>
            Seleccionar todos
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDescartarDiasVacios}>
            Descartar días vacíos
          </Button>
          <LoadingButton
            variant="default"
            size="sm"
            onClick={handleActualizarSeleccionados}
            disabled={totalSeleccionados === 0}
            loading={processing}
          >
            Cuadrar ({totalSeleccionados})
          </LoadingButton>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <DataFilters
            searchQuery={busquedaEmpleado}
            onSearchChange={setBusquedaEmpleado}
            estadoValue={filtroEstado}
            onEstadoChange={setFiltroEstado}
            estadoOptions={ESTADO_OPTIONS}
            estadoLabel="Tipo"
            equipoValue={filtroEquipo}
            onEquipoChange={setFiltroEquipo}
            equipoOptions={equiposOptions}
          />
          
          <DateRangeControls
            variant={isMobile ? 'mobile' : 'desktop'}
            range={rangoFechas}
            label={periodLabel}
            onRangeChange={setRangoFechas}
            onNavigate={(direction) => (direction === 'prev' ? goToPreviousPeriod() : goToNextPeriod())}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-500">
            Cargando fichajes en revisión...
          </div>
        ) : fichajesRevision.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
            <p className="text-gray-900 font-medium">No hay fichajes pendientes de revisión</p>
            <p className="text-sm text-gray-500 mt-1">Todos los fichajes están al día</p>
          </div>
        ) : fichajesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-900 font-medium">No se encontraron fichajes con los filtros aplicados</p>
            <p className="text-sm text-gray-500 mt-1">Ajusta la búsqueda o los filtros.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Seleccionar todos"
                        checked={fichajesFiltrados.length > 0 && fichajesFiltrados.every((f) => seleccionados[f.id])}
                        onCheckedChange={handleSeleccionarTodos}
                      />
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Eventos / Faltantes</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fichajesFiltrados.map((fichaje) => {
                    const esDiaVacio = fichaje.eventosRegistrados.length === 0;
                    const fecha = toDate(fichaje.fecha);
                    return (
                      <TableRow key={fichaje.id} className={seleccionados[fichaje.id] ? 'bg-blue-50/50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={seleccionados[fichaje.id] || false}
                            onCheckedChange={() => toggleSeleccion(fichaje.id)}
                            aria-label={`Seleccionar fichaje ${fichaje.empleadoNombre}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            {esDiaVacio ? (
                              <CircleSlash2 className="w-4 h-4 text-orange-600" />
                            ) : (
                              <TriangleAlert className="w-4 h-4 text-yellow-600" />
                            )}
                            {esDiaVacio ? 'Sin fichajes' : 'Incompleto'}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{fichaje.razon}</p>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">{fichaje.empleadoNombre}</div>
                          <div className="text-xs text-gray-500">
                            {fichaje.equipoNombre ?? 'Sin equipo asignado'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-900 font-medium">
                          {format(fecha, 'dd MMM', { locale: es })}
                        </TableCell>
                        <TableCell>
                          {fichaje.eventosRegistrados.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">Sin eventos registrados</span>
                          ) : (
                            <div className="space-y-1">
                              {fichaje.eventosRegistrados.map((evento, idx) => (
                                <div key={`${fichaje.id}-${idx}`} className="flex items-center gap-2 text-xs">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span className="font-medium">{EVENT_LABELS[evento.tipo] || evento.tipo}</span>
                                  <span className="text-gray-500">
                                    {format(toDate(evento.hora), 'HH:mm', { locale: es })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {fichaje.eventosFaltantes && fichaje.eventosFaltantes.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {fichaje.eventosFaltantes.map((faltante) => (
                                <Badge key={faltante} variant="outline" className="text-[11px]">
                                  Falta {EVENT_LABELS[faltante] || faltante}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setEditarFichajeModal({
                                open: true,
                                fichajeDiaId: fichaje.fichajeId,
                              })
                            }
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setAusenciaModal({
                                open: true,
                                empleadoId: fichaje.empleadoId,
                                fecha: fecha,
                              })
                            }
                          >
                            Ausencia
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <FichajeModal
        open={editarFichajeModal.open}
        fichajeDiaId={editarFichajeModal.fichajeDiaId ?? undefined}
        onClose={() => setEditarFichajeModal({ open: false, fichajeDiaId: null })}
        onSuccess={() => {
          setEditarFichajeModal({ open: false, fichajeDiaId: null });
          fetchFichajesRevision();
        }}
        contexto="hr_admin"
        modo="editar"
      />

      <SolicitarAusenciaModal
        open={ausenciaModal.open}
        contexto="hr_admin"
        empleadoIdDestino={ausenciaModal.empleadoId}
        defaultFechaInicio={ausenciaModal.fecha}
        defaultFechaFin={ausenciaModal.fecha}
        onClose={() => setAusenciaModal({ open: false })}
        onSuccess={() => {
          setAusenciaModal({ open: false });
          fetchFichajesRevision();
        }}
      />
    </div>
  );
}
