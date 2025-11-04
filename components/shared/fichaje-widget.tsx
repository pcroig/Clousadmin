// ========================================
// Fichaje Widget - Clock In/Out Widget
// ========================================
// Shows clocking with circular progress ring
// NUEVO MODELO: Consulta Fichaje completo con eventos

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { WidgetCard } from './widget-card';
import { calcularHorasTrabajadas } from '@/lib/calculos/fichajes';
import { formatTiempoTrabajado } from '@/lib/utils/formatters';
import type { FichajeEvento } from '@prisma/client';

interface FichajeWidgetProps {
  href?: string;
}

type EstadoFichaje = 'sin_fichar' | 'trabajando' | 'en_pausa' | 'finalizado';

// Usar FichajeEvento de Prisma en lugar de definir localmente

interface Fichaje {
  id: string;
  fecha: string;
  estado: string;
  horasTrabajadas: number | null;
  eventos: Array<{
    id: string;
    tipo: string;
    hora: string | Date;
  }>;
}

export function FichajeWidget({
  href = '/empleado/horario/fichajes',
}: FichajeWidgetProps) {
  const [estadoActual, setEstadoActual] = useState<EstadoFichaje>('sin_fichar');
  const [tiempoTrabajado, setTiempoTrabajado] = useState('00:00');
  const [horasHechas, setHorasHechas] = useState(0);
  const [horasPorHacer, setHorasPorHacer] = useState(8);
  const [cargando, setCargando] = useState(false);
  const [inicializando, setInicializando] = useState(true);
  const [horaEntrada, setHoraEntrada] = useState<Date | null>(null);

  // Actualizar tiempo trabajado cada segundo SOLO cuando está trabajando
  useEffect(() => {
    // Solo actualizar si está trabajando activamente
    if (estadoActual !== 'trabajando' || !horaEntrada) {
      return;
    }

    const actualizarTiempo = () => {
      if (horaEntrada) {
        const ahora = new Date();
        const diffMs = ahora.getTime() - horaEntrada.getTime();
        setTiempoTrabajado(formatTiempoTrabajado(diffMs));
      }
    };
    
    actualizarTiempo();
    const intervalo = setInterval(actualizarTiempo, 1000);
    
    return () => clearInterval(intervalo);
  }, [estadoActual, horaEntrada]);

  // Obtener estado actual y datos al cargar
  useEffect(() => {
    obtenerEstadoActual();
  }, []);

  async function obtenerEstadoActual() {
    try {
      // Usar formato de fecha local (YYYY-MM-DD)
      const hoy = new Date();
      const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      
      const response = await fetch(`/api/fichajes?fecha=${fechaLocal}&propios=1`, { cache: 'no-store' });
      
      if (!response.ok) {
        // Error crítico que debe loguearse
        console.error('[FichajeWidget] Error obteniendo fichaje:', response.status);
        // Reset explícito para evitar estado cruzado entre sesiones
        setEstadoActual('sin_fichar');
        setHorasHechas(0);
        setHorasPorHacer(8);
        setHoraEntrada(null);
        setInicializando(false);
        return;
      }

      const fichajes: Fichaje[] = await response.json();
      
      if (fichajes.length === 0) {
        setEstadoActual('sin_fichar');
        setHorasHechas(0);
        setHorasPorHacer(8);
        setHoraEntrada(null);
      } else {
        // Ahora recibimos UN fichaje con sus eventos
        const fichajeHoy = fichajes[0];
        
        // Buscar hora de entrada (primer evento 'entrada')
        const entrada = fichajeHoy.eventos.find((e) => e.tipo === 'entrada');
        if (entrada) {
          setHoraEntrada(new Date(entrada.hora));
        }
        
        // Determinar estado según el último evento
        if (fichajeHoy.estado === 'finalizado') {
          setEstadoActual('finalizado');
          setHoraEntrada(null);
        } else if (fichajeHoy.eventos.length > 0) {
          const ultimoEvento = fichajeHoy.eventos[fichajeHoy.eventos.length - 1];
          
          switch (ultimoEvento.tipo) {
            case 'entrada':
              setEstadoActual('trabajando');
              break;
            case 'pausa_inicio':
              setEstadoActual('en_pausa');
              break;
            case 'pausa_fin':
              setEstadoActual('trabajando');
              break;
            case 'salida':
              setEstadoActual('finalizado');
              setHoraEntrada(null);
              break;
            default:
              setEstadoActual('sin_fichar');
          }
        }

        // Calcular horas trabajadas usando función de lib/calculos
        // Los eventos del API vienen con hora como string, convertir a Date para calcularHorasTrabajadas
        const eventosFormateados: FichajeEvento[] = fichajeHoy.eventos.map(e => ({
          id: e.id,
          tipo: e.tipo as 'entrada' | 'pausa_inicio' | 'pausa_fin' | 'salida',
          hora: typeof e.hora === 'string' ? new Date(e.hora) : e.hora,
          fichajeId: fichajeHoy.id,
          ubicacion: null,
          editado: false,
          motivoEdicion: null,
          horaOriginal: null,
          editadoPor: null,
          createdAt: new Date(),
        }));
        
        actualizarHorasTrabajadas(eventosFormateados);
      }
    } catch (error) {
      console.error('[FichajeWidget] Error obteniendo estado:', error);
    } finally {
      setInicializando(false);
    }
  }

  // Función memoizada para actualizar horas trabajadas usando cálculo de lib/calculos
  const actualizarHorasTrabajadas = useCallback((eventos: FichajeEvento[]) => {
    if (eventos.length === 0) {
      setHorasHechas(0);
      setHorasPorHacer(8);
      setTiempoTrabajado('00:00');
      return;
    }

    // Usar función de lib/calculos/fichajes.ts
    const horasTotales = calcularHorasTrabajadas(eventos);
    const horasRedondeadas = Math.round(horasTotales * 10) / 10;
    
    setHorasHechas(horasRedondeadas);
    setHorasPorHacer(Math.max(0, 8 - horasRedondeadas));
    
    // Actualizar cronómetro si hay tiempo trabajado
    if (horasTotales > 0) {
      const horas = Math.floor(horasTotales);
      const minutos = Math.floor((horasTotales - horas) * 60);
      setTiempoTrabajado(`${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`);
    } else {
      setTiempoTrabajado('00:00');
    }
  }, []);

  async function handleFichar(tipoOverride?: string) {
    if (cargando) return;

    setCargando(true);
    try {
      // Determinar tipo de fichaje según estado actual
      let tipo = tipoOverride || 'entrada';
      
      if (!tipoOverride) {
        switch (estadoActual) {
          case 'sin_fichar':
          case 'finalizado':
            tipo = 'entrada';
            break;
          case 'trabajando':
            tipo = 'pausa_inicio';
            break;
          case 'en_pausa':
            tipo = 'pausa_fin';
            break;
        }
      }

      const response = await fetch('/api/fichajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al fichar');
        return;
      }

      // Actualizar estado después de fichar
      await obtenerEstadoActual();
    } catch (error) {
      console.error('[FichajeWidget] Error al fichar:', error);
      alert('Error al fichar. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  function getTextoBoton() {
    if (cargando) return 'Procesando...';
    
    switch (estadoActual) {
      case 'sin_fichar':
      case 'finalizado':
        return '▶ Iniciar Jornada';
      case 'trabajando':
        return '⏸ Pausar';
      case 'en_pausa':
        return '▶ Reanudar';
      default:
        return '▶ Fichar';
    }
  }

  function getTituloEstado() {
    switch (estadoActual) {
      case 'sin_fichar':
        return 'Sin fichar';
      case 'trabajando':
        return 'Trabajando';
      case 'en_pausa':
        return 'En pausa';
      case 'finalizado':
        return 'Jornada finalizada';
      default:
        return 'Fichaje';
    }
  }

  const porcentajeProgreso = (horasHechas / (horasHechas + horasPorHacer)) * 100;
  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (porcentajeProgreso / 100) * circumference;

  if (inicializando) {
    return (
      <WidgetCard title="Fichaje" href={href}>
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-gray-500">Cargando...</div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Fichaje" href={href} contentClassName="px-6 pb-20">
        {/* Dos mitades horizontales */}
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* Mitad izquierda: Estado y botón */}
          <div className="flex flex-col justify-between">
            <div>
              <h3 className="text-[24px] font-bold text-gray-900">{getTituloEstado()}</h3>
              <p className="text-[11px] text-gray-500 mt-1">
                {estadoActual === 'trabajando' && `${horasPorHacer.toFixed(1)}h restantes`}
                {estadoActual === 'en_pausa' && 'En descanso'}
                {estadoActual === 'sin_fichar' && 'Listo para comenzar'}
                {estadoActual === 'finalizado' && 'Día completado'}
              </p>
            </div>
            {estadoActual === 'trabajando' ? (
              <div className="space-y-2">
                <Button
                  variant="default"
                  className="w-full font-semibold text-[13px]"
                  onClick={() => handleFichar('pausa_inicio')}
                  disabled={cargando}
                >
                  ⏸ Pausar
                </Button>
                <Button
                  variant="outline"
                  className="w-full font-semibold text-[13px]"
                  onClick={() => handleFichar('salida')}
                  disabled={cargando}
                >
                  ⏹ Finalizar Jornada
                </Button>
              </div>
            ) : estadoActual === 'en_pausa' ? (
              <div className="space-y-2">
                <Button
                  variant="default"
                  className="w-full font-semibold text-[13px]"
                  onClick={() => handleFichar('pausa_fin')}
                  disabled={cargando}
                >
                  ▶ Reanudar
                </Button>
                <Button
                  variant="outline"
                  className="w-full font-semibold text-[13px]"
                  onClick={() => handleFichar('salida')}
                  disabled={cargando}
                >
                  ⏹ Finalizar Jornada
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                className="w-full font-semibold text-[13px]"
                onClick={() => handleFichar()}
                disabled={cargando}
              >
                {getTextoBoton()}
              </Button>
            )}
          </div>

          {/* Mitad derecha: Anillo de progreso */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-32 h-32">
              {/* SVG Anillo de progreso abierto por la parte de abajo */}
              <svg className="w-full h-full" viewBox="0 0 128 128">
                {/* Arco de fondo (3/4 del círculo, abierto en la parte de abajo) */}
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="#EFEFED"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(circumference * 3) / 4} ${circumference}`}
                  strokeDashoffset={-circumference / 8}
                  strokeLinecap="round"
                  transform="rotate(90 64 64)"
                />
                {/* Arco de progreso */}
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="#F26C21"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${((circumference * 3) / 4) * (porcentajeProgreso / 100)} ${circumference}`}
                  strokeDashoffset={-circumference / 8}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                  transform="rotate(90 64 64)"
                />
              </svg>
              {/* Tiempo en el centro */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{tiempoTrabajado}</span>
              </div>
            </div>

            {/* Marcadores de horas */}
            <div className="flex items-center justify-between w-full mt-2 px-2">
              <div className="text-center">
                <div className="text-[11px] text-gray-900 font-semibold">{horasHechas}h</div>
                <div className="text-[9px] text-gray-500">Hechas</div>
              </div>
              <div className="text-center">
                <div className="text-[11px] text-gray-900 font-semibold">{horasPorHacer}h</div>
                <div className="text-[9px] text-gray-500">Por hacer</div>
              </div>
            </div>
          </div>
        </div>
    </WidgetCard>
  );
}
