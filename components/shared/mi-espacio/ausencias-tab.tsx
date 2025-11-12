'use client';

import { useEffect, useState } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWeekend, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
      } catch (error: any) {
        if (error.name !== 'AbortError') {
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
      } catch (error: any) {
        if (error.name !== 'AbortError') {
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

  // Renderizar calendario
  const renderCalendar = (monthDate: Date) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start, end });

    // Añadir días del mes anterior para completar la primera semana
    const firstDayOfWeek = start.getDay();
    const daysFromPrevMonth = [];
    for (let i = firstDayOfWeek; i > 0; i--) {
      const prevDay = new Date(start);
      prevDay.setDate(start.getDate() - i);
      daysFromPrevMonth.push(prevDay);
    }

    const allDays = [...daysFromPrevMonth, ...days];

    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 capitalize">
          {format(monthDate, 'MMMM yyyy', { locale: es })}
        </h4>
        <div className="grid grid-cols-7 gap-1">
          {/* Encabezado días de la semana */}
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          
          {/* Días del calendario */}
          {allDays.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, monthDate);
            const isLaboral = esDiaLaborable(day);
            const isFeriado = esFestivo(day);
            const hasAusencia = tieneAusencia(day);
            const isToday = isSameDay(day, new Date());

            let bgColor = 'bg-white';
            if (!isLaboral || isFeriado) {
              bgColor = 'bg-gray-100';
            }
            if (hasAusencia) {
              bgColor = 'bg-primary/10';
            }
            if (isToday) {
              bgColor = 'bg-orange-100';
            }

            return (
              <Popover key={i}>
                <PopoverTrigger asChild>
                  <button
                    className={`
                      aspect-square p-1 text-xs rounded
                      ${bgColor}
                      ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                      ${isLaboral && isCurrentMonth ? 'hover:bg-gray-200 cursor-pointer' : 'cursor-default'}
                      ${isToday ? 'font-bold border-2 border-orange-500' : ''}
                    `}
                    disabled={!isLaboral || !isCurrentMonth}
                  >
                    {format(day, 'd')}
                  </button>
                </PopoverTrigger>
                {isLaboral && isCurrentMonth && (
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      <p className="font-semibold">{format(day, 'dd MMMM yyyy', { locale: es })}</p>
                      {hasAusencia ? (
                        <p className="text-sm text-primary">Día con ausencia</p>
                      ) : (
                        <p className="text-sm text-gray-600">Día laborable</p>
                      )}
                      {isFeriado && <p className="text-sm text-gray-500">Festivo</p>}
                      <Button size="sm" className="w-full mt-2">
                        Solicitar ausencia
                      </Button>
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Columna izquierda */}
      <div className="space-y-6">
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

      {/* Columna derecha - Calendario */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Calendario</h3>
          <Button size="sm">Solicitar ausencia</Button>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-white border border-gray-300"></div>
            <span className="text-gray-600">Laborable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-100"></div>
            <span className="text-gray-600">No laborable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary/10"></div>
            <span className="text-gray-600">Ausencia</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-orange-100 border-2 border-orange-500"></div>
            <span className="text-gray-600">Hoy</span>
          </div>
        </div>

        {/* Calendario de 2 meses */}
        <div className="grid grid-cols-2 gap-6">
          {renderCalendar(currentMonth)}
          {renderCalendar(addMonths(currentMonth, 1))}
        </div>

        {/* Navegación de meses */}
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          >
            Mes anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            Mes siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
