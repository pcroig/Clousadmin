// ========================================
// API: Estadísticas de Fichajes
// ========================================
// GET: Obtener estadísticas para el widget del dashboard HR

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EstadoAusencia } from '@/lib/constants/enums';

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

    // Contar fichajes cuadrados masivamente del día
    const cuadradosMasivamente = await prisma.fichaje.count({
      where: {
        empresaId: session.user.empresaId,
        cuadradoMasivamente: true,
        cuadradoEn: {
          gte: hoy,
          lt: manana,
        },
      },
    });

    // Contar fichajes pendientes (requieren revisión)
    const enRevision = await prisma.fichaje.count({
      where: {
        empresaId: session.user.empresaId,
        estado: EstadoAusencia.pendiente_aprobacion,
        fecha: {
          lt: hoy, // Solo días anteriores
        },
      },
    });

    return successResponse({
      cuadradosMasivamente,
      enRevision,
      fecha: hoy.toISOString().split('T')[0],
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/fichajes/stats');
  }
}



