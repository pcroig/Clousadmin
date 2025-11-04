// ========================================
// API Actualizar Ausencias Masivo
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { actualizarSaldo } from '@/lib/calculos/ausencias';
import {
  requireAuthAsHROrManager,
  validateRequest,
  handleApiError,
  successResponse,
  notFoundResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import { z } from 'zod';

const actualizarMasivoSchema = z.object({
  ausenciasIds: z.array(z.string().uuid()),
  accion: z.enum(['aprobar', 'rechazar']),
  motivoRechazo: z.string().optional(),
});

// POST /api/ausencias/actualizar-masivo - Procesar múltiples ausencias (HR Admin o Manager)
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin o Manager
    const authResult = await requireAuthAsHROrManager(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Obtener información del empleado si es manager
    let empleadoManager = null;
    if (session.user.rol === 'manager' && session.user.empleadoId) {
      empleadoManager = await prisma.empleado.findUnique({
        where: { id: session.user.empleadoId },
        include: { equipos: { include: { equipo: true } } }
      });
    }

    // Validar request body
    const validationResult = await validateRequest(req, actualizarMasivoSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    if (validatedData.accion === 'rechazar' && !validatedData.motivoRechazo) {
      return badRequestResponse('El motivo de rechazo es obligatorio');
    }

    // 3. Obtener todas las ausencias
    const ausencias = await prisma.ausencia.findMany({
      where: {
        id: { in: validatedData.ausenciasIds },
        empresaId: session.user.empresaId,
        estado: 'pendiente_aprobacion', // Solo ausencias pendientes
      },
      include: {
        empleado: true,
      },
    });

    if (ausencias.length === 0) {
      return notFoundResponse('No se encontraron ausencias pendientes');
    }

    // 4. Procesar en lote
    const resultados = {
      exitosas: 0,
      fallidas: 0,
      errores: [] as string[],
    };

    for (const ausencia of ausencias) {
      try {
        // Verificar permisos si es manager (solo su equipo)
        if (session.user.rol === 'manager' && empleadoManager) {
          const equiposManager = empleadoManager.equipos.map(e => e.equipo.id);
          if (ausencia.equipoId && !equiposManager.includes(ausencia.equipoId)) {
            resultados.errores.push(
              `No tienes permiso para gestionar la ausencia de ${ausencia.empleado.nombre}`
            );
            resultados.fallidas++;
            continue;
          }
        }

        // Actualizar ausencia
        if (validatedData.accion === 'aprobar') {
          // Determinar estado: en_curso si aún no pasó, completada si ya pasó
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          const fechaFin = new Date(ausencia.fechaFin);
          fechaFin.setHours(0, 0, 0, 0);
          const estadoAprobado = fechaFin < hoy ? 'completada' : 'en_curso';

          await prisma.ausencia.update({
            where: { id: ausencia.id },
            data: {
              estado: estadoAprobado,
              aprobadaPor: session.user.id,
              aprobadaEn: new Date(),
            },
          });

          // Actualizar saldo: diasPendientes -> diasUsados
          if (ausencia.descuentaSaldo) {
            const año = new Date(ausencia.fechaInicio).getFullYear();
            await actualizarSaldo(
              ausencia.empleadoId,
              año,
              'aprobar',
              Number(ausencia.diasSolicitados)
            );
          }

          resultados.exitosas++;
        } else if (validatedData.accion === 'rechazar') {
          await prisma.ausencia.update({
            where: { id: ausencia.id },
            data: {
              estado: 'rechazada',
              aprobadaPor: session.user.id,
              aprobadaEn: new Date(),
              motivoRechazo: validatedData.motivoRechazo,
            },
          });

          // Actualizar saldo: diasPendientes -> liberar
          if (ausencia.descuentaSaldo) {
            const año = new Date(ausencia.fechaInicio).getFullYear();
            await actualizarSaldo(
              ausencia.empleadoId,
              año,
              'rechazar',
              Number(ausencia.diasSolicitados)
            );
          }

          resultados.exitosas++;
        }
      } catch (error) {
        console.error(`Error procesando ausencia ${ausencia.id}:`, error);
        resultados.errores.push(
          `Error al procesar ausencia de ${ausencia.empleado.nombre}`
        );
        resultados.fallidas++;
      }
    }

    // Retornar resumen
    return successResponse({
      success: true,
      mensaje: `Procesadas ${resultados.exitosas} ausencias correctamente`,
      resultados,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/ausencias/actualizar-masivo');
  }
}

