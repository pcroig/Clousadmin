// ========================================
// API Route: Enviar Propuesta de Vacaciones a Empleados
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
import { crearNotificacionCampanaCuadrada } from '@/lib/notificaciones';

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
      return badRequestResponse('No tienes permisos para enviar propuestas');
    }

    const { id: campanaId } = await params;

    const campana = await prisma.campanaVacaciones.findFirst({
      where: {
        id: campanaId,
        empresaId: session.user.empresaId,
      },
      include: {
        preferencias: {
          include: {
            empleado: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!campana) {
      return badRequestResponse('Campaña no encontrada');
    }

    if (!campana.propuestaIA) {
      return badRequestResponse('No hay un borrador de propuestas para enviar');
    }

    const preferenciasConPropuesta = campana.preferencias.filter(
      (pref) => pref.propuestaIA !== null
    );

    if (preferenciasConPropuesta.length === 0) {
      return badRequestResponse('No hay propuestas disponibles para enviar');
    }

    const preferenciaIds = preferenciasConPropuesta.map((pref) => pref.id);

    await prisma.$transaction(async (tx) => {
      await tx.preferenciaVacaciones.updateMany({
        where: {
          id: { in: preferenciaIds },
        },
        data: {
          propuestaEnviada: true,
          cambioSolicitado: false,
        },
      });

      await tx.campanaVacaciones.update({
        where: { id: campanaId },
        data: {
          estado: 'propuesta_enviada',
        },
      });
    });

    const empleadosIds = preferenciasConPropuesta.map((pref) => pref.empleado.id);

    await crearNotificacionCampanaCuadrada(prisma, {
      campanaId,
      empresaId: session.user.empresaId,
      empleadosIds,
      titulo: campana.titulo,
    });

    return successResponse({
      enviados: empleadosIds.length,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/campanas-vacaciones/[id]/enviar-propuesta');
  }
}




