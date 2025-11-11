'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock } from 'lucide-react';

import { useApi } from '@/lib/hooks';
import { EstadoFichaje } from '@/lib/constants/enums';
import {
  agruparFichajesEnJornadas,
  calcularResumenJornadas,
  getEstadoBadgeConfig,
  type FichajeDTO,
  type FichajeNormalizado,
  type JornadaUI,
} from '@/lib/utils/fichajesHistorial';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { EditarFichajeModal } from '../../../hr/horario/fichajes/editar-fichaje-modal';

const MAX_FILAS = 30;

function getEstadoBadge(estado: string) {
  const variant = getEstadoBadgeConfig(estado);
  return <Badge className={variant.className}>{variant.label}</Badge>;
}

interface FichajesTabProps {
  empleadoId: string;
  empleado?: any; // Para obtener jornada si está disponible
}

export function FichajesTab({ empleadoId, empleado }: FichajesTabProps) {
  const [jornadas, setJornadas] = useState<JornadaUI[]>([]);
  const [fichajeEditando, setFichajeEditando] = useState<FichajeNormalizado | null>(null);

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

  const resumen = useMemo(() => calcularResumenJornadas(jornadas), [jornadas]);

  return (
    <div className="space-y-6">
      {/* Widget Resumen */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#d97757]" />
            <CardTitle className="text-base font-semibold">Resumen de fichajes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {jornadas.length > 0 ? resumen.totalHoras.toFixed(1) : '0.0'}h
            </div>
            <div className="mt-1 text-xs text-gray-500">Total trabajado</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{resumen.diasConFichaje}</div>
            <div className="mt-1 text-xs text-gray-500">Días con fichaje</div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${
                resumen.balanceAcumulado >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {resumen.balanceAcumulado >= 0 ? '+' : ''}
              {resumen.balanceAcumulado.toFixed(1)}h
            </div>
            <div className="mt-1 text-xs text-gray-500">Balance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{resumen.enCurso}</div>
            <div className="mt-1 text-xs text-gray-500">En curso</div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de fichajes */}
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
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setFichajeEditando(jornada.fichaje)}
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
        </CardContent>
      </Card>

      {/* Modal Editar Fichaje */}
      {fichajeEditando && (
        <EditarFichajeModal
          open
          fichaje={null}
          fichajeDiaId={typeof fichajeEditando.id === 'string' ? fichajeEditando.id : undefined}
          onClose={() => setFichajeEditando(null)}
          onSave={() => {
            setFichajeEditando(null);
            refetchFichajes(`/api/fichajes?empleadoId=${empleadoId}&propios=1`);
          }}
        />
      )}
    </div>
  );
}
