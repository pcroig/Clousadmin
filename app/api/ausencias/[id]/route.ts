// ========================================
// API Route: Ausencias [ID]
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { actualizarSaldo, calcularDias, validarSaldoSuficiente, validarPoliticasEquipo } from '@/lib/calculos/ausencias';
import {
  requireAuth,
  requireAuthAsHROrManager,
  validateRequest,
  handleApiError,
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import {
  crearNotificacionAusenciaAprobada,
  crearNotificacionAusenciaRechazada,
  crearNotificacionAusenciaCancelada,
} from '@/lib/notificaciones';
import { CalendarManager } from '@/lib/integrations/calendar/calendar-manager';
import { z } from 'zod';

import { EstadoAusencia, UsuarioRol } from '@/lib/constants/enums';

// Schema para aprobar/rechazar
const ausenciaAccionSchema = z.object({
  accion: z.enum(['aprobar', 'rechazar']),
  motivoRechazo: z.string().optional(),
});

// Schema para editar ausencia
      const ausenciaEditarSchema = z.object({
        tipo: z.enum(['vacaciones', 'enfermedad', 'enfermedad_familiar', 'maternidad_paternidad', 'otro']).optional(),
        fechaInicio: z.string().optional(),
        fechaFin: z.string().optional(),
        medioDia: z.boolean().optional(),
        motivo: z.string().nullable().optional(),
        descripcion: z.string().nullable().optional(),
        justificanteUrl: z.string().url().nullable().optional(),
        estado: z.enum(['pendiente', 'confirmada', 'completada', 'rechazada']).optional(),
      }).refine((data) => {
  // Si hay fechas, validar que fechaFin >= fechaInicio
  if (data.fechaInicio && data.fechaFin) {
    return new Date(data.fechaFin) >= new Date(data.fechaInicio);
  }
  return true;
}, {
  message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
  path: ['fechaFin'],
});

// PATCH /api/ausencias/[id] - Aprobar/Rechazar o Editar ausencia (HR Admin o Manager)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación y rol HR Admin o Manager
    const authResult = await requireAuthAsHROrManager(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Verificar que la ausencia existe y es de la misma empresa
    const ausencia = await prisma.ausencia.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      }
    });

    if (!ausencia) {
      return notFoundResponse('Ausencia no encontrada');
    }

    // Si es manager, verificar que la ausencia es de un empleado a su cargo
    if (session.user.rol === UsuarioRol.manager) {
      if (!session.user.empleadoId) {
        return forbiddenResponse('No tienes un empleado asignado. Contacta con HR.');
      }

      const empleado = await prisma.empleado.findUnique({
        where: { id: ausencia.empleadoId },
        select: { managerId: true },
      });

      if (!empleado || empleado.managerId !== session.user.empleadoId) {
        return forbiddenResponse('Solo puedes aprobar ausencias de empleados a tu cargo');
      }
    }

    // Leer body para determinar el tipo de operación
    const body = await req.json();

    // Detectar si es aprobar/rechazar o edición
    if (body.accion && (body.accion === 'aprobar' || body.accion === 'rechazar')) {
      // MODO 1: Aprobar/Rechazar
      const validationResult = ausenciaAccionSchema.safeParse(body);
      if (!validationResult.success) {
        return badRequestResponse(validationResult.error.issues[0]?.message || 'Datos inválidos');
      }
      const validatedData = validationResult.data;
      
      const { accion, motivoRechazo } = validatedData;

    // Determinar estado resultante
    let nuevoEstado: EstadoAusencia = EstadoAusencia.rechazada;
    if (accion === 'aprobar') {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaFin = new Date(ausencia.fechaFin);
      fechaFin.setHours(0, 0, 0, 0);
      
      nuevoEstado = fechaFin < hoy ? EstadoAusencia.completada : EstadoAusencia.confirmada;

      // Validar saldo suficiente antes de aprobar si la ausencia descuenta saldo
      if (ausencia.descuentaSaldo) {
        const año = ausencia.fechaInicio.getFullYear();
        const diasSolicitados = Number(ausencia.diasSolicitados);
        
        const validacion = await validarSaldoSuficiente(
          ausencia.empleadoId,
          año,
          diasSolicitados
        );

        if (!validacion.suficiente) {
          return badRequestResponse(
            validacion.mensaje || 'El empleado no tiene saldo suficiente para aprobar esta ausencia',
            {
              saldoDisponible: validacion.saldoActual,
              diasSolicitados: diasSolicitados,
            }
          );
        }
      }
    }

      // Usar transacción para asegurar consistencia de datos
      const result = await prisma.$transaction(async (tx) => {
    // Actualizar ausencia
        const updatedAusencia = await tx.ausencia.update({
      where: { id },
      data: {
        estado: nuevoEstado,
        aprobadaPor: session.user.id,
        aprobadaEn: new Date(),
        ...(accion === 'rechazar' && { motivoRechazo }),
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            email: true,
                usuario: {
                  select: {
                    id: true,
                  },
                },
          }
        }
      }
    });

    // Actualizar saldo si la ausencia descuenta saldo
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

          // Actualizar saldo según la acción
      if (accion === 'aprobar') {
        // Mover días de pendientes a usados
            await tx.empleadoSaldoAusencias.update({
              where: { id: saldo.id },
              data: {
                diasPendientes: {
                  decrement: diasSolicitados,
                },
                diasUsados: {
                  increment: diasSolicitados,
                },
              },
            });
          } else {
            // Devolver días pendientes
            await tx.empleadoSaldoAusencias.update({
              where: { id: saldo.id },
              data: {
                diasPendientes: {
                  decrement: diasSolicitados,
                },
              },
            });
          }
        }

        return updatedAusencia;
      });

      // Crear notificación usando el servicio centralizado
      if (accion === 'aprobar') {
        await crearNotificacionAusenciaAprobada(prisma, {
          ausenciaId: result.id,
          empresaId: session.user.empresaId,
          empleadoId: ausencia.empleadoId,
          empleadoNombre: `${result.empleado.nombre} ${result.empleado.apellidos}`,
          tipo: ausencia.tipo,
          fechaInicio: ausencia.fechaInicio,
          fechaFin: ausencia.fechaFin,
        });

        // Sincronizar con calendarios conectados (Google Calendar, etc.)
        try {
          await CalendarManager.syncAusenciaToCalendars({
            ...result,
            empleado: {
              nombre: result.empleado.nombre,
              apellidos: result.empleado.apellidos,
            },
          });
        } catch (error) {
          console.error('Error syncing ausencia to calendars:', error);
          // No fallar la aprobación si falla la sincronización con calendario
        }
      } else {
        await crearNotificacionAusenciaRechazada(prisma, {
          ausenciaId: result.id,
          empresaId: session.user.empresaId,
          empleadoId: ausencia.empleadoId,
          empleadoNombre: `${result.empleado.nombre} ${result.empleado.apellidos}`,
          tipo: ausencia.tipo,
          fechaInicio: ausencia.fechaInicio,
          fechaFin: ausencia.fechaFin,
          motivoRechazo,
        });

        // Eliminar evento de calendarios si existe
        try {
          await CalendarManager.deleteAusenciaFromCalendars(
            result.id,
            session.user.empresaId,
            ausencia.empleadoId
          );
        } catch (error) {
          console.error('Error deleting ausencia from calendars:', error);
          // No fallar el rechazo si falla la eliminación del calendario
        }
      }

      return successResponse(result);
    } else {
      // MODO 2: Editar ausencia
      // Validar campos de edición
      const validationResult = z.object({
        tipo: z.enum(['vacaciones', 'enfermedad', 'enfermedad_familiar', 'maternidad_paternidad', 'otro']).optional(),
        fechaInicio: z.string().optional(),
        fechaFin: z.string().optional(),
        medioDia: z.boolean().optional(),
        motivo: z.string().nullable().optional(),
        descripcion: z.string().nullable().optional(),
        justificanteUrl: z.string().nullable().optional(),
        estado: z.enum(['pendiente', 'confirmada', 'completada', 'rechazada']).optional(),
      }).refine((data) => {
        if (data.fechaInicio && data.fechaFin) {
          return new Date(data.fechaFin) >= new Date(data.fechaInicio);
        }
        return true;
      }, {
        message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
      }).safeParse(body);

      if (!validationResult.success) {
        return badRequestResponse(validationResult.error.issues[0]?.message || 'Datos inválidos');
      }

      const dataEdicion = validationResult.data;

      // Determinar fechas a usar (nuevas o existentes)
      const nuevaFechaInicio = dataEdicion.fechaInicio 
        ? new Date(dataEdicion.fechaInicio)
        : new Date(ausencia.fechaInicio);
      const nuevaFechaFin = dataEdicion.fechaFin 
        ? new Date(dataEdicion.fechaFin)
        : new Date(ausencia.fechaFin);

      // Recalcular días si cambiaron las fechas o medioDia
      const recalcularDias = dataEdicion.fechaInicio || dataEdicion.fechaFin || dataEdicion.medioDia !== undefined;
      
      let diasNaturales = ausencia.diasNaturales;
      let diasLaborables = ausencia.diasLaborables;
      let nuevosDiasSolicitados = Number(ausencia.diasSolicitados);
      const nuevoMedioDia = dataEdicion.medioDia !== undefined ? dataEdicion.medioDia : ausencia.medioDia;

      if (recalcularDias) {
        const calculoDias = await calcularDias(
          nuevaFechaInicio,
          nuevaFechaFin,
          session.user.empresaId
        );
        
        diasNaturales = calculoDias.diasNaturales;
        diasLaborables = calculoDias.diasLaborables;
        nuevosDiasSolicitados = nuevoMedioDia 
          ? calculoDias.diasSolicitados * 0.5 
          : calculoDias.diasSolicitados;
      }

      // Determinar si descuenta saldo
      const nuevoTipo = dataEdicion.tipo || ausencia.tipo;
      const nuevoDescuentaSaldo = nuevoTipo === 'vacaciones';
      const cambioTipo = ausencia.descuentaSaldo !== nuevoDescuentaSaldo;
      const diferenciaDias = nuevosDiasSolicitados - Number(ausencia.diasSolicitados);
      const año = nuevaFechaInicio.getFullYear();

      // Manejar cambios en el tipo (vacaciones ↔ otro tipo)
      if (cambioTipo) {
        const diasAnteriores = Number(ausencia.diasSolicitados);
        
        if (ausencia.descuentaSaldo && !nuevoDescuentaSaldo) {
          // Cambió de vacaciones a otro tipo: devolver días al saldo
          if (ausencia.estado === EstadoAusencia.pendiente) {
            await actualizarSaldo(ausencia.empleadoId, año, 'cancelar', diasAnteriores);
          } else if (ausencia.estado === EstadoAusencia.confirmada || ausencia.estado === EstadoAusencia.completada) {
            // Devolver días usados
            await prisma.empleadoSaldoAusencias.updateMany({
              where: { empleadoId: ausencia.empleadoId, año },
              data: { diasUsados: { decrement: diasAnteriores } },
            });
          }
        } else if (!ausencia.descuentaSaldo && nuevoDescuentaSaldo) {
          // Cambió de otro tipo a vacaciones: reservar días
          const validacion = await validarSaldoSuficiente(ausencia.empleadoId, año, nuevosDiasSolicitados);
          if (!validacion.suficiente) {
            return badRequestResponse(validacion.mensaje || 'Saldo insuficiente');
          }
          
          if (ausencia.estado === EstadoAusencia.pendiente) {
            await actualizarSaldo(ausencia.empleadoId, año, 'solicitar', nuevosDiasSolicitados);
          } else if (ausencia.estado === EstadoAusencia.confirmada || ausencia.estado === EstadoAusencia.completada) {
            // Marcar como usados
            await prisma.empleadoSaldoAusencias.updateMany({
              where: { empleadoId: ausencia.empleadoId, año },
              data: { diasUsados: { increment: nuevosDiasSolicitados } },
            });
          }
        }
      }

      // Validar saldo si es tipo vacaciones y aumentaron los días
      if (nuevoDescuentaSaldo && diferenciaDias > 0 && !cambioTipo) {
        const validacion = await validarSaldoSuficiente(
          ausencia.empleadoId,
          año,
          diferenciaDias
        );

        if (!validacion.suficiente) {
          return badRequestResponse(validacion.mensaje || 'Saldo insuficiente');
        }
      }

      // Validar políticas del equipo si cambió algo relacionado con fechas
      // - Antelación: aplica a vacaciones y "otro"
      // - Solapamiento: solo aplica a vacaciones
      if ((nuevoTipo === 'vacaciones' || nuevoTipo === 'otro') && (recalcularDias || dataEdicion.fechaInicio || dataEdicion.fechaFin) && ausencia.equipoId) {
        const validacionPoliticas = await validarPoliticasEquipo(
          ausencia.equipoId,
          ausencia.empleadoId,
          nuevaFechaInicio,
          nuevaFechaFin,
          nuevoTipo,
          ausencia.id // Excluir esta ausencia del cálculo
        );

        if (!validacionPoliticas.valida) {
          return badRequestResponse(
            validacionPoliticas.errores.join('. '),
            { errores: validacionPoliticas.errores }
          );
        }
      }

      // Actualizar saldo si cambió el número de días (sin cambio de tipo)
      if (!cambioTipo && nuevoDescuentaSaldo && diferenciaDias !== 0) {
        if (ausencia.estado === EstadoAusencia.pendiente) {
          // Ajustar días pendientes
          await prisma.empleadoSaldoAusencias.updateMany({
            where: { empleadoId: ausencia.empleadoId, año },
            data: { diasPendientes: { increment: diferenciaDias } },
          });
        } else if (ausencia.estado === EstadoAusencia.confirmada || ausencia.estado === EstadoAusencia.completada) {
          // Ajustar días usados
          await prisma.empleadoSaldoAusencias.updateMany({
            where: { empleadoId: ausencia.empleadoId, año },
            data: { diasUsados: { increment: diferenciaDias } },
          });
        }
      }

      // Actualizar ausencia
      const updatedAusencia = await prisma.ausencia.update({
        where: { id },
        data: {
          ...(dataEdicion.tipo && { tipo: dataEdicion.tipo }),
          ...(dataEdicion.fechaInicio && { fechaInicio: nuevaFechaInicio }),
          ...(dataEdicion.justificanteUrl !== undefined && { justificanteUrl: dataEdicion.justificanteUrl }),
          ...(dataEdicion.fechaFin && { fechaFin: nuevaFechaFin }),
          ...(dataEdicion.medioDia !== undefined && { medioDia: nuevoMedioDia }),
          ...(dataEdicion.motivo !== undefined && { motivo: dataEdicion.motivo }),
          ...(dataEdicion.descripcion !== undefined && { descripcion: dataEdicion.descripcion }),
          ...(dataEdicion.estado && { estado: dataEdicion.estado }),
          ...(recalcularDias && {
            diasNaturales,
            diasLaborables,
            diasSolicitados: nuevosDiasSolicitados,
          }),
          descuentaSaldo: nuevoDescuentaSaldo,
        },
        include: {
          empleado: {
            select: {
              nombre: true,
              apellidos: true,
              email: true,
            }
          }
        }
      });

    return successResponse(updatedAusencia);
    }
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/ausencias/[id]');
  }
}

// DELETE /api/ausencias/[id] - Cancelar ausencia (solo empleado)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación (debe ser empleado)
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    if (!session.user.empleadoId) {
      return forbiddenResponse('Solo empleados pueden cancelar sus ausencias');
    }

    // Await params in Next.js 15+
    const { id } = await params;

    // Verificar que la ausencia es del empleado y está pendiente
    const ausencia = await prisma.ausencia.findFirst({
      where: {
        id,
        empleadoId: session.user.empleadoId,
        estado: EstadoAusencia.pendiente,
      }
    });

    if (!ausencia) {
      return notFoundResponse('Ausencia no encontrada o no se puede cancelar');
    }

    // Actualizar saldo si la ausencia descuentaba saldo
    if (ausencia.descuentaSaldo) {
      const año = ausencia.fechaInicio.getFullYear();
      const diasSolicitados = Number(ausencia.diasSolicitados);
      
      // Devolver días pendientes
      await actualizarSaldo(
        ausencia.empleadoId,
        año,
        'cancelar',
        diasSolicitados
      );
    }

    // Obtener información del empleado antes de eliminar
    const empleado = await prisma.empleado.findUnique({
      where: { id: ausencia.empleadoId },
      select: { nombre: true, apellidos: true },
    });

    // Eliminar ausencia
    await prisma.ausencia.delete({
      where: { id }
    });

    // Crear notificación de cancelación
    if (empleado) {
      await crearNotificacionAusenciaCancelada(prisma, {
        ausenciaId: ausencia.id,
        empresaId: session.user.empresaId,
        empleadoId: ausencia.empleadoId,
        empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
        tipo: ausencia.tipo,
        fechaInicio: ausencia.fechaInicio,
        fechaFin: ausencia.fechaFin,
      });
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error, 'API DELETE /api/ausencias/[id]');
  }
}

