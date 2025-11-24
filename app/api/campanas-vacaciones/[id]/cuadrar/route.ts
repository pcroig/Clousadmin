// ========================================
// API Route: Cuadrar Vacaciones con IA
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { EstadoAusencia, UsuarioRol } from '@/lib/constants/enums';
import { cuadrarVacacionesIA } from '@/lib/ia/cuadrar-vacaciones';
import { prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// POST /api/campanas-vacaciones/[id]/cuadrar - Ejecutar IA para cuadrar vacaciones
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR Admin o Manager
    if (session.user.rol !== UsuarioRol.hr_admin && session.user.rol !== UsuarioRol.manager) {
      return badRequestResponse('No tienes permisos para cuadrar campañas');
    }

    const { id: campanaId } = await params;

    // Obtener campaña con preferencias completas
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
                usuarioId: true,
                equipos: {
                  include: {
                    equipo: {
                      select: {
                        id: true,
                        nombre: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!campana) {
      return badRequestResponse('Campaña no encontrada');
    }

    if (campana.estado === 'finalizada') {
      return badRequestResponse('La campaña ya fue finalizada');
    }

    if (campana.preferencias.length === 0) {
      return badRequestResponse('No hay empleados con preferencias completadas');
    }

    // Obtener ausencias ya aprobadas que puedan afectar el cuadrado
    const empleadoIds = campana.preferencias.map(p => p.empleado.id);
    const ausenciasAprobadas = await prisma.ausencia.findMany({
      where: {
        empleadoId: { in: empleadoIds },
        estado: { in: [EstadoAusencia.confirmada, EstadoAusencia.completada] },
        tipo: 'vacaciones',
      },
    });

    console.info(`[Cuadrar] Iniciando cuadrado de campaña ${campanaId} con ${campana.preferencias.length} empleados`);

    // Ejecutar IA
    const resultado = await cuadrarVacacionesIA({
      empresaId: session.user.empresaId,
      campanaId,
      solapamientoMaximoPct: campana.solapamientoMaximoPct,
      preferencias: campana.preferencias,
      ausenciasAprobadas,
      fechaInicioObjetivo: campana.fechaInicioObjetivo,
      fechaFinObjetivo: campana.fechaFinObjetivo,
    });

    // Guardar resultado en la campaña sin cerrar aún
    await prisma.campanaVacaciones.update({
      where: { id: campanaId },
      data: {
        propuestaIA: asJsonValue(resultado),
        estado: 'borrador_generado',
      },
    });

    // Guardar propuestas individuales en cada preferencia
    for (const propuesta of resultado.propuestas) {
      await prisma.preferenciaVacaciones.updateMany({
        where: {
          campanaId,
          empleadoId: propuesta.empleadoId,
        },
        data: {
          propuestaIA: asJsonValue(propuesta),
        },
      });
    }

    console.info(`[Cuadrar] Campaña ${campanaId} - borrador generado con ${resultado.propuestas.length} propuestas`);

    return successResponse({
      message: 'Borrador generado. Revisa y decide siguiente paso.',
      resultado,
    });
  } catch (error) {
    console.error('[Cuadrar] Error al cuadrar vacaciones:', error);
    return handleApiError(error, 'API POST /api/campanas-vacaciones/[id]/cuadrar');
  }
}

