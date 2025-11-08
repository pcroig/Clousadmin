// ========================================
// API Route: Cerrar Campaña de Vacaciones
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

// POST /api/campanas-vacaciones/[id]/cerrar - Cerrar campaña y opcionalmente cuadrar
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR Admin o Manager
    if (session.user.rol !== UsuarioRol.hr_admin && session.user.rol !== UsuarioRol.manager) {
      return badRequestResponse('No tienes permisos para cerrar campañas');
    }

    const { id: campanaId } = await params;

    // Verificar que la campaña existe y pertenece a la empresa
    const campana = await prisma.campanaVacaciones.findFirst({
      where: {
        id: campanaId,
        empresaId: session.user.empresaId,
      },
      include: {
        preferencias: {
          where: {
            completada: true,
          },
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                diasVacaciones: true,
              },
            },
          },
        },
      },
    });

    if (!campana) {
      return badRequestResponse('Campaña no encontrada');
    }

    if (campana.estado !== 'abierta') {
      return badRequestResponse('La campaña ya está cerrada');
    }

    // Verificar si hay preferencias completadas
    if (campana.preferencias.length === 0) {
      return badRequestResponse('No hay empleados que hayan completado sus preferencias');
    }

    // Cerrar campaña
    await prisma.campanaVacaciones.update({
      where: { id: campanaId },
      data: {
        estado: 'cerrada',
        cerradaEn: new Date(),
      },
    });

    console.info(`[Campaña] Campaña ${campanaId} cerrada por ${session.user.email}`);

    return successResponse({
      message: 'Campaña cerrada correctamente',
      campanaId,
      empleadosCompletados: campana.preferencias.length,
      totalEmpleados: campana.totalEmpleadosAsignados,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/campanas-vacaciones/[id]/cerrar');
  }
}






