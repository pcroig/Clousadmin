// ========================================
// API: Auto-aprobar Solicitudes Pendientes
// ========================================
// POST: Aprobar automáticamente todas las solicitudes pendientes

import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { handleApiError, requireAuthAsHROrManager } from '@/lib/api-handler';
import { registrarAutoCompletadoAusencia, registrarAutoCompletadoSolicitud } from '@/lib/auto-completado';
import { EstadoAusencia, EstadoSolicitud } from '@/lib/constants/enums';
import { 
  crearNotificacionAusenciaAprobada,
  crearNotificacionSolicitudAprobada 
} from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { aplicarCambiosSolicitud } from '@/lib/solicitudes/aplicar-cambios';
import { resolveAprobadorEmpleadoId } from '@/lib/solicitudes/aprobador';

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin o Manager
    const authResult = await requireAuthAsHROrManager(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const ahora = new Date();
    const aprobadorEmpleadoId = await resolveAprobadorEmpleadoId(
      prisma,
      session,
      'AUTOAPROBAR Solicitudes'
    );

    // 1. Obtener todas las ausencias pendientes de la empresa
    const ausenciasPendientes = await prisma.ausencia.findMany({
      where: {
        empresaId: session.user.empresaId,
        estado: EstadoAusencia.pendiente,
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            usuario: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    // 2. Obtener todas las solicitudes de cambio pendientes
    const solicitudesPendientes = await prisma.solicitudCambio.findMany({
      where: {
        empresaId: session.user.empresaId,
        estado: {
          in: [EstadoSolicitud.pendiente, EstadoSolicitud.requiere_revision],
        },
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            usuario: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    let ausenciasAprobadas = 0;
    let solicitudesAprobadas = 0;
    const errores: string[] = [];

    // 3. Aprobar todas las ausencias (cada una en su propia transacción)
    for (const ausencia of ausenciasPendientes) {
      try {
        await prisma.$transaction(async (tx) => {
          // Determinar estado: en_curso si aún no pasó, completada si ya pasó
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          const fechaFin = new Date(ausencia.fechaFin);
          fechaFin.setHours(0, 0, 0, 0);

          const nuevoEstado =
            fechaFin < hoy ? EstadoAusencia.completada : EstadoAusencia.confirmada;

          // Actualizar ausencia
          const updatedAusencia = await tx.ausencia.update({
            where: { id: ausencia.id },
            data: {
              estado: nuevoEstado,
              aprobadaPor: session.user.id,
              aprobadaEn: ahora,
            },
          });

          // Actualizar saldo si descuenta (inlinear la lógica para mantenerla en la transacción)
          if (ausencia.descuentaSaldo) {
            const año = ausencia.fechaInicio.getFullYear();
            const diasSolicitados = Number(ausencia.diasSolicitados);

            // Obtener o crear saldo
            let saldo = await tx.empleadoSaldoAusencias.findFirst({
              where: {
                empleadoId: ausencia.empleadoId,
                año,
              },
            });

            if (!saldo) {
              const empleado = await tx.empleado.findUnique({
                where: { id: ausencia.empleadoId },
                select: { diasVacaciones: true, empresaId: true },
              });

              if (!empleado) {
                throw new Error('Empleado no encontrado');
              }

              saldo = await tx.empleadoSaldoAusencias.create({
                data: {
                  empleadoId: ausencia.empleadoId,
                  empresaId: empleado.empresaId,
                  año,
                  diasTotales: empleado.diasVacaciones,
                  diasUsados: 0,
                  diasPendientes: 0,
                  origen: 'manual_hr',
                },
              });
            }

            // Mover días de pendientes a usados
            await tx.empleadoSaldoAusencias.update({
              where: { id: saldo.id },
              data: {
                diasPendientes: { decrement: diasSolicitados },
                diasUsados: { increment: diasSolicitados },
              },
            });
          }

          await registrarAutoCompletadoAusencia(tx, {
            empresaId: session.user.empresaId,
            ausenciaId: ausencia.id,
            empleadoId: ausencia.empleadoId,
            tipoAusencia: ausencia.tipo,
            fechaInicio: ausencia.fechaInicio,
            fechaFin: ausencia.fechaFin,
            aprobadoPor: session.user.id,
            origen: 'auto_aprobar_batch',
          });

          return updatedAusencia;
        });

        // Notificar al empleado que su ausencia fue aprobada
        await crearNotificacionAusenciaAprobada(prisma, {
          ausenciaId: ausencia.id,
          empresaId: session.user.empresaId,
          empleadoId: ausencia.empleadoId,
          empleadoNombre: `${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}`,
          tipo: ausencia.tipo,
          fechaInicio: ausencia.fechaInicio,
          fechaFin: ausencia.fechaFin,
        });

        ausenciasAprobadas++;
      } catch (error) {
        const errorMsg = `Error al aprobar ausencia ${ausencia.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
        console.error(`[AUTOAPROBAR] ${errorMsg}`);
        errores.push(errorMsg);
      }
    }

    // 4. Aprobar todas las solicitudes de cambio (cada una en su propia transacción)
    for (const solicitud of solicitudesPendientes) {
      try {
        await prisma.$transaction(async (tx) => {
          // Actualizar solicitud
          const updatedSolicitud = await tx.solicitudCambio.update({
            where: { id: solicitud.id },
            data: {
              estado: EstadoSolicitud.auto_aprobada,
              aprobadorId: aprobadorEmpleadoId,
              fechaRespuesta: ahora,
            },
          });

          // Aplicar cambios al empleado con validación y cifrado
          if (solicitud.camposCambiados && typeof solicitud.camposCambiados === 'object') {
            await aplicarCambiosSolicitud(
              tx,
              solicitud.id,
              solicitud.empleadoId,
              solicitud.camposCambiados as Record<string, unknown>
            );
          }
          await registrarAutoCompletadoSolicitud(tx, {
            empresaId: session.user.empresaId,
            solicitudId: solicitud.id,
            empleadoId: solicitud.empleadoId,
            tipoSolicitud: solicitud.tipo,
            camposCambiados: solicitud.camposCambiados as Prisma.JsonValue,
            aprobadoPor: session.user.id,
            origen: 'auto_aprobar_batch',
          });

          return updatedSolicitud;
        });

        // Notificar al empleado que su solicitud fue aprobada
        await crearNotificacionSolicitudAprobada(prisma, {
          solicitudId: solicitud.id,
          empresaId: session.user.empresaId,
          empleadoId: solicitud.empleadoId,
          tipo: solicitud.tipo,
          aprobadoPor: 'manual', // Aprobada por HR/Admin manualmente
        });

        solicitudesAprobadas++;
      } catch (error) {
        const errorMsg = `Error al aprobar solicitud ${solicitud.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
        console.error(`[AUTOAPROBAR] ${errorMsg}`);
        errores.push(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${ausenciasAprobadas} ausencias y ${solicitudesAprobadas} solicitudes aprobadas automáticamente${errores.length > 0 ? ` (${errores.length} errores)` : ''}`,
      ausenciasAprobadas,
      solicitudesAprobadas,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/solicitudes/autoaprobar');
  }
}
