// ========================================
// API: Bolsa de horas desde Fichajes
// ========================================
// Devuelve empleados con saldo positivo de horas en un mes seleccionado

import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  requireAuthAsHR,
  successResponse,
} from '@/lib/api-handler';
import {
  type BalancePeriodo,
  calcularBalanceMensualBatch,
  calcularBalancePeriodo,
} from '@/lib/calculos/balance-horas';
import { prisma } from '@/lib/prisma';

const empleadoSelect = Prisma.validator<Prisma.empleadosSelect>()({
  id: true,
  nombre: true,
  apellidos: true,
  email: true,
  equipos: {
    select: {
      equipo: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
});

type EmpleadoResumen = Prisma.empleadosGetPayload<{
  select: typeof empleadoSelect;
}>;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const periodoDefault = obtenerMesTrabajo();

    const mesParam = searchParams.get('mes');
    const totalMode = mesParam === null || mesParam === 'all';
    const mes = totalMode ? periodoDefault.mes : Number(mesParam);
    const anio = Number(searchParams.get('anio') ?? periodoDefault.anio);

    if (!totalMode && (!Number.isInteger(mes) || mes < 1 || mes > 12)) {
      return badRequestResponse('Mes inválido');
    }

    if (!Number.isInteger(anio) || anio < 2020 || anio > 2100) {
      return badRequestResponse('Año inválido');
    }

    const empleados: EmpleadoResumen[] = await prisma.empleados.findMany({
      where: {
        empresaId: session.user.empresaId,
        estadoEmpleado: 'activo',
      },
      select: empleadoSelect,
      orderBy: {
        nombre: 'asc',
      },
    });

    if (empleados.length === 0) {
      return successResponse({
        mes,
        anio,
        balances: [],
      });
    }

    const empleadoIds = empleados.map((empleado) => empleado.id);
    const balances: Array<{ empleado: EmpleadoResumen; balance: BalancePeriodo }> = [];

    if (totalMode) {
      const fechaInicio = new Date(anio, 0, 1);
      const fechaFin = new Date(anio, 11, 31, 23, 59, 59, 999);

      const balancesPromesas = await Promise.all(
        empleados.map(async (empleado) => {
          const balancePeriodo = await calcularBalancePeriodo(empleado.id, fechaInicio, fechaFin);
          const balanceTotal = Math.round(balancePeriodo.balanceTotal * 100) / 100;
          return {
            empleado,
            balance: balancePeriodo,
            balanceTotal,
          };
        })
      );

      balancesPromesas
        .filter((item) => item.balanceTotal > 0)
        .forEach((item) => {
          balances.push({
            empleado: item.empleado,
            balance: item.balance,
          });
        });
    } else {
      const balancesPorEmpleado = await calcularBalanceMensualBatch(
        session.user.empresaId,
        empleadoIds,
        mes,
        anio
      );

      for (const empleado of empleados) {
        const balanceMensual = balancesPorEmpleado.get(empleado.id);
        if (!balanceMensual) {
          continue;
        }

        const balanceTotal = Math.round(balanceMensual.balanceTotal * 100) / 100;
        if (balanceTotal > 0) {
          balances.push({
            empleado,
            balance: balanceMensual,
          });
        }
      }
    }

    return successResponse({
      mes: totalMode ? null : mes,
      anio,
      scope: totalMode ? 'total' : 'mensual',
      balances,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/fichajes/bolsa-horas');
  }
}

function obtenerMesTrabajo() {
  const referencia = new Date();
  if (referencia.getDate() <= 10) {
    referencia.setMonth(referencia.getMonth() - 1);
  }
  return {
    mes: referencia.getMonth() + 1,
    anio: referencia.getFullYear(),
  };
}






