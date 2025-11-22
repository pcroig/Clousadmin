// ========================================
// API Solicitudes - GET, POST
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createdResponse,
  forbiddenResponse,
  handleApiError,
  requireAuth,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { EstadoSolicitud, UsuarioRol } from '@/lib/constants/enums';
import { crearNotificacionSolicitudCreada } from '@/lib/notificaciones';
import { prisma, Prisma } from '@/lib/prisma';

// Schema de validación
const solicitudCreateSchema = z.object({
  tipo: z.enum(['cambio_datos', 'fichaje_correccion', 'ausencia_modificacion', 'documento']),
  camposCambiados: z.record(z.string(), z.unknown()),
  motivo: z.string().optional(),
});

// GET /api/solicitudes - Listar solicitudes
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const estado = searchParams.get('estado') || 'pendiente';

    // Si es empleado, solo ver sus propias solicitudes
    // Si es HR Admin o Manager, ver todas las solicitudes
    const where: Prisma.SolicitudCambioWhereInput = {
      empresaId: session.user.empresaId,
      estado,
    };

    if (session.user.rol === UsuarioRol.empleado && session.user.empleadoId) {
      where.empleadoId = session.user.empleadoId;
    }

    const solicitudes = await prisma.solicitudCambio.findMany({
      where,
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
            fotoUrl: true,
          },
        },
        aprobador: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return successResponse(solicitudes);
  } catch (error) {
    return handleApiError(error, 'API GET /api/solicitudes');
  }
}

// POST /api/solicitudes - Crear nueva solicitud
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    // Solo empleados pueden crear solicitudes de cambio
    if (!session.user.empleadoId) {
      return forbiddenResponse('Solo empleados pueden crear solicitudes');
    }

    // Validar request body
    const validationResult = await validateRequest(request, solicitudCreateSchema);
    if (validationResult instanceof NextResponse) return validationResult;
    const { data: validatedData } = validationResult;

    const solicitud = await prisma.solicitudCambio.create({
      data: {
        empresaId: session.user.empresaId,
        empleadoId: session.user.empleadoId,
        tipo: validatedData.tipo,
        camposCambiados: validatedData.camposCambiados as Prisma.InputJsonValue,
        motivo: validatedData.motivo,
        estado: EstadoSolicitud.pendiente,
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            email: true,
          },
        },
      },
    });

    // Crear notificación de solicitud creada
    await crearNotificacionSolicitudCreada(prisma, {
      solicitudId: solicitud.id,
      empresaId: session.user.empresaId,
      empleadoId: session.user.empleadoId,
      empleadoNombre: `${solicitud.empleado.nombre} ${solicitud.empleado.apellidos}`,
      tipo: solicitud.tipo,
    });

    return createdResponse(solicitud);
  } catch (error) {
    return handleApiError(error, 'API POST /api/solicitudes');
  }
}

