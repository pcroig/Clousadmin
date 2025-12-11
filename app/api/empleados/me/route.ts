// ========================================
// API Route: Get Current Employee
// ========================================

import { NextRequest } from 'next/server';

import { handleApiError, notFoundResponse, requireAuth, successResponse } from '@/lib/api-handler';
import { mapJornadaConNombreYEtiqueta } from '@/lib/jornadas/mappers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Buscar empleado por usuarioId
    const empleado = await prisma.empleados.findUnique({
      where: { usuarioId: session.user.id },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        empresaId: true,
        jornadaId: true,
        equipos: {
          select: {
            equipoId: true,
          },
        },
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    // Resolver jornada efectiva (individual > equipo > empresa)
    const equipoIds = empleado.equipos
      .map(eq => eq.equipoId)
      .filter((id): id is string => Boolean(id));

    const { obtenerJornadaEmpleado } = await import('@/lib/jornadas/helpers');
    const jornadaInfo = await obtenerJornadaEmpleado({
      empleadoId: empleado.id,
      equipoIds,
      jornadaIdDirecta: empleado.jornadaId,
    });

    // Obtener datos completos de la jornada si existe
    let jornadaConNombre = null;
    if (jornadaInfo && jornadaInfo.jornadaId) {
      const jornada = await prisma.jornadas.findUnique({
        where: { id: jornadaInfo.jornadaId },
        select: {
          id: true,
          horasSemanales: true,
          config: true,
        },
      });

      if (jornada) {
        jornadaConNombre = mapJornadaConNombreYEtiqueta(jornada);
      }
    }

    // Construir respuesta
    const empleadoConJornadaNombre = {
      id: empleado.id,
      nombre: empleado.nombre,
      apellidos: empleado.apellidos,
      email: empleado.email,
      empresaId: empleado.empresaId,
      jornada: jornadaConNombre,
    };

    return successResponse(empleadoConJornadaNombre);
  } catch (error) {
    return handleApiError(error, 'API GET /api/empleados/me');
  }
}






