// ========================================
// API Fichajes - Limpiar Revisados
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  handleApiError,
  successResponse,
} from '@/lib/api-handler';

// POST /api/fichajes/limpiar-revisados - Cambiar fichajes "revisado" a "finalizado" (solo HR Admin)
export async function POST(_req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(_req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Cambiar todos los fichajes "revisado" a "finalizado" de la empresa
    const resultado = await prisma.fichaje.updateMany({
      where: {
        empresaId: session.user.empresaId,
        estado: 'revisado',
      },
      data: {
        estado: 'finalizado',
      },
    });

    return successResponse({
      success: true,
      actualizados: resultado.count,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes/limpiar-revisados');
  }
}

