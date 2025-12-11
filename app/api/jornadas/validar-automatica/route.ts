// ========================================
// POST /api/jornadas/validar-automatica
// ========================================
// Valida si hay jornada automática para un empleado nuevo
// Retorna información sobre la asignación automática disponible

import { NextRequest } from 'next/server';
import { requireAuthAsHR, handleApiError, successResponse } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const auth = await requireAuthAsHR(req);
  if (auth instanceof Response) return auth;

  try {
    const { session } = auth;
    const body = (await req.json()) as { equipoIds?: unknown };
    const equipoIds = Array.isArray(body.equipoIds) ? body.equipoIds : [];

    // Validar que equipoIds sea un array de strings
    if (!equipoIds.every((id: unknown) => typeof id === 'string')) {
      return handleApiError(
        new Error('equipoIds debe ser un array de strings'),
        'API POST /api/jornadas/validar-automatica'
      );
    }

    // PASO 1: Verificar si hay jornada de equipo (prioridad más alta)
    if (equipoIds.length > 0) {
      const asignacionesEquipo = await prisma.jornada_asignaciones.findMany({
        where: {
          nivelAsignacion: 'equipo',
        },
      });

      for (const asignacion of asignacionesEquipo) {
        let equipoIdsAsignados: string[] = [];

        if (Array.isArray(asignacion.equipoIds)) {
          equipoIdsAsignados = asignacion.equipoIds as string[];
        } else if (typeof asignacion.equipoIds === 'string') {
          try {
            const parsed = JSON.parse(asignacion.equipoIds);
            if (Array.isArray(parsed)) {
              equipoIdsAsignados = parsed.filter((item): item is string => typeof item === 'string');
            }
          } catch {
            // Ignorar
          }
        }

        const tieneEquipoConJornada = (equipoIds as string[]).some((equipoId) =>
          equipoIdsAsignados.includes(equipoId)
        );

        if (tieneEquipoConJornada) {
          const jornada = await prisma.jornadas.findUnique({
            where: { id: asignacion.jornadaId },
            select: {
              horasSemanales: true,
            },
          });

          return successResponse({
            tieneAsignacionAutomatica: true,
            jornadaId: asignacion.jornadaId,
            origen: 'equipo',
            mensaje: `Se asignará la jornada del equipo: ${jornada?.horasSemanales}h`,
          });
        }
      }
    }

    // PASO 2: Verificar si hay jornada de empresa (segunda prioridad)
    const asignacionEmpresa = await prisma.jornada_asignaciones.findFirst({
      where: {
        empresaId: session.user.empresaId,
        nivelAsignacion: 'empresa',
      },
    });

    if (asignacionEmpresa) {
      const jornada = await prisma.jornadas.findUnique({
        where: { id: asignacionEmpresa.jornadaId },
        select: {
          horasSemanales: true,
        },
      });

      return successResponse({
        tieneAsignacionAutomatica: true,
        jornadaId: asignacionEmpresa.jornadaId,
        origen: 'empresa',
        mensaje: `Se asignará la jornada de empresa: ${jornada?.horasSemanales}h`,
      });
    }

    // PASO 3: No hay asignación automática
    return successResponse({
      tieneAsignacionAutomatica: false,
      jornadaId: null,
      origen: null,
      mensaje: 'No hay jornada asignada automáticamente. Debes seleccionar una jornada.',
    });
  } catch (error) {
    console.error('[POST /api/jornadas/validar-automatica] Error:', error);
    return handleApiError(error, 'API POST /api/jornadas/validar-automatica');
  }
}
