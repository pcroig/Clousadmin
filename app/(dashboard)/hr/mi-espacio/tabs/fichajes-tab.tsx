'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, isSameDay, isSameMonth, isSameWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Gift } from 'lucide-react';

import { CompensarHorasModal } from '@/components/hr/compensar-horas-modal';
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
import {
  agruparFichajesEnJornadas,
  calcularResumenJornadas,
  getEstadoBadgeConfig,
  type FichajeDTO,
  type FichajeNormalizado,
  type JornadaUI,
} from '@/lib/utils/fichajesHistorial';

import { EditarFichajeModal } from '../../horario/fichajes/editar-fichaje-modal';

interface BalanceResumen {
  diario: number;
  semanal: number;
  mensual: number;
  acumulado: number;
}

interface FichajesTabProps {
  empleadoId: string;
  empleadoNombre?: string;
}

const MAX_FILAS = 30;

export function FichajesTab({ empleadoId, empleadoNombre = 'Empleado' }: FichajesTabProps) {
  const [jornadas, setJornadas] = useState<JornadaUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [compensarModal, setCompensarModal] = useState(false);
  const [fichajeEditando, setFichajeEditando] = useState<FichajeNormalizado | null>(null);

  const fetchFichajes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ empleadoId });
      const response = await fetch(`/api/fichajes?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Error al obtener fichajes');
      }

      const data = await response.json();
      const rawFichajes: FichajeDTO[] = Array.isArray(data) ? data : [];
      const fichajesNormalizados = rawFichajes.map((fichaje) => ({
        ...fichaje,
        eventos: fichaje.eventos ?? [],
      }));

      setJornadas(agruparFichajesEnJornadas(fichajesNormalizados));
    } catch (error) {
      console.error('[FichajesTab HR] Error fetching fichajes:', error);
      setJornadas([]);
    } finally {
      setLoading(false);
    }
  }, [empleadoId]);

  useEffect(() => {
    fetchFichajes();
  }, [fetchFichajes]);

  const resumen = useMemo(() => calcularResumenJornadas(jornadas), [jornadas]);

  const balance = useMemo<BalanceResumen>(() => {
    const hoy = new Date();
    const resultado: BalanceResumen = {
      diario: 0,
      semanal: 0,
      mensual: 0,
      acumulado: resumen.balanceAcumulado,
    };

    jornadas.forEach((jornada) => {
      const balanceDia = jornada.balance ?? 0;

      if (isSameDay(jornada.fecha, hoy)) {
        resultado.diario += balanceDia;
      }
      if (isSameWeek(jornada.fecha, hoy, { weekStartsOn: 1 })) {
        resultado.semanal += balanceDia;
      }
      if (isSameMonth(jornada.fecha, hoy)) {
        resultado.mensual += balanceDia;
      }
    });

    return resultado;
  }, [jornadas, resumen.balanceAcumulado]);

  const renderEstadoBadge = (estado: string) => {
    const config = getEstadoBadgeConfig(estado);
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#d97757]" />
            <CardTitle className="text-base font-semibold">Balance de horas</CardTitle>
          </div>
          {resumen.balanceAcumulado > 0 && (
            <Button
              onClick={() => setCompensarModal(true)}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Gift className="mr-2 h-4 w-4" />
              Compensar horas
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${balance.diario >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {balance.diario >= 0 ? '+' : ''}
              {balance.diario.toFixed(1)}h
            </div>
            <div className="mt-1 text-xs text-gray-500">Hoy</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${balance.semanal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {balance.semanal >= 0 ? '+' : ''}
              {balance.semanal.toFixed(1)}h
            </div>
            <div className="mt-1 text-xs text-gray-500">Semana</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${balance.mensual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {balance.mensual >= 0 ? '+' : ''}
              {balance.mensual.toFixed(1)}h
            </div>
            <div className="mt-1 text-xs text-gray-500">Mes</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${balance.acumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {balance.acumulado >= 0 ? '+' : ''}
              {balance.acumulado.toFixed(1)}h
            </div>
            <div className="mt-1 text-xs text-gray-500">Acumulado</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-gray-200 px-6 py-4">
          <CardTitle className="text-sm font-semibold text-gray-900">Historial por jornadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Horas trabajadas</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : jornadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    No hay fichajes registrados
                  </TableCell>
                </TableRow>
              ) : (
                jornadas.slice(0, MAX_FILAS).map((jornada) => {
                  const key = `${jornada.fichaje.id}-${jornada.fecha.toISOString()}`;
                  const balancePositivo = jornada.balance >= 0;

                  return (
                    <TableRow
                      key={key}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setFichajeEditando(jornada.fichaje)}
                    >
                      <TableCell>
                        <span className="text-sm font-medium">
                          {format(jornada.fecha, 'EEEE, dd MMM yyyy', { locale: es })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{jornada.horasTrabajadas.toFixed(1)}h</span>
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
                      <TableCell>{renderEstadoBadge(jornada.estado)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CompensarHorasModal
        empleadoId={empleadoId}
        empleadoNombre={empleadoNombre}
        balanceAcumulado={resumen.balanceAcumulado}
        open={compensarModal}
        onClose={() => setCompensarModal(false)}
        onSuccess={() => {
          setCompensarModal(false);
          fetchFichajes();
        }}
      />

      {fichajeEditando && (
        <EditarFichajeModal
          open
          fichaje={null}
          fichajeDiaId={typeof fichajeEditando.id === 'string' ? fichajeEditando.id : undefined}
          onClose={() => setFichajeEditando(null)}
          onSave={() => {
            setFichajeEditando(null);
            fetchFichajes();
          }}
        />
      )}
    </div>
  );
}
