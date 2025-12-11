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
  salida: Date | null;
  pausas?: Array<{ inicio: Date; fin: Date }>; // Soporte para múltiples pausas (opcional para compatibilidad)
  // DEPRECATED: Mantener para compatibilidad con código existente
  pausa_inicio: Date | null;
  pausa_fin: Date | null;
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
 * Crea una fecha con hora a partir de minutos desde medianoche
 */
function crearHoraDesdeMinutos(fecha: Date, minutos: number): Date {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return crearFechaConHora(fecha, horas, mins);
}

/**
 * Detecta pausas en fichajes históricos y determina si hay patrón de 1 o 2 pausas
 */
function detectarPausas(
  fichajes: Array<{ eventos: FichajeEvento[] }>,
  fechaBase: Date
): Array<{ inicio: Date; fin: Date }> {
  // Contar pausas por fichaje
  const pausasPorFichaje = fichajes.map(f => {
    const inicios = f.eventos.filter(e => e.tipo === 'pausa_inicio');
    return inicios.length;
  });

  if (pausasPorFichaje.length === 0) return [];

  const promedioPausas = pausasPorFichaje.reduce((a, b) => a + b, 0) / pausasPorFichaje.length;

  if (promedioPausas >= 1.5) {
    // Patrón de 2 pausas → Agrupar por horario
    return agruparPausasPorHorario(fichajes, fechaBase);
  } else if (promedioPausas >= 0.5) {
    // Patrón de 1 pausa → Calcular promedio
    const pausaUnica = calcularPromedioPausaUnica(fichajes, fechaBase);
    return pausaUnica ? [pausaUnica] : [];
  }

  return []; // Sin patrón claro
}

/**
 * Agrupa pausas por horario cuando hay patrón de 2 pausas
 */
function agruparPausasPorHorario(
  fichajes: Array<{ eventos: FichajeEvento[] }>,
  fechaBase: Date
): Array<{ inicio: Date; fin: Date }> {
  // Extraer todos los pares (pausa_inicio, pausa_fin)
  const pares: Array<{ inicio: number; fin: number }> = [];

  for (const f of fichajes) {
    const inicios = f.eventos.filter(e => e.tipo === 'pausa_inicio');
    const fines = f.eventos.filter(e => e.tipo === 'pausa_fin');

    for (let i = 0; i < Math.min(inicios.length, fines.length); i++) {
      const horaInicio = new Date(inicios[i].hora);
      const horaFin = new Date(fines[i].hora);
      pares.push({
        inicio: horaInicio.getHours() * 60 + horaInicio.getMinutes(),
        fin: horaFin.getHours() * 60 + horaFin.getMinutes(),
      });
    }
  }

  if (pares.length === 0) return [];

  // Ordenar por hora de inicio
  pares.sort((a, b) => a.inicio - b.inicio);

  // Clustering simple: dividir en 2 grupos
  const mitad = Math.floor(pares.length / 2);
  const grupo1 = pares.slice(0, mitad);      // Pausas tempranas (~11:00)
  const grupo2 = pares.slice(mitad);         // Pausas tardías (~14:00)

  const result: Array<{ inicio: Date; fin: Date }> = [];

  const pausa1 = calcularPromedioGrupo(grupo1, fechaBase);
  if (pausa1) result.push(pausa1);

  const pausa2 = calcularPromedioGrupo(grupo2, fechaBase);
  if (pausa2) result.push(pausa2);

  return result;
}

/**
 * Calcula el promedio de una única pausa
 */
function calcularPromedioPausaUnica(
  fichajes: Array<{ eventos: FichajeEvento[] }>,
  fechaBase: Date
): { inicio: Date; fin: Date } | null {
  const inicios: number[] = [];
  const fines: number[] = [];

  for (const f of fichajes) {
    const pausaInicio = f.eventos.find(e => e.tipo === 'pausa_inicio');
    const pausaFin = f.eventos.find(e => e.tipo === 'pausa_fin');

    if (pausaInicio && pausaFin) {
      const horaInicio = new Date(pausaInicio.hora);
      const horaFin = new Date(pausaFin.hora);
      inicios.push(horaInicio.getHours() * 60 + horaInicio.getMinutes());
      fines.push(horaFin.getHours() * 60 + horaFin.getMinutes());
    }
  }

  if (inicios.length === 0) return null;

  const promedioInicio = Math.round(
    inicios.reduce((a, b) => a + b, 0) / inicios.length
  );
  const promedioFin = Math.round(
    fines.reduce((a, b) => a + b, 0) / fines.length
  );

  return {
    inicio: crearHoraDesdeMinutos(fechaBase, promedioInicio),
    fin: crearHoraDesdeMinutos(fechaBase, promedioFin),
  };
}

/**
 * Calcula el promedio de un grupo de pausas
 */
function calcularPromedioGrupo(
  pares: Array<{ inicio: number; fin: number }>,
  fechaBase: Date
): { inicio: Date; fin: Date } | null {
  if (pares.length === 0) return null;

  const promedioInicio = Math.round(
    pares.reduce((sum, p) => sum + p.inicio, 0) / pares.length
  );
  const promedioFin = Math.round(
    pares.reduce((sum, p) => sum + p.fin, 0) / pares.length
  );

  return {
    inicio: crearHoraDesdeMinutos(fechaBase, promedioInicio),
    fin: crearHoraDesdeMinutos(fechaBase, promedioFin),
  };
}

/**
 * Valida que la secuencia de eventos sea coherente
 * @param eventos Eventos promedio a validar
 * @returns true si la secuencia es válida, false si hay conflictos
 */
export function validarSecuenciaEventos(eventos: PromedioEventos): boolean {
  const { entrada, salida, pausas } = eventos;

  // Si no hay entrada ni salida, no es válido
  if (!entrada || !salida) {
    return false;
  }

  // Entrada debe ser antes que salida
  if (entrada.getTime() >= salida.getTime()) {
    return false;
  }

  // Validar todas las pausas
  if (pausas && pausas.length > 0) {
    let tiempoAnterior = entrada.getTime();

    for (const pausa of pausas) {
      // Validar que cada pausa sea coherente
      if (pausa.inicio.getTime() <= tiempoAnterior) {
        return false; // La pausa debe empezar después del evento anterior
      }

      if (pausa.inicio.getTime() >= pausa.fin.getTime()) {
        return false; // La pausa debe terminar después de empezar
      }

      if (pausa.fin.getTime() >= salida.getTime()) {
        return false; // La pausa debe terminar antes de la salida
      }

      tiempoAnterior = pausa.fin.getTime();
    }
  }

  return true;
}

/**
 * Obtiene el promedio de eventos de los últimos N días fichados del empleado
 * Solo considera fichajes finalizados con eventos registrados
 *
 * FASE A.2: Últimos 5 fichajes finalizados de CUALQUIER día (sin filtro de día de semana ni jornada)
 *
 * @param empleadoId ID del empleado
 * @param fecha Fecha del fichaje a cuadrar
 * @param jornadaId ID de la jornada actual del empleado (NO USADO - mantener por compatibilidad)
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
  // IMPORTANTE: Solo usar fichajes ordinarios para promedios históricos
  // Los extraordinarios son excepcionales y no representan patrones habituales
  // FASE A.2: NO filtrar por jornadaId ni día de semana - últimos 5 de cualquier día
  const whereClause: Record<string, unknown> = {
    empleadoId,
    tipoFichaje: 'ordinario', // Solo ordinarios para promedios
    estado: 'finalizado',
    fecha: { lt: fechaBase },
  };

  // FASE A.2: ELIMINADO - No filtrar por jornadaId para obtener últimos 5 de cualquier día
  // if (jornadaId) {
  //   whereClause.jornadaId = jornadaId;
  // }

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

  // Extraer horas de entrada y salida
  const horasEntrada: Date[] = [];
  const horasSalida: Date[] = [];

  for (const fichaje of fichajesConEventos) {
    for (const evento of fichaje.eventos) {
      const hora = new Date(evento.hora);

      switch (evento.tipo) {
        case 'entrada':
          horasEntrada.push(hora);
          break;
        case 'salida':
          horasSalida.push(hora);
          break;
      }
    }
  }

  // Detectar pausas (1 o 2 pausas automáticamente)
  const pausasDetectadas = detectarPausas(fichajesConEventos, fechaBase);

  // Calcular promedios para entrada y salida
  const promedios: PromedioEventos = {
    entrada: calcularPromedioHora(horasEntrada, fechaBase),
    salida: calcularPromedioHora(horasSalida, fechaBase),
    pausas: pausasDetectadas,
    // DEPRECATED: Mantener para compatibilidad (solo primera pausa)
    pausa_inicio: pausasDetectadas.length > 0 ? pausasDetectadas[0].inicio : null,
    pausa_fin: pausasDetectadas.length > 0 ? pausasDetectadas[0].fin : null,
  };

  // Validar que la secuencia sea coherente
  if (!validarSecuenciaEventos(promedios)) {
    console.warn(
      `[Fichajes Histórico] Secuencia de eventos inválida para empleado ${empleadoId}:`,
      {
        entrada: promedios.entrada?.toISOString(),
        pausas: promedios.pausas?.map(p => `${p.inicio.toISOString()} - ${p.fin.toISOString()}`) || [],
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

