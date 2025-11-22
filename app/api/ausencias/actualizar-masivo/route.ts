// ========================================
// API Actualizar Ausencias Masivo
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  handleApiError,
  notFoundResponse,
  requireAuthAsHROrManager,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { actualizarSaldo } from '@/lib/calculos/ausencias';
import { EstadoAusencia, UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

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
    if (session.user.rol === UsuarioRol.manager && session.user.empleadoId) {
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
        estado: EstadoAusencia.pendiente, // Solo ausencias pendientes
      },
      include: {
        empleado: true,
      },
    });

    if (ausencias.length === 0) {
      return notFoundResponse('No se encontraron ausencias pendientes');
    }

    // 4. Preparar validaciones y datos intermedios
    const resultados = {
      exitosas: 0,
      fallidas: 0,
      errores: [] as string[],
    };

    const ausenciasProcesables: typeof ausencias = [];

    for (const ausencia of ausencias) {
      if (session.user.rol === UsuarioRol.manager && empleadoManager) {
        const equiposManager = empleadoManager.equipos.map((e) => e.equipo.id);
        if (ausencia.equipoId && !equiposManager.includes(ausencia.equipoId)) {
          resultados.errores.push(
            `No tienes permiso para gestionar la ausencia de ${ausencia.empleado.nombre}`
          );
          resultados.fallidas++;
          continue;
        }
      }

      ausenciasProcesables.push(ausencia);
    }

    if (ausenciasProcesables.length === 0) {
      return successResponse({
        success: true,
        mensaje: 'No se procesó ninguna ausencia',
        resultados,
      });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const aprobadaEn = new Date();

    try {
      await prisma.$transaction(async (tx) => {
        if (validatedData.accion === 'aprobar') {
          const idsConfirmadas: string[] = [];
          const idsCompletadas: string[] = [];

          ausenciasProcesables.forEach((ausencia) => {
            const fechaFin = new Date(ausencia.fechaFin);
            fechaFin.setHours(0, 0, 0, 0);
            if (fechaFin < hoy) {
              idsCompletadas.push(ausencia.id);
            } else {
              idsConfirmadas.push(ausencia.id);
            }
          });

          if (idsConfirmadas.length > 0) {
            await tx.ausencia.updateMany({
              where: { id: { in: idsConfirmadas } },
              data: {
                estado: EstadoAusencia.confirmada,
                aprobadaPor: session.user.id,
                aprobadaEn,
                motivoRechazo: null,
              },
            });
          }

          if (idsCompletadas.length > 0) {
            await tx.ausencia.updateMany({
              where: { id: { in: idsCompletadas } },
              data: {
                estado: EstadoAusencia.completada,
                aprobadaPor: session.user.id,
                aprobadaEn,
                motivoRechazo: null,
              },
            });
          }

          for (const ausencia of ausenciasProcesables) {
            if (ausencia.descuentaSaldo) {
              const año = new Date(ausencia.fechaInicio).getFullYear();
              await actualizarSaldo(
                ausencia.empleadoId,
                año,
                'aprobar',
                Number(ausencia.diasSolicitados),
                tx
              );
            }
          }
        } else {
          await tx.ausencia.updateMany({
            where: { id: { in: ausenciasProcesables.map((a) => a.id) } },
            data: {
              estado: EstadoAusencia.rechazada,
              aprobadaPor: session.user.id,
              aprobadaEn,
              motivoRechazo: validatedData.motivoRechazo,
            },
          });

          for (const ausencia of ausenciasProcesables) {
            if (ausencia.descuentaSaldo) {
              const año = new Date(ausencia.fechaInicio).getFullYear();
              await actualizarSaldo(
                ausencia.empleadoId,
                año,
                'rechazar',
                Number(ausencia.diasSolicitados),
                tx
              );
            }
          }
        }
      });

      resultados.exitosas += ausenciasProcesables.length;
    } catch (error) {
      console.error('[Actualizar Ausencias Masivo] Error en transacción:', error);
      resultados.errores.push('Error al procesar las ausencias seleccionadas');
      resultados.fallidas += ausenciasProcesables.length;
      return successResponse({
        success: false,
        mensaje: 'No se pudieron procesar las ausencias seleccionadas',
        resultados,
      });
    }

    return successResponse({
      success: true,
      mensaje: `Procesadas ${resultados.exitosas} ausencias correctamente`,
      resultados,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/ausencias/actualizar-masivo');
  }
}

