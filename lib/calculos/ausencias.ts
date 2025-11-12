// ========================================
// Lógica de cálculo para Ausencias
// ========================================

import { prisma } from '@/lib/prisma';
import {
  crearSetFestivos,
  esDiaLaborable,
  formatearClaveFecha,
  getDiasLaborablesEmpresa,
  getFestivosActivosEnRango,
} from './dias-laborables';

import { EstadoAusencia } from '@/lib/constants/enums';

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
 * Calcula los días solicitados excluyendo días no laborables (según config empresa) y festivos
 * 
 * @param fechaInicio Fecha de inicio de la ausencia
 * @param fechaFin Fecha de fin de la ausencia
 * @param empresaId ID de la empresa (para obtener festivos y config días laborables)
 * @param medioDia Si es medio día (divide el resultado por 2)
 * @returns Número de días laborables solicitados
 */
export async function calcularDiasSolicitados(
  fechaInicio: Date,
  fechaFin: Date,
  empresaId: string,
  medioDia: boolean = false
): Promise<number> {
  const [diasLaborables, festivos] = await Promise.all([
    getDiasLaborablesEmpresa(empresaId),
    getFestivosActivosEnRango(empresaId, fechaInicio, fechaFin),
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
 * Calcula los días naturales y laborables entre dos fechas
 * Usa la configuración de días laborables de la empresa y festivos
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

  const [diasLaborablesConfig, festivos] = await Promise.all([
    getDiasLaborablesEmpresa(empresaId),
    getFestivosActivosEnRango(empresaId, fechaInicio, fechaFin),
  ]);
  const festivosSet = crearSetFestivos(festivos);

  // Contar días laborables y solicitados según configuración de empresa
  let diasLaborables = 0;
  let diasSolicitados = 0;
  const fecha = new Date(fechaInicio);
  const fechaFinDate = new Date(fechaFin);

  while (fecha <= fechaFinDate) {
    // Verificar si el día de la semana es laborable según configuración
    const diaSemana = fecha.getDay();
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
 * Recalcula desde las ausencias reales para mantener sincronización
 */
export async function calcularSaldoDisponible(empleadoId: string, año: number): Promise<{
  diasTotales: number;
  diasUsados: number;
  diasPendientes: number;
  diasDisponibles: number;
}> {
  const saldo = await getSaldoEmpleado(empleadoId, año);

  // Recalcular desde ausencias reales para mantener sincronización
  const ausencias = await prisma.ausencia.findMany({
    where: {
      empleadoId,
      descuentaSaldo: true, // Solo contar ausencias que descuentan saldo (vacaciones)
      fechaInicio: {
        gte: new Date(`${año}-01-01`),
        lt: new Date(`${año + 1}-01-01`),
      },
    },
  });

  // Días usados: ausencias aprobadas y disfrutadas
  const diasUsados = ausencias
    .filter((a) => a.estado === EstadoAusencia.confirmada || a.estado === EstadoAusencia.completada)
    .reduce((sum, a) => sum + Number(a.diasSolicitados), 0);

  // Días pendientes: ausencias esperando aprobación
  const diasPendientes = ausencias
    .filter((a) => a.estado === EstadoAusencia.pendiente)
    .reduce((sum, a) => sum + Number(a.diasSolicitados), 0);

  const diasDisponibles = saldo.diasTotales - diasUsados - diasPendientes;

  return {
    diasTotales: saldo.diasTotales,
    diasUsados,
    diasPendientes,
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
  const politica = await prisma.equipoPoliticaAusencias.findUnique({
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

  return await prisma.equipoPoliticaAusencias.findUnique({
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

  const solapamiento = await calcularSolapamientoEquipo(equipoId, fechaInicio, fechaFin);

  // Si es una edición, excluir la ausencia actual del cálculo
  if (excluirAusenciaId) {
    // Obtener la ausencia actual para restar su solapamiento
    const ausenciaActual = await prisma.ausencia.findUnique({
      where: { id: excluirAusenciaId },
      select: { fechaInicio: true, fechaFin: true },
    });

    if (ausenciaActual) {
      // Ajustar el cálculo restando la ausencia actual
      // Esto se puede hacer ajustando el conteo, pero por simplicidad
      // recalculamos sin esa ausencia
      const ausenciasEquipo = await prisma.ausencia.findMany({
        where: {
          equipoId,
          estado: {
            in: [EstadoAusencia.pendiente, EstadoAusencia.confirmada, EstadoAusencia.completada],
          },
          id: { not: excluirAusenciaId },
          OR: [
            {
              AND: [
                { fechaInicio: { lte: fechaFin } },
                { fechaFin: { gte: fechaInicio } },
              ],
            },
          ],
        },
      });

      const totalEquipo = await prisma.empleadoEquipo.count({
        where: { equipoId },
      });

      if (totalEquipo > 0) {
        // Recalcular solapamiento día por día
        const fecha = new Date(fechaInicio);
        const fechaFinDate = new Date(fechaFin);

        while (fecha <= fechaFinDate) {
          const ausentesEsteDia = ausenciasEquipo.filter(
            (a) =>
              new Date(a.fechaInicio) <= fecha && new Date(a.fechaFin) >= fecha
          ).length;

          // Agregar 1 por la ausencia que se está solicitando
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
      }
    }
  } else {
    // Nueva ausencia: verificar solapamiento incluyendo esta
    const totalEquipo = await prisma.empleadoEquipo.count({
      where: { equipoId },
    });

    if (totalEquipo === 0) {
      return { valida: true, maxPorcentaje: politica.maxSolapamientoPct };
    }

    // Recalcular día por día incluyendo la nueva ausencia
    const fecha = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);

    while (fecha <= fechaFinDate) {
      // Contar ausentes este día (sin incluir la nueva)
      const ausentesEsteDia = solapamiento.find(
        (s) => s.fecha.toDateString() === fecha.toDateString()
      )?.ausentes || 0;

      // Agregar 1 por la nueva ausencia
      const porcentajeConNueva = ((ausentesEsteDia + 1) / totalEquipo) * 100;

      if (porcentajeConNueva > politica.maxSolapamientoPct) {
        return {
          valida: false,
          mensaje: `El solapamiento máximo permitido es ${politica.maxSolapamientoPct}%. En la fecha ${fecha.toLocaleDateString('es-ES')} habría ${Math.round(porcentajeConNueva)}% del equipo ausente (${ausentesEsteDia + 1} de ${totalEquipo} miembros).`,
          maxPorcentaje: politica.maxSolapamientoPct,
          fechaProblema: new Date(fecha),
        };
      }

      fecha.setDate(fecha.getDate() + 1);
    }
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

