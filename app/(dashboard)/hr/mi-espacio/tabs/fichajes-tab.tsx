'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApi } from '@/lib/hooks';
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
import { Clock, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { EditarFichajeModal } from '../../horario/fichajes/editar-fichaje-modal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface FichajeEvento {
  id: string;
  tipo: string;
  hora: string;
  editado: boolean;
}

interface Fichaje {
  id: string;
  fecha: string;
  estado: string;
  horasTrabajadas: number;
  eventos: FichajeEvento[];
}

interface JornadaDia {
  fecha: Date;
  fichaje: Fichaje;
  horasTrabajadas: number;
  horarioEntrada: string | null;
  horarioSalida: string | null;
  balance: number;
  estado: string;
}

export function FichajesTab({ empleadoId }: { empleadoId: string }) {
  const [jornadas, setJornadas] = useState<JornadaDia[]>([]);
  const [jornadaExpandida, setJornadaExpandida] = useState<string | null>(null);
  const [fichajeEditando, setFichajeEditando] = useState<Fichaje | null>(null);

  // Memoizar función de callback para evitar recreación en cada render
  const handleFichajesSuccess = useCallback((data: Fichaje[]) => {
    // Agrupar fichajes en jornadas cuando se cargan
    const jornadasAgrupadas = agruparPorJornada(data);
    setJornadas(jornadasAgrupadas);
  }, []);

  // Memoizar opciones para evitar que refetchFichajes cambie en cada render
  const fichajesApiOptions = useMemo(() => ({
    onSuccess: handleFichajesSuccess,
  }), [handleFichajesSuccess]);

  // Hook para cargar fichajes
  const { data: fichajes = [], loading, execute: refetchFichajes } = useApi<Fichaje[]>(fichajesApiOptions);

  useEffect(() => {
    if (empleadoId) {
      refetchFichajes(`/api/fichajes?empleadoId=${empleadoId}&propios=1`);
    }
  }, [empleadoId, refetchFichajes]);

  // Función auxiliar para extraer solo la hora (HH:mm) de un DateTime ISO
  function extraerHora(datetime: string | Date): string | null {
    try {
      const fecha = typeof datetime === 'string' ? new Date(datetime) : datetime;
      if (isNaN(fecha.getTime())) {
        return null;
      }
      // Extraer solo HH:mm del DateTime
      const horas = fecha.getHours().toString().padStart(2, '0');
      const minutos = fecha.getMinutes().toString().padStart(2, '0');
      return `${horas}:${minutos}`;
    } catch {
      return null;
    }
  }

  function agruparPorJornada(fichajes: Fichaje[]): JornadaDia[] {
    // Agrupar por fecha
    const grupos: Record<string, Fichaje[]> = {};
    
    fichajes.forEach(f => {
      const fechaKey = new Date(f.fecha).toISOString().split('T')[0];
      if (!grupos[fechaKey]) {
        grupos[fechaKey] = [];
      }
      grupos[fechaKey].push(f);
    });

    // Convertir a jornadas
    return Object.entries(grupos).map(([fechaKey, fichajesDelDia]) => {
      // Obtener el fichaje principal del día (el que tiene eventos)
      const fichajePrincipal = fichajesDelDia.find(f => f.eventos && f.eventos.length > 0) || fichajesDelDia[0];
      
      const eventos = fichajePrincipal.eventos || [];
      const entrada = eventos.find((e) => e.tipo === 'entrada');
      const salida = eventos.find((e) => e.tipo === 'salida');
      
      // Extraer solo la hora del DateTime completo
      const horarioEntrada = entrada && entrada.hora ? extraerHora(entrada.hora) : null;
      const horarioSalida = salida && salida.hora ? extraerHora(salida.hora) : null;

      // Calcular horas trabajadas
      let horasTrabajadas = 0;
      if (fichajePrincipal.horasTrabajadas) {
        horasTrabajadas = Number(fichajePrincipal.horasTrabajadas);
      } else if (entrada && salida && entrada.hora && salida.hora) {
        const entradaHora = new Date(entrada.hora);
        const salidaHora = new Date(salida.hora);
        if (!isNaN(entradaHora.getTime()) && !isNaN(salidaHora.getTime())) {
          const diff = (salidaHora.getTime() - entradaHora.getTime()) / (1000 * 60 * 60);
          horasTrabajadas = diff;
        }
      }

      // Balance (asumiendo 8h como jornada estándar)
      const balance = horasTrabajadas - 8;

      return {
        fecha: new Date(fechaKey),
        fichaje: fichajePrincipal,
        horasTrabajadas,
        horarioEntrada,
        horarioSalida,
        balance,
        estado: fichajePrincipal.estado || 'finalizado',
      };
    }).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  function getEstadoBadge(estado: string) {
    const variants: Record<string, { label: string; className: string }> = {
      en_curso: { label: 'En Curso', className: 'bg-blue-100 text-blue-800' },
      finalizado: { label: 'Finalizado', className: 'bg-green-100 text-green-800' },
      revisado: { label: 'Revisado', className: 'bg-gray-100 text-gray-800' },
      pendiente: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
    };
    const variant = variants[estado] || variants.finalizado;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  }

  return (
    <div className="space-y-6">
      {/* Widget Resumen */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#F26C21]" />
            <CardTitle className="text-base font-semibold">Resumen de Fichajes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {jornadas.length > 0
                  ? jornadas.reduce((sum, j) => sum + j.horasTrabajadas, 0).toFixed(1)
                  : '0.0'}
                h
              </div>
              <div className="text-xs text-gray-500 mt-1">Total trabajado</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {jornadas.length > 0
                  ? jornadas.filter(j => j.horarioEntrada).length
                  : 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">Días con fichaje</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                jornadas.length > 0 && jornadas.reduce((sum, j) => sum + j.balance, 0) >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {jornadas.length > 0
                  ? (jornadas.reduce((sum, j) => sum + j.balance, 0) >= 0 ? '+' : '') +
                    jornadas.reduce((sum, j) => sum + j.balance, 0).toFixed(1)
                  : '0.0'}
                h
              </div>
              <div className="text-xs text-gray-500 mt-1">Balance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {jornadas.filter(j => j.estado === 'en_curso').length}
              </div>
              <div className="text-xs text-gray-500 mt-1">En curso</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de fichajes */}
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
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : jornadas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
                      <TableCell>
                        <button
                          className="p-1 hover:bg-gray-100 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFichajeEditando(jornada.fichaje);
                          }}
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                      </TableCell>
                    </TableRow>
                    
                    {/* Detalles expandidos */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-gray-50 p-4">
                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-gray-700 mb-3">Fichajes del día:</div>
                            {jornada.fichaje.eventos?.map((evento: FichajeEvento) => {
                              const horaEvento = evento.hora ? extraerHora(evento.hora) : null;
                              return (
                                <div key={evento.id} className="flex items-center justify-between text-sm py-2 px-3 bg-white rounded border border-gray-200">
                                  <div className="flex items-center gap-4">
                                    <span className="font-medium text-gray-900 w-16">
                                      {horaEvento || 'N/A'}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {evento.tipo.replace('_', ' ')}
                                    </Badge>
                                    {evento.editado && (
                                      <Badge className="bg-blue-100 text-blue-800 text-xs">Editado</Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            }) || <p className="text-sm text-gray-500">No hay eventos registrados</p>}
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

      {/* Modal Editar Fichaje */}
      {fichajeEditando && (
        <EditarFichajeModal
          open={!!fichajeEditando}
          fichaje={fichajeEditando.eventos?.[0] || null}
          fichajeDiaId={fichajeEditando.id}
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
