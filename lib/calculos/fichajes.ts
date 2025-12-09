// ========================================
// Cálculos y validaciones de Fichajes
// ========================================
// NUEVO MODELO: Fichaje = día completo, FichajeEvento = eventos individuales

import {
  ausencias as Ausencia,
  empleados as Empleado,
  fichajes as Fichaje,
  fichaje_eventos as FichajeEvento,
  EstadoFichaje as PrismaEstadoFichaje,
  Prisma,
  PrismaClient,
} from '@prisma/client';

import {
  crearSetFestivos,
  esDiaLaborableSync,
  getDiasLaborablesEmpresa,
  getFestivosActivosEnRango,
} from '@/lib/calculos/dias-laborables';
import { EstadoAusencia } from '@/lib/constants/enums';
import { crearNotificacionFichajeRequiereRevision } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { normalizarFechaSinHora, obtenerNombreDia } from '@/lib/utils/fechas';
import { redondearHoras } from '@/lib/utils/numeros';

import type { DiaConfig, JornadaConfig } from './fichajes-helpers';
import type { DiasLaborables, FestivosSet } from '@/lib/calculos/dias-laborables';

/**
 * Estados posibles del fichaje (del día completo)
 */
export type EstadoFichaje = 'sin_fichar' | 'trabajando' | 'en_pausa' | 'finalizado';

/**
 * Tipo de fichaje con sus eventos incluidos
 */
export type FichajeConEventos = Fichaje & {
  eventos: FichajeEvento[];
};

// FIX: Usar la función de utilidad consistente para normalizar fechas
function normalizarFecha(fecha: Date): Date {
  return normalizarFechaSinHora(fecha);
}

type EmpleadoConJornadaMinimal = Pick<Empleado, 'id' | 'empresaId'> & {
  jornada: {
    id: string;
    activa: boolean;
    config: unknown;
  } | null;
};

export interface EmpleadoDisponible
  extends EmpleadoConJornadaMinimal,
    Pick<Empleado, 'nombre' | 'apellidos' | 'fotoUrl'> {
}

const EMPLEADOS_DISPONIBLES_CACHE_TTL_MS = 60_000;

interface EmpleadosDisponiblesCacheEntry {
  value: EmpleadoDisponible[];
  expiresAt: number;
}

const empleadosDisponiblesCache = new Map<string, EmpleadosDisponiblesCacheEntry>();

function buildDisponiblesCacheKey(empresaId: string, fecha: Date): string {
  return `${empresaId}:${fecha.toISOString().split('T')[0]}`;
}

function getCachedEmpleadosDisponibles(key: string): EmpleadoDisponible[] | null {
  const entry = empleadosDisponiblesCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    empleadosDisponiblesCache.delete(key);
    return null;
  }

  return entry.value;
}

function setCachedEmpleadosDisponibles(key: string, value: EmpleadoDisponible[]): void {
  empleadosDisponiblesCache.set(key, {
    value,
    expiresAt: Date.now() + EMPLEADOS_DISPONIBLES_CACHE_TTL_MS,
  });
}

export function limpiarCacheEmpleadosDisponibles(empresaId?: string): void {
  if (!empresaId) {
    empleadosDisponiblesCache.clear();
    return;
  }

  for (const key of empleadosDisponiblesCache.keys()) {
    if (key.startsWith(`${empresaId}:`)) {
      empleadosDisponiblesCache.delete(key);
    }
  }
}

function esDiaActivoSegunJornada(configValue: unknown, nombreDia: string): boolean {
  if (!configValue || typeof configValue !== 'object') {
    return true;
  }

  const config = configValue as JornadaConfig;
  const diaConfig = config[nombreDia] as DiaConfig | undefined;

  if (!diaConfig) {
    return true;
  }

  if ('activo' in diaConfig && diaConfig.activo === false) {
    return false;
  }

  return true;
}

type EvaluacionDisponibilidad =
  | { disponible: true }
  | {
      disponible: false;
      motivo: 'sin_jornada' | 'jornada_inactiva' | 'ausencia_dia_completo' | 'dia_no_laborable_empresa' | 'dia_inactivo_jornada';
    };

function evaluarDisponibilidadEmpleado(
  empleado: EmpleadoConJornadaMinimal,
  fecha: Date,
  diasLaborables: DiasLaborables,
  festivosSet: FestivosSet,
  ausenciasSet?: Set<string>
): EvaluacionDisponibilidad {
  if (!empleado.jornada) {
    return { disponible: false, motivo: 'sin_jornada' };
  }

  if (!empleado.jornada.activa) {
    return { disponible: false, motivo: 'jornada_inactiva' };
  }

  if (ausenciasSet?.has(empleado.id)) {
    return { disponible: false, motivo: 'ausencia_dia_completo' };
  }

  if (!esDiaLaborableSync(fecha, diasLaborables, festivosSet)) {
    return { disponible: false, motivo: 'dia_no_laborable_empresa' };
  }

  const nombreDia = obtenerNombreDia(fecha);
  if (!esDiaActivoSegunJornada(empleado.jornada.config, nombreDia)) {
    return { disponible: false, motivo: 'dia_inactivo_jornada' };
  }

  return { disponible: true };
}

/**
 * Obtiene el estado actual de fichaje de un empleado
 * Estado derivado de los eventos del fichaje del día
 */
export async function obtenerEstadoFichaje(empleadoId: string): Promise<EstadoFichaje> {
  // FIX CRÍTICO: Usar normalizarFechaSinHora en lugar de constructor directo
  const fechaHoy = normalizarFechaSinHora(new Date());

  // Buscar el fichaje del día (único por empleado + fecha)
  const fichajeHoy = await prisma.fichajes.findUnique({
    where: {
      empleadoId_fecha: {
        empleadoId,
        fecha: fechaHoy,
      },
    },
    include: {
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
  });

  if (!fichajeHoy || fichajeHoy.eventos.length === 0) {
    return 'sin_fichar';
  }

  // Estado del fichaje completo
  if (fichajeHoy.estado === PrismaEstadoFichaje.finalizado) {
    return 'finalizado';
  }

  // Si está en curso, determinar estado actual según último evento
  const ultimoEvento = fichajeHoy.eventos[fichajeHoy.eventos.length - 1];

  switch (ultimoEvento.tipo) {
    case 'entrada':
      return 'trabajando';
    case 'pausa_inicio':
      return 'en_pausa';
    case 'pausa_fin':
      return 'trabajando';
    case 'salida':
      return 'finalizado';
    default:
      return 'sin_fichar';
  }
}

/**
 * Calcula las horas trabajadas a partir de los eventos de un fichaje
 */
export function calcularHorasTrabajadas(eventos: FichajeEvento[]): number | null {
  if (eventos.length === 0) return null;

  const ordenados = [...eventos].sort(
    (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime()
  );

  let horasTotales = 0;
  let inicioTrabajo: Date | null = null;
  let estado: 'sin_fichar' | 'trabajando' | 'en_pausa' | 'finalizado' = 'sin_fichar';

  for (const evento of ordenados) {
    const hora = new Date(evento.hora);

    switch (evento.tipo) {
      case 'entrada': {
        if (estado === 'trabajando' || estado === 'en_pausa') {
          return null;
        }
        estado = 'trabajando';
        inicioTrabajo = hora;
        break;
      }
      case 'pausa_inicio': {
        if (estado !== 'trabajando' || !inicioTrabajo) {
          return null;
        }
          const tiempoTrabajado = (hora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
          horasTotales += tiempoTrabajado;
          inicioTrabajo = null;
        estado = 'en_pausa';
        break;
      }
      case 'pausa_fin': {
        if (estado !== 'en_pausa') {
          return null;
        }
        estado = 'trabajando';
        inicioTrabajo = hora;
        break;
      }
      case 'salida': {
        if (estado !== 'trabajando' || !inicioTrabajo) {
          return null;
        }
          const tiempoTrabajado = (hora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
          horasTotales += tiempoTrabajado;
          inicioTrabajo = null;
        estado = 'finalizado';
        break;
        }
      default:
        break;
    }
  }

  if (estado === 'trabajando' || estado === 'en_pausa') {
    return null;
  }

  return Math.round(horasTotales * 100) / 100;
}

/**
 * Calcula el tiempo en pausa de un array de eventos
 */
export function calcularTiempoEnPausa(eventos: FichajeEvento[]): number {
  if (eventos.length === 0) return 0;

  const ordenados = [...eventos].sort(
    (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime()
  );

  let tiempoPausaTotal = 0;
  let inicioPausa: Date | null = null;

  for (const evento of ordenados) {
    const hora = new Date(evento.hora);

    if (evento.tipo === 'pausa_inicio') {
      if (inicioPausa) {
        // Ya hay una pausa abierta sin cerrar: ignorar el nuevo inicio para evitar inconsistencias
        continue;
      }
      inicioPausa = hora;
    } else if (evento.tipo === 'pausa_fin' && inicioPausa) {
      const tiempoPausa = (hora.getTime() - inicioPausa.getTime()) / (1000 * 60 * 60);
      tiempoPausaTotal += tiempoPausa;
      inicioPausa = null;
    }
  }

  // Pausas sin cerrar NO se cuentan (fail-open)
  return Math.round(tiempoPausaTotal * 100) / 100;
}

/**
 * Valida si un empleado puede agregar un evento al fichaje según su estado actual
 */
type ValidacionEvento = { valido: boolean; error?: string };

function obtenerEstadoDesdeEventos(
  eventos: Pick<FichajeEvento, 'tipo' | 'hora'>[]
): EstadoFichaje | 'invalido' {
  if (eventos.length === 0) {
    return 'sin_fichar';
  }

  let estado: EstadoFichaje = 'sin_fichar';
  const ordenados = [...eventos].sort(
    (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime()
  );
  let ultimoTimestamp: Date | null = null;

  for (const evento of ordenados) {
    const hora = new Date(evento.hora);
    if (ultimoTimestamp && hora.getTime() < ultimoTimestamp.getTime()) {
      return 'invalido';
    }
    ultimoTimestamp = hora;

    switch (evento.tipo) {
      case 'entrada':
        if (estado === 'trabajando' || estado === 'en_pausa') {
          return 'invalido';
        }
        estado = 'trabajando';
        break;
      case 'pausa_inicio':
        if (estado !== 'trabajando') return 'invalido';
        estado = 'en_pausa';
        break;
      case 'pausa_fin':
        if (estado !== 'en_pausa') return 'invalido';
        estado = 'trabajando';
        break;
      case 'salida':
        if (estado !== 'trabajando') return 'invalido';
        estado = 'finalizado';
        break;
      default:
        return 'invalido';
    }
  }

  return estado;
}

function validarEventoEnMemoria(
  eventos: Pick<FichajeEvento, 'tipo' | 'hora'>[],
  nuevoEvento: Pick<FichajeEvento, 'tipo' | 'hora'>
): ValidacionEvento {
  const estadoActual = obtenerEstadoDesdeEventos(eventos);

  if (estadoActual === 'invalido') {
    return { valido: false, error: 'Secuencia de eventos inválida' };
  }

  const ultimoEvento = [...eventos].sort(
    (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime()
  ).pop();

  if (ultimoEvento) {
    const ultimo = new Date(ultimoEvento.hora).getTime();
    const nuevo = new Date(nuevoEvento.hora).getTime();
    if (nuevo < ultimo) {
      return { valido: false, error: 'El evento debe ser posterior al último registro' };
    }
  }

  switch (nuevoEvento.tipo) {
    case 'entrada':
      if (estadoActual === 'trabajando' || estadoActual === 'en_pausa') {
        return { valido: false, error: 'Ya existe una entrada activa' };
      }
      if (estadoActual === 'finalizado') {
        return {
          valido: false,
          error: 'Ya has finalizado la jornada de hoy. Podrás iniciar una nueva jornada mañana.',
        };
      }
      return { valido: true };
    case 'pausa_inicio':
      return estadoActual === 'trabajando'
        ? { valido: true }
        : { valido: false, error: 'Debes estar trabajando para pausar' };
    case 'pausa_fin':
      return estadoActual === 'en_pausa'
        ? { valido: true }
        : { valido: false, error: 'No estás en pausa' };
    case 'salida':
      return estadoActual === 'trabajando'
        ? { valido: true }
        : { valido: false, error: 'No tienes una jornada iniciada' };
    default:
      return { valido: false, error: 'Tipo de evento inválido' };
  }
}

async function validarEventoRemoto(
  tipoEvento: string,
  empleadoId: string
): Promise<ValidacionEvento> {
  const estadoActual = await obtenerEstadoFichaje(empleadoId);

  switch (tipoEvento) {
    case 'entrada':
      if (estadoActual !== 'sin_fichar' && estadoActual !== 'finalizado') {
        return { valido: false, error: 'Ya tienes una jornada iniciada' };
      }
      
      // Si ya finalizó la jornada hoy, no puede iniciar otra hasta mañana
      if (estadoActual === 'finalizado') {
        return { 
          valido: false, 
          error: 'Ya has finalizado la jornada de hoy. Podrás iniciar una nueva jornada mañana.' 
        };
      }
      break;

    case 'pausa_inicio':
      if (estadoActual !== 'trabajando') {
        return { valido: false, error: 'Debes estar trabajando para pausar' };
      }
      break;

    case 'pausa_fin':
      if (estadoActual !== 'en_pausa') {
        return { valido: false, error: 'No estás en pausa' };
      }
      break;

    case 'salida':
      if (estadoActual === 'sin_fichar' || estadoActual === 'finalizado') {
        return { valido: false, error: 'No tienes una jornada iniciada' };
      }
      // Permitir finalizar desde pausa - el cálculo de horas no sumará el tiempo en pausa
      break;

    default:
      return { valido: false, error: 'Tipo de evento inválido' };
  }

  return { valido: true };
}

export function validarEvento(
  eventos: Pick<FichajeEvento, 'tipo' | 'hora'>[],
  nuevoEvento: Pick<FichajeEvento, 'tipo' | 'hora'>
): ValidacionEvento;
export function validarEvento(tipoEvento: string, empleadoId: string): Promise<ValidacionEvento>;
export function validarEvento(
  arg1: Pick<FichajeEvento, 'tipo' | 'hora'>[] | string,
  arg2: Pick<FichajeEvento, 'tipo' | 'hora'> | string
): ValidacionEvento | Promise<ValidacionEvento> {
  if (Array.isArray(arg1)) {
    return validarEventoEnMemoria(
      arg1,
      arg2 as Pick<FichajeEvento, 'tipo' | 'hora'>
    );
  }

  return validarEventoRemoto(arg1, arg2 as string);
}

/**
 * Valida evento extraordinario (solo entrada/salida)
 * @param tipoEvento - Tipo de evento a validar
 * @param empleadoId - ID del empleado
 * @returns Resultado de validación
 */
export async function validarEventoExtraordinario(
  tipoEvento: 'entrada' | 'salida',
  empleadoId: string
): Promise<{ valido: boolean; error?: string }> {
  const fechaHoy = normalizarFechaSinHora(new Date());

  const fichajeHoy = await prisma.fichajes.findUnique({
    where: {
      empleadoId_fecha: { empleadoId, fecha: fechaHoy },
    },
    include: {
      eventos: { orderBy: { hora: 'asc' } }
    },
  });

  // Sin fichaje: solo puede iniciar con entrada
  if (!fichajeHoy) {
    return tipoEvento === 'entrada'
      ? { valido: true }
      : { valido: false, error: 'Debes fichar entrada primero' };
  }

  // Con fichaje: validar secuencia entrada → salida
  const ultimoEvento = fichajeHoy.eventos[fichajeHoy.eventos.length - 1];

  if (tipoEvento === 'entrada') {
    if (ultimoEvento?.tipo === 'entrada') {
      return { valido: false, error: 'Ya has fichado entrada' };
    }
    if (fichajeHoy.estado === 'finalizado') {
      return { valido: false, error: 'Ya has finalizado la jornada de hoy' };
    }
    return { valido: true };
  }

  if (tipoEvento === 'salida') {
    if (!ultimoEvento || ultimoEvento.tipo !== 'entrada') {
      return { valido: false, error: 'Debes fichar entrada primero' };
    }
    return { valido: true };
  }

  return { valido: false, error: 'Tipo de evento no permitido' };
}

/**
 * Valida si el evento está dentro de los límites de la jornada
 */
export async function validarLimitesJornada(
  empleadoId: string,
  hora: Date
): Promise<{ valido: boolean; error?: string }> {
  const empleado = await prisma.empleados.findUnique({
    where: { id: empleadoId },
    include: {
      jornada: true,
    },
  });

  if (!empleado || !empleado.jornada) {
    return { valido: true }; // Si no tiene jornada, no validar límites
  }

  const config = empleado.jornada.config as JornadaConfig;
  const limiteInferior = typeof config.limiteInferior === 'string' ? config.limiteInferior : undefined;
  const limiteSuperior = typeof config.limiteSuperior === 'string' ? config.limiteSuperior : undefined;

  if (limiteInferior || limiteSuperior) {
    const horaFichaje = `${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`;

    if (limiteInferior && horaFichaje < limiteInferior) {
      return {
        valido: false,
        error: `No puedes fichar antes de ${limiteInferior}`,
      };
    }

    if (limiteSuperior && horaFichaje > limiteSuperior) {
      return {
        valido: false,
        error: `No puedes fichar después de ${limiteSuperior}`,
      };
    }
  }

  return { valido: true };
}

/**
 * Obtiene el fichaje de un empleado en una fecha específica
 */
export async function obtenerFichaje(
  empleadoId: string,
  fecha: Date
): Promise<FichajeConEventos | null> {
  // FIX: Usar normalizarFechaSinHora para consistencia
  const fechaSinHora = normalizarFechaSinHora(fecha);
  
  return prisma.fichajes.findUnique({
    where: {
      empleadoId_fecha: {
        empleadoId,
        fecha: fechaSinHora,
      },
    },
    include: {
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
  });
}

/**
 * Obtiene los fichajes de un empleado en un rango de fechas
 */
export async function obtenerFichajes(
  empleadoId: string,
  fechaInicio: Date,
  fechaFin: Date
): Promise<FichajeConEventos[]> {
  return prisma.fichajes.findMany({
    where: {
      empleadoId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
    include: {
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
    orderBy: [
      { fecha: 'desc' },
    ],
  });
}

/**
 * Agrupa fichajes por día (ya no es necesario, pero mantenemos por compatibilidad)
 */
export function agruparFichajesPorDia(
  fichajes: FichajeConEventos[]
): Record<string, FichajeConEventos> {
  return fichajes.reduce((acc, fichaje) => {
    const fechaKey = fichaje.fecha.toISOString().split('T')[0];
    acc[fechaKey] = fichaje;
    return acc;
  }, {} as Record<string, FichajeConEventos>);
}

/**
 * Calcula las horas esperadas de un empleado para una fecha
 */
function parseHorasValor(valor: number | string | null | undefined): number {
  if (valor === null || valor === undefined) {
    return 0;
  }

  if (typeof valor === 'number') {
    return valor;
  }

  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calcularHorasEsperadasDesdeConfig(
  config: JornadaConfig,
  fecha: Date,
  horasSemanales?: number | string | null
): number {
  // FIX CRÍTICO: Usar normalizarFechaSinHora en lugar de constructor directo
  const fechaBase = normalizarFechaSinHora(fecha);
  const nombreDia = obtenerNombreDia(fechaBase);
  const diaConfig = config[nombreDia] as DiaConfig | undefined;

  const tipoJornada = config.tipo ?? (diaConfig?.entrada && diaConfig?.salida ? 'fija' : 'flexible');

  // Jornadas fijas o días con horarios definidos
  if (tipoJornada === 'fija' || (diaConfig?.entrada && diaConfig?.salida)) {
    if (!diaConfig || diaConfig.activo === false || !diaConfig.entrada || !diaConfig.salida) {
      return 0;
    }

    const [horaE, minE] = diaConfig.entrada.split(':').map(Number);
    const [horaS, minS] = diaConfig.salida.split(':').map(Number);

    const minutosEntrada = (horaE ?? 0) * 60 + (minE ?? 0);
    const minutosSalida = (horaS ?? 0) * 60 + (minS ?? 0);

    let minutosTrabajo = minutosSalida - minutosEntrada;

    if (diaConfig.pausa_inicio && diaConfig.pausa_fin) {
      const [horaPI, minPI] = diaConfig.pausa_inicio.split(':').map(Number);
      const [horaPF, minPF] = diaConfig.pausa_fin.split(':').map(Number);
      const minutosPausaInicio = (horaPI ?? 0) * 60 + (minPI ?? 0);
      const minutosPausaFin = (horaPF ?? 0) * 60 + (minPF ?? 0);
      minutosTrabajo -= minutosPausaFin - minutosPausaInicio;
    }

    minutosTrabajo = Math.max(minutosTrabajo, 0);
    return redondearHoras(minutosTrabajo / 60);
  }

  // Jornadas flexibles
  if (tipoJornada === 'flexible') {
    if (!diaConfig || diaConfig.activo === false) {
      return 0;
    }

    const horasSemanalesNum = parseHorasValor(horasSemanales);
    if (horasSemanalesNum <= 0) {
      return 0;
    }

    const diasActivos = Object.entries(config).reduce((count, [clave, valor]) => {
      if (['tipo', 'descansoMinimo', 'limiteInferior', 'limiteSuperior'].includes(clave)) {
        return count;
      }

      if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
        const dia = valor as DiaConfig;
        if (dia.activo) {
          return count + 1;
        }
      }

      return count;
    }, 0);

    const divisor = diasActivos > 0 ? diasActivos : 5;
    return redondearHoras(horasSemanalesNum / divisor);
  }

  return 0;
}

export async function obtenerHorasEsperadas(
  empleadoId: string,
  fecha: Date
): Promise<number> {
  const empleado = await prisma.empleados.findUnique({
    where: { id: empleadoId },
    include: {
      jornada: true,
    },
  });

  if (!empleado || !empleado.jornada) {
    return 0; // Si no tiene jornada, 0 horas esperadas
  }

  const jornada = empleado.jornada;
  const config = jornada.config as JornadaConfig;

  return calcularHorasEsperadasDesdeConfig(config, fecha, Number(jornada.horasSemanales ?? 0));
}

export async function obtenerHorasEsperadasBatch(
  entradas: Array<{ empleadoId: string; fecha: Date }>
): Promise<Record<string, number>> {
  if (entradas.length === 0) {
    return {};
  }

  const uniqueEmpleadoIds = Array.from(new Set(entradas.map((entrada) => entrada.empleadoId)));

  const empleados =
    (await prisma.empleados.findMany({
    where: {
      id: {
        in: uniqueEmpleadoIds,
      },
    },
    include: {
      jornada: true,
    },
    })) ?? [];

  const empleadoMap = new Map(empleados.map((empleado) => [empleado.id, empleado]));
  const resultado: Record<string, number> = {};

  for (const entrada of entradas) {
    // FIX CRÍTICO: Usar normalizarFechaSinHora en lugar de constructor directo
    const fechaBase = normalizarFechaSinHora(entrada.fecha);
    const key = `${entrada.empleadoId}_${fechaBase.toISOString().split('T')[0]}`;

    if (resultado[key] !== undefined) {
      continue;
    }

    const empleado = empleadoMap.get(entrada.empleadoId);

    const horasEsperadas =
      empleado && empleado.jornada
        ? calcularHorasEsperadasDesdeConfig(
            empleado.jornada.config as JornadaConfig,
            fechaBase,
            Number(empleado.jornada.horasSemanales)
          )
        : 0;

    resultado[key] = horasEsperadas;
  }

  return resultado;
}

/**
 * Actualiza los cálculos agregados del fichaje (horas trabajadas y en pausa)
 * Se llama después de crear/editar un evento
 */
export async function actualizarCalculosFichaje(
  fichajeId: string,
  prismaClient?: PrismaClient | Prisma.TransactionClient
): Promise<void> {
  const client = prismaClient ?? prisma;

  const fichaje = await client.fichajes.findUnique({
    where: { id: fichajeId },
    include: {
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
  });

  if (!fichaje) {
    throw new Error(`Fichaje ${fichajeId} no encontrado`);
  }

  const horasTrabajadas = calcularHorasTrabajadas(fichaje.eventos) ?? 0;
  const horasEnPausa = calcularTiempoEnPausa(fichaje.eventos);

  await client.fichajes.update({
    where: { id: fichaje.id },
    data: {
      horasTrabajadas,
      horasEnPausa,
    },
  });
}

/**
 * Verifica si una fecha es día laboral para un empleado
 * Considera:
 * - Calendario laboral de la empresa (diasLaborables config)
 * - Festivos activos de la empresa
 * - Jornada del empleado (días activos)
 * - Ausencias de día completo del empleado
 */
export async function esDiaLaboral(empleadoId: string, fecha: Date): Promise<boolean> {
  const fechaSinHora = normalizarFecha(fecha);

  const empleado = await prisma.empleados.findUnique({
    where: { id: empleadoId },
    select: {
      id: true,
      empresaId: true,
      jornada: {
        select: {
          id: true,
          activa: true,
          config: true,
        },
      },
    },
  });

  if (!empleado || !empleado.jornada || !empleado.jornada.activa) {
    return false;
  }

  const [diasLaborables, festivos, ausencia] = await Promise.all([
    getDiasLaborablesEmpresa(empleado.empresaId),
    getFestivosActivosEnRango(empleado.empresaId, fechaSinHora, fechaSinHora),
    prisma.ausencias.findFirst({
      where: {
        empleadoId,
        medioDia: false,
        estado: {
          in: [EstadoAusencia.confirmada, EstadoAusencia.completada],
        },
        fechaInicio: {
          lte: fechaSinHora,
        },
        fechaFin: {
          gte: fechaSinHora,
        },
      },
    }),
  ]);

  const festivosSet = crearSetFestivos(festivos);
  const ausenciasSet = ausencia ? new Set<string>([empleado.id]) : undefined;
  const evaluacion = evaluarDisponibilidadEmpleado(
    empleado,
    fechaSinHora,
    diasLaborables,
    festivosSet,
    ausenciasSet
  );

  return evaluacion.disponible;
}

/**
 * Obtiene los empleados que deberían tener fichaje en una fecha
 * (empleados activos sin ausencia que tienen día laboral)
 */
export async function obtenerEmpleadosDisponibles(
  empresaId: string,
  fecha: Date
): Promise<EmpleadoDisponible[]> {
  const fechaSinHora = normalizarFecha(fecha);
  const cacheKey = buildDisponiblesCacheKey(empresaId, fechaSinHora);
  const cached = getCachedEmpleadosDisponibles(cacheKey);

  if (cached) {
    return cached;
  }

  const empleadosDisponibles = await calcularEmpleadosDisponibles(empresaId, fechaSinHora);
  setCachedEmpleadosDisponibles(cacheKey, empleadosDisponibles);

  return empleadosDisponibles;
}

async function calcularEmpleadosDisponibles(
  empresaId: string,
  fecha: Date
): Promise<EmpleadoDisponible[]> {
  const [empleados, diasLaborables, festivos, ausenciasDiaCompleto] = await Promise.all([
    prisma.empleados.findMany({
      where: {
        empresaId,
        activo: true,
        // FIX: Solo empleados que ya estaban dados de alta en la fecha objetivo
        fechaAlta: {
          lte: fecha,
        },
      },
      select: {
        id: true,
        empresaId: true,
        nombre: true,
        apellidos: true,
        fotoUrl: true,
        jornada: {
          select: {
            id: true,
            activa: true,
            config: true,
          },
        },
      },
    }),
    getDiasLaborablesEmpresa(empresaId),
    getFestivosActivosEnRango(empresaId, fecha, fecha),
    prisma.ausencias.findMany({
      where: {
        empresaId,
        medioDia: false,
        estado: {
          in: [EstadoAusencia.confirmada, EstadoAusencia.completada],
        },
        fechaInicio: {
          lte: fecha,
        },
        fechaFin: {
          gte: fecha,
        },
      },
      select: {
        empleadoId: true,
      },
    }),
  ]);

  const festivosSet = crearSetFestivos(festivos);
  if (!esDiaLaborableSync(fecha, diasLaborables, festivosSet)) {
    return [];
  }

  const ausenciasSet = new Set(ausenciasDiaCompleto.map((ausencia) => ausencia.empleadoId));
  const stats = {
    sinJornada: 0,
    jornadaInactiva: 0,
    ausenciaDiaCompleto: 0,
    diaNoLaborableEmpresa: 0,
    diaInactivoJornada: 0,
  };

  const filtrados = empleados.filter((empleado) => {
    const evaluacion = evaluarDisponibilidadEmpleado(
      empleado,
      fecha,
      diasLaborables,
      festivosSet,
      ausenciasSet
    );

    if (!evaluacion.disponible) {
      switch (evaluacion.motivo) {
        case 'sin_jornada':
          stats.sinJornada++;
          break;
        case 'jornada_inactiva':
          stats.jornadaInactiva++;
          break;
        case 'ausencia_dia_completo':
          stats.ausenciaDiaCompleto++;
          break;
        case 'dia_no_laborable_empresa':
          stats.diaNoLaborableEmpresa++;
          break;
        case 'dia_inactivo_jornada':
          stats.diaInactivoJornada++;
          break;
        default:
          break;
      }
      return false;
    }

    return true;
  });

  if (filtrados.length === 0 && empleados.length > 0) {
    console.warn(
      `[obtenerEmpleadosDisponibles] 0 empleados disponibles tras filtrar. Empresa=${empresaId}, Fecha=${fecha.toISOString()}`,
      stats
    );
  }

  return filtrados;
}

/**
 * Crea fichajes automáticos para empleados disponibles que no tienen fichaje
 * Se ejecuta al inicio de cada día o cuando se consultan fichajes
 */
export async function crearFichajesAutomaticos(
  empresaId: string,
  fecha: Date
): Promise<{ creados: number; errores: string[] }> {
  // FIX CRÍTICO: Usar normalizarFechaSinHora en lugar de constructor directo
  const fechaSinHora = normalizarFechaSinHora(fecha);
  const errores: string[] = [];
  let creados = 0;

  // Obtener empleados disponibles
  const empleadosDisponibles = await obtenerEmpleadosDisponibles(empresaId, fechaSinHora);

  // Para cada empleado, verificar si ya tiene fichaje
  for (const empleado of empleadosDisponibles) {
    try {
      const fichajeExistente = await prisma.fichajes.findUnique({
        where: {
          empleadoId_fecha: {
            empleadoId: empleado.id,
            fecha: fechaSinHora,
          },
        },
      });

      if (!fichajeExistente) {
        // Crear fichaje vacío en estado "en_curso"
        await prisma.fichajes.create({
          data: {
            empresaId,
            empleadoId: empleado.id,
            jornadaId: empleado.jornada?.id ?? null,
            fecha: fechaSinHora,
            estado: PrismaEstadoFichaje.en_curso,
          },
        });

        creados++;
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      errores.push(`${empleado.nombre} ${empleado.apellidos}: ${mensaje}`);
      console.error('[crearFichajesAutomaticos] Error creando fichaje:', {
        empleadoId: empleado.id,
        nombre: `${empleado.nombre} ${empleado.apellidos}`,
        error,
      });
    }
  }

  return { creados, errores };
}

export interface ProcesarFichajesDiaOptions {
  /**
   * Cuando es false, no se envían notificaciones a HR (útil para fallback manual)
   */
  notificar?: boolean;
}

export interface ProcesarFichajesDiaResult {
  empleadosDisponibles: number;
  fichajesCreados: number;
  fichajesPendientes: number;
  fichajesFinalizados: number;
  errores: string[];
}

/**
 * Procesa los fichajes de un día concreto replicando la lógica del CRON nocturno.
 * - Crea fichajes pendientes para empleados que debían trabajar y no ficharon
 * - Re-clasifica fichajes en curso como finalizados o pendientes según su jornada
 */
export async function procesarFichajesDia(
  empresaId: string,
  fecha: Date,
  options: ProcesarFichajesDiaOptions = {}
): Promise<ProcesarFichajesDiaResult> {
  const fechaSinHora = normalizarFecha(fecha);
  const notificar = options.notificar !== false;

  const empleadosDisponibles = await obtenerEmpleadosDisponibles(empresaId, fechaSinHora);
  const resultado: ProcesarFichajesDiaResult = {
    empleadosDisponibles: empleadosDisponibles.length,
    fichajesCreados: 0,
    fichajesPendientes: 0,
    fichajesFinalizados: 0,
    errores: [],
  };

  for (const empleado of empleadosDisponibles) {
    try {
      let fichaje = await prisma.fichajes.findUnique({
        where: {
          empleadoId_fecha: {
            empleadoId: empleado.id,
            fecha: fechaSinHora,
          },
        },
        include: {
          eventos: true,
        },
      });

      if (!fichaje) {
        fichaje = await prisma.fichajes.create({
          data: {
            empresaId,
            empleadoId: empleado.id,
            jornadaId: empleado.jornada?.id ?? null,
            fecha: fechaSinHora,
            estado: PrismaEstadoFichaje.pendiente,
          },
          include: {
            eventos: true,
          },
        });

        resultado.fichajesCreados++;
        resultado.fichajesPendientes++;

        if (notificar) {
          await crearNotificacionFichajeRequiereRevision(prisma, {
            fichajeId: fichaje.id,
            empresaId,
            empleadoId: empleado.id,
            empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
            fecha: fechaSinHora,
            razon: 'No se registraron fichajes en el día',
          });
        }

        continue;
      }

      if (fichaje.estado === PrismaEstadoFichaje.en_curso) {
        const validacion = await validarFichajeCompleto(fichaje.id);
        await actualizarCalculosFichaje(fichaje.id);

        if (validacion.completo) {
          await prisma.fichajes.update({
            where: { id: fichaje.id },
            data: {
              estado: PrismaEstadoFichaje.finalizado,
            },
          });
          resultado.fichajesFinalizados++;
        } else {
          await prisma.fichajes.update({
            where: { id: fichaje.id },
            data: {
              estado: PrismaEstadoFichaje.pendiente,
            },
          });
          resultado.fichajesPendientes++;

          if (notificar) {
            await crearNotificacionFichajeRequiereRevision(prisma, {
              fichajeId: fichaje.id,
              empresaId,
              empleadoId: empleado.id,
              empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
              fecha: fechaSinHora,
              razon: validacion.razon ?? 'Faltan eventos por registrar',
            });
          }
        }
      }
    } catch (error) {
      const mensaje = `Error procesando empleado ${empleado.nombre} ${empleado.apellidos}: ${
        error instanceof Error ? error.message : 'Error desconocido'
      }`;
      resultado.errores.push(mensaje);
      console.error('[procesarFichajesDia]', mensaje, error);
    }
  }

  return resultado;
}

/**
 * Información sobre ausencia de medio día
 */
export interface AusenciaMedioDia {
  tieneAusencia: boolean;
  medioDia: 'manana' | 'tarde' | null;
  ausencia: Ausencia | null;
}

/**
 * Obtiene información sobre ausencia de medio día para un empleado en una fecha
 */
export async function obtenerAusenciaMedioDia(
  empleadoId: string,
  fecha: Date
): Promise<AusenciaMedioDia> {
  // FIX: Usar normalizarFechaSinHora para consistencia
  const fechaSinHora = normalizarFechaSinHora(fecha);
  
  const ausencia = await prisma.ausencias.findFirst({
    where: {
      empleadoId,
      medioDia: true,
      estado: {
        in: [EstadoAusencia.confirmada, EstadoAusencia.completada],
      },
      fechaInicio: {
        lte: fechaSinHora,
      },
      fechaFin: {
        gte: fechaSinHora,
      },
    },
  });

  if (!ausencia) {
    return {
      tieneAusencia: false,
      medioDia: null,
      ausencia: null,
    };
  }

  return {
    tieneAusencia: true,
    medioDia: ausencia.periodo || 'manana', // Usar campo periodo o 'manana' por defecto para ausencias antiguas
    ausencia,
  };
}

/**
 * Resultado de validación de fichaje completo
 */
export interface ValidacionFichajeCompleto {
  completo: boolean;
  eventosRequeridos: string[];
  eventosFaltantes: string[];
  razon?: string;
}

/**
 * Valida si un fichaje está completo según la jornada del empleado
 * Tiene en cuenta:
 * - Jornada fija: entrada + salida + pausa (si configurada)
 * - Jornada flexible: entrada + salida + pausa (si descansoMinimo > 0)
 * - Ausencias de medio día: reduce eventos requeridos proporcionalmente
 */
export async function validarFichajeCompleto(
  fichajeId: string
): Promise<ValidacionFichajeCompleto> {
  const fichaje = await prisma.fichajes.findUnique({
    where: { id: fichajeId },
    include: {
      empleado: {
        include: {
          jornada: true,
        },
      },
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
  });

  if (!fichaje) {
    throw new Error(`Fichaje ${fichajeId} no encontrado`);
  }

  if (!fichaje.empleado.jornada) {
    return {
      completo: false,
      eventosRequeridos: [],
      eventosFaltantes: [],
      razon: 'Empleado sin jornada asignada',
    };
  }

  const jornada = fichaje.empleado.jornada;
  const config = jornada.config as JornadaConfig;
  const fechaFichaje = fichaje.fecha;
  
    const nombreDia = obtenerNombreDia(fechaFichaje);
  const configDia = config[nombreDia] as DiaConfig | undefined;

  // Obtener información de ausencia de medio día
  const ausenciaMedioDia = await obtenerAusenciaMedioDia(fichaje.empleadoId, fichaje.fecha);

  let eventosRequeridos: string[] = [];

  // JORNADA FIJA
  // Detectar jornada fija: tiene tipo 'fija' O tiene configDia con entrada/salida
  if (config.tipo === 'fija' || (configDia && configDia.entrada && configDia.salida)) {
    // Si el día no está activo o no está configurado, el fichaje está completo (día no laborable)
    if (!configDia || configDia.activo === false) {
      return {
        completo: true,
        eventosRequeridos: [],
        eventosFaltantes: [],
        razon: 'Día no laborable según jornada',
      };
    }

    // Eventos básicos requeridos
    if (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'tarde') {
      eventosRequeridos.push('entrada');
    }
    
    if (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'manana') {
      eventosRequeridos.push('salida');
    }

    // Pausa es opcional según configuración
    if (configDia.pausa_inicio && configDia.pausa_fin && !ausenciaMedioDia.tieneAusencia) {
      eventosRequeridos.push('pausa_inicio');
      eventosRequeridos.push('pausa_fin');
    }
  }
  // JORNADA FLEXIBLE
  else if (config.tipo === 'flexible') {
    // Verificar si el día está activo
    if (!configDia || configDia.activo === false) {
      return {
        completo: true,
        eventosRequeridos: [],
        eventosFaltantes: [],
        razon: 'Día no laborable según jornada flexible',
      };
    }

    // Siempre entrada y salida
    if (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'tarde') {
      eventosRequeridos.push('entrada');
    }
    
    if (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'manana') {
      eventosRequeridos.push('salida');
    }

    // Pausa obligatoria solo si hay descansoMinimo configurado
    if (config.descansoMinimo && !ausenciaMedioDia.tieneAusencia) {
      eventosRequeridos.push('pausa_inicio');
      eventosRequeridos.push('pausa_fin');
    }
  }
  // Fallback: jornada sin tipo o config incompleto
  else {
    eventosRequeridos = ['entrada', 'salida'];
  }

  // Calcular eventos faltantes
  const tiposEventosExistentes = fichaje.eventos.map((e) => e.tipo);
  const eventosFaltantes = eventosRequeridos.filter(
    (requerido) => !tiposEventosExistentes.includes(requerido)
  );

  // Validar coherencia de pausas: si tiene pausa_inicio, debe tener pausa_fin
  const tienePausaInicio = tiposEventosExistentes.includes('pausa_inicio');
  const tienePausaFin = tiposEventosExistentes.includes('pausa_fin');
  
  if (tienePausaInicio && !tienePausaFin) {
    eventosFaltantes.push('pausa_fin');
  } else if (!tienePausaInicio && tienePausaFin) {
    eventosFaltantes.push('pausa_inicio');
  }

  const completo = eventosFaltantes.length === 0;

  return {
    completo,
    eventosRequeridos,
    eventosFaltantes,
    razon: completo ? undefined : `Faltan eventos: ${eventosFaltantes.join(', ')}`,
  };
}

/**
 * Resultado de validación de descanso antes de salida
 */
export interface ValidacionDescanso {
  requiereDescanso: boolean;
  descansoCompleto: boolean;
  tienePausaInicio: boolean;
  tienePausaFin: boolean;
  debeConfirmar: boolean; // true si debe mostrar dialog de confirmación
}

/**
 * Valida si el empleado puede finalizar su jornada considerando los descansos
 * Retorna información sobre si requiere descanso y si está completo
 *
 * Se usa ANTES de crear el evento de salida para validar si se debe mostrar
 * el dialog de confirmación/edición al empleado
 */
export async function validarDescansoAntesDeSalida(
  empleadoId: string,
  fecha: Date
): Promise<ValidacionDescanso> {
  const fechaSinHora = normalizarFechaSinHora(fecha);

  // Obtener fichaje del día
  const fichaje = await prisma.fichajes.findUnique({
    where: {
      empleadoId_fecha: { empleadoId, fecha: fechaSinHora },
    },
    include: {
      empleado: {
        include: {
          jornada: true,
        },
      },
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
  });

  // Sin fichaje o sin jornada: no requiere descanso
  if (!fichaje || !fichaje.empleado.jornada) {
    return {
      requiereDescanso: false,
      descansoCompleto: true,
      tienePausaInicio: false,
      tienePausaFin: false,
      debeConfirmar: false,
    };
  }

  const jornada = fichaje.empleado.jornada;
  const config = jornada.config as JornadaConfig;
  const nombreDia = obtenerNombreDia(fechaSinHora);
  const configDia = config[nombreDia] as DiaConfig | undefined;

  // Obtener información de ausencia de medio día
  const ausenciaMedioDia = await obtenerAusenciaMedioDia(empleadoId, fechaSinHora);

  let requiereDescanso = false;

  // JORNADA FIJA: requiere pausa si está configurada
  if (config.tipo === 'fija' || (configDia && configDia.entrada && configDia.salida)) {
    if (configDia && configDia.activo !== false && configDia.pausa_inicio && configDia.pausa_fin && !ausenciaMedioDia.tieneAusencia) {
      requiereDescanso = true;
    }
  }
  // JORNADA FLEXIBLE: requiere pausa si hay descansoMinimo configurado
  else if (config.tipo === 'flexible') {
    if (configDia && configDia.activo !== false && config.descansoMinimo && !ausenciaMedioDia.tieneAusencia) {
      requiereDescanso = true;
    }
  }

  // Verificar eventos de pausa existentes
  const tiposEventosExistentes = fichaje.eventos.map((e) => e.tipo);
  const tienePausaInicio = tiposEventosExistentes.includes('pausa_inicio');
  const tienePausaFin = tiposEventosExistentes.includes('pausa_fin');

  // Descanso está completo si:
  // 1. No requiere descanso, O
  // 2. Tiene pausa_inicio Y pausa_fin
  const descansoCompleto = !requiereDescanso || (tienePausaInicio && tienePausaFin);

  // Debe confirmar si:
  // 1. Requiere descanso, Y
  // 2. El descanso NO está completo (falta pausa_inicio, pausa_fin, o ambos)
  const debeConfirmar = requiereDescanso && !descansoCompleto;

  return {
    requiereDescanso,
    descansoCompleto,
    tienePausaInicio,
    tienePausaFin,
    debeConfirmar,
  };
}

/**
 * Verifica si un fichaje debe cerrarse automáticamente según el límite superior de la jornada
 * o porque pertenece a un día anterior.
 *
 * @param fichaje - Fichaje a evaluar con jornada incluida
 * @param ahora - Fecha/hora actual (opcional, por defecto new Date())
 * @returns true si el fichaje debe cerrarse automáticamente
 */
export function debeCerrarseAutomaticamente(
  fichaje: {
    fecha: Date;
    estado: string;
    empleado?: {
      jornada?: {
        config: unknown;
      } | null;
    };
  },
  ahora: Date = new Date()
): boolean {
  // Solo cerrar fichajes en estado 'en_curso'
  if (fichaje.estado !== PrismaEstadoFichaje.en_curso) {
    return false;
  }

  const fechaFichaje = normalizarFechaSinHora(fichaje.fecha);
  const fechaHoy = normalizarFechaSinHora(ahora);

  // Si el fichaje es de un día anterior a hoy, debe cerrarse
  if (fechaFichaje < fechaHoy) {
    return true;
  }

  // Si el fichaje es de hoy, verificar el límite superior
  if (fechaFichaje.getTime() === fechaHoy.getTime()) {
    const jornada = fichaje.empleado?.jornada;
    if (!jornada) {
      // Sin jornada, no podemos determinar límite superior
      // Mantener abierto (conservador)
      return false;
    }

    const config = jornada.config as JornadaConfig | null;
    if (!config) {
      return false;
    }

    const limiteSuperior = config.limiteSuperior;
    if (!limiteSuperior || typeof limiteSuperior !== 'string') {
      // Sin límite superior configurado, solo cerrar si es día anterior
      return false;
    }

    // Parsear límite superior (formato "HH:mm")
    const [horaLimite, minutoLimite] = limiteSuperior.split(':').map(Number);
    if (horaLimite === undefined || minutoLimite === undefined) {
      return false;
    }

    // Crear fecha límite (mismo día que el fichaje, con la hora límite superior)
    const fechaLimite = new Date(fechaFichaje);
    fechaLimite.setHours(horaLimite, minutoLimite, 0, 0);

    // Si ya pasó el límite superior, debe cerrarse
    return ahora > fechaLimite;
  }

  // Fichaje es del futuro (no debería ocurrir), no cerrar
  return false;
}

/**
 * Cierra automáticamente un fichaje que quedó abierto, clasificándolo como pendiente o finalizado
 * según su completitud.
 *
 * @param fichajeId - ID del fichaje a cerrar
 * @param prismaClient - Cliente de Prisma (opcional, para uso en transacciones)
 * @returns Estado final del fichaje ('finalizado' o 'pendiente')
 */
export async function cerrarFichajeAutomaticamente(
  fichajeId: string,
  prismaClient?: PrismaClient | Prisma.TransactionClient
): Promise<'finalizado' | 'pendiente'> {
  const client = prismaClient ?? prisma;

  // Obtener fichaje con validación completa
  const validacion = await validarFichajeCompleto(fichajeId);

  // Actualizar cálculos antes de cerrar
  await actualizarCalculosFichaje(fichajeId, client);

  const estadoFinal = validacion.completo
    ? PrismaEstadoFichaje.finalizado
    : PrismaEstadoFichaje.pendiente;

  await client.fichajes.update({
    where: { id: fichajeId },
    data: {
      estado: estadoFinal,
      // Si está finalizado, marcar fecha de aprobación automática
      ...(validacion.completo && { fechaAprobacion: new Date() }),
    },
  });

  console.log(
    `[cerrarFichajeAutomaticamente] Fichaje ${fichajeId} cerrado automáticamente: ${estadoFinal}`,
    { completo: validacion.completo, razon: validacion.razon }
  );

  return estadoFinal === PrismaEstadoFichaje.finalizado ? 'finalizado' : 'pendiente';
}
