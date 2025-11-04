// ========================================
// API: Analytics - Obtener lista de equipos
// ========================================
// GET: Lista de equipos activos de la empresa

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  handleApiError,
  successResponse,
} from '@/lib/api-handler';

// GET /api/analytics/equipos - Obtener lista de equipos (solo HR Admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const equipos = await prisma.equipo.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return successResponse(equipos);
  } catch (error) {
    return handleApiError(error, 'API GET /api/analytics/equipos');
  }
}
