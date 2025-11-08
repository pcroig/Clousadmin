// ========================================
// API: Balance Acumulado de Fichajes
// ========================================
// Calcula balance de horas trabajadas vs esperadas en un rango de fechas

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  handleApiError,
  successResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import { calcularBalancePeriodo } from '@/lib/calculos/balance-horas';
import { UsuarioRol } from '@/lib/constants/enums';

// GET /api/fichajes/balance - Obtener balance acumulado
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const empleadoId = searchParams.get('empleadoId');
    const fechaDesdeStr = searchParams.get('fechaDesde');

    if (!empleadoId) {
      return badRequestResponse('empleadoId es requerido');
    }

    // Verificar acceso
    if (session.user.rol === UsuarioRol.empleado && empleadoId !== session.user.empleadoId) {
      return badRequestResponse('No autorizado');
    }

    // Calcular fecha desde (inicio de año o fecha de alta)
    let fechaDesde: Date;
    
    if (fechaDesdeStr) {
      fechaDesde = new Date(fechaDesdeStr);
    } else {
      // Obtener fecha de alta del empleado
      const empleado = await prisma.empleado.findUnique({
        where: { id: empleadoId },
        select: { fechaAlta: true },
      });

      if (!empleado) {
        return badRequestResponse('Empleado no encontrado');
      }

      // Usar el máximo entre inicio de año y fecha de alta
      const inicioAño = new Date(new Date().getFullYear(), 0, 1);
      fechaDesde = new Date(Math.max(empleado.fechaAlta.getTime(), inicioAño.getTime()));
    }

    const fechaHasta = new Date(); // Hasta hoy

    // Calcular balance del período
    const balance = await calcularBalancePeriodo(empleadoId, fechaDesde, fechaHasta);

    console.info(`[Balance Fichajes] ${empleadoId}: ${balance.balanceTotal}h desde ${fechaDesde.toISOString().split('T')[0]}`);

    return successResponse({
      horasTrabajadas: balance.totalHorasTrabajadas, // Ya calculado en calcularBalancePeriodo
      horasEsperadas: balance.totalHorasEsperadas,
      balance: balance.balanceTotal,
      fechaDesde: fechaDesde.toISOString().split('T')[0],
      fechaHasta: fechaHasta.toISOString().split('T')[0],
      dias: balance.dias.length,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/fichajes/balance');
  }
}

