// ========================================
// Cron Task: Renovar saldo de horas extra
// ========================================
// Esta tarea normaliza el campo `saldoRenovadoDesde` de cada empleado activo
// para que el contador de horas extra se reinicie automáticamente cada año.

import { EstadoEmpleado } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

export interface RenovarSaldoHorasResultado {
  inicioAnio: Date;
  empleadosEvaluados: number;
  empleadosActualizados: number;
  ejecutado: boolean;
}

const CHUNK_SIZE = 25;

export async function renovarSaldoHorasAnual(
  fechaReferencia: Date = new Date(),
  options: { force?: boolean } = {}
): Promise<RenovarSaldoHorasResultado> {
  const inicioAnio = startOfYear(fechaReferencia);

  if (!esPrimerDiaDelAnio(fechaReferencia) && !options.force) {
    return {
      inicioAnio,
      empleadosEvaluados: 0,
      empleadosActualizados: 0,
      ejecutado: false,
    };
  }

  const empleados = await prisma.empleados.findMany({
    where: {
      estadoEmpleado: EstadoEmpleado.activo,
      OR: [
        { saldoRenovadoDesde: null },
        { saldoRenovadoDesde: { lt: inicioAnio } },
      ],
    },
    select: {
      id: true,
      fechaAlta: true,
      saldoRenovadoDesde: true,
    },
  });

  const updates = empleados
    .map((empleado) => {
      const fechaAltaNormalizada = normalizeDate(empleado.fechaAlta);
      const fechaObjetivo =
        fechaAltaNormalizada > inicioAnio ? fechaAltaNormalizada : inicioAnio;

      if (
        empleado.saldoRenovadoDesde &&
        empleado.saldoRenovadoDesde >= fechaObjetivo
      ) {
        return null;
      }

      return {
        id: empleado.id,
        fechaObjetivo,
      };
    })
    .filter(Boolean) as Array<{ id: string; fechaObjetivo: Date }>;

  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE);
    await prisma.$transaction(
      chunk.map(({ id, fechaObjetivo }) =>
        prisma.empleados.update({
          where: { id },
          data: {
            saldoRenovadoDesde: fechaObjetivo,
          },
        })
      )
    );
  }

  return {
    inicioAnio,
    empleadosEvaluados: empleados.length,
    empleadosActualizados: updates.length,
    ejecutado: true,
  };
}

function startOfYear(date: Date): Date {
  const year = date.getFullYear();
  const inicio = new Date(year, 0, 1);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function esPrimerDiaDelAnio(date: Date): boolean {
  return date.getMonth() === 0 && date.getDate() === 1;
}


