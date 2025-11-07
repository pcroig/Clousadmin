'use client';

// ========================================
// Fichajes Empleado Client Component - Vista por Jornadas
// ========================================

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TableHeader as PageHeader } from '@/components/shared/table-header';
import { Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatearHorasMinutos } from '@/lib/utils/formatters';

interface Fichaje {
  id: string;
  tipo: string;
  fecha: string;
  hora: string;
  estado: string;
  editado: boolean;
  motivoEdicion: string | null;
}

interface BalanceResumen {
  diario: number;
  semanal: number;
  mensual: number;
  acumulado: number;
}

interface JornadaDia {
  fecha: Date;
  fichajes: Fichaje[];
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
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [jornadas, setJornadas] = useState<JornadaDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [jornadaExpandida, setJornadaExpandida] = useState<string | null>(null);
  const [correccionModal, setCorreccionModal] = useState<{ open: boolean; fichaje: Fichaje | null }>({
    open: false,
    fichaje: null
  });
  const [motivoCorreccion, setMotivoCorreccion] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHora, setNuevaHora] = useState('');

  useEffect(() => {
    fetchFichajes();
  }, []);

  async function fetchFichajes() {
    setLoading(true);
    try {
      const response = await fetch('/api/fichajes');
      const data = await response.json();
      setFichajes(data);
      
      // Agrupar fichajes en jornadas
      const jornadasAgrupadas = agruparPorJornada(data);
      setJornadas(jornadasAgrupadas);
    } catch (error) {
      console.error('Error fetching fichajes:', error);
    } finally {
      setLoading(false);
    }
  }

  function agruparPorJornada(fichajes: Fichaje[]): JornadaDia[] {
    // Agrupar por fecha
    const grupos: Record<string, Fichaje[]> = {};
    
    fichajes.forEach(f => {
      if (!grupos[f.fecha]) {
        grupos[f.fecha] = [];
      }
      grupos[f.fecha].push(f);
    });

    // Convertir a jornadas
    return Object.entries(grupos).map(([fecha, fichajesDelDia]) => {
      const ordenados = [...fichajesDelDia].sort((a, b) => 
        new Date(a.hora).getTime() - new Date(b.hora).getTime()
      );

      // Calcular horas trabajadas
      const horasTrabajadas = calcularHorasTrabajadas(ordenados);
      
      // Obtener horario de entrada/salida
      const entrada = ordenados.find(f => f.tipo === 'entrada');
      const salida = ordenados.find(f => f.tipo === 'salida');
      
      const horarioEntrada = entrada ? format(new Date(entrada.hora), 'HH:mm') : null;
      const horarioSalida = salida ? format(new Date(salida.hora), 'HH:mm') : null;

      // Estado de la jornada
      let estado: 'completa' | 'incompleta' | 'pendiente' = 'completa';
      if (!entrada || !salida) {
        estado = 'incompleta';
      }
      if (fichajesDelDia.some(f => f.estado === 'pendiente_aprobacion')) {
        estado = 'pendiente';
      }

      // Balance (asumiendo 8h como jornada estándar por ahora)
      const balance = horasTrabajadas - 8;

      return {
        fecha: new Date(fecha),
        fichajes: ordenados,
        horasTrabajadas,
        horarioEntrada,
        horarioSalida,
        balance,
        estado,
      };
    }).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  function calcularHorasTrabajadas(fichajes: Fichaje[]): number {
    let horasTotales = 0;
    let inicioTrabajo: Date | null = null;

    for (const fichaje of fichajes) {
      const hora = new Date(fichaje.hora);

      switch (fichaje.tipo) {
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
  }

  async function handleSolicitarCorreccion() {
    if (!correccionModal.fichaje || !motivoCorreccion.trim()) return;

    try {
      const response = await fetch(`/api/fichajes/${correccionModal.fichaje.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: nuevaFecha || undefined,
          hora: nuevaHora ? new Date(`${nuevaFecha || correccionModal.fichaje.fecha}T${nuevaHora}`).toISOString() : undefined,
          motivoEdicion: motivoCorreccion,
        }),
      });

      if (response.ok) {
        setCorreccionModal({ open: false, fichaje: null });
        setMotivoCorreccion('');
        setNuevaFecha('');
        setNuevaHora('');
        fetchFichajes();
        alert('Solicitud de corrección enviada correctamente');
      } else {
        alert('Error al solicitar corrección');
      }
    } catch (error) {
      console.error('Error solicitando corrección:', error);
      alert('Error al solicitar corrección');
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
                              <div className="text-sm font-semibold text-gray-700 mb-3">Fichajes del día:</div>
                              {jornada.fichajes.map(f => (
                                <div key={f.id} className="flex items-center justify-between text-sm py-2 px-3 bg-white rounded border border-gray-200">
                                  <div className="flex items-center gap-4">
                                    <span className="font-medium text-gray-900 w-16">
                                      {format(new Date(f.hora), 'HH:mm')}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {f.tipo.replace('_', ' ')}
                                    </Badge>
                                    {f.editado && (
                                      <Badge className="bg-blue-100 text-blue-800 text-xs">Editado</Badge>
                                    )}
                                    {f.estado !== 'confirmado' && (
                                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">{f.estado}</Badge>
                                    )}
                                  </div>
                                  {f.estado !== 'confirmado' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-gray-600 hover:text-gray-700 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCorreccionModal({ open: true, fichaje: f });
                                        setNuevaFecha(f.fecha);
                                        setNuevaHora(format(new Date(f.hora), 'HH:mm'));
                                      }}
                                    >
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Solicitar Corrección
                                    </Button>
                                  )}
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
      <Dialog open={correccionModal.open} onOpenChange={(open) => setCorreccionModal({ open, fichaje: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Corrección de Fichaje</DialogTitle>
          </DialogHeader>
          
          {correccionModal.fichaje && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Fichaje actual:</div>
                <div className="text-sm font-medium">
                  {format(new Date(correccionModal.fichaje.fecha), 'dd MMM yyyy', { locale: es })} - {' '}
                  {format(new Date(correccionModal.fichaje.hora), 'HH:mm')} - {' '}
                  {correccionModal.fichaje.tipo.replace('_', ' ')}
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
            <Button variant="outline" onClick={() => setCorreccionModal({ open: false, fichaje: null })}>
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
