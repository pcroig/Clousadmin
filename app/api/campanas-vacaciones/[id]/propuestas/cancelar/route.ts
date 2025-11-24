// ========================================
// API Route: Cancelar borrador de propuestas
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { JSON_NULL } from '@/lib/prisma/json';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    if (session.user.rol !== UsuarioRol.hr_admin && session.user.rol !== UsuarioRol.manager) {
      return badRequestResponse('No tienes permisos para cancelar la propuesta');
    }

    const { id: campanaId } = await params;

    const campana = await prisma.campanaVacaciones.findFirst({
      where: {
        id: campanaId,
        empresaId: session.user.empresaId,
      },
      select: {
        id: true,
      },
    });

    if (!campana) {
      return badRequestResponse('Campaña no encontrada');
    }

    await prisma.$transaction(async (tx) => {
      await tx.preferenciaVacaciones.updateMany({
        where: {
          campanaId,
        },
        data: {
          propuestaIA: JSON_NULL,
          propuestaEnviada: false,
          cambioSolicitado: false,
          propuestaEmpleado: JSON_NULL,
        },
      });

      await tx.campanaVacaciones.update({
        where: { id: campanaId },
        data: {
          propuestaIA: JSON_NULL,
          estado: 'abierta',
          cuadradaEn: null,
        },
      });
    });

    return successResponse({ cancelada: true });
  } catch (error) {
    return handleApiError(error, 'API POST /api/campanas-vacaciones/[id]/propuestas/cancelar');
  }
}




