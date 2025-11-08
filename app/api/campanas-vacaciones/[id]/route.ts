// ========================================
// API Route: Campaña de Vacaciones (Individual)
// ========================================

import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { UsuarioRol } from '@/lib/constants/enums';

import {
  requireAuth,
  handleApiError,
  successResponse,
  badRequestResponse,
} from '@/lib/api-handler';

// GET /api/campanas-vacaciones/[id] - Obtener detalle de campaña
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Buscar campaña con estadísticas
    const campana = await prisma.campanaVacaciones.findFirst({
      where: {
        id,
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
              }
            }
          },
          orderBy: [
            { completada: 'desc' }, // Completadas primero
            { empleado: { apellidos: 'asc' } }
          ]
        }
      }
    });

    if (!campana) {
      return badRequestResponse('Campaña no encontrada');
    }

    // Calcular estadísticas
    const totalEmpleados = campana.preferencias.length;
    const completados = campana.preferencias.filter(p => p.completada).length;
    const pendientes = totalEmpleados - completados;

    return successResponse({
      ...campana,
      estadisticas: {
        totalEmpleados,
        completados,
        pendientes,
        porcentajeCompletado: totalEmpleados > 0 
          ? Math.round((completados / totalEmpleados) * 100) 
          : 0,
      }
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/campanas-vacaciones/[id]');
  }
}

// PATCH /api/campanas-vacaciones/[id] - Actualizar campaña (cerrar, etc.)
export async function PATCH(
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
      return badRequestResponse('No tienes permisos para actualizar campañas');
    }

    const { id } = await params;
    const body = await req.json();

    // Verificar que la campaña existe y pertenece a la empresa
    const campana = await prisma.campanaVacaciones.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      }
    });

    if (!campana) {
      return badRequestResponse('Campaña no encontrada');
    }

    // Actualizar estado
    const updatedCampana = await prisma.campanaVacaciones.update({
      where: { id },
      data: {
        ...(body.estado && { estado: body.estado }),
        ...(body.estado === 'cerrada' && { cerradaEn: new Date() }),
        ...(body.solapamientoMaximoPct !== undefined && { 
          solapamientoMaximoPct: body.solapamientoMaximoPct 
        }),
      },
      include: {
        preferencias: {
          include: {
            empleado: {
              select: {
                nombre: true,
                apellidos: true,
                fotoUrl: true,
              }
            }
          }
        }
      }
    });

    return successResponse(updatedCampana);
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/campanas-vacaciones/[id]');
  }
}

