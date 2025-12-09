// ========================================
// Utilidades para normalizar fichajes a jornadas UI
// ========================================
// Centraliza la lógica de transformación de fichajes API en datos listos para renderizar

import { EstadoFichaje } from '@/lib/constants/enums';
import { toMadridDate } from '@/lib/utils/fechas';
import { calcularProgresoEventos } from '@/lib/calculos/fichajes-cliente';

const HORAS_OBJETIVO_POR_DEFECTO = 8;

export interface FichajeEventoDTO {
  id: string;
  tipo: string;
  hora: string | Date;
  editado?: boolean | null;
  [key: string]: unknown;
}

export interface FichajeDTO {
  id: string;
  fecha: string | Date;
  estado?: string | null;
  horasTrabajadas?: number | string | null;
  eventos?: FichajeEventoDTO[] | null;
  [key: string]: unknown;
}

export interface FichajeNormalizado extends Omit<FichajeDTO, 'fecha' | 'horasTrabajadas' | 'eventos'> {
  fecha: string;
  estado: string;
  horasTrabajadas: number;
  eventos: FichajeEventoDTO[];
}

export interface JornadaUI {
  fecha: Date;
  fichaje: FichajeNormalizado;
  horasTrabajadas: number;
  horasObjetivo: number;
  entrada: Date | null;
  salida: Date | null;
  balance: number;
  estado: string;
}

export interface ResumenJornadas {
  totalHoras: number;
  diasConFichaje: number;
  balanceAcumulado: number;
  enCurso: number;
}

export interface EstadoBadgeConfig {
  label: string;
  className: string;
}

interface AgruparOptions {
  horasObjetivo?: number;
}

/**
 * Convierte una hora en formato libre (ISO o HH:mm[:ss]) a un objeto Date.
 * Retorna null si la hora no es válida.
 */
export function parseHoraToDate(hora: string | Date | null | undefined): Date | null {
  if (!hora) {
    return null;
  }

  if (hora instanceof Date) {
    return Number.isNaN(hora.getTime()) ? null : hora;
  }

  const normalized = hora.trim();
  if (!normalized) {
    return null;
  }

  const isoCandidate = normalized.includes('T') ? normalized : `2000-01-01T${normalized.length === 5 ? `${normalized}:00` : normalized}`;
  const parsedIso = new Date(isoCandidate);
  if (!Number.isNaN(parsedIso.getTime())) {
    return parsedIso;
  }

  const [timePart] = normalized.split(/[+-]/);
  const [horas, minutos, segundos] = timePart.split(':').map((value) => Number(value));

  if (
    Number.isFinite(horas) &&
    Number.isFinite(minutos) &&
    horas >= 0 &&
    horas < 24 &&
    minutos >= 0 &&
    minutos < 60
  ) {
    const date = new Date(2000, 0, 1, horas, minutos, Number.isFinite(segundos) ? segundos : 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function parseHorasTrabajadas(valor: number | string | null | undefined): number {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return valor;
  }

  if (typeof valor === 'string') {
    const parsed = Number(valor);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function normalizarFecha(fecha: string | Date): { fechaISO: string; fechaDate: Date } {
  const baseDate = fecha instanceof Date ? fecha : new Date(fecha);

  if (Number.isNaN(baseDate.getTime())) {
    const hoy = new Date();
    const fallback = toMadridDate(hoy);
    const fallbackISO = fallback.toISOString().split('T')[0];
    return { fechaISO: fallbackISO, fechaDate: fallback };
  }

  const madridDate = toMadridDate(baseDate);
  const fechaISO = madridDate.toISOString().split('T')[0];

  return { fechaISO, fechaDate: madridDate };
}

function obtenerEntrada(eventos: FichajeEventoDTO[]): FichajeEventoDTO | undefined {
  return eventos.find((evento) => evento.tipo === 'entrada');
}

function obtenerSalida(eventos: FichajeEventoDTO[]): FichajeEventoDTO | undefined {
  for (let index = eventos.length - 1; index >= 0; index -= 1) {
    const evento = eventos[index];
    if (evento.tipo === 'salida') {
      return evento;
    }
  }
  return undefined;
}

/**
 * Agrupa los fichajes recibidos del API por jornada (día).
 * Devuelve los datos listos para ser renderizados en tablas o resúmenes.
 */
export function agruparFichajesEnJornadas(
  fichajes: FichajeDTO[],
  options: AgruparOptions = {}
): JornadaUI[] {
  if (!Array.isArray(fichajes) || fichajes.length === 0) {
    return [];
  }

  const horasObjetivo = options.horasObjetivo ?? HORAS_OBJETIVO_POR_DEFECTO;
  const grupos: Record<string, FichajeDTO[]> = {};

  fichajes.forEach((fichaje) => {
    if (!fichaje) return;

    const { fechaISO } = normalizarFecha(fichaje.fecha);
    if (!grupos[fechaISO]) {
      grupos[fechaISO] = [];
    }
    grupos[fechaISO].push(fichaje);
  });

  return Object.entries(grupos)
    .map(([_fechaISO, fichajesDelDia]) => {
      const fichajeBase = fichajesDelDia.find((f) => (f.eventos ?? []).length > 0) ?? fichajesDelDia[0];

      const eventosOrdenados = fichajesDelDia
        .flatMap((f) => f.eventos ?? [])
        .filter((evento): evento is FichajeEventoDTO => Boolean(evento))
        .sort((a, b) => {
          const fechaA = parseHoraToDate(a.hora);
          const fechaB = parseHoraToDate(b.hora);
          return (fechaA?.getTime() ?? 0) - (fechaB?.getTime() ?? 0);
        });

      const entradaEvento = obtenerEntrada(eventosOrdenados);
      const salidaEvento = obtenerSalida(eventosOrdenados);
      const entrada = parseHoraToDate(entradaEvento?.hora);
      const salida = parseHoraToDate(salidaEvento?.hora);

      // FIX CRÍTICO: Para fichajes en curso, calcular horas en tiempo real desde eventos
      const estadoNormalizado = (fichajeBase.estado ?? EstadoFichaje.finalizado).toString();
      const esEnCurso = estadoNormalizado === EstadoFichaje.en_curso;

      let horasTrabajadas = 0;
      if (esEnCurso && eventosOrdenados.length > 0) {
        // Calcular horas en tiempo real desde eventos (mismo cálculo que el widget)
        const { horasAcumuladas, horaEnCurso } = calcularProgresoEventos(eventosOrdenados);
        if (horaEnCurso) {
          // Hay tramo abierto: sumar horas acumuladas + tiempo desde último evento hasta ahora
          const ahora = new Date();
          const horasDesdeUltimoEvento = (ahora.getTime() - horaEnCurso.getTime()) / (1000 * 60 * 60);
          horasTrabajadas = horasAcumuladas + horasDesdeUltimoEvento;
        } else {
          horasTrabajadas = horasAcumuladas;
        }
      } else {
        // Fichaje finalizado: usar horas almacenadas en BD
        const horasTrabajadasRaw = parseHorasTrabajadas(
          fichajesDelDia.find((f) => f.horasTrabajadas !== null && f.horasTrabajadas !== undefined)?.horasTrabajadas,
        );
        horasTrabajadas = horasTrabajadasRaw;

        // Fallback: si no hay horas en BD pero hay entrada y salida, calcular manualmente
        if (horasTrabajadas === 0 && entrada && salida) {
          horasTrabajadas = (salida.getTime() - entrada.getTime()) / (1000 * 60 * 60);
        }
      }

      // FIX: Usar horasEsperadas del fichaje (0 para extraordinarios) en lugar del parámetro
      const horasEsperadasFichaje = typeof fichajeBase.horasEsperadas === 'number'
        ? fichajeBase.horasEsperadas
        : typeof fichajeBase.horasEsperadas === 'string'
          ? Number(fichajeBase.horasEsperadas)
          : horasObjetivo;

      const balance = Number((horasTrabajadas - horasEsperadasFichaje).toFixed(2));
      const { fechaDate } = normalizarFecha(fichajeBase.fecha);

      const fichajeNormalizado: FichajeNormalizado = {
        ...fichajeBase,
        fecha: normalizarFecha(fichajeBase.fecha).fechaISO,
        estado: estadoNormalizado,
        horasTrabajadas,
        eventos: eventosOrdenados,
      };

      return {
        fecha: fechaDate,
        fichaje: fichajeNormalizado,
        horasTrabajadas,
        horasObjetivo: horasEsperadasFichaje, // FIX: Usar horas esperadas reales del fichaje
        entrada,
        salida,
        balance,
        estado: estadoNormalizado,
      };
    })
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}

/**
 * Calcula métricas de resumen para mostrar tarjetas rápidas.
 */
export function calcularResumenJornadas(jornadas: JornadaUI[]): ResumenJornadas {
  return jornadas.reduce<ResumenJornadas>(
    (acumulado, jornada) => {
      const totalHoras = acumulado.totalHoras + jornada.horasTrabajadas;
      const balanceAcumulado = acumulado.balanceAcumulado + jornada.balance;
      const diasConFichaje = acumulado.diasConFichaje + (jornada.fichaje.eventos.some((ev) => ev.tipo === 'entrada') ? 1 : 0);
      const enCurso = acumulado.enCurso + (jornada.estado === EstadoFichaje.en_curso ? 1 : 0);

      return {
        totalHoras,
        balanceAcumulado,
        diasConFichaje,
        enCurso,
      };
    },
    {
      totalHoras: 0,
      balanceAcumulado: 0,
      diasConFichaje: 0,
      enCurso: 0,
    }
  );
}

export const HORAS_OBJETIVO_DEFAULT = HORAS_OBJETIVO_POR_DEFECTO;

/**
 * Obtiene los estilos y etiqueta para un estado de fichaje.
 */
export function getEstadoBadgeConfig(estado: string): EstadoBadgeConfig {
  const mapa: Record<string, EstadoBadgeConfig> = {
    en_curso: { label: 'En curso', className: 'bg-blue-100 text-blue-800' },
    finalizado: { label: 'Finalizado', className: 'bg-green-100 text-green-800' },
    revisado: { label: 'Revisado', className: 'bg-gray-100 text-gray-800' },
    pendiente: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
  };

  return mapa[estado] ?? mapa.finalizado;
}


