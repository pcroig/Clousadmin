'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

interface Ausencia {
  id: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  diasLaborables: number;
  estado: string;
  motivo: string | null;
}

interface MiEspacioAusenciasTabProps {
  empleadoId: string;
}

export function AusenciasTab({ empleadoId }: MiEspacioAusenciasTabProps) {
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [diasLaborables, setDiasLaborables] = useState({
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: false,
    domingo: false,
  });
  const [festivos, setFestivos] = useState<{ fecha: string; nombre: string }[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [tooltipData, setTooltipData] = useState<{
    date: Date;
    ausencia: Ausencia | null;
    position: { top: number; left: number };
  } | null>(null);

  const calendarContainerRef = useRef<HTMLDivElement>(null);

  // Cargar ausencias
  useEffect(() => {
    const controller = new AbortController();

    async function cargarAusencias() {
      try {
        const response = await fetch(`/api/ausencias?empleadoId=${empleadoId}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          setAusencias(data.ausencias || []);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error cargando ausencias:', error);
        }
      }
    }

    cargarAusencias();

    return () => controller.abort();
  }, [empleadoId]);

  // Cargar calendario laboral y festivos
  useEffect(() => {
    const controller = new AbortController();

    async function cargarCalendarioLaboral() {
      try {
        // Cargar días laborables
        const diasResponse = await fetch('/api/empresa/calendario-laboral', {
          signal: controller.signal,
        });
        if (diasResponse.ok) {
          const diasData = await diasResponse.json();
          if (diasData.diasLaborables) {
            setDiasLaborables(diasData.diasLaborables);
          }
        }

        // Cargar festivos activos
        const festivosResponse = await fetch('/api/festivos?activo=true', {
          signal: controller.signal,
        });
        if (festivosResponse.ok) {
          const festivosData = await festivosResponse.json();
          setFestivos(festivosData.festivos || []);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error cargando calendario laboral:', error);
        }
      }
    }

    cargarCalendarioLaboral();

    return () => controller.abort();
  }, []);

  // Calcular saldo de ausencias
  const calcularSaldo = () => {
    const diasTotales = 22; // Ejemplo: podría venir de la API
    const diasUsados = ausencias
      .filter((a) => a.estado === 'approved' || a.estado === 'auto_aprobada')
      .reduce((sum, a) => sum + (a.diasLaborables || 0), 0);
    const diasPendientes = ausencias
      .filter((a) => a.estado === 'pending' || a.estado === 'pendiente_aprobacion')
      .reduce((sum, a) => sum + (a.diasLaborables || 0), 0);
    const diasDisponibles = diasTotales - diasUsados - diasPendientes;

    return { diasTotales, diasUsados, diasPendientes, diasDisponibles };
  };

  const saldo = calcularSaldo();

  // Próximas ausencias
  const proximasAusencias = ausencias
    .filter((a) => new Date(a.fechaInicio) >= new Date())
    .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())
    .slice(0, 5);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'approved':
      case 'auto_aprobada':
        return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      case 'pending':
      case 'pendiente_aprobacion':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  // Función para verificar si un día es laborable
  const esDiaLaborable = (date: Date) => {
    const dayOfWeek = date.getDay();
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const nombreDia = diasSemana[dayOfWeek] as keyof typeof diasLaborables;
    return diasLaborables[nombreDia];
  };

  // Función para verificar si un día es festivo
  const esFestivo = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return festivos.some((f) => f.fecha === dateStr);
  };

  // Función para verificar si un día tiene ausencia
  const tieneAusencia = (date: Date) => {
    return ausencias.some((ausencia) => {
      const inicio = new Date(ausencia.fechaInicio);
      const fin = new Date(ausencia.fechaFin);
      return date >= inicio && date <= fin;
    });
  };

  // Obtener ausencia de un día específico
  const getAusenciaDelDia = (date: Date): Ausencia | null => {
    const ausencia = ausencias.find((a) => {
      const inicio = new Date(a.fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(a.fechaFin);
      fin.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return checkDate >= inicio && checkDate <= fin;
    });
    return ausencia || null;
  };

  // Handler para click en día del calendario
  const handleDayClick = (
    date: Date | undefined,
    _modifiers?: unknown,
    event?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (!date || !event) return;

    setSelectedDate(date);

    const ausencia = getAusenciaDelDia(date);

    if (!calendarContainerRef.current) {
      setTooltipData({ date, ausencia, position: { top: 0, left: 0 } });
      return;
    }

    const containerRect = calendarContainerRef.current.getBoundingClientRect();
    const buttonRect = event.currentTarget.getBoundingClientRect();

    const tooltipWidth = 260;
    const tooltipHeight = 160;

    let left = buttonRect.left - containerRect.left + buttonRect.width / 2 - tooltipWidth / 2;
    let top = buttonRect.bottom - containerRect.top + 12;

    if (left + tooltipWidth > containerRect.width) {
      left = containerRect.width - tooltipWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }

    if (top + tooltipHeight > containerRect.height) {
      top = buttonRect.top - containerRect.top - tooltipHeight - 12;
    }

    if (!esDiaLaborable(date) && !ausencia) {
      setTooltipData({
        date,
        ausencia: null,
        position: { top, left },
      });
      return;
    }

    setTooltipData({
      date,
      ausencia,
      position: { top, left },
    });
  };

  // Modificadores para el calendario
  const modifiers = {
    ausencia: (date: Date) => tieneAusencia(date),
    festivo: (date: Date) => esFestivo(date),
    noLaborable: (date: Date) => !esDiaLaborable(date),
  };

  const modifiersClassNames = {
    ausencia: 'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-[#d97757]/20 after:border-2 after:border-[#d97757] after:opacity-80 after:rounded-md after:transition-opacity hover:after:opacity-100 cursor-pointer',
    festivo: 'relative after:absolute after:top-0 after:left-0 after:w-full after:h-full after:bg-red-50 after:border after:border-red-300 after:opacity-90 after:rounded-md',
    noLaborable: 'bg-gray-50 text-gray-400',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Columna izquierda - 2 columnas */}
      <div className="lg:col-span-2 space-y-6">
        {/* Card de saldo */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900">Saldo de ausencias</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            De enero {new Date().getFullYear()} a diciembre {new Date().getFullYear()}
          </p>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">{saldo.diasTotales}</div>
              <div className="text-xs text-gray-500 mt-1">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{saldo.diasUsados}</div>
              <div className="text-xs text-gray-500 mt-1">Usados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{saldo.diasPendientes}</div>
              <div className="text-xs text-gray-500 mt-1">Pendientes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{saldo.diasDisponibles}</div>
              <div className="text-xs text-gray-500 mt-1">Disponibles</div>
            </div>
          </div>
        </div>

        {/* Próximas ausencias */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900">Próximas ausencias</h3>
          </div>
          <div className="space-y-3">
            {proximasAusencias.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay ausencias próximas</p>
            ) : (
              proximasAusencias.map((ausencia) => (
                <div key={ausencia.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(ausencia.fechaInicio).toLocaleDateString('es-ES')} → {new Date(ausencia.fechaFin).toLocaleDateString('es-ES')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ausencia.diasLaborables} {ausencia.diasLaborables === 1 ? 'día' : 'días'}
                      </p>
                    </div>
                  </div>
                  {getEstadoBadge(ausencia.estado)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Columna derecha - Calendario (3 columnas) */}
      <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Calendario</h3>
          <Button size="sm" onClick={() => (window.location.href = '/empleado/horario/ausencias')}>
            Solicitar ausencia
          </Button>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-white border-2 border-gray-300"></div>
            <span className="text-gray-600">Laborable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-50 border border-gray-200"></div>
            <span className="text-gray-600">No laborable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#d97757]/20 border-2 border-[#d97757]"></div>
            <span className="text-gray-600">Ausencia</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-50 border border-red-300"></div>
            <span className="text-gray-600">Festivo</span>
          </div>
        </div>

        {/* Calendario de 2 meses */}
        <div className="relative flex justify-center overflow-x-auto" ref={calendarContainerRef}>
          <Calendar
            mode="single"
            selected={selectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            onDayClick={handleDayClick}
            onSelect={setSelectedDate}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            numberOfMonths={2}
            className="rounded-lg border-0"
            locale={es}
          />

          {tooltipData && (
            <div
              className="absolute z-20 max-w-[260px] rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
              style={{
                top: tooltipData.position.top,
                left: tooltipData.position.left,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">
                  {format(tooltipData.date, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                </p>
                <button
                  onClick={() => setTooltipData(null)}
                  aria-label="Cerrar"
                  className="text-gray-400 transition hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="mt-3 space-y-3 text-sm text-gray-700">
                {tooltipData.ausencia ? (
                  <>
                    <div>
                      <span className="text-xs text-gray-500">Tipo</span>
                      <p className="font-medium text-gray-900">{tooltipData.ausencia.tipo}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-gray-500">Inicio</span>
                        <p>{new Date(tooltipData.ausencia.fechaInicio).toLocaleDateString('es-ES')}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Fin</span>
                        <p>{new Date(tooltipData.ausencia.fechaFin).toLocaleDateString('es-ES')}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Días laborables</span>
                      <p>
                        {tooltipData.ausencia.diasLaborables}{' '}
                        {tooltipData.ausencia.diasLaborables === 1 ? 'día' : 'días'}
                      </p>
                    </div>
                    {tooltipData.ausencia.motivo && (
                      <div>
                        <span className="text-xs text-gray-500">Motivo</span>
                        <p>{tooltipData.ausencia.motivo}</p>
                      </div>
                    )}
                  </>
                ) : esDiaLaborable(tooltipData.date) ? (
                  <>
                    <p className="text-sm text-gray-600">Día laborable disponible</p>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => (window.location.href = '/empleado/horario/ausencias')}
                    >
                      Solicitar ausencia
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Día no laborable</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
