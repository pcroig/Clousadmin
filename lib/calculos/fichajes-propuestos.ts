// ========================================
// C\u00e1lculo de Eventos Propuestos para Cuadrar Fichajes
// ========================================
// Sistema unificado con priorizaci\u00f3n:
// 1. Eventos existentes (MAXIMA) → Mantener originales, calcular solo faltantes
// 2. Promedio hist\u00f3rico → \u00daltimos 5 fichajes finalizados
// 3. Defaults gen\u00e9ricos → 09:00, 18:00, 60%

import { prisma } from '@/lib/prisma';
import { obtenerPromedioEventosHistoricos } from './fichajes-historico';
import { crearFechaConHora } from '@/lib/utils/fechas';

import type { fichajes, fichaje_eventos, empleados, jornadas } from '@prisma/client';

/**
 * Evento propuesto con m\u00e9todo de c\u00e1lculo
 */
export interface EventoPropuesto {
  tipo: 'entrada' | 'pausa_inicio' | 'pausa_fin' | 'salida';
  hora: Date;
  metodo: 'historico' | 'default' | 'calculado_desde_evento_existente' | 'calculo_60pct';
}

/**
 * Configuraci\u00f3n de jornada
 */
interface JornadaConfig {
  tipo?: 'fija' | 'flexible';
  horasSemanales?: number;
  descansoMinimo?: string; // "HH:MM" - duración del descanso (ej: "01:00")
}

/**
 * Fichaje con datos necesarios para c\u00e1lculo
 */
type FichajeCompleto = fichajes & {
  eventos: fichaje_eventos[];
  empleado: empleados & {
    jornada: jornadas | null;
  };
};

/**
 * Calcula eventos propuestos para un fichaje pendiente
 *
 * PRIORIDADES:
 * 1. Eventos existentes (mantener originales, calcular solo faltantes)
 * 2. Promedio hist\u00f3rico (\u00faltimos 5 fichajes finalizados)
 * 3. Defaults gen\u00e9ricos (09:00, 18:00, 60%)
 */
export async function calcularEventosPropuestos(
  fichajeId: string
): Promise<EventoPropuesto[]> {
  // 1. Obtener fichaje con datos necesarios
  const fichaje = await prisma.fichajes.findUnique({
    where: { id: fichajeId },
    include: {
      eventos: { orderBy: { hora: 'asc' } },
      empleado: {
        include: {
          jornada: true,
        },
      },
    },
  });

  if (!fichaje) {
    throw new Error(`Fichaje ${fichajeId} no encontrado`);
  }

  if (!fichaje.empleado.jornada) {
    throw new Error(`Empleado ${fichaje.empleadoId} no tiene jornada asignada`);
  }

  return calcularEventosPropuestosInterno(fichaje as FichajeCompleto);
}

/**
 * Funci\u00f3n interna de c\u00e1lculo (permite testing sin DB)
 */
async function calcularEventosPropuestosInterno(
  fichaje: FichajeCompleto
): Promise<EventoPropuesto[]> {
  const config = fichaje.empleado.jornada?.config as JornadaConfig | null;
  if (!config) {
    throw new Error('Configuraci\u00f3n de jornada no encontrada');
  }

  const eventos = fichaje.eventos;
  const propuestos: EventoPropuesto[] = [];

  // 2. Obtener promedio hist\u00f3rico UNA SOLA VEZ
  const promedio = await obtenerPromedioEventosHistoricos(
    fichaje.empleadoId,
    fichaje.fecha,
    fichaje.jornadaId!,
    5 // \u00daltimos 5 fichajes finalizados (cualquier d\u00eda)
  );

  // ========== ENTRADA ==========
  if (!tieneEvento(eventos, 'entrada')) {
    const horaEntrada = promedio?.entrada          // 2. Hist\u00f3rico
      || crearHora(fichaje.fecha, 9, 0);          // 3. Default 09:00

    propuestos.push({
      tipo: 'entrada',
      hora: horaEntrada,
      metodo: promedio?.entrada ? 'historico' : 'default'
    });
  }
  // Si YA tiene entrada → NO proponer (mantener original)

  // ========== SALIDA ==========
  if (!tieneEvento(eventos, 'salida')) {
    let horaSalida: Date;
    let metodo: EventoPropuesto['metodo'];

    if (promedio?.salida) {
      // 2. Hist\u00f3rico
      horaSalida = promedio.salida;
      metodo = 'historico';
    } else {
      // 3. Default: calcular desde entrada
      const horaEntrada = obtenerHoraEntrada(eventos, propuestos);
      const horasPorDia = Number(config.horasSemanales || 40) / 5;
      const descansoMinutos = convertirDescansoAMinutos(config.descansoMinimo);
      const descansoMs = descansoMinutos * 60000;
      horaSalida = new Date(horaEntrada.getTime() + (horasPorDia * 3600000) + descansoMs);
      metodo = 'default';
    }

    propuestos.push({
      tipo: 'salida',
      hora: horaSalida,
      metodo
    });
  }

  // ========== PAUSAS ==========
  const descansoMinutos = convertirDescansoAMinutos(config.descansoMinimo);
  const requiereDescanso = descansoMinutos > 0;
  const tieneDescansoCompleto =
    tieneEvento(eventos, 'pausa_inicio') &&
    tieneEvento(eventos, 'pausa_fin');

  if (requiereDescanso && !tieneDescansoCompleto) {
    const tienePausaInicio = tieneEvento(eventos, 'pausa_inicio');
    const tienePausaFin = tieneEvento(eventos, 'pausa_fin');

    if (tienePausaInicio && !tienePausaFin) {
      // 1. PRIORIDAD M\u00c1XIMA: Tiene pausa_inicio → Calcular pausa_fin desde ese evento
      const ultimaPausaInicio = [...eventos]
        .filter(e => e.tipo === 'pausa_inicio')
        .sort((a, b) => b.hora.getTime() - a.hora.getTime())[0];

      const horaFin = new Date(
        ultimaPausaInicio.hora.getTime() + descansoMinutos * 60000
      );

      propuestos.push({
        tipo: 'pausa_fin',
        hora: horaFin,
        metodo: 'calculado_desde_evento_existente'
      });

    } else if (!tienePausaInicio && !tienePausaFin) {
      // No tiene ninguna pausa

      if (promedio && promedio.pausas && promedio.pausas.length > 0) {
        // 2. Hist\u00f3rico (1 o 2 pausas detectadas)
        for (const pausa of promedio.pausas) {
          propuestos.push(
            { tipo: 'pausa_inicio', hora: pausa.inicio, metodo: 'historico' },
            { tipo: 'pausa_fin', hora: pausa.fin, metodo: 'historico' }
          );
        }
      } else {
        // 3. Default: calcular 60%
        const horaEntrada = obtenerHoraEntrada(eventos, propuestos);
        const horaSalida = obtenerHoraSalida(eventos, propuestos);

        const pausa = calcularPosicionDescanso({
          horaEntrada,
          horaSalida,
          duracionMinutos: descansoMinutos,
          porcentaje: 0.6, // 60% del tiempo entre entrada y salida
        });

        propuestos.push(
          { tipo: 'pausa_inicio', hora: pausa.inicio, metodo: 'calculo_60pct' },
          { tipo: 'pausa_fin', hora: pausa.fin, metodo: 'calculo_60pct' }
        );
      }
    }
    // Si tiene pausa_fin pero no inicio → caso raro, no proponer nada
  }

  return propuestos;
}

// ========== HELPERS ==========

/**
 * Convierte string "HH:MM" a minutos
 */
function convertirDescansoAMinutos(descansoMinimo?: string): number {
  if (!descansoMinimo) return 0;
  const [horas, minutos] = descansoMinimo.split(':').map(Number);
  return (horas * 60) + (minutos || 0);
}

function tieneEvento(
  eventos: Array<{ tipo: string }>,
  tipo: string
): boolean {
  return eventos.some(e => e.tipo === tipo);
}

function crearHora(fecha: Date, horas: number, minutos: number): Date {
  return crearFechaConHora(fecha, horas, minutos);
}

function obtenerHoraEntrada(
  eventos: Array<{ tipo: string; hora: Date }>,
  propuestos: EventoPropuesto[]
): Date {
  // 1. Prioridad: evento real
  const eventoReal = eventos.find(e => e.tipo === 'entrada');
  if (eventoReal) return new Date(eventoReal.hora);

  // 2. Evento propuesto
  const propuesto = propuestos.find(e => e.tipo === 'entrada');
  if (propuesto) return propuesto.hora;

  throw new Error('No se pudo determinar hora de entrada');
}

function obtenerHoraSalida(
  eventos: Array<{ tipo: string; hora: Date }>,
  propuestos: EventoPropuesto[]
): Date {
  // 1. Prioridad: evento real
  const eventoReal = eventos.find(e => e.tipo === 'salida');
  if (eventoReal) return new Date(eventoReal.hora);

  // 2. Evento propuesto
  const propuesto = propuestos.find(e => e.tipo === 'salida');
  if (propuesto) return propuesto.hora;

  throw new Error('No se pudo determinar hora de salida');
}

function calcularPosicionDescanso(params: {
  horaEntrada: Date;
  horaSalida: Date;
  duracionMinutos: number;
  porcentaje: number; // 0.6 = 60%
}): { inicio: Date; fin: Date } {
  const tiempoTotal = params.horaSalida.getTime() - params.horaEntrada.getTime();
  const tiempoHastaPausa = tiempoTotal * params.porcentaje;

  const inicio = new Date(params.horaEntrada.getTime() + tiempoHastaPausa);
  const fin = new Date(inicio.getTime() + params.duracionMinutos * 60000);

  return { inicio, fin };
}
