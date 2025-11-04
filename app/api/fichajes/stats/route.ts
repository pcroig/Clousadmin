// ========================================
// API: Estadísticas de Fichajes Auto-completados
// ========================================
// GET: Obtener estadísticas para el widget del dashboard HR

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  handleApiError,
  successResponse,
} from '@/lib/api-handler';

// GET /api/fichajes/stats - Obtener estadísticas de fichajes (solo HR Admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Obtener fecha desde query params o usar hoy por defecto
    const { searchParams } = new URL(request.url);
    const fechaParam = searchParams.get('fecha');
    
    const hoy = fechaParam ? new Date(fechaParam) : new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    // Contar auto-completados del día (estado: aprobado, tipo: fichaje_completado)
    const autoCompletados = await prisma.autoCompletado.count({
      where: {
        empresaId: session.user.empresaId,
        tipo: 'fichaje_completado',
        estado: 'aprobado',
        createdAt: {
          gte: hoy,
          lt: manana,
        },
      },
    });

    // Contar fichajes en revisión (estado: pendiente, tipo: fichaje_revision)
    const enRevision = await prisma.autoCompletado.count({
      where: {
        empresaId: session.user.empresaId,
        tipo: 'fichaje_revision',
        estado: 'pendiente',
      },
    });

    return successResponse({
      autoCompletados,
      enRevision,
      fecha: hoy.toISOString().split('T')[0],
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/fichajes/stats');
  }
}



