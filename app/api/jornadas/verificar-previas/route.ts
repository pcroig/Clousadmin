// ========================================
// API Jornadas - Verificar Jornadas Previas
// ========================================

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

const verificarSchema = z.object({
  nivel: z.enum(['empresa', 'equipo', 'individual']),
  equipoIds: z.array(z.string().uuid()).optional(),
  empleadoIds: z.array(z.string().uuid()).optional(),
});

// GET /api/jornadas/verificar-previas - Verificar jornadas previas antes de asignar
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Obtener parámetros de query
    const { searchParams } = new URL(req.url);
    const nivel = searchParams.get('nivel') as 'empresa' | 'equipo' | 'individual' | null;
    const equipoIds = searchParams.get('equipoIds')?.split(',') || [];
    const empleadoIds = searchParams.get('empleadoIds')?.split(',') || [];

    if (!nivel) {
      return badRequestResponse('Nivel de asignación requerido');
    }

    let empleadosConJornadas: any[] = [];

    switch (nivel) {
      case 'empresa':
        empleadosConJornadas = await prisma.empleado.findMany({
          where: {
            empresaId: session.user.empresaId,
            activo: true,
            jornadaId: { not: null },
          },
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            jornadaId: true,
            jornada: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        });
        break;

      case 'equipo':
        if (!equipoIds || equipoIds.length === 0) {
          return badRequestResponse('Debes especificar al menos un equipo');
        }
        const miembrosEquipos = await prisma.empleadoEquipo.findMany({
          where: {
            equipoId: { in: equipoIds },
          },
          select: {
            empleadoId: true,
          },
        });
        const empleadoIdsEquipos = [...new Set(miembrosEquipos.map(m => m.empleadoId))];
        
        if (empleadoIdsEquipos.length > 0) {
          empleadosConJornadas = await prisma.empleado.findMany({
            where: {
              id: { in: empleadoIdsEquipos },
              empresaId: session.user.empresaId,
              activo: true,
              jornadaId: { not: null },
            },
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              jornadaId: true,
              jornada: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          });
        }
        break;

      case 'individual':
        if (!empleadoIds || empleadoIds.length === 0) {
          return badRequestResponse('Debes especificar al menos un empleado');
        }
        empleadosConJornadas = await prisma.empleado.findMany({
          where: {
            id: { in: empleadoIds },
            empresaId: session.user.empresaId,
            activo: true,
            jornadaId: { not: null },
          },
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            jornadaId: true,
            jornada: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        });
        break;
    }

    // Agrupar por jornada
    const jornadasPorNombre: Record<string, { nombre: string; cantidad: number; empleadoIds: string[] }> = {};
    
    empleadosConJornadas.forEach(empleado => {
      const nombreJornada = empleado.jornada?.nombre || 'Sin nombre';
      if (!jornadasPorNombre[nombreJornada]) {
        jornadasPorNombre[nombreJornada] = {
          nombre: nombreJornada,
          cantidad: 0,
          empleadoIds: [],
        };
      }
      jornadasPorNombre[nombreJornada].cantidad++;
      jornadasPorNombre[nombreJornada].empleadoIds.push(empleado.id);
    });

    return successResponse({
      tieneJornadasPrevias: empleadosConJornadas.length > 0,
      totalEmpleados: empleadosConJornadas.length,
      jornadas: Object.values(jornadasPorNombre),
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/jornadas/verificar-previas');
  }
}












