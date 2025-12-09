'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, ChevronDown, ChevronUp, Clock, RotateCcw, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTable, type Column } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { FichajeModal } from '@/components/shared/fichajes/fichaje-modal';
import { MetricsCard } from '@/components/shared/metrics-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApi } from '@/lib/hooks';
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import {
  agruparFichajesEnJornadas,
  calcularResumenJornadas,
  type FichajeDTO,
  type FichajeNormalizado,
  getEstadoBadgeConfig,
  type JornadaUI,
} from '@/lib/utils/fichajesHistorial';
import { calcularProgresoEventos } from '@/lib/calculos/fichajes-cliente';
import { EstadoFichaje } from '@/lib/constants/enums';
import { formatearHorasMinutos } from '@/lib/utils/formatters';

import type { MiEspacioEmpleado } from '@/types/empleado';

const MAX_FILAS = 30;

function getEstadoBadge(estado: string) {
  const variant = getEstadoBadgeConfig(estado);
  return <Badge className={variant.className}>{variant.label}</Badge>;
}

interface FichajesTabProps {
  empleadoId: string;
  empleado?: MiEspacioEmpleado;
  contexto?: 'empleado' | 'manager' | 'hr_admin';
  manualModalOpen?: boolean;
  onManualModalOpenChange?: (open: boolean) => void;
  showManualActionButton?: boolean;
}

export function FichajesTab({
  empleadoId,
  empleado,
  contexto = 'empleado',
  manualModalOpen: manualModalOpenProp,
  onManualModalOpenChange,
  showManualActionButton = true,
}: FichajesTabProps) {
  const [jornadas, setJornadas] = useState<JornadaUI[]>([]);
  const [fichajeEditando, setFichajeEditando] = useState<FichajeNormalizado | null>(null);
  const [internalManualModalOpen, setInternalManualModalOpen] = useState(false);
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const manualModalOpen = manualModalOpenProp ?? internalManualModalOpen;

  const handleManualModalChange = useCallback(
    (open: boolean) => {
      onManualModalOpenChange?.(open);
      if (manualModalOpenProp === undefined) {
        setInternalManualModalOpen(open);
      }
    },
    [manualModalOpenProp, onManualModalOpenChange],
  );

  // Obtener horas objetivo desde jornada del empleado
  const horasObjetivo = useMemo(() => {
    if (empleado?.jornada?.horasSemanales) {
      // Convertir horas semanales a horas diarias (asumiendo 5 días laborables)
      return Number(empleado.jornada.horasSemanales) / 5;
    }
    return 8; // Default
  }, [empleado]);

  const { loading, execute: refetchFichajes } = useApi<Record<string, unknown>>({
    onSuccess: (payload) => {
      // FIX: La API devuelve { data: fichajes[], pagination: {} }
      // Extraer el array correctamente
      const fichajes = extractArrayFromResponse<FichajeDTO>(payload, { key: 'fichajes' });
      setJornadas(agruparFichajesEnJornadas(fichajes, { horasObjetivo }));
    },
  });

  useEffect(() => {
    if (!empleadoId) {
      return;
    }
    refetchFichajes(`/api/fichajes?empleadoId=${empleadoId}&propios=1`);
  }, [empleadoId, refetchFichajes]);

  useEffect(() => {
    function handleRealtimeUpdate() {
      if (!empleadoId) return;
      refetchFichajes(`/api/fichajes?empleadoId=${empleadoId}&propios=1`);
    }
    window.addEventListener('fichaje-updated', handleRealtimeUpdate);
    return () => window.removeEventListener('fichaje-updated', handleRealtimeUpdate);
  }, [empleadoId, refetchFichajes]);

  // Recalcular horas/balance de fichajes en curso en el cliente (sin esperar a API)
  // FIX: Intervalo permanente que siempre ejecuta (no condicional), más eficiente
  useEffect(() => {
    const intervalo = setInterval(() => {
      setJornadas((prev) => {
        // Detectar si hay fichajes en curso en CADA iteración del intervalo
        const hayFichajesEnCurso = prev.some((jornada) => jornada.estado === EstadoFichaje.en_curso);
        if (!hayFichajesEnCurso) return prev; // Si no hay, no modificar el array (evita re-render)

        // Recalcular solo los fichajes en curso
        return prev.map((jornada) => {
          if (jornada.estado !== EstadoFichaje.en_curso) {
            return jornada;
          }

          const eventos = jornada.fichaje.eventos ?? [];
          const { horasAcumuladas, horaEnCurso } = calcularProgresoEventos(eventos);

          let horasTrabajadas = horasAcumuladas;
          if (horaEnCurso) {
            const ahora = new Date();
            const horasDesdeUltimoEvento = (ahora.getTime() - horaEnCurso.getTime()) / (1000 * 60 * 60);
            horasTrabajadas += horasDesdeUltimoEvento;
          }

          // FIX: Usar horasObjetivo del fichaje (ya viene desde el API con 0 para extraordinarios)
          const balance = Number((horasTrabajadas - jornada.horasObjetivo).toFixed(2));

          return {
            ...jornada,
            horasTrabajadas,
            balance,
          };
        });
      });
    }, 15000); // refrescar cada 15s

    return () => clearInterval(intervalo);
  }, []); // Sin dependencias - el intervalo se crea solo una vez

  const resumen = useMemo(() => {
    // Si hay fecha de renovación, filtrar jornadas anteriores
    const jornadasFiltradas = fechaInicio 
      ? jornadas.filter(j => j.fecha >= fechaInicio) 
      : jornadas;
      
    return calcularResumenJornadas(jornadasFiltradas);
  }, [jornadas, fechaInicio]);
  const puedeCrearManual = contexto === 'empleado' || contexto === 'manager';
  const puedeEditar = contexto === 'hr_admin';
  const mostrarRenovar = contexto === 'hr_admin';

  // Calcular tiempo esperado total
  const tiempoEsperado = useMemo(() => {
    const jornadasFiltradas = fechaInicio 
      ? jornadas.filter(j => j.fecha >= fechaInicio) 
      : jornadas;
    return jornadasFiltradas.reduce((sum, j) => sum + (j.horasObjetivo || 0), 0);
  }, [jornadas, fechaInicio]);

  // Calcular promedios de horarios
  const promedios = useMemo(() => {
    const jornadasFiltradas = fechaInicio 
      ? jornadas.filter(j => j.fecha >= fechaInicio) 
      : jornadas;
      
    const fichajesConHorarios = jornadasFiltradas.filter(j => j.entrada && j.salida);
    if (fichajesConHorarios.length === 0) {
      return { horaEntrada: '--:--', horaSalida: '--:--', horasTrabajadas: '0.0' };
    }

    // Calcular minutos desde medianoche para cada hora
    const minutosEntrada = fichajesConHorarios.map(j => {
      if (!j.entrada) return 0;
      const fecha = new Date(j.entrada);
      return fecha.getHours() * 60 + fecha.getMinutes();
    });

    const minutosSalida = fichajesConHorarios.map(j => {
      if (!j.salida) return 0;
      const fecha = new Date(j.salida);
      return fecha.getHours() * 60 + fecha.getMinutes();
    });

    const promedioEntrada = minutosEntrada.reduce((a, b) => a + b, 0) / minutosEntrada.length;
    const promedioSalida = minutosSalida.reduce((a, b) => a + b, 0) / minutosSalida.length;

    const formatearHora = (minutos: number) => {
      const h = Math.floor(minutos / 60);
      const m = Math.round(minutos % 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const promedioHoras = fichajesConHorarios.reduce((sum, j) => sum + j.horasTrabajadas, 0) / fichajesConHorarios.length;

    return {
      horaEntrada: formatearHora(promedioEntrada),
      horaSalida: formatearHora(promedioSalida),
      horasTrabajadas: promedioHoras.toFixed(1),
    };
  }, [jornadas, fechaInicio]);

  const columns = useMemo<Column<JornadaUI>[]>(() => [
    {
      id: 'fecha',
      header: 'Fecha',
      priority: 'high',
      cell: (row) => (
        <div className="min-w-[140px]">
          <p className="text-sm font-semibold text-gray-900 capitalize">
            {format(row.fecha, "d 'de' MMMM", { locale: es })}
          </p>
          <p className="text-xs text-gray-500 capitalize">
            {format(row.fecha, 'EEEE', { locale: es })}
          </p>
        </div>
      ),
    },
    {
      id: 'horas',
      header: 'Horas',
      priority: 'high',
      cell: (row) => (
        <div className="text-sm text-gray-900">
          <span className="font-semibold">{formatearHorasMinutos(row.horasTrabajadas)}</span>
          <span className="text-gray-500"> / {formatearHorasMinutos(row.horasObjetivo)}</span>
        </div>
      ),
    },
    {
      id: 'balance',
      header: 'Balance',
      priority: 'high',
      cell: (row) => (
        <span className={`text-sm font-semibold ${
          row.balance >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {row.balance >= 0 ? '+' : ''}{formatearHorasMinutos(row.balance)}
        </span>
      ),
    },
    {
      id: 'horario',
      header: 'Horario',
      priority: 'medium',
      cell: (row) => (
        <span className="text-sm text-gray-600">
          {row.entrada && row.salida
            ? `${format(row.entrada, 'HH:mm')} - ${format(row.salida, 'HH:mm')}`
            : row.entrada
            ? `${format(row.entrada, 'HH:mm')} - ...`
            : 'Sin datos'}
        </span>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      priority: 'medium',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {getEstadoBadge(row.estado)}
          {row.fichaje.tipoFichaje === 'extraordinario' && (
            <div className="group relative">
              <Zap className="h-4 w-4 text-amber-600 fill-amber-100" />
              <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Horas extra
              </span>
            </div>
          )}
        </div>
      ),
    },
  ], []);

  const displayedJornadas = useMemo(() => jornadas.slice(0, MAX_FILAS), [jornadas]);
  const manualActionLabel = contexto === 'hr_admin' ? 'Añadir fichaje' : 'Solicitar fichaje manual';
  const manualActionVisible = (puedeCrearManual || puedeEditar) && showManualActionButton;
  const headerDescription = useMemo(() => {
    if (loading) {
      return 'Cargando tus fichajes...';
    }
    if (jornadas.length === 0) {
      return '';
    }
    if (jornadas.length <= MAX_FILAS) {
      return `${jornadas.length} jornadas registradas`;
    }
    return `Mostrando ${MAX_FILAS} de ${jornadas.length} jornadas`;
  }, [jornadas.length, loading]);

  // Cargar fecha de inicio (última renovación o fecha de alta)
  useEffect(() => {
    async function cargarFechaInicio() {
      if (!empleadoId) return;
      
      try {
        const res = await fetch(`/api/empleados/${empleadoId}/renovar-saldo`);
        if (res.ok) {
          const data = await res.json() as Record<string, unknown>;
          setFechaInicio(new Date(data.fechaRenovacion as string));
        }
      } catch (error) {
        console.error('Error cargando fecha de renovación:', error);
        // Fallback: usar fecha más antigua de jornadas
        if (jornadas.length > 0) {
          const fechaMasAntigua = jornadas.reduce((min, j) => {
            return j.fecha < min ? j.fecha : min;
          }, jornadas[0].fecha);
          setFechaInicio(fechaMasAntigua);
        }
      }
    }
    
    cargarFechaInicio();
  }, [empleadoId, jornadas]);

  const handleRenovarSaldo = async () => {
    // Confirmar con el usuario
    const confirmado = window.confirm(
      '¿Estás seguro de que deseas renovar el saldo? El saldo de horas volverá a 0 y el contador empezará desde hoy.'
    );
    
    if (!confirmado) return;

    try {
      const res = await fetch(`/api/empleados/${empleadoId}/renovar-saldo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json() as Record<string, unknown>;
        throw new Error((error.error as string) || 'Error al renovar saldo');
      }

      const data = await res.json() as Record<string, unknown>;
      toast.success((data.mensaje as string) || 'Saldo renovado correctamente');
      setFechaInicio(new Date(data.fechaRenovacion as string));
      
      // Recargar fichajes
      refetchFichajes(`/api/fichajes?empleadoId=${empleadoId}&propios=1`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al renovar el saldo');
      console.error(error);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Cards de Resumen - MOBILE: Métricas compactas */}
      <div className="sm:hidden">
        <MetricsCard
          metrics={[
            {
              value: `${resumen.totalHoras.toFixed(0)}h`,
              label: 'Trabajadas',
            },
            {
              value: `${resumen.balanceAcumulado >= 0 ? '+' : ''}${Math.floor(resumen.balanceAcumulado)}h ${Math.abs(Math.round((resumen.balanceAcumulado % 1) * 60))}m`,
              label: 'Saldo',
              color: resumen.balanceAcumulado >= 0 ? 'green' : 'red',
            },
          ]}
        />
      </div>

      {/* Cards de Resumen - DESKTOP: Grid original */}
      <div className="hidden sm:grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Tiempo */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#d97757]" />
                <CardTitle className="text-base font-semibold">Tiempo</CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CalendarDays className="h-4 w-4" />
                <span>
                  {fechaInicio ? `Desde ${format(fechaInicio, 'dd/MM/yyyy', { locale: es })}` : 'Sin datos'}
                </span>
                {mostrarRenovar && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleRenovarSaldo}
                    title="Renovar saldo"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Tiempo trabajado</p>
                <p className="text-xl font-semibold text-gray-900">
                  {resumen.totalHoras.toFixed(1)}h
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tiempo esperado</p>
                <p className="text-xl font-semibold text-gray-900">
                  {tiempoEsperado.toFixed(1)}h
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Saldo de horas</p>
                <p
                  className={`text-xl font-bold ${
                    resumen.balanceAcumulado >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {resumen.balanceAcumulado >= 0 ? '+' : ''}
                  {resumen.balanceAcumulado.toFixed(1)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Horarios */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#d97757]" />
              <CardTitle className="text-base font-semibold">Horarios</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Hora media de entrada</p>
                <p className="text-xl font-semibold text-gray-900">
                  {promedios.horaEntrada}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Hora media de salida</p>
                <p className="text-xl font-semibold text-gray-900">
                  {promedios.horaSalida}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Horas medias trabajadas</p>
                <p className="text-xl font-semibold text-gray-900">
                  {promedios.horasTrabajadas}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de fichajes - MOBILE: Colapsable */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Cargando...</div>
        ) : displayedJornadas.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No hay fichajes registrados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedJornadas.map((jornada) => {
              const rowId = `${jornada.fichaje.id}-${jornada.fecha.toISOString()}`;
              const isExpanded = expandedRows.has(rowId);

              return (
                <Card key={rowId} className="overflow-hidden border-gray-200 shadow-sm">
                  <CardContent className="p-0">
                    {/* Info básica - siempre visible */}
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedRows);
                        if (isExpanded) {
                          newExpanded.delete(rowId);
                        } else {
                          newExpanded.add(rowId);
                        }
                        setExpandedRows(newExpanded);
                      }}
                      className="w-full min-h-[50px] px-2.5 py-2 flex items-center justify-between gap-2 text-left transition-colors active:bg-gray-50"
                    >
                      {/* Izquierda: Fecha más compacta */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900 capitalize">
                          {format(jornada.fecha, "d MMM", { locale: es })}
                        </div>
                        <div className="text-[10px] text-gray-500 capitalize">
                          {format(jornada.fecha, 'EEE', { locale: es })}
                        </div>
                      </div>

                      {/* Derecha: Horas + Balance + Chevron */}
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-xs font-medium text-gray-700">
                            {formatearHorasMinutos(jornada.horasTrabajadas)}
                          </div>
                          <div className={`text-[10px] font-semibold ${
                            jornada.balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {jornada.balance >= 0 ? '+' : ''}{formatearHorasMinutos(jornada.balance)}
                          </div>
                        </div>
                        
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {/* Detalles expandidos */}
                    {isExpanded && (
                      <div className="px-2.5 pb-2 pt-0 border-t bg-gray-50/50">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
                          <div>
                            <div className="text-[10px] text-gray-500 mb-0.5">Horas objetivo</div>
                            <div className="text-xs text-gray-900">
                              {formatearHorasMinutos(jornada.horasObjetivo)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500 mb-0.5">Balance</div>
                            <div className={`text-xs font-semibold ${
                              jornada.balance >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {jornada.balance >= 0 ? '+' : ''}{formatearHorasMinutos(jornada.balance)}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-[10px] text-gray-500 mb-0.5">Horario</div>
                            <div className="text-xs text-gray-900">
                              {jornada.entrada && jornada.salida
                                ? `${format(jornada.entrada, 'HH:mm')} - ${format(jornada.salida, 'HH:mm')}`
                                : jornada.entrada
                                ? `${format(jornada.entrada, 'HH:mm')} - ...`
                                : 'Sin datos'}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-[10px] text-gray-500 mb-0.5">Estado</div>
                            <div className="text-xs text-gray-900">{getEstadoBadge(jornada.estado)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabla de fichajes - DESKTOP: DataTable original */}
      <div className="hidden sm:block space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Historial por jornadas</h3>
            {headerDescription && <p className="text-sm text-gray-500">{headerDescription}</p>}
          </div>
          {manualActionVisible && (
            <Button size="sm" onClick={() => handleManualModalChange(true)}>
              {manualActionLabel}
            </Button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={loading ? [] : displayedJornadas}
          onRowClick={
            puedeEditar
              ? (row) => setFichajeEditando(row.fichaje)
              : undefined
          }
          getRowId={(row) => `${row.fichaje.id}-${row.fecha.toISOString()}`}
          emptyContent={
            loading ? (
              <div className="py-12 text-center text-sm text-gray-500">Cargando fichajes...</div>
            ) : (
              <EmptyState
                layout="table"
                icon={Clock}
                title="No hay fichajes registrados"
                description="Comienza a fichar para ver tu historial de jornadas."
              />
            )
          }
        />
      </div>

      {/* Modal Editar Fichaje */}
      {puedeEditar && fichajeEditando && (
        <FichajeModal
          open
          fichajeDiaId={typeof fichajeEditando.id === 'string' ? fichajeEditando.id : undefined}
          onClose={() => setFichajeEditando(null)}
          onSuccess={() => {
            setFichajeEditando(null);
            refetchFichajes(`/api/fichajes?empleadoId=${empleadoId}&propios=1`);
          }}
          contexto={contexto}
          empleadoId={empleadoId}
          modo="editar"
        />
      )}

      {/* Modal Crear Fichaje */}
      {(puedeCrearManual || puedeEditar) && (
        <FichajeModal
          open={manualModalOpen}
          onClose={() => handleManualModalChange(false)}
          onSuccess={() => {
            handleManualModalChange(false);
            refetchFichajes(`/api/fichajes?empleadoId=${empleadoId}&propios=1`);
          }}
          contexto={contexto}
          empleadoId={empleadoId}
          modo="crear"
        />
      )}
    </div>
  );
}
