// ========================================
// Lógica de cálculo para Ausencias
// ========================================

import { prisma } from '@/lib/prisma';

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
  const count = await prisma.festivo.count({
    where: {
      empresaId,
      fecha: fecha,
      activo: true,
    },
  });
  return count > 0;
}

/**
 * Obtiene todos los festivos activos de una empresa para un rango de fechas
 */
export async function getFestivos(empresaId: string, fechaInicio: Date, fechaFin: Date) {
  return await prisma.festivo.findMany({
    where: {
      empresaId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
      activo: true,
    },
    orderBy: {
      fecha: 'asc',
    },
  });
}

/**
 * Calcula los días solicitados excluyendo fines de semana y festivos
 * 
 * @param fechaInicio Fecha de inicio de la ausencia
 * @param fechaFin Fecha de fin de la ausencia
 * @param empresaId ID de la empresa (para obtener festivos)
 * @param medioDia Si es medio día (divide el resultado por 2)
 * @returns Número de días laborables solicitados
 */
export async function calcularDiasSolicitados(
  fechaInicio: Date,
  fechaFin: Date,
  empresaId: string,
  medioDia: boolean = false
): Promise<number> {
  // Obtener festivos de la empresa en el rango
  const festivos = await getFestivos(empresaId, fechaInicio, fechaFin);
  const festivosDates = festivos.map(f => f.fecha.toDateString());

  let dias = 0;
  let fecha = new Date(fechaInicio);
  const fechaFinDate = new Date(fechaFin);

  while (fecha <= fechaFinDate) {
    // Excluir fines de semana
    if (!esFinDeSemana(fecha)) {
      // Excluir festivos
      if (!festivosDates.includes(fecha.toDateString())) {
        dias++;
      }
    }
    fecha.setDate(fecha.getDate() + 1);
  }

  return medioDia ? dias * 0.5 : dias;
}

/**
 * Calcula los días naturales y laborables entre dos fechas
 */
export async function calcularDias(
  fechaInicio: Date,
  fechaFin: Date,
  empresaId: string
): Promise<{
  diasNaturales: number;
  diasLaborables: number;
  diasSolicitados: number;
}> {
  // Días naturales (todos los días incluyendo fines de semana)
  const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
  const diasNaturales = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir el día de inicio

  // Obtener festivos
  const festivos = await getFestivos(empresaId, fechaInicio, fechaFin);
  const festivosDates = festivos.map(f => f.fecha.toDateString());

  // Contar días laborables (excluyendo solo fines de semana, incluyendo festivos)
  let diasLaborables = 0;
  let diasSolicitados = 0;
  let fecha = new Date(fechaInicio);
  const fechaFinDate = new Date(fechaFin);

  while (fecha <= fechaFinDate) {
    const esFinde = esFinDeSemana(fecha);
    const esFest = festivosDates.includes(fecha.toDateString());

    if (!esFinde) {
      diasLaborables++;
      if (!esFest) {
        diasSolicitados++;
      }
    }
    fecha.setDate(fecha.getDate() + 1);
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
export async function getSaldoEmpleado(empleadoId: string, año: number) {
  let saldo = await prisma.empleadoSaldoAusencias.findFirst({
    where: {
      empleadoId,
      equipoId: null, // Saldo general
      año,
    },
  });

  // Si no existe, crear uno por defecto
  if (!saldo) {
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      select: { diasVacaciones: true, empresaId: true },
    });

    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    saldo = await prisma.empleadoSaldoAusencias.create({
      data: {
        empleadoId,
        empresaId: empleado.empresaId,
        equipoId: null,
        año,
        diasTotales: empleado.diasVacaciones,
        diasUsados: 0,
        diasPendientes: 0,
        origen: 'manual_hr',
      },
    });
  }

  return saldo;
}

/**
 * Calcula el saldo disponible de un empleado
 */
export async function calcularSaldoDisponible(empleadoId: string, año: number): Promise<{
  diasTotales: number;
  diasUsados: number;
  diasPendientes: number;
  diasDisponibles: number;
}> {
  const saldo = await getSaldoEmpleado(empleadoId, año);

  const diasDisponibles =
    saldo.diasTotales - Number(saldo.diasUsados) - Number(saldo.diasPendientes);

  return {
    diasTotales: saldo.diasTotales,
    diasUsados: Number(saldo.diasUsados),
    diasPendientes: Number(saldo.diasPendientes),
    diasDisponibles,
  };
}

/**
 * Valida si el empleado tiene saldo suficiente
 */
export async function validarSaldoSuficiente(
  empleadoId: string,
  año: number,
  diasSolicitados: number
): Promise<{
  suficiente: boolean;
  saldoActual: number;
  mensaje?: string;
}> {
  const { diasDisponibles } = await calcularSaldoDisponible(empleadoId, año);

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
  diasSolicitados: number
) {
  const saldo = await getSaldoEmpleado(empleadoId, año);

  switch (accion) {
    case 'solicitar':
      // Incrementar días pendientes
      await prisma.empleadoSaldoAusencias.update({
        where: { id: saldo.id },
        data: {
          diasPendientes: {
            increment: diasSolicitados,
          },
        },
      });
      break;

    case 'aprobar':
      // Mover días de pendientes a usados
      await prisma.empleadoSaldoAusencias.update({
        where: { id: saldo.id },
        data: {
          diasPendientes: {
            decrement: diasSolicitados,
          },
          diasUsados: {
            increment: diasSolicitados,
          },
        },
      });
      break;

    case 'rechazar':
    case 'cancelar':
      // Devolver días pendientes
      await prisma.empleadoSaldoAusencias.update({
        where: { id: saldo.id },
        data: {
          diasPendientes: {
            decrement: diasSolicitados,
          },
        },
      });
      break;
  }
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
  const totalEquipo = await prisma.empleadoEquipo.count({
    where: { equipoId },
  });

  if (totalEquipo === 0) {
    return [];
  }

  // Obtener ausencias del equipo en el período (aprobadas o pendientes)
  const ausencias = await prisma.ausencia.findMany({
    where: {
      equipoId,
      estado: {
        in: ['pendiente_aprobacion', 'en_curso', 'auto_aprobada'],
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

  let fecha = new Date(fechaInicio);
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
    esFinDeSemana: boolean;
  }>
> {
  // Obtener solapamiento
  const solapamiento = await calcularSolapamientoEquipo(equipoId, fechaInicio, fechaFin);

  // Obtener festivos
  const festivos = await getFestivos(empresaId, fechaInicio, fechaFin);
  const festivosDates = festivos.map(f => f.fecha.toDateString());

  return solapamiento.map((s) => {
    const esFinde = esFinDeSemana(s.fecha);
    const esFest = festivosDates.includes(s.fecha.toDateString());

    let estado: 'muy_disponible' | 'disponible' | 'poco_disponible' | 'no_disponible';

    if (esFest || s.porcentaje > 50) {
      estado = 'no_disponible';
    } else if (s.porcentaje >= 40) {
      estado = 'poco_disponible';
    } else if (s.porcentaje >= 25) {
      estado = 'disponible';
    } else {
      estado = 'muy_disponible';
    }

    return {
      fecha: s.fecha,
      estado,
      porcentaje: s.porcentaje,
      esFestivo: esFest,
      esFinDeSemana: esFinde,
    };
  });
}

