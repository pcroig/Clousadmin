'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, isSameDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronRight, Info } from 'lucide-react';

import { useApi } from '@/lib/hooks';
import { EstadoAusencia } from '@/lib/constants/enums';
import { getAusenciaEstadoLabel } from '@/lib/utils/formatters';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { FechaCalendar } from '@/components/shared/fecha-calendar';
import { SolicitarAusenciaModal } from '@/components/empleado/solicitar-ausencia-modal';

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

interface DiasLaborables {
  lunes: boolean;
  martes: boolean;
  miercoles: boolean;
  jueves: boolean;
  viernes: boolean;
  sabado: boolean;
  domingo: boolean;
}

interface Festivo {
  id: string;
  fecha: string;
  nombre: string;
  activo: boolean;
}

const isFestivo = (value: unknown): value is Festivo => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const festivo = value as Record<string, unknown>;

  return (
    typeof festivo.id === 'string' &&
    typeof festivo.fecha === 'string' &&
    typeof festivo.nombre === 'string' &&
    typeof festivo.activo === 'boolean'
  );
};

interface MiEspacioAusenciasTabProps {
  empleadoId: string;
}

export function AusenciasTab({ empleadoId }: MiEspacioAusenciasTabProps) {
  const [saldo, setSaldo] = useState<SaldoAusencias>({
    diasTotales: 0,
    diasUsados: 0,
    diasPendientes: 0,
    diasDisponibles: 0,
  });
  const [activeTab, setActiveTab] = useState<'proximas' | 'pasadas'>('proximas');
  const [mostrarModalSolicitud, setMostrarModalSolicitud] = useState(false);
  
  // Estado para popover de selección de fecha
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Estados para calendario laboral
  const [diasLaborables, setDiasLaborables] = useState<DiasLaborables>({
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: false,
    domingo: false,
  });
  const [festivos, setFestivos] = useState<Festivo[]>([]);

  // Hook para cargar ausencias
  const {
    data: ausencias = [],
    loading,
    execute: refetchAusencias,
  } = useApi<Ausencia[]>();

  // Hook para cargar saldo
  const { execute: refetchSaldo } = useApi<SaldoAusencias>({
    onSuccess: (data) => {
      setSaldo({
        diasTotales: Number(data.diasTotales) || 0,
        diasUsados: Number(data.diasUsados) || 0,
        diasPendientes: Number(data.diasPendientes) || 0,
        diasDisponibles: Number(data.diasDisponibles) || 0,
      });
    },
  });

  useEffect(() => {
    if (empleadoId) {
      refetchAusencias(`/api/ausencias?empleadoId=${empleadoId}&propios=1`);
      refetchSaldo(`/api/ausencias/saldo?empleadoId=${empleadoId}`);
    }
  }, [empleadoId, refetchAusencias, refetchSaldo]);

  // Cargar días laborables y festivos
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function cargarCalendarioLaboral() {
      try {
        // Cargar días laborables
        const diasResponse = await fetch('/api/empresa/calendario-laboral', {
          signal: controller.signal,
        });
        if (diasResponse.ok) {
          const { diasLaborables: dias } = await diasResponse.json();
          if (isMounted && dias) {
            setDiasLaborables(dias);
          }
        }

        // Cargar festivos activos
        const festivosResponse = await fetch('/api/festivos?activo=true', {
          signal: controller.signal,
        });
        if (festivosResponse.ok) {
          const festivosData = await festivosResponse.json();
          if (isMounted) {
            const festivosListRaw: unknown =
              typeof festivosData === 'object' && festivosData !== null
                ? // API devuelve { festivos, meta }
                  (festivosData as { festivos?: unknown }).festivos ?? festivosData
                : [];

            const festivosParsed = Array.isArray(festivosListRaw)
              ? festivosListRaw.filter(isFestivo)
              : [];

            setFestivos(festivosParsed);
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error cargando calendario laboral:', error);
        }
      }
    }

    cargarCalendarioLaboral();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const proximasAusencias = useMemo(
    () =>
      (ausencias || [])
        .filter((a) => {
          const fechaFin = new Date(a.fechaFin);
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          fechaFin.setHours(0, 0, 0, 0);
          return (
            fechaFin >= hoy &&
            (a.estado === 'pendiente' || a.estado === 'confirmada')
          );
        })
        .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()),
    [ausencias]
  );

  const ausenciasPasadas = useMemo(
    () =>
      (ausencias || [])
        .filter((a) => {
          const fechaFin = new Date(a.fechaFin);
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          fechaFin.setHours(0, 0, 0, 0);
          return fechaFin < hoy && a.estado === 'completada';
        })
        .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()),
    [ausencias]
  );

  function getEstadoBadge(estado: string) {
    const variants: Record<string, { label: string; className: string }> = {
      pendiente: {
        label: 'Pendiente',
        className: 'bg-yellow-100 text-yellow-800',
      },
      confirmada: {
        label: 'Confirmada',
        className: 'bg-blue-100 text-blue-800',
      },
      completada: {
        label: 'Completada',
        className: 'bg-gray-100 text-gray-800',
      },
      rechazada: {
        label: 'Rechazada',
        className: 'bg-red-100 text-red-800',
      },
    };
    const variant = variants[estado] || variants.pendiente;
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

  const modifiers = useMemo(
    () => ({
      festivo: festivos.map((festivo) => new Date(festivo.fecha)),
      noLaborable: (date: Date) => {
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaKey = diasSemana[date.getDay()] as keyof DiasLaborables;
        return !diasLaborables[diaKey];
      },
      pendiente: (ausencias || [])
        .filter((a) => a.estado === 'pendiente')
        .map((a) => ({ from: new Date(a.fechaInicio), to: new Date(a.fechaFin) })),
      confirmada: (ausencias || [])
        .filter((a) => a.estado === 'confirmada')
        .map((a) => ({ from: new Date(a.fechaInicio), to: new Date(a.fechaFin) })),
      completada: (ausencias || [])
        .filter((a) => a.estado === 'completada')
        .map((a) => ({
        from: new Date(a.fechaInicio),
        to: new Date(a.fechaFin),
      })),
      rechazada: (ausencias || [])
        .filter((a) => a.estado === 'rechazada')
        .map((a) => ({ from: new Date(a.fechaInicio), to: new Date(a.fechaFin) })),
    }),
    [
      ausencias,
      diasLaborables.domingo,
      diasLaborables.jueves,
      diasLaborables.lunes,
      diasLaborables.martes,
      diasLaborables.miercoles,
      diasLaborables.sabado,
      diasLaborables.viernes,
      festivos,
    ]
  );

  const modifiersClassNames = useMemo(
    () => ({
      pendiente:
        'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-yellow-300 after:opacity-40 after:rounded-md',
      confirmada:
        'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-blue-300 after:opacity-40 after:rounded-md',
      completada:
        'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-green-300 after:opacity-40 after:rounded-md',
      rechazada:
        'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-red-300 after:opacity-40 after:rounded-md',
      festivo:
        'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-red-100 after:border after:border-red-300 after:opacity-60 after:rounded-md',
      noLaborable: 'bg-gray-100 text-gray-400',
    }),
    []
  );

  const calendarioLegend = useMemo(
    () => [
      {
        label: 'Pendiente',
        className: 'bg-yellow-100 border border-yellow-300 text-yellow-800',
      },
      {
        label: 'Confirmada',
        className: 'bg-blue-100 border border-blue-300 text-blue-800',
      },
      {
        label: 'Completada',
        className: 'bg-green-100 border border-green-300 text-green-800',
      },
      {
        label: 'Rechazada',
        className: 'bg-red-100 border border-red-300 text-red-800',
      },
      {
        label: 'Festivo',
        className: 'bg-red-50 border border-red-200 text-red-700',
      },
      {
        label: 'No laborable',
        className: 'bg-gray-100 border border-gray-300 text-gray-700',
      },
    ],
    []
  );

  const handleNuevaAusenciaClick = () => {
    setMostrarModalSolicitud(true);
  };

  const onSolicitudSuccess = () => {
    setMostrarModalSolicitud(false);
    refetchAusencias(`/api/ausencias?empleadoId=${empleadoId}&propios=1`);
    refetchSaldo(`/api/ausencias/saldo?empleadoId=${empleadoId}`);
  };

  // Helper: determinar si un día es festivo
  const esFestivoFecha = (date: Date): boolean => {
    return festivos.some((f) => {
      const festivoDate = new Date(f.fecha);
      festivoDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return festivoDate.getTime() === checkDate.getTime();
    });
  };

  // Helper: determinar si un día es laborable según jornada empresa
  const esLaborableFecha = (date: Date): boolean => {
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaKey = diasSemana[date.getDay()] as keyof DiasLaborables;
    return diasLaborables[diaKey];
  };

  // Helper: obtener ausencia en fecha específica
  const getAusenciaEnFecha = (date: Date): Ausencia | null => {
    if (!ausencias) return null;
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return (
      ausencias.find((ausencia) => {
        const inicio = new Date(ausencia.fechaInicio);
        const fin = new Date(ausencia.fechaFin);
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(0, 0, 0, 0);

        return isWithinInterval(checkDate, { start: inicio, end: fin });
      }) || null
    );
  };

  // Helper: obtener info completa de un día para el popover
  const getDayInfo = (date: Date) => {
    const ausencia = getAusenciaEnFecha(date);
    const esFestivo = esFestivoFecha(date);
    const esLaborable = esLaborableFecha(date);

    return {
      date,
      esLaborable,
      esFestivo,
      ausencia,
      festivoInfo: esFestivo ? festivos.find((f) => {
        const fDate = new Date(f.fecha);
        fDate.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        return fDate.getTime() === checkDate.getTime();
      }) : null,
    };
  };

  // Handler: click en día del calendario
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setPopoverOpen(true);
  };

  const renderListaAusencias = (lista: Ausencia[], isPast = false) => (
    <div className="space-y-3">
      {lista.length === 0 ? (
        <Card className="border-dashed border-gray-200 bg-gray-50/60">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-gray-500">
              {isPast ? 'No hay ausencias previas registradas' : 'No hay ausencias programadas'}
            </p>
          </CardContent>
        </Card>
      ) : (
        lista.map((ausencia) => {
          const fechaInicio = new Date(ausencia.fechaInicio);
          const fechaFin = new Date(ausencia.fechaFin);
          const esMultiDia = !isSameDay(fechaInicio, fechaFin);

          return (
            <Card key={ausencia.id} className="border border-gray-200">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-semibold">
                        {getTipoLabel(ausencia.tipo)}
                      </Badge>
                      {getEstadoBadge(ausencia.estado)}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <span>
                          {format(fechaInicio, 'dd MMM yyyy', { locale: es })}
                          {esMultiDia && (
                            <>
                              <span className="mx-2 text-gray-300">•</span>
                              {format(fechaFin, 'dd MMM yyyy', { locale: es })}
                            </>
                          )}
                        </span>
                      </div>

                      <div className="hidden sm:flex items-center gap-2">
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-500">
                          {ausencia.diasSolicitados}{' '}
                          {ausencia.diasSolicitados === 1 ? 'día' : 'días'}
                          {ausencia.medioDia && ' (medio día)'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      {ausencia.motivo ? (
                        <span className="block leading-relaxed">{ausencia.motivo}</span>
                      ) : (
                        <span className="text-gray-400">Sin motivo adicional</span>
                      )}
                      {ausencia.descripcion && (
                        <span className="block text-gray-400 mt-1">{ausencia.descripcion}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-gray-400">
                      Solicitud creada el{' '}
                      {format(new Date(fechaInicio), 'dd MMM yyyy', { locale: es })}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Card Saldo */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Saldo de Ausencias
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Resumen de tus días disponibles y solicitudes en curso
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleNuevaAusenciaClick}
              className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm"
            >
              Solicitar ausencia
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-center">
              <div className="text-lg font-semibold text-gray-900">{saldo.diasTotales}</div>
              <div className="text-xs text-gray-500 mt-1">Asignados</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <div className="text-lg font-semibold text-gray-700">{saldo.diasUsados}</div>
              <div className="text-xs text-gray-500 mt-1">Usados</div>
            </div>
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-center">
              <div className="text-lg font-semibold text-yellow-700">{saldo.diasPendientes}</div>
              <div className="text-xs text-yellow-600 mt-1">Pendientes</div>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <div className="text-lg font-semibold text-green-700">{saldo.diasDisponibles}</div>
              <div className="text-xs text-green-600 mt-1">Disponibles</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Lista / Historial */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Seguimiento de ausencias
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Visualiza tus ausencias próximas y anteriores
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList className="grid grid-cols-2 w-full mb-4 bg-gray-100/70 p-1 rounded-xl">
                  <TabsTrigger value="proximas" className="text-sm font-medium">
                    Próximas
                  </TabsTrigger>
                  <TabsTrigger value="pasadas" className="text-sm font-medium">
                    Historial
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="proximas" className="mt-0">
                  {renderListaAusencias(proximasAusencias)}
                </TabsContent>
                <TabsContent value="pasadas" className="mt-0">
                  {renderListaAusencias(ausenciasPasadas, true)}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Calendario laboral
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Visualiza ausencias, festivos y días no laborables
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex border-gray-200 text-gray-600 hover:bg-gray-100"
                  onClick={() => setActiveTab('proximas')}
                >
                  Ver próximas
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {calendarioLegend.map((legend) => (
                  <span
                    key={legend.label}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${legend.className}`}
                  >
                    {legend.label}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onDayClick={handleDayClick}
                  modifiers={modifiers}
                  modifiersClassNames={modifiersClassNames}
                  className="rounded-md border"
                  locale={es}
                />
              <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onDayClick={handleDayClick}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                  month={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)}
                  className="rounded-md border"
                  locale={es}
              />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Próximas ausencias</h4>
                {proximasAusencias.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No hay ausencias programadas en los próximos días.
                  </p>
                ) : (
                  proximasAusencias.slice(0, 3).map((ausencia) => (
                    <div
                      key={ausencia.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
                    >
                      <div className="flex flex-col text-sm">
                        <span className="font-medium text-gray-900">
                          {getTipoLabel(ausencia.tipo)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(ausencia.fechaInicio), 'dd MMM', { locale: es })} •{' '}
                          {format(new Date(ausencia.fechaFin), 'dd MMM yyyy', { locale: es })}
                        </span>
                      </div>
                      {getEstadoBadge(ausencia.estado)}
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Calendario laboral</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <span>Días laborables</span>
                    <span className="font-medium text-gray-900">
                      {Object.entries(diasLaborables)
                        .filter(([, value]) => value)
                        .map(([dia]) => dia.charAt(0).toUpperCase() + dia.slice(1))
                        .join(', ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <span>Festivos próximos</span>
                    <span className="font-medium text-gray-900">
                      {festivos.length === 0
                        ? 'Sin festivos registrados'
                        : festivos
                            .slice(0, 3)
                            .map(
                              (festivo) =>
                                `${festivo.nombre} (${format(new Date(festivo.fecha), 'dd MMM', {
                                  locale: es,
                                })})`
                            )
                            .join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SolicitarAusenciaModal
        open={mostrarModalSolicitud}
        onClose={() => setMostrarModalSolicitud(false)}
        onSuccess={onSolicitudSuccess}
        saldoDisponible={saldo.diasDisponibles}
      />

      {/* Popover de información de día */}
      {selectedDate && (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <div className="hidden" />
          </PopoverTrigger>
          <PopoverContent className="w-80" align="center">
            {(() => {
              const dayInfo = getDayInfo(selectedDate);
              return (
                <div className="space-y-4">
                  {/* Header con fecha */}
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                    <CalendarIcon className="h-5 w-5 text-[#d97757]" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(selectedDate, 'yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>

                  {/* Información del día */}
                  <div className="space-y-3">
                    {/* Estado laborable/festivo/no laborable */}
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {dayInfo.esFestivo ? (
                          <Badge className="bg-red-50 border border-red-200 text-red-700">
                            Festivo: {dayInfo.festivoInfo?.nombre}
                          </Badge>
                        ) : dayInfo.esLaborable ? (
                          <Badge className="bg-green-50 border border-green-200 text-green-700">
                            Día laborable
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 border border-gray-300 text-gray-700">
                            No laborable
                          </Badge>
                        )}
                      </span>
                    </div>

                    {/* Si hay ausencia en este día */}
                    {dayInfo.ausencia && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                        <p className="text-sm font-semibold text-gray-900">Ausencia registrada</p>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Tipo:</span>{' '}
                            {getTipoLabel(dayInfo.ausencia.tipo)}
                          </p>
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Estado:</span>{' '}
                            {(() => {
                              const estadoMap: Record<string, string> = {
                                pendiente: 'Pendiente',
                                confirmada: 'Confirmada',
                                completada: 'Completada',
                                rechazada: 'Rechazada',
                              };
                              return estadoMap[dayInfo.ausencia.estado] || dayInfo.ausencia.estado;
                            })()}
                          </p>
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Período:</span>{' '}
                            {format(new Date(dayInfo.ausencia.fechaInicio), 'dd MMM', {
                              locale: es,
                            })}{' '}
                            -{' '}
                            {format(new Date(dayInfo.ausencia.fechaFin), 'dd MMM yyyy', {
                              locale: es,
                            })}
                          </p>
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Días:</span> {dayInfo.ausencia.diasSolicitados}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Botón solicitar ausencia solo si es día laborable y no festivo */}
                    {dayInfo.esLaborable && !dayInfo.esFestivo && !dayInfo.ausencia && (
                      <Button
                        onClick={() => {
                          setPopoverOpen(false);
                          handleNuevaAusenciaClick();
                        }}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                        size="sm"
                      >
                        Solicitar ausencia desde esta fecha
                      </Button>
                    )}

                    {/* Mensaje si no se puede solicitar */}
                    {(!dayInfo.esLaborable || dayInfo.esFestivo || dayInfo.ausencia) && (
                      <p className="text-xs text-gray-500 text-center">
                        {dayInfo.ausencia
                          ? 'Ya tienes una ausencia en este día'
                          : dayInfo.esFestivo
                          ? 'No puedes solicitar ausencia en un festivo'
                          : 'No puedes solicitar ausencia en un día no laborable'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}


