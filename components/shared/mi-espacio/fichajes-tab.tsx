'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Clock, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';


import { FichajeModal } from '@/components/shared/fichajes/fichaje-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useApi } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import {
  agruparFichajesEnJornadas,
  calcularResumenJornadas,
  type FichajeDTO,
  type FichajeNormalizado,
  getEstadoBadgeConfig,
  type JornadaUI,
} from '@/lib/utils/fichajesHistorial';

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
}

export function FichajesTab({ empleadoId, empleado, contexto = 'empleado' }: FichajesTabProps) {
  const [jornadas, setJornadas] = useState<JornadaUI[]>([]);
  const [fichajeEditando, setFichajeEditando] = useState<FichajeNormalizado | null>(null);
  const [fichajeManualModalOpen, setFichajeManualModalOpen] = useState(false);
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);

  // Obtener horas objetivo desde jornada del empleado
  const horasObjetivo = useMemo(() => {
    if (empleado?.jornada?.horasSemanales) {
      // Convertir horas semanales a horas diarias (asumiendo 5 días laborables)
      return Number(empleado.jornada.horasSemanales) / 5;
    }
    return 8; // Default
  }, [empleado]);

  const { loading, execute: refetchFichajes } = useApi<FichajeDTO[]>({
    onSuccess: (data) => {
      setJornadas(agruparFichajesEnJornadas(data, { horasObjetivo }));
    },
  });

  useEffect(() => {
    if (!empleadoId) {
      return;
    }
    refetchFichajes(`/api/fichajes?empleadoId=${empleadoId}&propios=1`);
  }, [empleadoId, refetchFichajes]);

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
    <div className="space-y-6">
      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

      {/* Tabla de fichajes */}
      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Historial por jornadas</h3>
          {(puedeCrearManual || puedeEditar) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFichajeManualModalOpen(true)}
            >
              {contexto === 'hr_admin' ? 'Añadir fichaje' : 'Solicitar fichaje manual'}
            </Button>
          )}
        </div>
        <div className="overflow-x-auto px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Horas trabajadas</TableHead>
                <TableHead>Horas esperadas</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : jornadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                    No tienes fichajes registrados
                  </TableCell>
                </TableRow>
              ) : (
                jornadas.slice(0, MAX_FILAS).map((jornada) => {
                  const key = `${jornada.fichaje.id}-${jornada.fecha.toISOString()}`;
                  const balancePositivo = jornada.balance >= 0;

                  return (
                    <TableRow
                      key={key}
                      className={cn(puedeEditar ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default')}
                      onClick={puedeEditar ? () => setFichajeEditando(jornada.fichaje) : undefined}
                    >
                      <TableCell>
                        <span className="text-sm font-medium">
                          {format(jornada.fecha, "d 'de' MMMM", { locale: es })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{jornada.horasTrabajadas.toFixed(1)}h</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{jornada.horasObjetivo.toFixed(1)}h</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {jornada.entrada && jornada.salida
                            ? `${format(jornada.entrada, 'HH:mm')} - ${format(jornada.salida, 'HH:mm')}`
                            : jornada.entrada
                            ? `${format(jornada.entrada, 'HH:mm')} - ...`
                            : 'Sin datos'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-sm font-medium ${
                            balancePositivo ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {balancePositivo ? '+' : ''}
                          {jornada.balance.toFixed(1)}h
                        </span>
                      </TableCell>
                      <TableCell>{getEstadoBadge(jornada.estado)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

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
          open={fichajeManualModalOpen}
          onClose={() => setFichajeManualModalOpen(false)}
          onSuccess={() => {
            setFichajeManualModalOpen(false);
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
