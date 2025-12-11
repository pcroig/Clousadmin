// ========================================
// Generación de Pre-nóminas
// ========================================
// Servicio para COMPLETAR CÁLCULOS de nóminas base existentes
// ⚠️ NO CREA NÓMINAS - Las nóminas se crean al crear el evento

import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { prisma } from '@/lib/prisma';
import { normalizarFechaSinHora } from '@/lib/utils/fechas';

const SEMANAS_POR_MES = 52 / 12;
const HORAS_SEMANALES_DEFAULT = 40;

type EmpleadoParaPrenomina = {
  id: string;
  salarioBaseMensual: Prisma.Decimal | null;
  salarioBaseAnual: Prisma.Decimal | null;
  jornada: {
    horasSemanales: Prisma.Decimal | null;
  } | null;
  contratos: Array<{
    id: string;
    salarioBaseAnual: Prisma.Decimal | null;
    tipoPagas: number;
    fechaInicio: Date;
    fechaFin: Date | null;
  }>;
  complementos: Array<{
    id: string;
    importePersonalizado: Prisma.Decimal;
    esImporteFijo: boolean;
  }>;
  ausencias: Array<{
    fechaInicio: Date;
    fechaFin: Date;
  }>;
};

type NominaExistente = Prisma.nominasGetPayload<{
  select: {
    id: true;
    empleadoId: true;
    eventoNominaId: true;
    salarioBase: true;
    totalComplementos: true;
    totalBruto: true;
    totalNeto: true;
    complementosPendientes: true;
  };
}>;

type CompensacionPendiente = Prisma.compensaciones_horas_extraGetPayload<{
  select: {
    id: true;
    empleadoId: true;
    horasBalance: true;
  };
}>;

interface GenerarPrenominasOptions {
  eventoId: string;
  empresaId: string;
  mes: number;
  anio: number;
}

export interface GenerarPrenominasResult {
  totalProcesados: number;
  nominasActualizadas: number; // Renombrado de prenominasVinculadas para claridad
  compensacionesAsignadas: number;
  empleadosConComplementos: number;
  complementosConfigurados: number;
}

/**
 * Completa los cálculos finales de nóminas base existentes
 *
 * Responsabilidades:
 * ✅ Calcular totalComplementos (suma de complementos activos)
 * ✅ Asignar compensaciones de horas extra aprobadas
 * ✅ Calcular totalBruto final (salarioBase + complementos + compensaciones)
 * ✅ Actualizar estado a "completada" si no hay pendientes
 *
 * NO hace:
 * ❌ NO crea nóminas (se crean al crear el evento)
 * ❌ NO calcula salarioBase (ya calculado en nómina base)
 * ❌ NO calcula días trabajados/ausencias (ya calculados)
 * ❌ NO genera alertas (ya generadas en nómina base)
 */
export async function generarPrenominasEvento(
  options: GenerarPrenominasOptions
): Promise<GenerarPrenominasResult> {
  const { eventoId, empresaId, mes, anio } = options;

  // Calcular rango del mes (normalizado a UTC para consistencia con BD)
  const inicioMes = normalizarFechaSinHora(new Date(anio, mes - 1, 1));
  const finMes = normalizarFechaSinHora(new Date(anio, mes, 0));
  finMes.setHours(23, 59, 59, 999);

  const empleadosRaw = await prisma.empleados.findMany({
    where: {
      empresaId,
      activo: true,
    },
    select: {
      id: true,
      salarioBaseMensual: true,
      salarioBaseAnual: true,
      jornadaId: true,
      equipos: {
        select: {
          equipoId: true,
        },
      },
      contratos: {
        where: {
          fechaInicio: {
            lte: finMes,
          },
          OR: [
            { fechaFin: null },
            {
              fechaFin: {
                gte: inicioMes,
              },
            },
          ],
        },
        orderBy: {
          fechaInicio: 'desc',
        },
        take: 1,
        select: {
          id: true,
          salarioBaseAnual: true,
          tipoPagas: true,
          fechaInicio: true,
          fechaFin: true,
        },
      },
      empleado_complementos: {
        where: {
          activo: true,
        },
        select: {
          id: true,
          importePersonalizado: true,
          esImporteFijo: true,
        },
      },
      ausencias: {
        where: {
          estado: {
            in: ['confirmada', 'completada'],
          },
          fechaInicio: {
            lte: finMes,
          },
          fechaFin: {
            gte: inicioMes,
          },
        },
        select: {
          fechaInicio: true,
          fechaFin: true,
        },
      },
    },
  });

  // Resolver jornadas efectivas para todos los empleados (optimizado en batch)
  const { resolverJornadasBatch } = await import('@/lib/jornadas/resolver-batch');
  const jornadasResueltasBatch = await resolverJornadasBatch(empleadosRaw);

  // Convertir al formato esperado (solo horasSemanales)
  const jornadasResueltas = new Map<string, { horasSemanales: Prisma.Decimal | null }>();
  for (const [empleadoId, jornada] of jornadasResueltasBatch.entries()) {
    jornadasResueltas.set(empleadoId, {
      horasSemanales: jornada.horasSemanales,
    });
  }

  const empleados: EmpleadoParaPrenomina[] = empleadosRaw.map((empleado) => ({
    id: empleado.id,
    salarioBaseMensual: empleado.salarioBaseMensual,
    salarioBaseAnual: empleado.salarioBaseAnual,
    jornada: jornadasResueltas.get(empleado.id) || null,
    contratos: empleado.contratos,
    complementos: empleado.empleado_complementos.map((comp) => ({
      id: comp.id,
      importePersonalizado: comp.importePersonalizado,
      esImporteFijo: comp.esImporteFijo,
    })),
    ausencias: empleado.ausencias,
  }));

  if (empleados.length === 0) {
    await prisma.eventos_nomina.update({
      where: { id: eventoId },
      data: {
        totalEmpleados: 0,
        empleadosConComplementos: 0,
        complementosAsignados: 0,
      },
    });

    return {
      totalProcesados: 0,
      nominasActualizadas: 0,
      compensacionesAsignadas: 0,
      empleadosConComplementos: 0,
      complementosConfigurados: 0,
    };
  }

  const empleadoIds = empleados.map((empleado) => empleado.id);

  const [nominasExistentes, compensacionesPendientes] = await Promise.all([
    prisma.nominas.findMany({
      where: {
        empleadoId: { in: empleadoIds },
        mes,
        anio,
      },
      select: {
        id: true,
        empleadoId: true,
        eventoNominaId: true,
        salarioBase: true,
        totalComplementos: true,
        totalBruto: true,
        totalNeto: true,
        complementosPendientes: true,
      },
    }),
    prisma.compensaciones_horas_extra.findMany({
      where: {
        empresaId,
        empleadoId: { in: empleadoIds },
        tipoCompensacion: 'nomina',
        estado: 'aprobada',
        nominaId: null,
      },
      select: {
        id: true,
        empleadoId: true,
        horasBalance: true,
      },
    }),
  ]);

  const nominasPorEmpleado = new Map<string, NominaExistente>();
  nominasExistentes.forEach((nomina) => {
    nominasPorEmpleado.set(nomina.empleadoId, nomina);
  });

  const compensacionesPorEmpleado = new Map<string, CompensacionPendiente[]>();
  compensacionesPendientes.forEach((compensacion) => {
    const lista = compensacionesPorEmpleado.get(compensacion.empleadoId) ?? [];
    lista.push(compensacion);
    compensacionesPorEmpleado.set(compensacion.empleadoId, lista);
  });

  let nominasActualizadas = 0;
  let compensacionesAsignadas = 0;
  let empleadosConComplementos = 0;
  let complementosConfigurados = 0;

  // ✅ NUEVA LÓGICA: Solo actualizar nóminas existentes
  for (const empleado of empleados) {
    const nominaExistente = nominasPorEmpleado.get(empleado.id);

    // ⚠️ Si no existe nómina base, es un ERROR (deberían haberse creado al crear el evento)
    if (!nominaExistente) {
      console.warn(
        `[generarPrenominasEvento] Nómina no encontrada para empleado ${empleado.id}. ` +
        `Las nóminas base deberían haberse creado al crear el evento.`
      );
      continue;
    }

    // Contar complementos
    if (empleado.complementos.length > 0) {
      empleadosConComplementos += 1;
      complementosConfigurados += empleado.complementos.length;
    }

    // Calcular complementos (suma de importes fijos + variables validados)
    const totalComplementosCalculados = empleado.complementos.reduce(
      (sum, comp) => sum.plus(new Decimal(comp.importePersonalizado || 0)),
      new Decimal(0)
    );

    // Calcular compensaciones de horas extra
    const compensacionesEmpleado = compensacionesPorEmpleado.get(empleado.id) ?? [];
    const horasTotalesCompensadas = compensacionesEmpleado.reduce(
      (acc, item) => acc.plus(new Decimal(item.horasBalance)),
      new Decimal(0)
    );

    // Calcular salario mensual para la fórmula de compensación
    const contratoVigente = empleado.contratos[0];
    const salarioMensual = calcularSalarioMensual(empleado, contratoVigente);

    const importeCompensaciones = calcularImporteCompensacion(
      horasTotalesCompensadas,
      salarioMensual,
      empleado.jornada?.horasSemanales
    );

    // Calcular totales finales
    const totalComplementos = totalComplementosCalculados.plus(importeCompensaciones);
    const salarioBase = new Decimal(nominaExistente.salarioBase); // Ya calculado en nómina base
    const totalBruto = salarioBase.plus(totalComplementos);
    const totalNeto = totalBruto; // Simplificado (sin deducciones por ahora)

    // Actualizar nómina con cálculos finales
    await prisma.nominas.update({
      where: { id: nominaExistente.id },
      data: {
        totalComplementos,
        totalBruto,
        totalNeto,
        estado: 'completada', // Marcar como completada (los cálculos están listos)
      },
    });

    nominasActualizadas += 1;

    // Asignar compensaciones a la nómina
    if (compensacionesEmpleado.length > 0) {
      await asignarCompensacionesANomina(compensacionesEmpleado, nominaExistente.id);
      compensacionesAsignadas += compensacionesEmpleado.length;
    }
  }

  const totalNominasEvento = await prisma.nominas.count({
    where: { eventoNominaId: eventoId },
  });

  await prisma.eventos_nomina.update({
    where: { id: eventoId },
    data: {
      prenominasGeneradas: totalNominasEvento,
      empleadosConComplementos,
      complementosAsignados: complementosConfigurados,
    },
  });

  return {
    totalProcesados: empleados.length,
    nominasActualizadas,
    compensacionesAsignadas,
    empleadosConComplementos,
    complementosConfigurados,
  };
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function calcularSalarioMensual(
  empleado: Pick<EmpleadoParaPrenomina, 'salarioBaseMensual' | 'salarioBaseAnual'>,
  contrato?: { salarioBaseAnual: Prisma.Decimal | null; tipoPagas: number }
): Decimal {
  if (contrato?.salarioBaseAnual) {
    const numPagas = contrato.tipoPagas || 12;
    return new Decimal(contrato.salarioBaseAnual)
      .div(numPagas)
      .toDecimalPlaces(2);
  }

  if (empleado.salarioBaseMensual) {
    return new Decimal(empleado.salarioBaseMensual).toDecimalPlaces(2);
  }

  if (empleado.salarioBaseAnual) {
    return new Decimal(empleado.salarioBaseAnual).div(12).toDecimalPlaces(2);
  }

  return new Decimal(0);
}

/**
 * Calcula días de ausencias con normalización de fechas (consistencia timezone)
 * ⚠️ Esta función ya no se usa en generar-prenominas (días se calculan en crear-nominas-base)
 * Se mantiene por compatibilidad
 */
function calcularDiasAusencias(
  ausencias: Array<{ fechaInicio: Date; fechaFin: Date }>,
  inicioMes: Date,
  finMes: Date
): number {
  return ausencias.reduce((total, ausencia) => {
    // Normalizar fechas para comparación correcta
    const ausenciaInicio = normalizarFechaSinHora(ausencia.fechaInicio);
    const ausenciaFin = normalizarFechaSinHora(ausencia.fechaFin);

    const inicio = new Date(
      Math.max(ausenciaInicio.getTime(), inicioMes.getTime())
    );
    const fin = new Date(
      Math.min(ausenciaFin.getTime(), finMes.getTime())
    );

    if (fin < inicio) {
      return total;
    }

    const dias =
      Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return total + dias;
  }, 0);
}

function calcularImporteCompensacion(
  horas: Decimal,
  salarioMensual: Decimal,
  horasSemanales?: Prisma.Decimal | null
): Decimal {
  if (horas.isZero() || salarioMensual.isZero()) {
    return new Decimal(0);
  }

  const horasSemanaNumber = horasSemanales
    ? Number(horasSemanales)
    : HORAS_SEMANALES_DEFAULT;

  if (!horasSemanaNumber || horasSemanaNumber <= 0) {
    return new Decimal(0);
  }

  const horasMensuales = new Decimal(horasSemanaNumber * SEMANAS_POR_MES);

  if (horasMensuales.isZero()) {
    return new Decimal(0);
  }

  return salarioMensual.div(horasMensuales).mul(horas).toDecimalPlaces(2);
}

async function asignarCompensacionesANomina(
  compensaciones: CompensacionPendiente[],
  nominaId: string
) {
  const ids = compensaciones.map((comp) => comp.id);
  await prisma.compensaciones_horas_extra.updateMany({
    where: {
      id: { in: ids },
    },
    data: {
      nominaId,
    },
  });
}


