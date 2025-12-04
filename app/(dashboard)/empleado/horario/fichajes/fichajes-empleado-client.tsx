'use client';

// ========================================
// Fichajes Empleado Client Component - Vista por Jornadas
// ========================================

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { TableHeader as PageHeader } from '@/components/shared/table-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EstadoFichaje } from '@/lib/constants/enums';
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { extraerHoraDeISO, formatearHorasMinutos } from '@/lib/utils/formatters';


interface FichajeEvento {
  id: string;
  tipo: string;
  hora: string;
  editado: boolean;
  motivoEdicion: string | null;
}

interface FichajeDia {
  id: string;
  fecha: string;
  estado: string;
  horasTrabajadas: number | string | null;
  horasEnPausa: number | string | null;
  eventos: FichajeEvento[];
}

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

interface Props {
  balanceInicial: BalanceResumen;
}

export function FichajesEmpleadoClient({ balanceInicial }: Props) {
  const [jornadas, setJornadas] = useState<JornadaDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [jornadaExpandida, setJornadaExpandida] = useState<string | null>(null);
  const [correccionModal, setCorreccionModal] = useState<{ 
    open: boolean; 
    fichajeId: string | null;
    evento: FichajeEvento | null;
  }>({
    open: false,
    fichajeId: null,
    evento: null
  });
  const [motivoCorreccion, setMotivoCorreccion] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHora, setNuevaHora] = useState('');

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

    return Math.round(horasTotales * 10) / 10;
  }, []);

  const agruparPorJornada = useCallback((fichajes: FichajeDia[]): JornadaDia[] => {
    return fichajes.map((fichaje) => {
      const eventos = fichaje.eventos || [];
      const eventosOrdenados = [...eventos].sort((a, b) =>
        new Date(a.hora).getTime() - new Date(b.hora).getTime()
      );

      const horasTrabajadas = calcularHorasTrabajadas(eventosOrdenados) ?? 0;

      const entrada = eventosOrdenados.find(e => e.tipo === 'entrada');
      const salida = eventosOrdenados.find(e => e.tipo === 'salida');

      // Extraer hora directamente del ISO string para evitar desfases de zona horaria
      const horarioEntrada = entrada ? extraerHoraDeISO(entrada.hora) : null;
      const horarioSalida = salida ? extraerHoraDeISO(salida.hora) : null;

      let estado: 'completa' | 'incompleta' | 'pendiente' = 'completa';
      if (!entrada || !salida) {
        estado = 'incompleta';
      }
      if (fichaje.estado === EstadoFichaje.pendiente) {
        estado = 'pendiente';
      }

      const balance = horasTrabajadas - 8;

      return {
        fecha: new Date(fichaje.fecha),
        fichajeId: fichaje.id,
        eventos: eventosOrdenados,
        horasTrabajadas,
        horarioEntrada,
        horarioSalida,
        balance,
        estado,
      };
    }).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }, [calcularHorasTrabajadas]);

  const fetchFichajes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fichajes');
      const data = await response.json() as Record<string, unknown>;
      
      // Agrupar fichajes en jornadas
      const jornadasAgrupadas = agruparPorJornada(
        extractArrayFromResponse<FichajeDia>(data, { key: 'data' })
      );
      setJornadas(jornadasAgrupadas);
    } catch (error) {
      console.error('Error fetching fichajes:', error);
    } finally {
      setLoading(false);
    }
  }, [agruparPorJornada]);

  useEffect(() => {
    fetchFichajes();
  }, [fetchFichajes]);

  // Listener para refrescar en tiempo real
  useEffect(() => {
    function handleRealtimeUpdate() {
      fetchFichajes();
    }
    window.addEventListener('fichaje-updated', handleRealtimeUpdate);
    return () => window.removeEventListener('fichaje-updated', handleRealtimeUpdate);
  }, [fetchFichajes]);

  async function handleSolicitarCorreccion() {
    if (!correccionModal.fichajeId || !motivoCorreccion.trim()) return;

    try {
      const horaIso = nuevaHora ? new Date(`${nuevaFecha || new Date().toISOString().split('T')[0]}T${nuevaHora}`).toISOString() : undefined;

      const response = await fetch('/api/fichajes/correcciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fichajeId: correccionModal.fichajeId,
          motivo: motivoCorreccion,
          nuevaFecha: nuevaFecha || undefined,
          nuevaHora: horaIso,
        }),
      });

      if (response.ok) {
        setCorreccionModal({ open: false, fichajeId: null, evento: null });
        setMotivoCorreccion('');
        setNuevaFecha('');
        setNuevaHora('');
        fetchFichajes();
        toast.success('Solicitud de corrección enviada para revisión');
      } else {
        toast.error('Error al solicitar corrección');
      }
    } catch (error) {
      console.error('Error solicitando corrección:', error);
      toast.error('Error al solicitar corrección');
    }
  }

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
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <PageHeader
        title="Mis Fichajes"
      />

      {/* Widget Resumen */}
      <div className="mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[#d97757]" />
            <h3 className="text-base font-semibold">Balance de Horas</h3>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${balanceInicial.diario >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balanceInicial.diario >= 0 ? '+' : ''}{formatearHorasMinutos(Math.abs(balanceInicial.diario))}
              </div>
              <div className="text-xs text-gray-500 mt-1">Hoy</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${balanceInicial.semanal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balanceInicial.semanal >= 0 ? '+' : ''}{formatearHorasMinutos(Math.abs(balanceInicial.semanal))}
              </div>
              <div className="text-xs text-gray-500 mt-1">Semana</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${balanceInicial.mensual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balanceInicial.mensual >= 0 ? '+' : ''}{formatearHorasMinutos(Math.abs(balanceInicial.mensual))}
              </div>
              <div className="text-xs text-gray-500 mt-1">Mes</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${balanceInicial.acumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balanceInicial.acumulado >= 0 ? '+' : ''}{formatearHorasMinutos(Math.abs(balanceInicial.acumulado))}
              </div>
              <div className="text-xs text-gray-500 mt-1">Acumulado</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
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
                    <>
                      <TableRow 
                        key={key}
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
                            {formatearHorasMinutos(jornada.horasTrabajadas)}
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
                            {jornada.balance >= 0 ? '+' : ''}{formatearHorasMinutos(Math.abs(jornada.balance))}
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
                              {jornada.eventos.map(evento => (
                                <div key={evento.id} className="flex items-center justify-between text-sm py-2 px-3 bg-white rounded border border-gray-200">
                                  <div className="flex items-center gap-4">
                                    <span className="font-medium text-gray-900 w-16">
                                      {format(new Date(evento.hora), 'HH:mm')}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {evento.tipo.replace('_', ' ')}
                                    </Badge>
                                    {evento.editado && (
                                      <Badge className="bg-gray-100 text-gray-800 text-xs">Editado</Badge>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-gray-600 hover:text-gray-700 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCorreccionModal({ 
                                        open: true, 
                                        fichajeId: jornada.fichajeId,
                                        evento
                                      });
                                      setNuevaFecha(format(jornada.fecha, 'yyyy-MM-dd'));
                                      setNuevaHora(format(new Date(evento.hora), 'HH:mm'));
                                    }}
                                  >
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Solicitar Corrección
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Modal Solicitar Corrección */}
      <Dialog open={correccionModal.open} onOpenChange={(open) => setCorreccionModal({ open, fichajeId: null, evento: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Corrección de Fichaje</DialogTitle>
          </DialogHeader>
          
          {correccionModal.evento && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Evento actual:</div>
                <div className="text-sm font-medium">
                  {format(new Date(correccionModal.evento.hora), 'HH:mm')} - {' '}
                  {correccionModal.evento.tipo.replace('_', ' ')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nueva-fecha">Nueva Fecha</Label>
                  <Input
                    id="nueva-fecha"
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="nueva-hora">Nueva Hora</Label>
                  <Input
                    id="nueva-hora"
                    type="time"
                    value={nuevaHora}
                    onChange={(e) => setNuevaHora(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="motivo">Motivo de la corrección *</Label>
                <Input
                  id="motivo"
                  placeholder="Explica por qué necesitas corregir este fichaje"
                  value={motivoCorreccion}
                  onChange={(e) => setMotivoCorreccion(e.target.value)}
                />
              </div>

              <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-900">
                ⚠️ Tu solicitud será revisada por Recursos Humanos antes de aplicarse.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCorreccionModal({ open: false, fichajeId: null, evento: null })}>
              Cancelar
            </Button>
            <Button
              onClick={handleSolicitarCorreccion}
              disabled={!motivoCorreccion.trim()}
            >
              Enviar Solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
