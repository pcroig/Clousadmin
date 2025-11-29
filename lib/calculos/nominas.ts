// ========================================
// Cálculos de Nóminas
// ========================================
// Funciones para calcular resúmenes mensuales pre-nómina

import { EstadoAusencia, EstadoFichaje } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { redondearHoras } from '@/lib/utils/numeros';

import {
  crearSetFestivos,
  esDiaLaborableSync,
  getDiasLaborablesEmpresa,
  getFestivosActivosEnRango,
} from './dias-laborables';

/**
 * Tipo de retorno para el resumen mensual
 */
export interface ResumenMensual {
  empresaId: string;
  empleadoId: string;
  mes: number;
  anio: number;
  diasLaborables: number;
  diasTrabajados: number;
  diasVacaciones: number;
  diasBajaIT: number;
  diasPermisosRetribuidos: number;
  diasPermisosNoRetribuidos: number;
  horasTrabajadas: number;
  horasExtras: number;
  salarioBase: number | null;
}

/**
 * Calcula los días laborables de un mes
 * Excluye sábados, domingos y festivos
 */
export async function calcularDiasLaborablesMes(
  empresaId: string,
  mes: number,
  anio: number
): Promise<number> {
  const fechaInicio = new Date(anio, mes - 1, 1);
  const fechaFin = new Date(anio, mes, 0);

  const [diasLaborablesConfig, festivos] = await Promise.all([
    getDiasLaborablesEmpresa(empresaId),
    getFestivosActivosEnRango(empresaId, fechaInicio, fechaFin),
  ]);
  const festivosSet = crearSetFestivos(festivos);

  let diasLaborables = 0;

  const fecha = new Date(fechaInicio);

  while (fecha <= fechaFin) {
    // Verificar si el día es laborable (versión síncrona para evitar N+1 queries)
    if (esDiaLaborableSync(fecha, diasLaborablesConfig, festivosSet)) {
      diasLaborables++;
    }
    fecha.setDate(fecha.getDate() + 1);
  }

  return diasLaborables;
}

/**
 * Calcula los días trabajados de un empleado en un mes
 * Cuenta fichajes completos (estado='finalizado')
 */
export async function calcularDiasTrabajados(
  empleadoId: string,
  mes: number,
  anio: number
): Promise<number> {
  // Primer día del mes
  const fechaInicio = new Date(anio, mes - 1, 1);
  fechaInicio.setHours(0, 0, 0, 0);
  
  // Último día del mes
  const fechaFin = new Date(anio, mes, 0);
  fechaFin.setHours(23, 59, 59, 999);

  const fichajes = await prisma.fichaje.count({
    where: {
      empleadoId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
      estado: EstadoFichaje.finalizado,
    },
  });

  return fichajes;
}

/**
 * Calcula las ausencias por tipo de un empleado en un mes
 */
export async function calcularAusenciasPorTipo(
  empleadoId: string,
  mes: number,
  anio: number
): Promise<{
  diasVacaciones: number;
  diasBajaIT: number;
  diasPermisosRetribuidos: number;
  diasPermisosNoRetribuidos: number;
}> {
  // Primer día del mes
  const fechaInicio = new Date(anio, mes - 1, 1);
  fechaInicio.setHours(0, 0, 0, 0);
  
  // Último día del mes
  const fechaFin = new Date(anio, mes, 0);
  fechaFin.setHours(23, 59, 59, 999);

  // Obtener todas las ausencias del mes (completadas o en curso)
  const ausencias = await prisma.ausencia.findMany({
    where: {
      empleadoId,
      estado: {
        in: [EstadoAusencia.completada, EstadoAusencia.confirmada],
      },
      OR: [
        // Ausencias que empiezan en el mes
        {
          fechaInicio: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        // Ausencias que terminan en el mes
        {
          fechaFin: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        // Ausencias que abarcan todo el mes
        {
          AND: [
            { fechaInicio: { lte: fechaInicio } },
            { fechaFin: { gte: fechaFin } },
          ],
        },
      ],
    },
    select: {
      tipo: true,
      fechaInicio: true,
      fechaFin: true,
      diasSolicitados: true,
    },
  });

  let diasVacaciones = 0;
  let diasBajaIT = 0;
  let diasPermisosRetribuidos = 0;
  const diasPermisosNoRetribuidos = 0;

  for (const ausencia of ausencias) {
    // Calcular cuántos días de esta ausencia caen en el mes actual
    const inicioAusencia = ausencia.fechaInicio > fechaInicio ? ausencia.fechaInicio : fechaInicio;
    const finAusencia = ausencia.fechaFin < fechaFin ? ausencia.fechaFin : fechaFin;

    // Calcular días laborables entre las fechas ajustadas
    const diffTime = finAusencia.getTime() - inicioAusencia.getTime();
    const diasEnMes = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Proporcionar los días según el tipo
    const diasDelMes = Math.min(Number(ausencia.diasSolicitados), diasEnMes);

    switch (ausencia.tipo) {
      case 'vacaciones':
        diasVacaciones += diasDelMes;
        break;
      case 'enfermedad':
        diasBajaIT += diasDelMes;
        break;
      case 'enfermedad_familiar':
        diasPermisosRetribuidos += diasDelMes;
        break;
      case 'maternidad_paternidad':
        diasBajaIT += diasDelMes;
        break;
      case 'otro':
        // Asumir permiso retribuido por defecto
        diasPermisosRetribuidos += diasDelMes;
        break;
    }
  }

  return {
    diasVacaciones,
    diasBajaIT,
    diasPermisosRetribuidos,
    diasPermisosNoRetribuidos,
  };
}

/**
 * Calcula las horas trabajadas y extras de un empleado en un mes
 */
export async function calcularHorasMensuales(
  empleadoId: string,
  mes: number,
  anio: number
): Promise<{
  horasTrabajadas: number;
  horasExtras: number;
}> {
  // Primer día del mes
  const fechaInicio = new Date(anio, mes - 1, 1);
  fechaInicio.setHours(0, 0, 0, 0);
  
  // Último día del mes
  const fechaFin = new Date(anio, mes, 0);
  fechaFin.setHours(23, 59, 59, 999);

  const fichajes = await prisma.fichaje.findMany({
    where: {
      empleadoId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
      estado: EstadoFichaje.finalizado,
    },
    select: {
      horasTrabajadas: true,
    },
  });

  let horasTrabajadas = 0;
  let horasExtras = 0;

  for (const fichaje of fichajes) {
    const horas = Number(fichaje.horasTrabajadas || 0);
    horasTrabajadas += horas;

    // Si trabajó más de 8 horas en el día, contar como extras
    if (horas > 8) {
      horasExtras += horas - 8;
    }
  }

  return {
    horasTrabajadas: redondearHoras(horasTrabajadas),
    horasExtras: redondearHoras(horasExtras),
  };
}

/**
 * Calcula el resumen mensual completo de un empleado
 * Guarda/actualiza en la tabla ResumenMensualNomina
 */
export async function calcularResumenMensual(
  empresaId: string,
  empleadoId: string,
  mes: number,
  anio: number
): Promise<ResumenMensual> {

  // Obtener datos del empleado
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    select: {
      salarioBaseMensual: true,
    },
  });

  // Calcular todos los datos
  const [
    diasLaborables,
    diasTrabajados,
    ausencias,
    horas,
  ] = await Promise.all([
    calcularDiasLaborablesMes(empresaId, mes, anio),
    calcularDiasTrabajados(empleadoId, mes, anio),
    calcularAusenciasPorTipo(empleadoId, mes, anio),
    calcularHorasMensuales(empleadoId, mes, anio),
  ]);

  const resumen: ResumenMensual = {
    empresaId,
    empleadoId,
    mes,
    anio,
    diasLaborables,
    diasTrabajados,
    diasVacaciones: ausencias.diasVacaciones,
    diasBajaIT: ausencias.diasBajaIT,
    diasPermisosRetribuidos: ausencias.diasPermisosRetribuidos,
    diasPermisosNoRetribuidos: ausencias.diasPermisosNoRetribuidos,
    horasTrabajadas: horas.horasTrabajadas,
    horasExtras: horas.horasExtras,
    salarioBase: empleado?.salarioBaseMensual ? Number(empleado.salarioBaseMensual) : null,
  };

  // Guardar/actualizar en la base de datos
  await prisma.resumenMensualNomina.upsert({
    where: {
      empresaId_empleadoId_mes_anio: {
        empresaId,
        empleadoId,
        mes,
        anio,
      },
    },
    create: {
      empresaId,
      empleadoId,
      mes,
      anio,
      diasLaborables: resumen.diasLaborables,
      diasTrabajados: resumen.diasTrabajados,
      diasVacaciones: resumen.diasVacaciones,
      diasBajaIT: resumen.diasBajaIT,
      diasPermisosRetribuidos: resumen.diasPermisosRetribuidos,
      diasPermisosNoRetribuidos: resumen.diasPermisosNoRetribuidos,
      horasTrabajadas: resumen.horasTrabajadas,
      horasExtras: resumen.horasExtras,
      salarioBase: resumen.salarioBase,
    },
    update: {
      diasLaborables: resumen.diasLaborables,
      diasTrabajados: resumen.diasTrabajados,
      diasVacaciones: resumen.diasVacaciones,
      diasBajaIT: resumen.diasBajaIT,
      diasPermisosRetribuidos: resumen.diasPermisosRetribuidos,
      diasPermisosNoRetribuidos: resumen.diasPermisosNoRetribuidos,
      horasTrabajadas: resumen.horasTrabajadas,
      horasExtras: resumen.horasExtras,
      salarioBase: resumen.salarioBase,
      calculadoEn: new Date(),
    },
  });

  return resumen;
}

/**
 * Calcula el resumen mensual para todos los empleados activos de una empresa
 */
export async function calcularResumenMensualEmpresa(
  empresaId: string,
  mes: number,
  anio: number
): Promise<ResumenMensual[]> {

  // Obtener todos los empleados activos
  const empleados = await prisma.empleado.findMany({
    where: {
      empresaId,
      activo: true,
    },
    select: {
      id: true,
    },
  });

  // Calcular resumen para cada empleado
  const resumenes: ResumenMensual[] = [];
  
  for (const empleado of empleados) {
    try {
      const resumen = await calcularResumenMensual(empresaId, empleado.id, mes, anio);
      resumenes.push(resumen);
    } catch (error) {
      console.error(`[calcularResumenMensualEmpresa] Error calculando empleado ${empleado.id}:`, error);
    }
  }

  return resumenes;
}

/**
 * Obtiene el resumen mensual de un empleado (desde cache o calcula)
 */
export async function obtenerResumenMensual(
  empresaId: string,
  empleadoId: string,
  mes: number,
  anio: number
): Promise<ResumenMensual | null> {
  // Intentar obtener desde cache
  const resumen = await prisma.resumenMensualNomina.findUnique({
    where: {
      empresaId_empleadoId_mes_anio: {
        empresaId,
        empleadoId,
        mes,
        anio,
      },
    },
  });

  if (resumen) {
    return {
      empresaId: resumen.empresaId,
      empleadoId: resumen.empleadoId,
      mes: resumen.mes,
      anio: resumen.anio,
      diasLaborables: resumen.diasLaborables,
      diasTrabajados: resumen.diasTrabajados,
      diasVacaciones: resumen.diasVacaciones,
      diasBajaIT: resumen.diasBajaIT,
      diasPermisosRetribuidos: resumen.diasPermisosRetribuidos,
      diasPermisosNoRetribuidos: resumen.diasPermisosNoRetribuidos,
      horasTrabajadas: Number(resumen.horasTrabajadas),
      horasExtras: Number(resumen.horasExtras),
      salarioBase: resumen.salarioBase ? Number(resumen.salarioBase) : null,
    };
  }

  // Si no existe en cache, calcular
  return calcularResumenMensual(empresaId, empleadoId, mes, anio);
}

/**
 * Obtiene los resúmenes mensuales de todos los empleados activos
 */
export async function obtenerResumenesMensuales(
  empresaId: string,
  mes: number,
  anio: number
): Promise<ResumenMensual[]> {
  const resumenes = await prisma.resumenMensualNomina.findMany({
    where: {
      empresaId,
      mes,
      anio,
    },
    include: {
      empleado: {
        select: {
          activo: true,
        },
      },
    },
  });

  // Filtrar solo empleados activos
  return resumenes
    .filter(r => r.empleado.activo)
    .map(r => ({
      empresaId: r.empresaId,
      empleadoId: r.empleadoId,
      mes: r.mes,
      anio: r.anio,
      diasLaborables: r.diasLaborables,
      diasTrabajados: r.diasTrabajados,
      diasVacaciones: r.diasVacaciones,
      diasBajaIT: r.diasBajaIT,
      diasPermisosRetribuidos: r.diasPermisosRetribuidos,
      diasPermisosNoRetribuidos: r.diasPermisosNoRetribuidos,
      horasTrabajadas: Number(r.horasTrabajadas),
      horasExtras: Number(r.horasExtras),
      salarioBase: r.salarioBase ? Number(r.salarioBase) : null,
    }));
}

