// ========================================
// API: Aprobar Fichajes Revisados
// ========================================
// Endpoint para que HR apruebe fichajes en estado 'revisado'
// Puede aprobar uno, varios o todos

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  validateRequest,
  handleApiError,
  successResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import { z } from 'zod';

const aprobarSchema = z.object({
  fichajesIds: z.array(z.string()).optional(),
  aprobarTodos: z.boolean().optional(),
  empresaId: z.string().optional(),
});

// POST /api/fichajes/aprobar-revisados - Aprobar fichajes revisados (solo HR Admin)
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(req, aprobarSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const empresaId = validatedData.empresaId || session.user.empresaId;
    let fichajesIds = validatedData.fichajesIds || [];

    // 3. Si aprobarTodos, obtener todos los fichajes revisados
    if (validatedData.aprobarTodos) {
      const fichajesRevisados = await prisma.fichaje.findMany({
        where: {
          empresaId,
          estado: 'revisado',
        },
        select: {
          id: true,
        },
      });

      fichajesIds = fichajesRevisados.map(f => f.id);
    }

    if (fichajesIds.length === 0) {
      return badRequestResponse('No hay fichajes para aprobar');
    }

    // 4. Actualizar fichajes a 'finalizado' (aprobado pasa a finalizado)
    const resultado = await prisma.fichaje.updateMany({
      where: {
        id: {
          in: fichajesIds,
        },
        empresaId,
        estado: 'revisado',
      },
      data: {
        estado: 'finalizado',
        fechaAprobacion: new Date(),
      },
    });

    // TODO: Update AutoCompletado records for approved fichajes
    // Note: JSON filtering with 'in' operator needs to be implemented differently

    return successResponse({
      success: true,
      aprobados: resultado.count,
      mensaje: `${resultado.count} fichaje(s) aprobado(s) correctamente`,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes/aprobar-revisados');
  }
}

