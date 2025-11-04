'use client';

import { useState, useEffect } from 'react';
import { useApi, useMutation } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { FechaCalendar } from '@/components/shared/fecha-calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, isSameDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/shared/loading-button';

interface Ausencia {
  id: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  diasSolicitados: number;
  estado: string;
  motivo: string | null;
  descripcion: string | null;
  medioDia: boolean;
}

interface SaldoAusencias {
  diasTotales: number;
  diasUsados: number;
  diasPendientes: number;
  diasDisponibles: number;
}

export function AusenciasTab({ empleadoId }: { empleadoId: string }) {
  const [saldo, setSaldo] = useState<SaldoAusencias>({
    diasTotales: 0,
    diasUsados: 0,
    diasPendientes: 0,
    diasDisponibles: 0,
  });
  const [activeTab, setActiveTab] = useState<'proximas' | 'pasadas'>('proximas');
  const [showNuevaAusenciaModal, setShowNuevaAusenciaModal] = useState(false);
  const [nuevaAusencia, setNuevaAusencia] = useState({
    tipo: 'vacaciones',
    fechaInicio: '',
    fechaFin: '',
    motivo: '',
    descripcion: '',
    medioDia: false,
  });

  // Hook para cargar ausencias
  const { data: ausencias = [], loading, execute: refetchAusencias } = useApi<Ausencia[]>();

  // Hook para cargar saldo
  const { execute: refetchSaldo } = useApi<{
    diasTotales: number;
    diasUsados: number;
    diasPendientes: number;
    diasDisponibles: number;
  }>({
    onSuccess: (data) => {
      setSaldo({
        diasTotales: Number(data.diasTotales) || 0,
        diasUsados: Number(data.diasUsados) || 0,
        diasPendientes: Number(data.diasPendientes) || 0,
        diasDisponibles: Number(data.diasDisponibles) || 0,
      });
    },
  });

  // Hook para crear ausencia
  const { mutate: crearAusencia, loading: guardando } = useMutation<Ausencia, any>({
    onSuccess: () => {
      setShowNuevaAusenciaModal(false);
      setNuevaAusencia({
        tipo: 'vacaciones',
        fechaInicio: '',
        fechaFin: '',
        motivo: '',
        descripcion: '',
        medioDia: false,
      });
      refetchAusencias(`/api/ausencias?empleadoId=${empleadoId}&propios=1`);
      refetchSaldo(`/api/ausencias/saldo?empleadoId=${empleadoId}`);
    },
  });

  useEffect(() => {
    if (empleadoId) {
      refetchAusencias(`/api/ausencias?empleadoId=${empleadoId}&propios=1`);
      refetchSaldo(`/api/ausencias/saldo?empleadoId=${empleadoId}`);
    }
  }, [empleadoId, refetchAusencias, refetchSaldo]);

  async function handleCrearAusencia() {
    if (!nuevaAusencia.fechaInicio || !nuevaAusencia.fechaFin) {
      toast.error('Por favor completa las fechas');
      return;
    }

    await crearAusencia('/api/ausencias', {
      tipo: nuevaAusencia.tipo,
      fechaInicio: nuevaAusencia.fechaInicio,
      fechaFin: nuevaAusencia.fechaFin,
      motivo: nuevaAusencia.motivo || undefined,
      descripcion: nuevaAusencia.descripcion || undefined,
      medioDia: nuevaAusencia.medioDia,
    });
  }

  function calcularSaldo(ausencias: Ausencia[]) {
    const totalDias = saldo.diasTotales || 22;
    
    const diasUsados = ausencias
      .filter((a) => a.estado === 'en_curso' || a.estado === 'completada' || a.estado === 'auto_aprobada')
      .reduce((sum, a) => sum + Number(a.diasSolicitados), 0);

    const diasPendientes = ausencias
      .filter((a) => a.estado === 'pendiente_aprobacion')
      .reduce((sum, a) => sum + Number(a.diasSolicitados), 0);

    setSaldo({
      diasTotales: totalDias,
      diasUsados,
      diasPendientes,
      diasDisponibles: totalDias - diasUsados - diasPendientes,
    });
  }

  const proximasAusencias = (ausencias || [])
    .filter((a) => {
      const fechaFin = new Date(a.fechaFin);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      fechaFin.setHours(0, 0, 0, 0);
      return fechaFin >= hoy && (a.estado === 'pendiente_aprobacion' || a.estado === 'en_curso' || a.estado === 'auto_aprobada');
    })
    .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());

  const ausenciasPasadas = (ausencias || [])
    .filter((a) => {
      const fechaFin = new Date(a.fechaFin);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      fechaFin.setHours(0, 0, 0, 0);
      return fechaFin < hoy && (a.estado === 'completada' || a.estado === 'auto_aprobada');
    })
    .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());

  function getEstadoBadge(estado: string) {
    const variants: Record<string, { label: string; className: string }> = {
      pendiente_aprobacion: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      en_curso: { label: 'En Curso', className: 'bg-blue-100 text-blue-800' },
      completada: { label: 'Completada', className: 'bg-gray-100 text-gray-800' },
      auto_aprobada: { label: 'Auto-aprobada', className: 'bg-green-100 text-green-800' },
      rechazada: { label: 'Rechazada', className: 'bg-red-100 text-red-800' },
      cancelada: { label: 'Cancelada', className: 'bg-gray-100 text-gray-800' },
    };
    const variant = variants[estado] || variants.pendiente_aprobacion;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  }

  function getTipoLabel(tipo: string) {
    const tipos: Record<string, string> = {
      vacaciones: 'Vacaciones',
      enfermedad: 'Enfermedad',
      enfermedad_familiar: 'Enfermedad Familiar',
      maternidad_paternidad: 'Maternidad/Paternidad',
      otro: 'Otro',
    };
    return tipos[tipo] || tipo;
  }

  function getEstadoColor(estado: string): string {
    const colors: Record<string, string> = {
      pendiente_aprobacion: 'bg-yellow-200 border-yellow-400',
      en_curso: 'bg-blue-200 border-blue-400',
      completada: 'bg-gray-200 border-gray-400',
      auto_aprobada: 'bg-green-200 border-green-400',
      rechazada: 'bg-red-200 border-red-400',
    };
    return colors[estado] || 'bg-gray-100 border-gray-300';
  }

  // Obtener días con ausencias para el calendario
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Funciones para marcar días con ausencias en el calendario
  const getDiaEstado = (date: Date): string | null => {
    const dateKey = format(date, 'yyyy-MM-dd');
    
    for (const ausencia of (ausencias || [])) {
      const inicio = new Date(ausencia.fechaInicio);
      const fin = new Date(ausencia.fechaFin);
      
      if (isWithinInterval(date, { start: inicio, end: fin })) {
        return ausencia.estado;
      }
    }
    
    return null;
  };

  // Modificadores para react-day-picker
  const modifiers = {
    pendiente: (date: Date) => getDiaEstado(date) === 'pendiente_aprobacion',
    aprobada: (date: Date) => {
      const estado = getDiaEstado(date);
      return estado === 'en_curso' || estado === 'auto_aprobada' || estado === 'completada';
    },
    rechazada: (date: Date) => getDiaEstado(date) === 'rechazada',
  };

  const modifiersClassNames = {
    pendiente: 'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-yellow-300 after:opacity-40 after:rounded-md',
    aprobada: 'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-green-300 after:opacity-40 after:rounded-md',
    rechazada: 'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-red-300 after:opacity-40 after:rounded-md',
  };

  return (
    <div className="space-y-6">
      {/* Layout: Lista de ausencias (izquierda pequeña) + Calendario (derecha grande) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* COLUMNA IZQUIERDA - Lista de ausencias (2 columnas) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Saldo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#F26C21]" />
                Saldo de Ausencias {new Date().getFullYear()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{saldo.diasTotales}</div>
                  <div className="text-xs text-gray-500 mt-1">Asignados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{saldo.diasUsados}</div>
                  <div className="text-xs text-gray-500 mt-1">Gastados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{saldo.diasPendientes}</div>
                  <div className="text-xs text-gray-500 mt-1">Pendientes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Próximas/Historial */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Mis Ausencias</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'proximas' | 'pasadas')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="proximas">Próximas</TabsTrigger>
                  <TabsTrigger value="pasadas">Pasadas</TabsTrigger>
                </TabsList>
                <TabsContent value="proximas" className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {loading ? (
                    <p className="text-sm text-gray-500 text-center py-4">Cargando...</p>
                ) : proximasAusencias.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No hay ausencias próximas</p>
                ) : (
                  proximasAusencias.map((ausencia) => {
                    const fechaInicio = new Date(ausencia.fechaInicio);
                    const fechaFin = new Date(ausencia.fechaFin);
                    const esMismoDia = isSameDay(fechaInicio, fechaFin);

                    return (
                      <div key={ausencia.id} className="flex items-center gap-3 py-2">
                        <div className="flex items-center gap-2">
                          {!esMismoDia && fechaFin ? (
                            <>
                              <FechaCalendar date={fechaInicio} />
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                              <FechaCalendar date={fechaFin} />
                            </>
                          ) : (
                            <FechaCalendar date={fechaInicio} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-gray-900">{getTipoLabel(ausencia.tipo)}</p>
                          <p className="text-[11px] text-gray-500">{ausencia.diasSolicitados} {ausencia.diasSolicitados === 1 ? 'día' : 'días'}</p>
                        </div>
                        {ausencia.estado === 'pendiente_aprobacion' && (
                          <span className="px-2 py-1 rounded text-[11px] font-medium bg-yellow-100 text-yellow-800">
                            Pendiente
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
                </TabsContent>
                <TabsContent value="pasadas" className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                  {loading ? (
                    <p className="text-sm text-gray-500 text-center py-4">Cargando...</p>
                  ) : ausenciasPasadas.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No hay ausencias pasadas</p>
                  ) : (
                    ausenciasPasadas.map((ausencia) => {
                      const fechaInicio = new Date(ausencia.fechaInicio);
                      const fechaFin = new Date(ausencia.fechaFin);
                      const esMismoDia = isSameDay(fechaInicio, fechaFin);

                      return (
                        <div key={ausencia.id} className="flex items-center gap-3 py-2 opacity-60">
                          <div className="flex items-center gap-2">
                            {!esMismoDia && fechaFin ? (
                              <>
                                <FechaCalendar date={fechaInicio} />
                                <ChevronRight className="w-3 h-3 text-gray-400" />
                                <FechaCalendar date={fechaFin} />
                              </>
                            ) : (
                              <FechaCalendar date={fechaInicio} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-900">{getTipoLabel(ausencia.tipo)}</p>
                            <p className="text-[11px] text-gray-500">{ausencia.diasSolicitados} {ausencia.diasSolicitados === 1 ? 'día' : 'días'}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA - Calendario (3 columnas) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Calendario */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Calendario de Ausencias</CardTitle>
                <Button
                  onClick={() => setShowNuevaAusenciaModal(true)}
                  size="sm"
                >
                  Solicitar Ausencia
                </Button>
              </div>
            </CardHeader>
          <CardContent>
              <Calendar
                mode="single"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                className="rounded-md border"
                locale={es}
              />
              
              {/* Leyenda */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Leyenda:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-300 rounded"></div>
                    <span>Pendiente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-300 rounded"></div>
                    <span>Aprobada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-300 rounded"></div>
                    <span>Rechazada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <span>Día laborable</span>
                  </div>
                </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Modal Nueva Ausencia */}
      <Dialog open={showNuevaAusenciaModal} onOpenChange={setShowNuevaAusenciaModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar Nueva Ausencia</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="tipo">Tipo de Ausencia</Label>
              <Select value={nuevaAusencia.tipo} onValueChange={(value) => setNuevaAusencia({ ...nuevaAusencia, tipo: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="enfermedad">Enfermedad</SelectItem>
                  <SelectItem value="enfermedad_familiar">Enfermedad Familiar</SelectItem>
                  <SelectItem value="maternidad_paternidad">Maternidad/Paternidad</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={nuevaAusencia.fechaInicio}
                  onChange={(e) => setNuevaAusencia({ ...nuevaAusencia, fechaInicio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="fechaFin">Fecha Fin</Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={nuevaAusencia.fechaFin}
                  onChange={(e) => setNuevaAusencia({ ...nuevaAusencia, fechaFin: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="motivo">Motivo</Label>
              <Input
                id="motivo"
                placeholder="Motivo de la ausencia (opcional)"
                value={nuevaAusencia.motivo}
                onChange={(e) => setNuevaAusencia({ ...nuevaAusencia, motivo: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                placeholder="Descripción adicional (opcional)"
                value={nuevaAusencia.descripcion}
                onChange={(e) => setNuevaAusencia({ ...nuevaAusencia, descripcion: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="medioDia"
                checked={nuevaAusencia.medioDia}
                onChange={(e) => setNuevaAusencia({ ...nuevaAusencia, medioDia: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="medioDia" className="cursor-pointer">
                Medio día
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNuevaAusenciaModal(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={handleCrearAusencia} disabled={guardando}>
              {guardando ? 'Enviando...' : 'Solicitar Ausencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
