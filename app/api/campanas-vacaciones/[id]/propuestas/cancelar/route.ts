// ========================================
// API Route: Cancelar borrador de propuestas
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UsuarioRol } from '@/lib/constants/enums';
import {
  requireAuth,
  handleApiError,
  successResponse,
  badRequestResponse,
} from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
          propuestaIA: null,
          propuestaEnviada: false,
          cambioSolicitado: false,
          propuestaEmpleado: null,
        },
      });

      await tx.campanaVacaciones.update({
        where: { id: campanaId },
        data: {
          propuestaIA: null,
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



