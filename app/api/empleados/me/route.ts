// ========================================
// API Route: Get Current Employee
// ========================================

import { NextRequest } from 'next/server';
import { requireAuth, handleApiError, successResponse, notFoundResponse } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Buscar empleado por usuarioId
    const empleado = await prisma.empleado.findUnique({
      where: { usuarioId: session.user.id },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        empresaId: true,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    return successResponse(empleado);
  } catch (error) {
    return handleApiError(error, 'API GET /api/empleados/me');
  }
}


