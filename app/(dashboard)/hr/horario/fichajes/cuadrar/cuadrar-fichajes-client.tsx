'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Filter,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { FichajeModal } from '@/components/shared/fichajes/fichaje-modal';
import { InfoTooltip } from '@/components/shared/info-tooltip';
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
  fecha: string;
  eventos: EventoPropuesto[];
  eventosRegistrados: EventoPropuesto[];
  razon: string;
  eventosFaltantes: string[];
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

const toDate = (value: string): Date => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export function CuadrarFichajesClient() {
  const [loading, setLoading] = useState(true);
  const [fichajesRevision, setFichajesRevision] = useState<FichajeRevision[]>([]);
  const [processing, setProcessing] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({});
  const [empleadosExpandidos, setEmpleadosExpandidos] = useState<Record<string, boolean>>({});
  const [ocultarDiasSinFichajes, setOcultarDiasSinFichajes] = useState(false);
  const [editarFichajeModal, setEditarFichajeModal] = useState<EditarFichajeModalState>({
    open: false,
    fichajeDiaId: null,
  });

  useEffect(() => {
    fetchFichajesRevision();
  }, []);

  async function fetchFichajesRevision() {
    setLoading(true);
    try {
      const response = await fetch('/api/fichajes/revision');

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
      setEmpleadosExpandidos({});
    } catch (error) {
      console.error('[Cuadrar fichajes] Error obteniendo datos:', error);
      toast.error('No se pudieron cargar los fichajes pendientes');
    } finally {
      setLoading(false);
    }
  }

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function handleSeleccionarTodos() {
    const todosSeleccionados = Object.values(seleccionados).every(Boolean) && fichajesRevision.length > 0;
    const actualizado: Record<string, boolean> = {};

    fichajesRevision.forEach((f) => {
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

  const totalSeleccionados = Object.values(seleccionados).filter(Boolean).length;

  const fichajesPorEmpleado = fichajesRevision.reduce(
    (acc, fichaje) => {
      if (!acc[fichaje.empleadoId]) {
        acc[fichaje.empleadoId] = {
          empleadoId: fichaje.empleadoId,
          empleadoNombre: fichaje.empleadoNombre,
          fichajes: [],
        };
      }
      acc[fichaje.empleadoId].fichajes.push(fichaje);
      return acc;
    },
    {} as Record<string, { empleadoId: string; empleadoNombre: string; fichajes: FichajeRevision[] }>
  );

  const gruposEmpleado = Object.values(fichajesPorEmpleado);

  const gruposFiltrados = ocultarDiasSinFichajes
    ? gruposEmpleado
        .map((grupo) => ({
          ...grupo,
          fichajes: grupo.fichajes.filter((f) => f.eventos.length > 0),
        }))
        .filter((grupo) => grupo.fichajes.length > 0)
    : gruposEmpleado;

  function toggleEmpleado(empleadoId: string) {
    setEmpleadosExpandidos((prev) => ({
      ...prev,
      [empleadoId]: !prev[empleadoId],
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <AlertCircle className="w-4 h-4" />
            Cuadrar fichajes
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">Revisión de fichajes pendientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Revisa los fichajes incompletos, ajusta los eventos y ciérralos para mantener el registro al día.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="text-sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Button variant="outline" size="sm" onClick={handleSeleccionarTodos} disabled={processing}>
            Seleccionar todos
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

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Pendientes:</span>
              <Badge variant="outline">
                {gruposFiltrados.reduce((acc, g) => acc + g.fichajes.length, 0)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Seleccionados:</span>
              <Badge className="bg-blue-100 text-blue-800">{totalSeleccionados}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              Filtro de días sin fichajes
              <InfoTooltip content="Oculta los días sin actividad para centrarte en los que requieren ajustes." side="left" />
            </span>
            <Button
              variant={ocultarDiasSinFichajes ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOcultarDiasSinFichajes(!ocultarDiasSinFichajes)}
            >
              {ocultarDiasSinFichajes ? (
                <>
                  <X className="w-3 h-3 mr-1" />
                  Mostrar todos los días
                </>
              ) : (
                <>
                  <Filter className="w-3 h-3 mr-1" />
                  Omitir días sin fichajes
                </>
              )}
            </Button>
          </div>
        </div>
        {ocultarDiasSinFichajes && (
          <p className="text-xs text-gray-600 text-right">
            <strong>Filtro activo:</strong> No se muestran días sin fichajes registrados.
          </p>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
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
        ) : (
          <div className="divide-y">
            {gruposFiltrados.map((grupo) => {
              const estaExpandido = empleadosExpandidos[grupo.empleadoId];
              const fichajesDelGrupo = grupo.fichajes;
              const seleccionadosEnGrupo = fichajesDelGrupo.filter((f) => seleccionados[f.id]).length;

              return (
                <div key={grupo.empleadoId}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    onClick={() => toggleEmpleado(grupo.empleadoId)}
                  >
                    <div className="flex-shrink-0 text-gray-600">
                      {estaExpandido ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900">{grupo.empleadoNombre}</span>
                      <Badge variant="outline" className="text-xs">
                        {fichajesDelGrupo.length} {fichajesDelGrupo.length === 1 ? 'día' : 'días'}
                      </Badge>
                      {seleccionadosEnGrupo > 0 && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          {seleccionadosEnGrupo} seleccionado{seleccionadosEnGrupo > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </button>

                  {estaExpandido && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Sel.</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Eventos del fichaje</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fichajesDelGrupo.map((fichaje) => (
                          <TableRow key={fichaje.id} className={seleccionados[fichaje.id] ? 'bg-blue-50/50' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={seleccionados[fichaje.id] || false}
                                onCheckedChange={() => toggleSeleccion(fichaje.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-900 font-medium">
                                {format(toDate(fichaje.fecha), 'dd MMM yyyy', { locale: es })}
                              </div>
                              <div className="text-xs text-gray-500">{fichaje.razon}</div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {fichaje.eventos.length === 0 ? (
                                  <span className="text-xs text-gray-400 italic">Sin fichajes registrados</span>
                                ) : (
                                  fichaje.eventos.map((evento, idx) => {
                                    const fechaEvento = toDate(evento.hora);
                                    const etiqueta = EVENT_LABELS[evento.tipo] || evento.tipo;
                                    const esPropuesto = evento.origen === 'propuesto';

                                    return (
                                      <div key={`${fichaje.id}-${idx}`} className="flex items-center gap-2 text-xs">
                                        <Clock
                                          className={`w-3 h-3 ${esPropuesto ? 'text-blue-400' : 'text-gray-400'}`}
                                        />
                                        <span className="font-medium">{etiqueta}</span>
                                        <span className="text-gray-500">
                                          {format(fechaEvento, 'HH:mm', { locale: es })}
                                        </span>
                                        {esPropuesto && (
                                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                            Propuesto
                                          </Badge>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-gray-900"
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
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              );
            })}
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
    </div>
  );
}

