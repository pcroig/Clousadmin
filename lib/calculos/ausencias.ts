// ========================================
// Lógica de cálculo para Ausencias
// ========================================

import { EstadoAusencia } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { normalizeToUTCDate, getDaysBetween } from '@/lib/utils/dates';

import {
  crearSetFestivos,
  esDiaLaborable,
  formatearClaveFecha,
  getDiasLaborablesEmpresa,
  getFestivosActivosEnRango,
  getFestivosActivosParaEmpleado,
} from './dias-laborables';

import type { empleadoSaldoAusencias as EmpleadoSaldoAusencias, Prisma } from '@prisma/client';

const CARRY_OVER_DEFAULT_MONTHS = 4;

type CarryOverPolicy = {
  mode: 'limpiar' | 'extender';
  months: number;
};

type PrismaTx = Prisma.TransactionClient;

function parseCarryOverPolicy(config?: Record<string, unknown> | null): CarryOverPolicy {
  if (!config || typeof config.carryOver !== 'object' || config.carryOver === null) {
    return { mode: 'limpiar', months: 0 };
  }

  const raw = config.carryOver as Record<string, unknown>;
  const mode =
    typeof raw.modo === 'string' && raw.modo === 'extender' ? 'extender' : 'limpiar';
  if (mode === 'extender') {
    return { mode, months: CARRY_OVER_DEFAULT_MONTHS };
  }

  return { mode: 'limpiar', months: 0 };
}

function computeCarryOverExpiry(year: number, months: number): Date {
  const targetMonthIndex = Math.min(Math.max(months, 1), 12);
  // Date.UTC month is zero-based; using targetMonthIndex gives us the first day of the month following the extension
  const expira = new Date(Date.UTC(year, targetMonthIndex, 0, 23, 59, 59, 999));
  return expira;
}

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof (value as Prisma.Decimal).toNumber === 'function') {
    try {
      return (value as Prisma.Decimal).toNumber();
    } catch {
      return 0;
    }
  }
  return 0;
}

async function limpiarCarryOverSiExpirado(
  saldo: EmpleadoSaldoAusencias,
  executor: PrismaTx | typeof prisma
): Promise<EmpleadoSaldoAusencias> {
  if (!saldo.carryOverExpiraEn || decimalToNumber(saldo.carryOverAsignado) <= 0) {
    return saldo;
  }

  const hoy = new Date();
  if (hoy <= saldo.carryOverExpiraEn) {
    return saldo;
  }

  return executor.empleadoSaldoAusencias.update({
    where: { id: saldo.id },
    data: {
      carryOverAsignado: 0,
      carryOverPendiente: 0,
      carryOverExpiraEn: null,
      carryOverFuenteAnio: null,
    },
  });
}

async function calcularDatosCarryOverParaNuevoSaldo(params: {
  empleadoId: string;
  año: number;
  empresaId: string;
  empresaConfig: Record<string, unknown> | null;
  executor: PrismaTx | typeof prisma;
}): Promise<Pick<
  Prisma.empleadoSaldoAusenciasCreateInput,
  'carryOverAsignado' | 'carryOverPendiente' | 'carryOverUsado' | 'carryOverExpiraEn' | 'carryOverFuenteAnio'
>> {
  const policy = parseCarryOverPolicy(params.empresaConfig);
  if (policy.mode !== 'extender') {
    return {
      carryOverAsignado: 0,
      carryOverPendiente: 0,
      carryOverUsado: 0,
      carryOverExpiraEn: null,
      carryOverFuenteAnio: null,
    };
  }

  const saldoAnterior = await params.executor.empleadoSaldoAusencias.findUnique({
    where: {
      empleadoId_anio: {
        empleadoId: params.empleadoId,
        anio: params.año - 1,
      },
    },
  });

  if (!saldoAnterior) {
    return {
      carryOverAsignado: 0,
      carryOverPendiente: 0,
      carryOverUsado: 0,
      carryOverExpiraEn: null,
      carryOverFuenteAnio: null,
    };
  }

  const diasDisponiblesAnterior =
    saldoAnterior.diasTotales -
    decimalToNumber(saldoAnterior.diasUsados) -
    decimalToNumber(saldoAnterior.diasPendientes);

  if (diasDisponiblesAnterior <= 0) {
    return {
      carryOverAsignado: 0,
      carryOverPendiente: 0,
      carryOverUsado: 0,
      carryOverExpiraEn: null,
      carryOverFuenteAnio: null,
    };
  }

  return {
    carryOverAsignado: diasDisponiblesAnterior,
    carryOverPendiente: 0,
    carryOverUsado: 0,
    carryOverExpiraEn: computeCarryOverExpiry(params.año, policy.months),
    carryOverFuenteAnio: params.año - 1,
  };
}

function obtenerCarryOverDisponible(
  saldo: EmpleadoSaldoAusencias,
  referencia: Date
): { disponible: number; activo: boolean; expiraEn?: Date } {
  const asignado = decimalToNumber(saldo.carryOverAsignado);
  if (asignado <= 0) {
    return { disponible: 0, activo: false };
  }

  if (saldo.carryOverExpiraEn && referencia > saldo.carryOverExpiraEn) {
    return { disponible: 0, activo: false, expiraEn: saldo.carryOverExpiraEn };
  }

  const pendiente = decimalToNumber(saldo.carryOverPendiente);
  const usado = decimalToNumber(saldo.carryOverUsado);
  const disponible = Math.max(0, asignado - pendiente - usado);
  return {
    disponible,
    activo: disponible > 0,
    expiraEn: saldo.carryOverExpiraEn ?? undefined,
  };
}


/**
 * Determina el estado aprobado para una ausencia en función de la fecha fin.
 * - Si la fecha fin ya pasó, se considera completada
 * - Si la fecha fin es futura o hoy, se considera aprobada/en curso
 */
export function determinarEstadoTrasAprobacion(fechaFin: Date): EstadoAusencia {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const finNormalizado = new Date(fechaFin);
  finNormalizado.setHours(0, 0, 0, 0);

  return finNormalizado < hoy ? EstadoAusencia.completada : EstadoAusencia.confirmada;
}

/**
 * Verifica si una fecha es fin de semana (sábado o domingo)
 */
export function esFinDeSemana(fecha: Date): boolean {
  const diaSemana = fecha.getDay();
  return diaSemana === 0 || diaSemana === 6; // 0 = domingo, 6 = sábado
}

/**
 * Verifica si una fecha es festivo para una empresa
 */
export async function esFestivo(fecha: Date, empresaId: string): Promise<boolean> {
  const count = await prisma.festivos.count({
    where: {
      empresaId,
      fecha: fecha,
      activo: true,
    },
  });
  return count > 0;
}

/**
 * Calcula los días solicitados excluyendo días no laborables (según config empresa) y festivos
 * 
 * @param fechaInicio Fecha de inicio de la ausencia
 * @param fechaFin Fecha de fin de la ausencia
 * @param empresaId ID de la empresa (para obtener festivos y config días laborables)
 * @param medioDia Si es medio día (divide el resultado por 2)
 * @param empleadoId ID del empleado (opcional, para incluir festivos personalizados)
 * @returns Número de días laborables solicitados
 */
export async function calcularDiasSolicitados(
  fechaInicio: Date,
  fechaFin: Date,
  empresaId: string,
  medioDia: boolean = false,
  empleadoId?: string
): Promise<number> {
  const [diasLaborables, festivos] = await Promise.all([
    getDiasLaborablesEmpresa(empresaId),
    getFestivosActivosParaEmpleado(empresaId, empleadoId, fechaInicio, fechaFin),
  ]);
  const festivosSet = crearSetFestivos(festivos);

  let dias = 0;
  const fecha = new Date(fechaInicio);
  const fechaFinDate = new Date(fechaFin);

  while (fecha <= fechaFinDate) {
    // Verificar si el día es laborable según configuración y festivos
    const esLaborable = await esDiaLaborable(fecha, empresaId, diasLaborables, festivosSet);
    if (esLaborable) {
      dias++;
    }
    fecha.setDate(fecha.getDate() + 1);
  }

  return medioDia ? dias * 0.5 : dias;
}

/**
 * Calcula los días naturales y laborables entre dos fechas.
 *
 * IMPORTANTE: Normaliza automáticamente las fechas a UTC para evitar problemas de timezone.
 * Usa la configuración de días laborables de la empresa y festivos.
 *
 * @param fechaInicio - Fecha de inicio (se normalizará a medianoche UTC)
 * @param fechaFin - Fecha de fin (se normalizará a medianoche UTC)
 * @param empresaId - ID de la empresa para obtener configuración y festivos
 * @param empleadoId - ID del empleado (opcional, para incluir festivos personalizados)
 * @returns Objeto con diasNaturales, diasLaborables y diasSolicitados
 *
 * @example
 * const resultado = await calcularDias(
 *   new Date('2025-01-17T23:00:00+01:00'), // Se normalizará a 2025-01-17 00:00 UTC
 *   new Date('2025-01-22T12:00:00-05:00'), // Se normalizará a 2025-01-22 00:00 UTC
 *   'empresa-id'
 * );
 * // resultado: { diasNaturales: 6, diasLaborables: 4, diasSolicitados: 4 }
 */
export async function calcularDias(
  fechaInicio: Date | string,
  fechaFin: Date | string,
  empresaId: string,
  empleadoId?: string
): Promise<{
  diasNaturales: number;
  diasLaborables: number;
  diasSolicitados: number;
}> {
  // Normalizar fechas a UTC para evitar problemas de timezone
  const fechaInicioUTC = normalizeToUTCDate(fechaInicio);
  const fechaFinUTC = normalizeToUTCDate(fechaFin);

  // Días naturales usando helper centralizado
  const diasNaturales = getDaysBetween(fechaInicioUTC, fechaFinUTC);

  const [diasLaborablesConfig, festivos] = await Promise.all([
    getDiasLaborablesEmpresa(empresaId),
    getFestivosActivosParaEmpleado(empresaId, empleadoId, fechaInicioUTC, fechaFinUTC),
  ]);
  const festivosSet = crearSetFestivos(festivos);

  // Contar días laborables y solicitados según configuración de empresa
  let diasLaborables = 0;
  let diasSolicitados = 0;
  const fecha = new Date(fechaInicioUTC);
  const fechaFinDate = new Date(fechaFinUTC);

  while (fecha <= fechaFinDate) {
    // Verificar si el día de la semana es laborable según configuración
    const diaSemana = fecha.getUTCDay(); // Usar getUTCDay() para consistencia
    const mapaDias: { [key: number]: keyof typeof diasLaborablesConfig } = {
      0: 'domingo',
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes',
      6: 'sabado',
    };
    const nombreDia = mapaDias[diaSemana];
    const esDiaSemanaLaborable = diasLaborablesConfig[nombreDia];

    // Un día es "laborable" si el día de la semana está configurado como tal
    // (no consideramos festivos para días laborables, solo para días solicitados)
    if (esDiaSemanaLaborable) {
      diasLaborables++;
    }

    // Días solicitados: solo días laborables que NO son festivos
    const esLaborable = await esDiaLaborable(fecha, empresaId, diasLaborablesConfig, festivosSet);
    if (esLaborable) {
      diasSolicitados++;
    }

    // Incrementar usando setUTCDate para evitar problemas con DST
    fecha.setUTCDate(fecha.getUTCDate() + 1);
  }

  return {
    diasNaturales,
    diasLaborables,
    diasSolicitados,
  };
}

/**
 * Obtiene o crea el saldo de ausencias de un empleado para un año
 */
export async function getSaldoEmpleado(
  empleadoId: string,
  año: number,
  tx?: PrismaTx,
  _options?: { lock?: boolean }
) {
  const executor = tx ?? prisma;

  let saldo = await executor.empleadoSaldoAusencias.findFirst({
    where: {
      empleadoId,
      anio: año,
    },
  });

  if (!saldo) {
    const empleado = await executor.empleados.findUnique({
      where: { id: empleadoId },
      select: {
        diasVacaciones: true,
        diasAusenciasPersonalizados: true,
        empresaId: true,
        empresa: {
          select: {
            config: true,
          },
        },
      },
    });

    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    // Usar días personalizados si están definidos, si no usar el mínimo global (diasVacaciones)
    const diasAsignados = empleado.diasAusenciasPersonalizados ?? empleado.diasVacaciones;

    const carryOverData = await calcularDatosCarryOverParaNuevoSaldo({
      empleadoId,
      año,
      empresaId: empleado.empresaId,
      empresaConfig: (empleado.empresa?.config as Record<string, unknown> | null) ?? null,
      executor,
    });

    // Usar upsert para evitar race conditions con unique constraint
    saldo = await executor.empleadoSaldoAusencias.upsert({
      where: {
        empleadoId_anio: {
          empleadoId,
          anio: año,
        },
      },
      create: {
        empleadoId,
        empresaId: empleado.empresaId,
        anio: año,
        diasTotales: diasAsignados,
        diasUsados: 0,
        diasPendientes: 0,
        origen: 'manual_hr',
        ...carryOverData,
      },
      update: {
        // Si ya existe, solo actualizamos el carryOver si ha cambiado
        ...carryOverData,
      },
    });
  } else {
    saldo = await limpiarCarryOverSiExpirado(saldo, executor);
  }

  return saldo;
}

/**
 * Calcula el saldo disponible de un empleado
 * 
 * IMPORTANTE: Cuando se usa dentro de una transacción (`tx` presente), 
 * confía en los valores de la tabla para evitar race conditions.
 * Fuera de transacción, recalcula desde ausencias para verificación.
 * 
 * Las horas compensadas aprobadas se suman automáticamente a diasTotales.
 */
export async function calcularSaldoDisponible(
  empleadoId: string,
  año: number,
  tx?: PrismaTx,
  options?: { lock?: boolean }
): Promise<{
  diasTotales: number;
  diasUsados: number;
  diasPendientes: number;
  diasDisponibles: number;
  carryOverDisponible: number;
  carryOverExpiraEn: Date | null;
  diasDesdeHorasCompensadas: number;
  horasCompensadas: number;
}> {
  const executor = tx ?? prisma;
  let saldo = await getSaldoEmpleado(empleadoId, año, tx, options);
  saldo = await limpiarCarryOverSiExpirado(saldo, executor);

  const referencia = new Date();
  const carryInfo = obtenerCarryOverDisponible(saldo, referencia);

  // Calcular días de horas compensadas aprobadas
  const inicioAño = new Date(año, 0, 1);
  const finAño = new Date(año, 11, 31, 23, 59, 59, 999);
  
  const compensacionesAprobadas = await executor.compensaciones_horas_extra.findMany({
    where: {
      empleadoId,
      estado: 'aprobada',
      tipoCompensacion: 'ausencia',
      createdAt: {
        gte: inicioAño,
        lte: finAño,
      },
    },
    select: {
      horasBalance: true,
      diasAusencia: true,
    },
  });

  const horasCompensadas = compensacionesAprobadas.reduce(
    (total, comp) => total + Number(comp.horasBalance),
    0
  );

  const diasDesdeHorasCompensadas = compensacionesAprobadas.reduce(
    (total, comp) => total + (comp.diasAusencia ? Number(comp.diasAusencia) : 0),
    0
  );

  // Los días totales YA incluyen los días de compensación
  // porque se añaden al saldo cuando HR aprueba la compensación
  const diasTotales = saldo.diasTotales;
  const diasUsados = decimalToNumber(saldo.diasUsados);
  const diasPendientes = decimalToNumber(saldo.diasPendientes);
  const diasDisponibles = diasTotales - diasUsados - diasPendientes + carryInfo.disponible;

  return {
    diasTotales,
    diasUsados,
    diasPendientes,
    diasDisponibles,
    carryOverDisponible: carryInfo.disponible,
    carryOverExpiraEn: carryInfo.expiraEn ?? saldo.carryOverExpiraEn ?? null,
    diasDesdeHorasCompensadas: Math.round(diasDesdeHorasCompensadas * 10) / 10,
    horasCompensadas: Math.round(horasCompensadas * 100) / 100,
  };
}

/**
 * Valida si el empleado tiene saldo suficiente
 */
export async function validarSaldoSuficiente(
  empleadoId: string,
  año: number,
  diasSolicitados: number,
  tx?: PrismaTx,
  options?: { lock?: boolean }
): Promise<{
  suficiente: boolean;
  saldoActual: number;
  mensaje?: string;
}> {
  const { diasDisponibles } = await calcularSaldoDisponible(empleadoId, año, tx, options);

  if (diasDisponibles < diasSolicitados) {
    return {
      suficiente: false,
      saldoActual: diasDisponibles,
      mensaje: `No tienes suficientes días disponibles. Disponibles: ${diasDisponibles}, solicitados: ${diasSolicitados}`,
    };
  }

  return {
    suficiente: true,
    saldoActual: diasDisponibles,
  };
}

/**
 * Actualiza el saldo de un empleado después de una acción
 */
export async function actualizarSaldo(
  empleadoId: string,
  año: number,
  accion: 'solicitar' | 'aprobar' | 'rechazar' | 'cancelar',
  diasSolicitados: number,
  tx?: PrismaTx,
  options?: { diasDesdeCarryOver?: number }
): Promise<{ diasDesdeCarryOver: number }> {
  const ejecutar = async (client: PrismaTx) => {
    let saldo = await getSaldoEmpleado(empleadoId, año, client, { lock: true });
    saldo = await limpiarCarryOverSiExpirado(saldo, client);

    const hoy = new Date();
    let diasDesdeCarryOver = 0;

    switch (accion) {
      case 'solicitar': {
        const carryInfo = obtenerCarryOverDisponible(saldo, hoy);
        if (carryInfo.disponible > 0) {
          diasDesdeCarryOver = Math.min(diasSolicitados, carryInfo.disponible);
        }

        await client.empleadoSaldoAusencias.update({
          where: { id: saldo.id },
          data: {
            diasPendientes: {
              increment: diasSolicitados,
            },
            ...(diasDesdeCarryOver > 0 && {
              carryOverPendiente: {
                increment: diasDesdeCarryOver,
              },
            }),
          },
        });
        break;
      }

      case 'aprobar': {
        const diasCarry =
          options && typeof options.diasDesdeCarryOver === 'number'
            ? Math.min(options.diasDesdeCarryOver, diasSolicitados)
            : 0;
        diasDesdeCarryOver = diasCarry;

        await client.empleadoSaldoAusencias.update({
          where: { id: saldo.id },
          data: {
            diasPendientes: {
              decrement: diasSolicitados,
            },
            diasUsados: {
              increment: diasSolicitados,
            },
            ...(diasCarry > 0 && {
              carryOverPendiente: {
                decrement: diasCarry,
              },
              carryOverUsado: {
                increment: diasCarry,
              },
            }),
          },
        });
        break;
      }

      case 'rechazar':
      case 'cancelar': {
        const diasCarry =
          options && typeof options.diasDesdeCarryOver === 'number'
            ? Math.min(options.diasDesdeCarryOver, diasSolicitados)
            : 0;
        diasDesdeCarryOver = diasCarry;

        await client.empleadoSaldoAusencias.update({
          where: { id: saldo.id },
          data: {
            diasPendientes: {
              decrement: diasSolicitados,
            },
            ...(diasCarry > 0 && {
              carryOverPendiente: {
                decrement: diasCarry,
              },
            }),
          },
        });
        break;
      }
    }

    return { diasDesdeCarryOver };
  };

  if (tx) {
    return ejecutar(tx);
  }

  return prisma.$transaction(async (transaction) => ejecutar(transaction));
}

/**
 * Calcula el solapamiento de ausencias en un equipo para un período
 */
export async function calcularSolapamientoEquipo(
  equipoId: string,
  fechaInicio: Date,
  fechaFin: Date
): Promise<
  Array<{
    fecha: Date;
    ausentes: number;
    total: number;
    porcentaje: number;
  }>
> {
  // Obtener total de miembros del equipo
  const totalEquipo = await prisma.empleado_equipos.count({
    where: { equipoId },
  });

  if (totalEquipo === 0) {
    return [];
  }

  // Obtener ausencias del equipo en el período (aprobadas o pendientes)
  const ausencias = await prisma.ausencias.findMany({
    where: {
      equipoId,
      estado: {
        in: [EstadoAusencia.pendiente, EstadoAusencia.confirmada, EstadoAusencia.completada],
      },
      OR: [
        {
          AND: [
            { fechaInicio: { lte: fechaFin } },
            { fechaFin: { gte: fechaInicio } },
          ],
        },
      ],
    },
    select: {
      fechaInicio: true,
      fechaFin: true,
    },
  });

  // Calcular solapamiento por cada día
  const solapamientos: Array<{
    fecha: Date;
    ausentes: number;
    total: number;
    porcentaje: number;
  }> = [];

  const fecha = new Date(fechaInicio);
  const fechaFinDate = new Date(fechaFin);

  while (fecha <= fechaFinDate) {
    // Contar cuántos están ausentes este día
    const ausentesEsteDia = ausencias.filter(
      (a) =>
        new Date(a.fechaInicio) <= fecha && new Date(a.fechaFin) >= fecha
    ).length;

    const porcentaje = (ausentesEsteDia / totalEquipo) * 100;

    solapamientos.push({
      fecha: new Date(fecha),
      ausentes: ausentesEsteDia,
      total: totalEquipo,
      porcentaje: Math.round(porcentaje),
    });

    fecha.setDate(fecha.getDate() + 1);
  }

  return solapamientos;
}

/**
 * Obtiene la disponibilidad de cada día para el calendario inteligente
 * Usa la configuración de días laborables de la empresa
 */
export async function getDisponibilidadCalendario(
  equipoId: string,
  fechaInicio: Date,
  fechaFin: Date,
  empresaId: string
): Promise<
  Array<{
    fecha: Date;
    estado: 'muy_disponible' | 'disponible' | 'poco_disponible' | 'no_disponible';
    porcentaje: number;
    esFestivo: boolean;
    esNoLaborable: boolean; // Calculado del calendario laboral (inverso de esLaborable)
    esLaborable: boolean;
  }>
> {
  // Obtener solapamiento
  const solapamiento = await calcularSolapamientoEquipo(equipoId, fechaInicio, fechaFin);

  const [festivos, diasLaborablesConfig] = await Promise.all([
    getFestivosActivosEnRango(empresaId, fechaInicio, fechaFin),
    getDiasLaborablesEmpresa(empresaId),
  ]);
  const festivosSet = crearSetFestivos(festivos);

  // Obtener política del equipo si existe
  const politica = await prisma.equipo_politica_ausencias.findUnique({
    where: { equipoId },
  });
  const maxSolapamientoPct = politica?.maxSolapamientoPct || 50;

  return await Promise.all(solapamiento.map(async (s) => {
    const esFest = festivosSet.has(formatearClaveFecha(s.fecha));
    const esLaborable = await esDiaLaborable(s.fecha, empresaId, diasLaborablesConfig, festivosSet);

    let estado: 'muy_disponible' | 'disponible' | 'poco_disponible' | 'no_disponible';

    // Usar el umbral de la política del equipo o 50% por defecto
    if (esFest || !esLaborable || s.porcentaje > maxSolapamientoPct) {
      estado = 'no_disponible';
    } else if (s.porcentaje >= maxSolapamientoPct * 0.8) {
      estado = 'poco_disponible';
    } else if (s.porcentaje >= maxSolapamientoPct * 0.5) {
      estado = 'disponible';
    } else {
      estado = 'muy_disponible';
    }

    return {
      fecha: s.fecha,
      estado,
      porcentaje: s.porcentaje,
      esFestivo: esFest,
      esNoLaborable: !esLaborable, // ✅ Calculado del calendario laboral (no hardcoded)
      esLaborable,
    };
  }));
}

/**
 * Obtiene la política de ausencias de un equipo
 */
export async function getPoliticaEquipo(equipoId: string | null) {
  if (!equipoId) {
    return null;
  }

  return await prisma.equipo_politica_ausencias.findUnique({
    where: { equipoId },
  });
}

/**
 * Valida si una ausencia cumple con la política de antelación mínima del equipo
 * Solo aplica a ausencias que requieren aprobación (vacaciones y "otro")
 */
export async function validarAntelacion(
  equipoId: string | null,
  fechaInicio: Date,
  tipoAusencia: string // 'vacaciones', 'enfermedad', 'enfermedad_familiar', 'maternidad_paternidad', 'otro'
): Promise<{
  valida: boolean;
  mensaje?: string;
  diasAntelacion?: number;
  requiereDias?: number;
}> {
  // Solo aplicar antelación a tipos que requieren aprobación
  const tiposQueRequierenAprobacion = ['vacaciones', 'otro'];
  if (!tiposQueRequierenAprobacion.includes(tipoAusencia)) {
    return { valida: true };
  }

  if (!equipoId) {
    // Sin equipo, no hay restricción de antelación
    return { valida: true };
  }

  const politica = await getPoliticaEquipo(equipoId);
  
  if (!politica || !politica.requiereAntelacionDias) {
    return { valida: true };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const fechaInicioDate = new Date(fechaInicio);
  fechaInicioDate.setHours(0, 0, 0, 0);

  const diffTime = fechaInicioDate.getTime() - hoy.getTime();
  const diasAntelacion = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diasAntelacion < politica.requiereAntelacionDias) {
    return {
      valida: false,
      mensaje: `La solicitud debe realizarse con al menos ${politica.requiereAntelacionDias} días de antelación. Faltan ${diasAntelacion} días.`,
      diasAntelacion,
      requiereDias: politica.requiereAntelacionDias,
    };
  }

  return {
    valida: true,
    diasAntelacion,
    requiereDias: politica.requiereAntelacionDias,
  };
}

/**
 * Valida si una ausencia cumple con la política de solapamiento máximo del equipo
 */
export async function validarSolapamientoMaximo(
  equipoId: string | null,
  fechaInicio: Date,
  fechaFin: Date,
  excluirAusenciaId?: string // Para excluir la ausencia actual en caso de edición
): Promise<{
  valida: boolean;
  mensaje?: string;
  maxPorcentaje?: number;
  fechaProblema?: Date;
}> {
  if (!equipoId) {
    // Sin equipo, no hay restricción de solapamiento
    return { valida: true };
  }

  const politica = await getPoliticaEquipo(equipoId);
  
  if (!politica) {
    return { valida: true };
  }

  const totalEquipo = await prisma.empleado_equipos.count({
    where: { equipoId },
  });

  if (totalEquipo === 0) {
    return { valida: true, maxPorcentaje: politica.maxSolapamientoPct };
  }

  const ausenciasEquipo = await prisma.ausencias.findMany({
    where: {
      equipoId,
      estado: {
        in: [EstadoAusencia.pendiente, EstadoAusencia.confirmada, EstadoAusencia.completada],
      },
      ...(excluirAusenciaId && { id: { not: excluirAusenciaId } }),
      OR: [
        {
          AND: [
            { fechaInicio: { lte: fechaFin } },
            { fechaFin: { gte: fechaInicio } },
          ],
        },
      ],
    },
    select: {
      fechaInicio: true,
      fechaFin: true,
    },
  });

  const fecha = new Date(fechaInicio);
  const fechaFinDate = new Date(fechaFin);

  while (fecha <= fechaFinDate) {
    const ausentesEsteDia = ausenciasEquipo.filter(
      (a) =>
        new Date(a.fechaInicio) <= fecha && new Date(a.fechaFin) >= fecha
    ).length;

    const porcentaje = ((ausentesEsteDia + 1) / totalEquipo) * 100;

    if (porcentaje > politica.maxSolapamientoPct) {
      return {
        valida: false,
        mensaje: `El solapamiento máximo permitido es ${politica.maxSolapamientoPct}%. En la fecha ${fecha.toLocaleDateString('es-ES')} habría ${Math.round(porcentaje)}% del equipo ausente.`,
        maxPorcentaje: politica.maxSolapamientoPct,
        fechaProblema: new Date(fecha),
      };
    }

    fecha.setDate(fecha.getDate() + 1);
  }

  return { valida: true, maxPorcentaje: politica.maxSolapamientoPct };
}


/**
 * Valida todas las políticas de ausencia de un equipo
 */
export async function validarPoliticasEquipo(
  equipoId: string | null,
  empleadoId: string,
  fechaInicio: Date,
  fechaFin: Date,
  tipoAusencia: string, // Necesario para determinar si requiere aprobación
  excluirAusenciaId?: string
): Promise<{
  valida: boolean;
  errores: string[];
}> {
  const errores: string[] = [];

  // Validar antelación (solo para tipos que requieren aprobación)
  const validacionAntelacion = await validarAntelacion(equipoId, fechaInicio, tipoAusencia);
  if (!validacionAntelacion.valida) {
    errores.push(validacionAntelacion.mensaje || 'No cumple con la antelación mínima requerida');
  }

  // Validar solapamiento máximo (solo para vacaciones)
  if (tipoAusencia === 'vacaciones') {
    const validacionSolapamiento = await validarSolapamientoMaximo(
      equipoId,
      fechaInicio,
      fechaFin,
      excluirAusenciaId
    );
    if (!validacionSolapamiento.valida) {
      errores.push(validacionSolapamiento.mensaje || 'Excede el solapamiento máximo permitido');
    }
  }

  return {
    valida: errores.length === 0,
    errores,
  };
}

