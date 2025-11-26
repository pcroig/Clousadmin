'use client';

// ========================================
// Modal: Cuadrar Fichajes
// ========================================
// Permite a HR revisar fichajes pendientes y actualizarlos en bloque

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Clock, Edit2, Filter, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { FichajeModal } from '@/components/shared/fichajes/fichaje-modal';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { LoadingButton } from '@/components/shared/loading-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface RevisionModalProps {
  open: boolean;
  onClose: () => void;
  onReviewed: () => void;
  onEditFichaje: (params: { fichajeId: string; empleadoId: string; fecha: string }) => void | Promise<void>;
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

export function RevisionModal({ open, onClose, onReviewed, onEditFichaje: _onEditFichaje }: RevisionModalProps) {
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
    if (open) {
      fetchFichajesRevision();
    } else {
      // Resetear estado al cerrar
      setEmpleadosExpandidos({});
      setOcultarDiasSinFichajes(false);
    }
  }, [open]);

  async function fetchFichajesRevision() {
    setLoading(true);
    try {
      const response = await fetch('/api/fichajes/revision');
      
      if (response.ok) {
        const data = await response.json() as Record<string, any>;
        const fichajes: FichajeRevision[] = data.fichajes || [];
        
        setFichajesRevision(fichajes);
        
        const estadoInicial: Record<string, boolean> = {};
        fichajes.forEach((f) => {
          estadoInicial[f.id] = false;
        });
        setSeleccionados(estadoInicial);

        // Todos colapsados por defecto
        setEmpleadosExpandidos({});
      } else {
        const errorText = await response.text();
        console.error('[Modal Revisión] Error response:', errorText);
      }
    } catch (error) {
      console.error('[Modal Revisión] Excepción:', error);
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
        setProcessing(false);
        return;
      }

      console.log('[Modal Revisión] Cuadrando fichajes:', seleccion);

      // Llamar al nuevo endpoint de cuadrar fichajes
      const response = await fetch('/api/fichajes/cuadrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fichajeIds: seleccion,
        }),
      });

      if (response.ok) {
        const resultado = await response.json() as Record<string, any>;
        toast.success(
          `Fichajes cuadrados: ${resultado.cuadrados}` +
            (resultado.errores?.length ? `. Con incidencias: ${resultado.errores.length}` : '')
        );
        onReviewed();
        onClose();
      } else {
        const error = await response.json() as Record<string, any>;
        toast.error(error.error || 'Error al actualizar fichajes');
      }
    } catch (error) {
      console.error('Error actualizando fichajes:', error);
      toast.error('Error al actualizar fichajes');
    } finally {
      setProcessing(false);
    }
  }

  const totalSeleccionados = Object.values(seleccionados).filter(Boolean).length;

  // Agrupar fichajes por empleado
  const fichajesPorEmpleado = fichajesRevision.reduce((acc, fichaje) => {
    if (!acc[fichaje.empleadoId]) {
      acc[fichaje.empleadoId] = {
        empleadoId: fichaje.empleadoId,
        empleadoNombre: fichaje.empleadoNombre,
        fichajes: [],
      };
    }
    acc[fichaje.empleadoId].fichajes.push(fichaje);
    return acc;
  }, {} as Record<string, { empleadoId: string; empleadoNombre: string; fichajes: FichajeRevision[] }>);

  const gruposEmpleado = Object.values(fichajesPorEmpleado);

  // Aplicar filtro de días sin fichajes si está activo
  const gruposFiltrados = ocultarDiasSinFichajes 
    ? gruposEmpleado.map(grupo => ({
        ...grupo,
        fichajes: grupo.fichajes.filter(f => f.eventos.length > 0),
      })).filter(grupo => grupo.fichajes.length > 0)
    : gruposEmpleado;

  function toggleEmpleado(empleadoId: string) {
    setEmpleadosExpandidos(prev => ({
      ...prev,
      [empleadoId]: !prev[empleadoId],
    }));
  }


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[1000px] w-[1000px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Cuadrar fichajes
          </DialogTitle>
          <DialogDescription>
            Revisa los fichajes pendientes, edítalos si es necesario y actualízalos para cerrarlos correctamente.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-gray-500">Cargando fichajes en revisión...</div>
          </div>
        ) : fichajesRevision.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
            <p className="text-gray-900 font-medium">No hay fichajes pendientes de revisión</p>
            <p className="text-sm text-gray-500 mt-1">Todos los fichajes están al día</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {/* Barra de estadísticas y acciones */}
              <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Pendientes:</span>
                    <Badge variant="outline">{gruposFiltrados.reduce((acc, g) => acc + g.fichajes.length, 0)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Seleccionados:</span>
                    <Badge className="bg-blue-100 text-blue-800">{totalSeleccionados}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSeleccionarTodos}
                    disabled={processing}
                  >
                    Seleccionar todos
                  </Button>
                  <LoadingButton
                    size="sm"
                    variant="default"
                    onClick={handleActualizarSeleccionados}
                    disabled={totalSeleccionados === 0}
                    loading={processing}
                  >
                    Cuadrar ({totalSeleccionados})
                  </LoadingButton>
                </div>
              </div>

              {/* Barra de filtros */}
              <div className="flex flex-wrap items-center justify-end gap-3 py-2">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <span>Filtro de días sin fichajes</span>
                  <InfoTooltip
                    content="Oculta temporalmente los días sin fichajes para centrar el cuadrado en jornadas con actividad."
                    side="left"
                  />
                </div>
                <Button
                  variant={ocultarDiasSinFichajes ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOcultarDiasSinFichajes(!ocultarDiasSinFichajes)}
                  className="text-xs h-7"
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

              {ocultarDiasSinFichajes && (
                <p className="text-xs text-gray-600 text-right">
                  <strong>Filtro activo:</strong> Los días sin fichajes se omiten del cuadraje masivo.
                </p>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="space-y-0">
                {gruposFiltrados.map((grupo) => {
                  const estaExpandido = empleadosExpandidos[grupo.empleadoId];
                  const fichajesDelGrupo = grupo.fichajes;
                  const seleccionadosEnGrupo = fichajesDelGrupo.filter(f => seleccionados[f.id]).length;

                  return (
                    <div key={grupo.empleadoId} className="border-b last:border-b-0">
                      {/* Header del grupo empleado */}
                      <div 
                        className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => toggleEmpleado(grupo.empleadoId)}
                      >
                        <div className="flex-shrink-0">
                          {estaExpandido ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
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
                      </div>

                      {/* Tabla de fichajes del empleado (se muestra solo si está expandido) */}
                      {estaExpandido && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Sel.</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Eventos del fichaje (según jornada)</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fichajesDelGrupo.map((fichaje) => (
                              <TableRow 
                                key={fichaje.id}
                                className={seleccionados[fichaje.id] ? 'bg-blue-50/50' : ''}
                              >
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
                                            <Clock className={`w-3 h-3 ${esPropuesto ? 'text-blue-400' : 'text-gray-400'}`} />
                                            <span className={`font-mono ${esPropuesto ? 'text-blue-700' : 'text-gray-700'}`}>
                                              {format(fechaEvento, 'HH:mm')}
                                            </span>
                                            <Badge
                                              variant={esPropuesto ? "default" : "outline"}
                                              className={`text-xs ${esPropuesto ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}`}
                                            >
                                              {etiqueta}
                                            </Badge>
                                            {esPropuesto && (
                                              <span className="text-xs text-blue-600 italic">(propuesto)</span>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-gray-600 hover:text-primary"
                                    title="Editar fichaje"
                                    onClick={() => {
                                      if (fichaje.fichajeId) {
                                        setEditarFichajeModal({
                                          open: true,
                                          fichajeDiaId: fichaje.fichajeId,
                                        });
                                      } else {
                                        toast.error('No se encontró el identificador del fichaje para editar.');
                                      }
                                    }}
                                  >
                                    <Edit2 className="w-4 h-4" />
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
            </div>
          </>
        )}

      </DialogContent>

      {/* Modal Editar Fichaje - Renderizado fuera del Dialog principal para correcto z-index */}
      <FichajeModal
        open={editarFichajeModal.open}
        fichajeDiaId={editarFichajeModal.fichajeDiaId ?? undefined}
        onClose={() => {
          setEditarFichajeModal({ open: false, fichajeDiaId: null });
          // Recargar fichajes después de editar
          fetchFichajesRevision();
        }}
        onSuccess={async () => {
          setEditarFichajeModal({ open: false, fichajeDiaId: null });
          // El modal ya guarda los cambios, solo necesitamos recargar
          await fetchFichajesRevision();
          if (onReviewed) onReviewed();
        }}
        contexto="hr_admin"
        modo="editar"
      />
    </Dialog>
  );
}

