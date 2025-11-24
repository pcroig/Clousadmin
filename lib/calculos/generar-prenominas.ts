// ========================================
// Generación de Pre-nóminas
// ========================================
// Servicio reutilizable para crear o vincular pre-nóminas a un evento

import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { prisma } from '@/lib/prisma';

import { generarAlertasParaNomina } from './alertas-nomina';

const SEMANAS_POR_MES = 52 / 12;
const HORAS_SEMANALES_DEFAULT = 40;

type EmpleadoParaPrenomina = {
  id: string;
  salarioBrutoMensual: Prisma.Decimal | null;
  salarioBrutoAnual: Prisma.Decimal | null;
  jornada: {
    horasSemanales: Prisma.Decimal | null;
  } | null;
  contratos: Array<{
    id: string;
    salarioBrutoAnual: Prisma.Decimal | null;
    fechaInicio: Date;
    fechaFin: Date | null;
  }>;
  complementos: Array<{
    id: string;
    importePersonalizado: Prisma.Decimal | null;
    tipoComplemento: {
      importeFijo: Prisma.Decimal | null;
    } | null;
  }>;
  ausencias: Array<{
    fechaInicio: Date;
    fechaFin: Date;
  }>;
};

type NominaExistente = Prisma.NominaGetPayload<{
  select: {
    id: true;
    empleadoId: true;
    eventoNominaId: true;
    totalComplementos: true;
    totalBruto: true;
    totalNeto: true;
    complementosPendientes: true;
  };
}>;

type CompensacionPendiente = Prisma.CompensacionHoraExtraGetPayload<{
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
  prenominasCreadas: number;
  prenominasVinculadas: number;
  compensacionesAsignadas: number;
  empleadosConComplementos: number;
  complementosConfigurados: number;
}

interface DatosBaseNomina {
  salarioMensual: Decimal;
  salarioBase: Decimal;
  contratoId: string | null;
  diasTrabajados: number;
  diasAusencias: number;
  complementosPendientes: boolean;
}

export async function generarPrenominasEvento(
  options: GenerarPrenominasOptions
): Promise<GenerarPrenominasResult> {
  const { eventoId, empresaId, mes, anio } = options;

  const inicioMes = new Date(anio, mes - 1, 1);
  inicioMes.setHours(0, 0, 0, 0);
  const finMes = new Date(anio, mes, 0);
  finMes.setHours(23, 59, 59, 999);

  const empleados = (await prisma.empleado.findMany({
    where: {
      empresaId,
      activo: true,
    },
    select: {
      id: true,
      salarioBrutoMensual: true,
      salarioBrutoAnual: true,
      jornada: {
        select: {
          horasSemanales: true,
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
          salarioBrutoAnual: true,
          fechaInicio: true,
          fechaFin: true,
        },
      },
      complementos: {
        where: {
          activo: true,
        },
        select: {
          id: true,
          importePersonalizado: true,
          tipoComplemento: {
            select: {
              importeFijo: true,
            },
          },
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
  })) as EmpleadoParaPrenomina[];

  if (empleados.length === 0) {
    await prisma.eventoNomina.update({
      where: { id: eventoId },
      data: {
        fechaGeneracion: new Date(),
        totalEmpleados: 0,
        empleadosConComplementos: 0,
        complementosAsignados: 0,
      },
    });

    return {
      totalProcesados: 0,
      prenominasCreadas: 0,
      prenominasVinculadas: 0,
      compensacionesAsignadas: 0,
      empleadosConComplementos: 0,
      complementosConfigurados: 0,
    };
  }

  const empleadoIds = empleados.map((empleado) => empleado.id);

  const [nominasExistentes, compensacionesPendientes] = await Promise.all([
    prisma.nomina.findMany({
      where: {
        empleadoId: { in: empleadoIds },
        mes,
        anio,
      },
      select: {
        id: true,
        empleadoId: true,
        eventoNominaId: true,
        totalComplementos: true,
        totalBruto: true,
        totalNeto: true,
        complementosPendientes: true,
      },
    }),
    prisma.compensacionHoraExtra.findMany({
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

  let prenominasCreadas = 0;
  let prenominasVinculadas = 0;
  let compensacionesAsignadas = 0;
  let empleadosConComplementos = 0;
  let complementosConfigurados = 0;

  for (const empleado of empleados) {
    const datosBase = calcularDatosBaseNomina(
      empleado,
      inicioMes,
      finMes
    );

    if (empleado.complementos.length > 0) {
      empleadosConComplementos += 1;
      complementosConfigurados += empleado.complementos.length;
    }

    const compensacionesEmpleado =
      compensacionesPorEmpleado.get(empleado.id) ?? [];
    const horasTotalesCompensadas = compensacionesEmpleado.reduce(
      (acc, item) => acc.plus(new Decimal(item.horasBalance)),
      new Decimal(0)
    );
    const importeCompensaciones = calcularImporteCompensacion(
      horasTotalesCompensadas,
      datosBase.salarioMensual,
      empleado.jornada?.horasSemanales
    );

    const nominaExistente = nominasPorEmpleado.get(empleado.id);

    if (nominaExistente) {
      const updateData: Prisma.NominaUpdateInput = {};
      if (nominaExistente.eventoNominaId !== eventoId) {
        updateData.eventoNomina = { connect: { id: eventoId } };
        prenominasVinculadas += 1;
      }

      if (datosBase.complementosPendientes !== nominaExistente.complementosPendientes) {
        updateData.complementosPendientes = datosBase.complementosPendientes;
      }

      if (!horasTotalesCompensadas.isZero()) {
        const totalComplementosActual = new Decimal(
          nominaExistente.totalComplementos ?? 0
        );
        const totalBrutoActual = new Decimal(nominaExistente.totalBruto ?? 0);
        const totalNetoActual = new Decimal(nominaExistente.totalNeto ?? 0);

        updateData.totalComplementos = totalComplementosActual.plus(
          importeCompensaciones
        );
        updateData.totalBruto = totalBrutoActual.plus(importeCompensaciones);
        updateData.totalNeto = totalNetoActual.plus(importeCompensaciones);
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.nomina.update({
          where: { id: nominaExistente.id },
          data: updateData,
        });
      }

      if (compensacionesEmpleado.length > 0) {
        await asignarCompensacionesANomina(
          compensacionesEmpleado,
          nominaExistente.id
        );
        compensacionesAsignadas += compensacionesEmpleado.length;
      }

      continue;
    }

    const totalComplementos = importeCompensaciones;
    const totalBruto = datosBase.salarioBase.plus(totalComplementos);

    // Crear la nómina primero en estado pendiente
    const nuevaNomina = await prisma.nomina.create({
      data: {
        empleadoId: empleado.id,
        contratoId: datosBase.contratoId,
        eventoNominaId: eventoId,
        mes,
        anio,
        estado: 'pendiente',
        salarioBase: datosBase.salarioBase,
        totalComplementos,
        totalDeducciones: new Decimal(0),
        totalBruto,
        totalNeto: totalBruto,
        diasTrabajados: datosBase.diasTrabajados,
        diasAusencias: datosBase.diasAusencias,
        complementosPendientes: datosBase.complementosPendientes,
      },
    });

    prenominasCreadas += 1;

    if (compensacionesEmpleado.length > 0) {
      await asignarCompensacionesANomina(compensacionesEmpleado, nuevaNomina.id);
      compensacionesAsignadas += compensacionesEmpleado.length;
    }

    // Generar alertas para la nómina
    await generarAlertasParaNomina(nuevaNomina.id, empleado.id, empresaId, mes, anio);

    // Determinar estado final: "completada" si no hay complementos pendientes NI alertas críticas
    const alertasCriticas = await prisma.alertaNomina.count({
      where: {
        nominaId: nuevaNomina.id,
        tipo: 'critico',
        resuelta: false,
      },
    });

    const estadoFinal =
      datosBase.complementosPendientes || alertasCriticas > 0 ? 'pendiente' : 'completada';

    // Actualizar estado si es necesario
    if (estadoFinal !== 'pendiente') {
      await prisma.nomina.update({
        where: { id: nuevaNomina.id },
        data: { estado: estadoFinal },
      });
    }
  }

  const totalNominasEvento = await prisma.nomina.count({
    where: { eventoNominaId: eventoId },
  });

  await prisma.eventoNomina.update({
    where: { id: eventoId },
    data: {
      fechaGeneracion: new Date(),
      totalEmpleados: totalNominasEvento,
      empleadosConComplementos,
      complementosAsignados: complementosConfigurados,
    },
  });

  return {
    totalProcesados: empleados.length,
    prenominasCreadas,
    prenominasVinculadas,
    compensacionesAsignadas,
    empleadosConComplementos,
    complementosConfigurados,
  };
}

function calcularDatosBaseNomina(
  empleado: Pick<EmpleadoParaPrenomina, 'contratos' | 'ausencias' | 'complementos' | 'salarioBrutoAnual' | 'salarioBrutoMensual'>,
  inicioMes: Date,
  finMes: Date
): DatosBaseNomina {
  const contratoVigente = empleado.contratos[0];
  const salarioMensual = calcularSalarioMensual(empleado, contratoVigente);
  const diasMes = finMes.getDate();
  const diasAusencias = calcularDiasAusencias(empleado.ausencias, inicioMes, finMes);
  const diasTrabajados = Math.max(0, diasMes - diasAusencias);

  const salarioBase = diasMes > 0
    ? salarioMensual.mul(diasTrabajados).div(diasMes).toDecimalPlaces(2)
    : salarioMensual;

  const complementosPendientes = empleado.complementos.some(
    (comp) =>
      !comp.importePersonalizado && !comp.tipoComplemento?.importeFijo
  );

  return {
    salarioMensual,
    salarioBase,
    contratoId: contratoVigente?.id ?? null,
    diasTrabajados,
    diasAusencias,
    complementosPendientes,
  };
}

function calcularSalarioMensual(
  empleado: Pick<EmpleadoParaPrenomina, 'salarioBrutoMensual' | 'salarioBrutoAnual'>,
  contrato?: { salarioBrutoAnual: Prisma.Decimal | null }
): Decimal {
  if (contrato?.salarioBrutoAnual) {
    return new Decimal(contrato.salarioBrutoAnual).div(12).toDecimalPlaces(2);
  }

  if (empleado.salarioBrutoMensual) {
    return new Decimal(empleado.salarioBrutoMensual).toDecimalPlaces(2);
  }

  if (empleado.salarioBrutoAnual) {
    return new Decimal(empleado.salarioBrutoAnual).div(12).toDecimalPlaces(2);
  }

  return new Decimal(0);
}

function calcularDiasAusencias(
  ausencias: Array<{ fechaInicio: Date; fechaFin: Date }>,
  inicioMes: Date,
  finMes: Date
): number {
  return ausencias.reduce((total, ausencia) => {
    const inicio = new Date(
      Math.max(ausencia.fechaInicio.getTime(), inicioMes.getTime())
    );
    const fin = new Date(
      Math.min(ausencia.fechaFin.getTime(), finMes.getTime())
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
  await prisma.compensacionHoraExtra.updateMany({
    where: {
      id: { in: ids },
    },
    data: {
      nominaId,
    },
  });
}


