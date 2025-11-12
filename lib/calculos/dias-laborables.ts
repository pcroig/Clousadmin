// ========================================
// Cálculo de Días Laborables
// ========================================

import { prisma } from '@/lib/prisma';

export type FestivosSet = Set<string>;

type FestivoConFecha = {
  fecha: Date;
};

function normalizarInicioDeDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function normalizarFinDeDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);
}

export function formatearClaveFecha(fecha: Date): string {
  const normalizada = normalizarInicioDeDia(fecha);
  const year = normalizada.getFullYear();
  const month = String(normalizada.getMonth() + 1).padStart(2, '0');
  const day = String(normalizada.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function crearSetFestivos(festivos: FestivoConFecha[]): FestivosSet {
  return new Set(festivos.map((festivo) => formatearClaveFecha(festivo.fecha)));
}

export async function getFestivosActivosEnRango(
  empresaId: string,
  fechaInicio: Date,
  fechaFin: Date
) {
  return prisma.festivo.findMany({
    where: {
      empresaId,
      fecha: {
        gte: normalizarInicioDeDia(fechaInicio),
        lte: normalizarFinDeDia(fechaFin),
      },
      activo: true,
    },
    orderBy: {
      fecha: 'asc',
    },
  });
}

export interface DiasLaborables {
  lunes: boolean;
  martes: boolean;
  miercoles: boolean;
  jueves: boolean;
  viernes: boolean;
  sabado: boolean;
  domingo: boolean;
}

const DIAS_LABORABLES_DEFAULT: DiasLaborables = {
  lunes: true,
  martes: true,
  miercoles: true,
  jueves: true,
  viernes: true,
  sabado: false,
  domingo: false,
};

/**
 * Obtiene la configuración de días laborables de una empresa
 * Si no existe configuración, retorna L-V por defecto
 */
export async function getDiasLaborablesEmpresa(empresaId: string): Promise<DiasLaborables> {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { config: true },
    });

    if (!empresa) {
      console.warn(`[DiasLaborables] Empresa ${empresaId} no encontrada, usando default`);
      return DIAS_LABORABLES_DEFAULT;
    }

    const config = empresa.config;

    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null;

    const getFlag = (
      source: Record<string, unknown>,
      key: keyof DiasLaborables
    ): boolean => (typeof source[key] === 'boolean' ? (source[key] as boolean) : DIAS_LABORABLES_DEFAULT[key]);

    if (isRecord(config) && 'diasLaborables' in config) {
      const diasConfig = (config as Record<string, unknown>).diasLaborables;
      if (isRecord(diasConfig)) {
        return {
          lunes: getFlag(diasConfig, 'lunes'),
          martes: getFlag(diasConfig, 'martes'),
          miercoles: getFlag(diasConfig, 'miercoles'),
          jueves: getFlag(diasConfig, 'jueves'),
          viernes: getFlag(diasConfig, 'viernes'),
          sabado: getFlag(diasConfig, 'sabado'),
          domingo: getFlag(diasConfig, 'domingo'),
        };
      }
    }

    // Si no existe, retornar default
    return DIAS_LABORABLES_DEFAULT;
  } catch (error) {
    console.error('[DiasLaborables] Error obteniendo configuración:', error);
    return DIAS_LABORABLES_DEFAULT;
  }
}

/**
 * Verifica si un día de la semana es laborable según la configuración de la empresa
 */
function esDiaSemanaLaborable(fecha: Date, diasLaborables: DiasLaborables): boolean {
  const diaSemana = fecha.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  
  const mapaDias: { [key: number]: keyof DiasLaborables } = {
    0: 'domingo',
    1: 'lunes',
    2: 'martes',
    3: 'miercoles',
    4: 'jueves',
    5: 'viernes',
    6: 'sabado',
  };

  const nombreDia = mapaDias[diaSemana];
  return diasLaborables[nombreDia];
}

/**
 * Verifica si una fecha es festivo activo
 */
async function esFestivoActivo(fecha: Date, empresaId: string): Promise<boolean> {
  try {
    const fechaNormalizada = normalizarInicioDeDia(fecha);
    const festivo = await prisma.festivo.findFirst({
      where: {
        empresaId,
        fecha: {
          equals: fechaNormalizada,
        },
        activo: true,
      },
    });

    return festivo !== null;
  } catch (error) {
    console.error('[DiasLaborables] Error verificando festivo:', error);
    return false;
  }
}

/**
 * Determina si una fecha es laborable según:
 * 1. Configuración de días de la semana de la empresa
 * 2. Si es festivo activo
 * 
 * Una fecha es laborable si:
 * - El día de la semana está configurado como laborable
 * - Y NO es festivo activo
 */
export async function esDiaLaborable(
  fecha: Date,
  empresaId: string,
  diasLaborables?: DiasLaborables,
  festivosSet?: FestivosSet
): Promise<boolean> {
  // Obtener configuración si no se proporcionó
  const diasLaborablesConfig = diasLaborables ?? (await getDiasLaborablesEmpresa(empresaId));

  // Verificar si el día de la semana es laborable
  const esDiaSemanaLab = esDiaSemanaLaborable(fecha, diasLaborablesConfig);
  
  if (!esDiaSemanaLab) {
    return false;
  }

  if (festivosSet) {
    return !festivosSet.has(formatearClaveFecha(fecha));
  }

  // Verificar si es festivo
  const esFestivo = await esFestivoActivo(fecha, empresaId);

  return !esFestivo;
}

/**
 * Cuenta los días laborables entre dos fechas (inclusivo)
 */
export async function contarDiasLaborables(
  fechaInicio: Date,
  fechaFin: Date,
  empresaId: string
): Promise<number> {
  const [diasLaborables, festivos] = await Promise.all([
    getDiasLaborablesEmpresa(empresaId),
    getFestivosActivosEnRango(empresaId, fechaInicio, fechaFin),
  ]);
  const festivosSet = crearSetFestivos(festivos);
  let count = 0;
  
  const fecha = new Date(fechaInicio);
  const fechaFinDate = new Date(fechaFin);

  while (fecha <= fechaFinDate) {
    const esDiaSemana = esDiaSemanaLaborable(fecha, diasLaborables);
    const esFestivo = festivosSet.has(formatearClaveFecha(fecha));
    if (esDiaSemana && !esFestivo) {
      count++;
    }
    fecha.setDate(fecha.getDate() + 1);
  }

  return count;
}

/**
 * Obtiene los días no laborables (fines de semana según config + festivos) en un rango
 */
export async function getDiasNoLaborables(
  fechaInicio: Date,
  fechaFin: Date,
  empresaId: string
): Promise<Date[]> {
  const [diasLaborables, festivos] = await Promise.all([
    getDiasLaborablesEmpresa(empresaId),
    getFestivosActivosEnRango(empresaId, fechaInicio, fechaFin),
  ]);
  const festivosSet = crearSetFestivos(festivos);
  const diasNoLaborables: Date[] = [];
  
  const fecha = new Date(fechaInicio);
  const fechaFinDate = new Date(fechaFin);

  while (fecha <= fechaFinDate) {
    const esDiaSemana = esDiaSemanaLaborable(fecha, diasLaborables);
    const esFestivo = festivosSet.has(formatearClaveFecha(fecha));
    const esLaborable = esDiaSemana && !esFestivo;
    if (!esLaborable) {
      diasNoLaborables.push(new Date(fecha));
    }
    fecha.setDate(fecha.getDate() + 1);
  }

  return diasNoLaborables;
}






