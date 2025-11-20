'use client';

import { format, isSameDay, isSameMonth, isSameWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
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

interface FichajeEvento {
  id: string;
  tipo: string;
  hora: string;
  editado: boolean;
  motivoEdicion?: string | null;
}

interface Fichaje {
  id: string;
  fecha: string;
  estado: string;
  horasTrabajadas: number;
  eventos: FichajeEvento[];
}

type ApiFichaje = {
  id: string;
  fecha: string;
  estado: string;
  horasTrabajadas?: number | string | null;
  eventos?: FichajeEvento[];
};

interface BalanceResumen {
  diario: number;
  semanal: number;
  mensual: number;
  acumulado: number;
}

interface JornadaDia {
  fecha: Date;
  fichajeId: string;
  eventos: FichajeEvento[];
  horasTrabajadas: number;
  horarioEntrada: string | null;
  horarioSalida: string | null;
  balance: number;
  estado: 'completa' | 'incompleta' | 'pendiente';
}

export function FichajesTab({ empleadoId }: { empleadoId: string }) {
  const [jornadas, setJornadas] = useState<JornadaDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [jornadaExpandida, setJornadaExpandida] = useState<string | null>(null);

  const agruparPorJornada = useCallback((lista: Fichaje[]): JornadaDia[] => {
    return lista.map(fichaje => {
      const eventos = fichaje.eventos || [];

      const entrada = eventos.find(e => e.tipo === 'entrada');
      const salida = eventos.find(e => e.tipo === 'salida');

      const horarioEntrada = entrada ? format(new Date(entrada.hora), 'HH:mm') : null;
      const horarioSalida = salida ? format(new Date(salida.hora), 'HH:mm') : null;

      let estado: 'completa' | 'incompleta' | 'pendiente' = 'completa';
      if (fichaje.estado === EstadoFichaje.en_curso) {
        estado = 'incompleta';
      } else if (
        fichaje.estado === EstadoFichaje.pendiente ||
        fichaje.estado === 'revisado'
      ) {
        estado = 'pendiente';
      }

      const balance = fichaje.horasTrabajadas - 8;

      return {
        fecha: new Date(fichaje.fecha),
        fichajeId: fichaje.id,
        eventos,
        horasTrabajadas: fichaje.horasTrabajadas,
        balance,
        estado,
        horarioEntrada,
        horarioSalida,
      };
    }).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }, []);

  const fetchFichajes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('empleadoId', empleadoId);
      const response = await fetch(`/api/fichajes?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Error al obtener fichajes');
      }
      const data = await response.json();
      const rawFichajes: ApiFichaje[] = Array.isArray(data) ? data : [];

      // Procesar fichajes con su nueva estructura (eventos separados)
      const fichajesConEventos: Fichaje[] = rawFichajes.map((f) => ({
        id: f.id,
        fecha: f.fecha,
        estado: f.estado,
        horasTrabajadas: f.horasTrabajadas ? Number(f.horasTrabajadas) : 0,
        eventos: f.eventos ?? [],
      }));

      // Agrupar fichajes en jornadas
      const jornadasAgrupadas = agruparPorJornada(fichajesConEventos);
      setJornadas(jornadasAgrupadas);
    } catch (error) {
      console.error('Error fetching fichajes:', error);
      setJornadas([]);
    } finally {
      setLoading(false);
    }
  }, [empleadoId, agruparPorJornada]);

  useEffect(() => {
    fetchFichajes();
  }, [fetchFichajes]);

  const balance = useMemo<BalanceResumen>(() => {
    const hoy = new Date();
    const resumen: BalanceResumen = {
      diario: 0,
      semanal: 0,
      mensual: 0,
      acumulado: 0,
    };

    jornadas.forEach((jornada) => {
      const balanceDia = jornada.balance ?? 0;
      resumen.acumulado += balanceDia;

      if (isSameDay(jornada.fecha, hoy)) {
        resumen.diario += balanceDia;
      }

      if (isSameWeek(jornada.fecha, hoy, { weekStartsOn: 1 })) {
        resumen.semanal += balanceDia;
      }

      if (isSameMonth(jornada.fecha, hoy)) {
        resumen.mensual += balanceDia;
      }
    });

    return resumen;
  }, [jornadas]);

  function getEstadoBadge(estado: 'completa' | 'incompleta' | 'pendiente') {
    const variants: Record<typeof estado, { label: string; className: string }> = {
      completa: { label: 'Completa', className: 'bg-green-100 text-green-800' },
      incompleta: { label: 'Incompleta', className: 'bg-yellow-100 text-yellow-800' },
      pendiente: { label: 'Pendiente', className: 'bg-orange-100 text-orange-800' },
    };

    const variant = variants[estado];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  }

  return (
    <div className="space-y-6">
      {/* Widget Resumen */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[#d97757]" />
          <h3 className="text-base font-semibold">Balance de Horas</h3>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${balance.diario >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {balance.diario >= 0 ? '+' : ''}{balance.diario.toFixed(1)}h
            </div>
            <div className="text-xs text-gray-500 mt-1">Hoy</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${balance.semanal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {balance.semanal >= 0 ? '+' : ''}{balance.semanal.toFixed(1)}h
            </div>
            <div className="text-xs text-gray-500 mt-1">Semana</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${balance.mensual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {balance.mensual >= 0 ? '+' : ''}{balance.mensual.toFixed(1)}h
            </div>
            <div className="text-xs text-gray-500 mt-1">Mes</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${balance.acumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {balance.acumulado >= 0 ? '+' : ''}{balance.acumulado.toFixed(1)}h
            </div>
            <div className="text-xs text-gray-500 mt-1">Acumulado</div>
          </div>
        </div>
      </Card>

      {/* Historial por Jornadas */}
      <Card className="p-0">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Historial por Jornadas</h3>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Horas Trabajadas</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : jornadas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No tienes fichajes registrados
                </TableCell>
              </TableRow>
            ) : (
              jornadas.slice(0, 30).map((jornada) => {
                const key = jornada.fecha.toISOString();
                const isExpanded = jornadaExpandida === key;

                return (
                  <React.Fragment key={key}>
                    <TableRow
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setJornadaExpandida(isExpanded ? null : key)}
                    >
                      <TableCell>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {format(jornada.fecha, 'EEEE, dd MMM yyyy', { locale: es })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {jornada.horasTrabajadas.toFixed(1)}h
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
                        <span className={`text-sm font-medium ${jornada.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {jornada.balance >= 0 ? '+' : ''}{jornada.balance.toFixed(1)}h
                        </span>
                      </TableCell>
                      <TableCell>
                        {getEstadoBadge(jornada.estado)}
                      </TableCell>
                    </TableRow>

                    {/* Detalles expandidos */}
                    {isExpanded && (
                      <TableRow key={`${key}-expanded`}>
                        <TableCell colSpan={6} className="bg-gray-50 p-4">
                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-gray-700 mb-3">Eventos del día:</div>
                            {jornada.eventos.map(e => (
                              <div key={e.id} className="flex items-center justify-between text-sm py-2 px-3 bg-white rounded border border-gray-200">
                                <div className="flex items-center gap-4">
                                  <span className="font-medium text-gray-900 w-16">
                                    {format(new Date(e.hora), 'HH:mm')}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {e.tipo.replace('_', ' ')}
                                  </Badge>
                                  {e.editado && (
                                    <Badge className="bg-blue-100 text-blue-800 text-xs">Editado</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
