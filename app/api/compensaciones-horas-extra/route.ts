// ========================================
// API: Compensaciones de Horas Extra
// ========================================
// GET: Listar compensaciones
// POST: Crear nueva solicitud de compensación

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAuthAsHR,
  validateRequest,
  handleApiError,
  successResponse,
  createdResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import { z } from 'zod';
import { UsuarioRol } from '@/lib/constants/enums';

const crearCompensacionSchema = z.object({
  tipoCompensacion: z.enum(['nomina', 'ausencia']),
  horasBalance: z.number().positive(),
});

// GET /api/compensaciones-horas-extra - Listar compensaciones
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const empleadoId = searchParams.get('empleadoId');
    const estado = searchParams.get('estado');

    // Construir filtros
    const where: any = {
      empresaId: session.user.empresaId,
    };

    // Control de acceso
    if (session.user.rol === UsuarioRol.empleado) {
      // Empleados solo ven sus propias compensaciones
      where.empleadoId = session.user.empleadoId;
    } else if (empleadoId) {
      // HR/Manager pueden filtrar por empleado
      where.empleadoId = empleadoId;
    }

    if (estado && estado !== 'todos') {
      where.estado = estado;
    }

    const compensaciones = await prisma.compensacionHoraExtra.findMany({
      where,
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
          },
        },
        ausencia: {
          select: {
            id: true,
            fechaInicio: true,
            fechaFin: true,
            estado: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return successResponse(compensaciones);
  } catch (error) {
    return handleApiError(error, 'API GET /api/compensaciones-horas-extra');
  }
}

// POST /api/compensaciones-horas-extra - Crear solicitud de compensación
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo empleados pueden solicitar compensación
    if (!session.user.empleadoId) {
      return badRequestResponse('No tienes un empleado asignado');
    }

    const validationResult = await validateRequest(request, crearCompensacionSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const { tipoCompensacion, horasBalance } = validatedData;

    // Validar que las horas sean positivas
    if (horasBalance <= 0) {
      return badRequestResponse('Las horas de balance deben ser positivas');
    }

    // Crear solicitud de compensación
    const compensacion = await prisma.compensacionHoraExtra.create({
      data: {
        empresaId: session.user.empresaId,
        empleadoId: session.user.empleadoId,
        horasBalance,
        tipoCompensacion,
        estado: 'pendiente',
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
          },
        },
      },
    });

    // TODO: Crear notificación a HR sobre nueva solicitud de compensación

    console.info(`[Compensación Horas Extra] Creada solicitud ${compensacion.id} para empleado ${session.user.empleadoId}: ${horasBalance}h vía ${tipoCompensacion}`);

    return createdResponse(compensacion);
  } catch (error) {
    return handleApiError(error, 'API POST /api/compensaciones-horas-extra');
  }
}

