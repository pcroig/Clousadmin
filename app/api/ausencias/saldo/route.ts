// ========================================
// API Saldo Ausencias - Obtener y Asignar saldo anual
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAuthAsHROrManager,
  validateRequest,
  handleApiError,
  successResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import { z } from 'zod';

const saldoSchema = z.object({
  nivel: z.enum(['empresa', 'equipo']),
  diasTotales: z.number().int().min(0).max(365),
  equipoIds: z.array(z.string().uuid()).optional(),
});

// GET /api/ausencias/saldo - Obtener saldo de ausencias de un empleado
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(req.url);
    const empleadoId = searchParams.get('empleadoId');

    if (!empleadoId) {
      return badRequestResponse('empleadoId requerido');
    }

    // Validar permisos: empleados solo pueden ver su propio saldo
    if (session.user.rol === 'empleado' && session.user.empleadoId !== empleadoId) {
      return badRequestResponse('No puedes ver el saldo de otros empleados');
    }

    // Verificar que el empleado pertenece a la misma empresa
    const empleado = await prisma.empleado.findFirst({
      where: {
        id: empleadoId,
        empresaId: session.user.empresaId,
      },
      select: { id: true },
    });

    if (!empleado) {
      return badRequestResponse('Empleado no encontrado o no pertenece a tu empresa');
    }

    const añoActual = new Date().getFullYear();

    // Obtener saldo asignado
    const saldoAsignado = await prisma.empleadoSaldoAusencias.findUnique({
      where: {
        empleadoId_año: {
          empleadoId,
          año: añoActual,
        },
      },
    });

    // Obtener ausencias del empleado para calcular usadas/pendientes
    // IMPORTANTE: Solo contar ausencias que descuentan saldo (vacaciones)
    const ausencias = await prisma.ausencia.findMany({
      where: {
        empleadoId,
        descuentaSaldo: true, // Solo vacaciones descuentan saldo
        fechaInicio: {
          gte: new Date(`${añoActual}-01-01`),
          lt: new Date(`${añoActual + 1}-01-01`),
        },
      },
    });

    const diasUsados = ausencias
      .filter((a: any) => a.estado === 'en_curso' || a.estado === 'completada' || a.estado === 'auto_aprobada')
      .reduce((sum: number, a: any) => sum + Number(a.diasSolicitados), 0);

    const diasPendientes = ausencias
      .filter((a: any) => a.estado === 'pendiente_aprobacion')
      .reduce((sum: number, a: any) => sum + Number(a.diasSolicitados), 0);

    const diasTotales = saldoAsignado?.diasTotales || 0;

    return successResponse({
      diasTotales,
      diasUsados,
      diasPendientes,
      diasDisponibles: diasTotales - diasUsados - diasPendientes,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/ausencias/saldo');
  }
}

// POST /api/ausencias/saldo - Asignar saldo de ausencias (HR Admin o Manager)
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin o Manager
    const authResult = await requireAuthAsHROrManager(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(req, saldoSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const añoActual = new Date().getFullYear();
    let empleadosIds: string[] = [];

    if (validatedData.nivel === 'empresa') {
      // Todos los empleados de la empresa
      const empleados = await prisma.empleado.findMany({
        where: { empresaId: session.user.empresaId },
        select: { id: true },
      });
      empleadosIds = empleados.map((e: { id: string }) => e.id);
    } else if (validatedData.nivel === 'equipo' && validatedData.equipoIds && validatedData.equipoIds.length > 0) {
      // Empleados de los equipos seleccionados
      const empleadoEquipos = await prisma.empleadoEquipo.findMany({
        where: {
          equipoId: { in: validatedData.equipoIds },
        },
        select: { empleadoId: true },
        distinct: ['empleadoId'],
      });
      empleadosIds = empleadoEquipos.map((ee: { empleadoId: string }) => ee.empleadoId);
    }

    if (empleadosIds.length === 0) {
      return badRequestResponse('No se encontraron empleados para asignar el saldo');
    }

    // Upsert saldo para cada empleado
    const promises = empleadosIds.map((empleadoId) =>
      prisma.empleadoSaldoAusencias.upsert({
        where: {
          empleadoId_año: { empleadoId, año: añoActual },
        },
        update: {
          diasTotales: validatedData.diasTotales,
        },
        create: {
          empleadoId,
          empresaId: session.user.empresaId,
          año: añoActual,
          diasTotales: validatedData.diasTotales,
          diasUsados: 0,
          diasPendientes: 0,
          origen: 'manual_hr',
        },
      })
    );

    await Promise.all(promises);

    return successResponse({
      success: true,
      empleadosActualizados: empleadosIds.length,
      año: añoActual,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/ausencias/saldo');
  }
}

