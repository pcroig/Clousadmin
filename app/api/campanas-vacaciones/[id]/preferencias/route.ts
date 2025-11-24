// ========================================
// API Route: Preferencias de Vacaciones
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { preferenciaVacacionesCreateSchema } from '@/lib/validaciones/schemas';
import { getJsonBody } from '@/lib/utils/json';

// POST /api/campanas-vacaciones/[id]/preferencias - Guardar preferencias del empleado
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: campanaId } = await params;

    // Validar permisos: solo el empleado puede guardar sus propias preferencias
    if (!session.user.empleadoId) {
      return badRequestResponse('Debes ser un empleado para indicar preferencias');
    }

    const body = await getJsonBody<Record<string, unknown>>(req);
    
    // Forzar campanaId del parámetro
    body.campanaId = campanaId;
    
    const validationResult = preferenciaVacacionesCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0]?.message || 'Datos inválidos');
    }

    const data = validationResult.data;

    // Verificar que la campaña existe y está abierta
    const campana = await prisma.campanaVacaciones.findFirst({
      where: {
        id: campanaId,
        empresaId: session.user.empresaId,
        estado: 'abierta',
      },
    });

    if (!campana) {
      return badRequestResponse('Campaña no encontrada o ya cerrada');
    }

    // Verificar que existe una preferencia para este empleado en esta campaña
    const preferenciaExistente = await prisma.preferenciaVacaciones.findFirst({
      where: {
        campanaId,
        empleadoId: session.user.empleadoId,
      },
    });

    if (!preferenciaExistente) {
      return badRequestResponse('No estás asignado a esta campaña');
    }

    // Actualizar preferencias
    const preferenciaActualizada = await prisma.preferenciaVacaciones.update({
      where: {
        id: preferenciaExistente.id,
      },
      data: {
        diasIdeales: data.diasIdeales,
        diasPrioritarios: data.diasPrioritarios || [],
        diasAlternativos: data.diasAlternativos || [],
        completada: true,
      },
    });

    // Actualizar contador de empleados completados en la campaña
    const empleadosCompletados = await prisma.preferenciaVacaciones.count({
      where: {
        campanaId,
        completada: true,
      },
    });

    await prisma.campanaVacaciones.update({
      where: { id: campanaId },
      data: {
        empleadosCompletados,
      },
    });

    console.info(`[Preferencias] Empleado ${session.user.empleadoId} completó preferencias para campaña ${campanaId}`);

    return successResponse({
      preferencia: preferenciaActualizada,
      empleadosCompletados,
      totalEmpleados: campana.totalEmpleadosAsignados,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/campanas-vacaciones/[id]/preferencias');
  }
}






