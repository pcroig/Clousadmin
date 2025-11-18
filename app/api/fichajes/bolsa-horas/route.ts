// ========================================
// API: Bolsa de horas desde Fichajes
// ========================================
// Devuelve empleados con saldo positivo de horas en un mes seleccionado

import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  handleApiError,
  successResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import { calcularBalanceMensual } from '@/lib/calculos/balance-horas';

const empleadoSelect = Prisma.validator<Prisma.EmpleadoSelect>()({
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

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const periodoDefault = obtenerMesTrabajo();

    const mes = Number(searchParams.get('mes') ?? periodoDefault.mes);
    const anio = Number(searchParams.get('anio') ?? periodoDefault.anio);

    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      return badRequestResponse('Mes inválido');
    }

    if (!Number.isInteger(anio) || anio < 2020 || anio > 2100) {
      return badRequestResponse('Año inválido');
    }

    const empleados = await prisma.empleado.findMany({
      where: {
        empresaId: session.user.empresaId,
        estadoEmpleado: 'activo',
      },
      select: empleadoSelect,
      orderBy: {
        nombre: 'asc',
      },
    });

    const balances = [];

    for (const empleado of empleados) {
      const balanceMensual = await calcularBalanceMensual(empleado.id, mes, anio);
      const balanceTotal = Math.round(balanceMensual.balanceTotal * 100) / 100;
      if (balanceTotal > 0) {
        balances.push({
          empleado,
          balance: balanceMensual,
        });
      }
    }

    return successResponse({
      mes,
      anio,
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


