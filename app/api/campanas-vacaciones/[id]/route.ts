// ========================================
// API Route: Single Campaign by ID
// ========================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  handleApiError,
  successResponse,
  badRequestResponse,
} from '@/lib/api-handler';

// GET /api/campanas-vacaciones/[id] - Obtener campaña específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

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
                nombre: true,
                apellidos: true,
                fotoUrl: true,
                email: true,
                equipos: {
                  include: {
                    equipo: {
                      select: {
                        id: true,
                        nombre: true,
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            empleado: {
              nombre: 'asc',
            }
          }
        },
        _count: {
          select: {
            preferencias: true
          }
        }
      }
    });

    if (!campana) {
      return badRequestResponse('Campaña no encontrada');
    }

    // Serialize dates for client
    const campanaData = {
      id: campana.id,
      titulo: campana.titulo,
      estado: campana.estado,
      fechaInicioObjetivo: campana.fechaInicioObjetivo.toISOString().split('T')[0],
      fechaFinObjetivo: campana.fechaFinObjetivo.toISOString().split('T')[0],
      totalEmpleadosAsignados: campana.totalEmpleadosAsignados,
      empleadosCompletados: campana.empleadosCompletados,
      propuestaIA: campana.propuestaIA as Record<string, unknown> | null,
      finalizadaEn: campana.finalizadaEn?.toISOString() || null,
      preferencias: campana.preferencias.map(pref => ({
        id: pref.id,
        empleadoId: pref.empleadoId,
        completada: pref.completada,
        aceptada: pref.aceptada,
        cambioSolicitado: pref.cambioSolicitado,
        diasIdeales: pref.diasIdeales as string[] | null,
        diasPrioritarios: pref.diasPrioritarios as string[] | null,
        diasAlternativos: pref.diasAlternativos as string[] | null,
        propuestaIA: pref.propuestaIA as Record<string, unknown> | null,
        propuestaEmpleado: pref.propuestaEmpleado as Record<string, unknown> | null,
        empleado: {
          id: pref.empleado.id,
          nombre: pref.empleado.nombre,
          apellidos: pref.empleado.apellidos,
          fotoUrl: pref.empleado.fotoUrl,
          email: pref.empleado.email,
          equipos: pref.empleado.equipos.map(eq => ({
            equipoId: eq.equipoId,
            nombre: eq.equipo?.nombre || null,
          })),
        },
      })),
    };

    return successResponse(campanaData);
  } catch (error) {
    return handleApiError(error, 'API GET /api/campanas-vacaciones/[id]');
  }
}
