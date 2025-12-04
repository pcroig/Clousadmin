// ========================================
// Cálculo de Promedios Históricos de Fichajes
// ========================================
// Funciones para calcular eventos propuestos basados en promedio
// de los últimos N días con eventos registrados del mismo empleado

import { calcularHorasTrabajadas } from '@/lib/calculos/fichajes';
import { prisma } from '@/lib/prisma';
import { crearFechaConHora, normalizarFechaSinHora } from '@/lib/utils/fechas';

import type { fichaje_eventos as FichajeEvento } from '@prisma/client';

/**
 * Interface para eventos promedio calculados
 */
export interface PromedioEventos {
  entrada: Date | null;
  pausa_inicio: Date | null;
  pausa_fin: Date | null;
  salida: Date | null;
}

/**
 * Calcula el promedio de hora a partir de un array de fechas
 * @param horas Array de fechas con diferentes timestamps
 * @param fechaBase Fecha base para crear el resultado
 * @returns Date con la hora promedio en la fecha base, o null si no hay datos
 */
function calcularPromedioHora(horas: Date[], fechaBase: Date): Date | null {
  if (horas.length === 0) return null;

  const horasValidas = horas.filter((hora) => !Number.isNaN(hora.getTime()));
  if (horasValidas.length === 0) return null;

  // Convertir cada hora a minutos desde medianoche
  const totalMinutos = horasValidas.reduce((sum, hora) => {
    return sum + hora.getHours() * 60 + hora.getMinutes();
  }, 0);

  const promedioMinutos = Math.round(totalMinutos / horasValidas.length);
  if (!Number.isFinite(promedioMinutos)) {
    return null;
  }

  const horasPromedio = Math.floor(promedioMinutos / 60);
  const minutosPromedio = promedioMinutos % 60;

  return crearFechaConHora(fechaBase, horasPromedio, minutosPromedio);
}

/**
 * Valida que la secuencia de eventos sea coherente
 * @param eventos Eventos promedio a validar
 * @returns true si la secuencia es válida, false si hay conflictos
 */
export function validarSecuenciaEventos(eventos: PromedioEventos): boolean {
  const { entrada, pausa_inicio, pausa_fin, salida } = eventos;

  // Si no hay entrada ni salida, no es válido
  if (!entrada || !salida) {
    return false;
  }

  // Entrada debe ser antes que salida
  if (entrada.getTime() >= salida.getTime()) {
    return false;
  }

  // Si hay pausas, validar secuencia completa
  if (pausa_inicio || pausa_fin) {
    // Si hay inicio de pausa sin fin, o viceversa, no es válido
    if ((pausa_inicio && !pausa_fin) || (!pausa_inicio && pausa_fin)) {
      return false;
    }

    if (pausa_inicio && pausa_fin) {
      // Validar: entrada < pausa_inicio < pausa_fin < salida
      if (
        entrada.getTime() >= pausa_inicio.getTime() ||
        pausa_inicio.getTime() >= pausa_fin.getTime() ||
        pausa_fin.getTime() >= salida.getTime()
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Obtiene el promedio de eventos de los últimos N días fichados del empleado
 * Solo considera fichajes finalizados con eventos registrados y de la misma jornada
 * 
 * @param empleadoId ID del empleado
 * @param fecha Fecha del fichaje a cuadrar
 * @param jornadaId ID de la jornada actual del empleado
 * @param limite Número máximo de días históricos a considerar (default: 5)
 * @returns Promedio de eventos o null si no hay suficientes datos
 */
export async function obtenerPromedioEventosHistoricos(
  empleadoId: string,
  fecha: Date,
  jornadaId: string | null,
  limite: number = 5
): Promise<PromedioEventos | null> {
  const fechaBase = normalizarFechaSinHora(fecha);

  // Construir where clause
  const whereClause: Record<string, unknown> = {
    empleadoId,
    estado: 'finalizado',
    fecha: { lt: fechaBase },
  };

  // Solo filtrar por jornadaId si existe
  if (jornadaId) {
    whereClause.jornadaId = jornadaId;
  }

  // Buscar últimos fichajes finalizados (traemos más para filtrar por eventos)
  const fichajesHistoricos = await prisma.fichajes.findMany({
    where: whereClause,
    include: {
      eventos: {
        orderBy: { hora: 'asc' },
      },
    },
    orderBy: { fecha: 'desc' },
    take: 50, // Traer suficientes para filtrar los que tienen eventos
  });

  // Filtrar solo fichajes que tienen eventos registrados
  const fichajesConEventos = fichajesHistoricos
    .filter((f) => f.eventos.length > 0)
    .slice(0, limite);

  // Si no hay suficientes históricos, retornar null para usar fallback
  if (fichajesConEventos.length === 0) {
    return null;
  }

  // Extraer horas de cada tipo de evento
  const horasEntrada: Date[] = [];
  const horasPausaInicio: Date[] = [];
  const horasPausaFin: Date[] = [];
  const horasSalida: Date[] = [];

  for (const fichaje of fichajesConEventos) {
    for (const evento of fichaje.eventos) {
      const hora = new Date(evento.hora);

      switch (evento.tipo) {
        case 'entrada':
          horasEntrada.push(hora);
          break;
        case 'pausa_inicio':
          horasPausaInicio.push(hora);
          break;
        case 'pausa_fin':
          horasPausaFin.push(hora);
          break;
        case 'salida':
          horasSalida.push(hora);
          break;
      }
    }
  }

  // Calcular promedios para cada tipo de evento
  const promedios: PromedioEventos = {
    entrada: calcularPromedioHora(horasEntrada, fechaBase),
    pausa_inicio: calcularPromedioHora(horasPausaInicio, fechaBase),
    pausa_fin: calcularPromedioHora(horasPausaFin, fechaBase),
    salida: calcularPromedioHora(horasSalida, fechaBase),
  };

  // Validar que la secuencia sea coherente
  if (!validarSecuenciaEventos(promedios)) {
    console.warn(
      `[Fichajes Histórico] Secuencia de eventos inválida para empleado ${empleadoId}:`,
      {
        entrada: promedios.entrada?.toISOString(),
        pausa_inicio: promedios.pausa_inicio?.toISOString(),
        pausa_fin: promedios.pausa_fin?.toISOString(),
        salida: promedios.salida?.toISOString(),
      }
    );
    return null;
  }

  return promedios;
}

/**
 * Ajusta la hora de salida si el promedio supera las horas esperadas del día
 * 
 * @param eventosPromedio Eventos promedio calculados
 * @param fecha Fecha del fichaje
 * @param horasEsperadasDia Horas esperadas según jornada
 * @param descansoMinimo Descanso mínimo configurado (formato "HH:mm")
 * @returns Eventos ajustados con salida corregida si es necesario
 */
export function ajustarSalidaPorJornada(
  eventosPromedio: PromedioEventos,
  fecha: Date,
  horasEsperadasDia: number,
  descansoMinimo?: string
): PromedioEventos {
  if (!eventosPromedio.entrada || !eventosPromedio.salida) {
    return eventosPromedio;
  }

  // Crear array de eventos simulados para calcular horas
  const eventosSimulados: Array<Pick<FichajeEvento, 'tipo' | 'hora'>> = [
    { tipo: 'entrada' as const, hora: eventosPromedio.entrada },
    ...(eventosPromedio.pausa_inicio
      ? [{ tipo: 'pausa_inicio' as const, hora: eventosPromedio.pausa_inicio }]
      : []),
    ...(eventosPromedio.pausa_fin
      ? [{ tipo: 'pausa_fin' as const, hora: eventosPromedio.pausa_fin }]
      : []),
    { tipo: 'salida' as const, hora: eventosPromedio.salida },
  ];

  // Calcular horas trabajadas con el promedio actual
  const horasTrabajadas =
    calcularHorasTrabajadas(eventosSimulados as FichajeEvento[]) ?? 0;

  // Si no supera las horas esperadas, retornar sin cambios
  if (horasTrabajadas <= horasEsperadasDia) {
    return eventosPromedio;
  }

  // Calcular duración de pausa en milisegundos
  let duracionPausaMs = 0;

  if (eventosPromedio.pausa_inicio && eventosPromedio.pausa_fin) {
    // Usar la pausa calculada del promedio
    duracionPausaMs =
      eventosPromedio.pausa_fin.getTime() - eventosPromedio.pausa_inicio.getTime();
  } else if (descansoMinimo) {
    // Usar descansoMinimo configurado
    const [h, m] = descansoMinimo.split(':').map(Number);
    duracionPausaMs = (h * 60 + m) * 60 * 1000;
  }

  // Recalcular salida: entrada + horas esperadas + pausa
  const nuevaSalida = new Date(
    eventosPromedio.entrada.getTime() +
      horasEsperadasDia * 60 * 60 * 1000 +
      duracionPausaMs
  );

  return {
    ...eventosPromedio,
    salida: nuevaSalida,
  };
}

