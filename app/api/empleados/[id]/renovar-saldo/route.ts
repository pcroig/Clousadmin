// ========================================
// API Empleados - Renovar Saldo de Horas
// ========================================

import { NextRequest } from 'next/server';

import {
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  id: string;
}

// POST /api/empleados/[id]/renovar-saldo - Renovar saldo de horas (solo HR Admin)
export async function POST(
  req: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const params = await context.params;
  
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR Admin puede renovar saldos
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return forbiddenResponse('Solo HR Admin puede renovar saldos de horas');
    }

    const { id: empleadoId } = params;

    // Verificar que el empleado existe y pertenece a la empresa
    const empleado = await prisma.empleados.findFirst({
      where: {
        id: empleadoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    const fechaRenovacion = new Date();

    await prisma.empleados.update({
      where: { id: empleadoId },
      data: {
        saldoRenovadoDesde: fechaRenovacion,
      },
    });

    return successResponse({
      mensaje: 'Saldo renovado correctamente. El contador empezará desde hoy.',
      fechaRenovacion,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/empleados/[id]/renovar-saldo');
  }
}

// GET /api/empleados/[id]/renovar-saldo - Obtener fecha de última renovación
export async function GET(
  req: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  const params = await context.params;
  
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: empleadoId } = params;

    // Verificar que el empleado existe y pertenece a la empresa
    const empleado = await prisma.empleados.findFirst({
      where: {
        id: empleadoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    return successResponse({
      fechaRenovacion: empleado.saldoRenovadoDesde ?? empleado.fechaAlta,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/empleados/[id]/renovar-saldo');
  }
}

