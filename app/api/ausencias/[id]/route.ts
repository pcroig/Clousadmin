// ========================================
// API Route: Ausencias [ID]
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  requireAuth,
  requireAuthAsHROrManager,
  successResponse,
} from '@/lib/api-handler';
import { actualizarSaldo, calcularDias, validarPoliticasEquipo, validarSaldoSuficiente } from '@/lib/calculos/ausencias';
import { EstadoAusencia, TipoAusencia, UsuarioRol } from '@/lib/constants/enums';
import { CalendarManager } from '@/lib/integrations/calendar/calendar-manager';
import {
  crearNotificacionAusenciaAprobada,
  crearNotificacionAusenciaCancelada,
  crearNotificacionAusenciaRechazada,
} from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { getJsonBody } from '@/lib/utils/json';

class SaldoInsuficienteError extends Error {
  saldoDisponible: number;

  constructor(saldoDisponible: number, mensaje?: string) {
    super(mensaje || 'Saldo insuficiente');
    this.name = 'SaldoInsuficienteError';
    this.saldoDisponible = saldoDisponible;
  }
}

// Schema para aprobar/rechazar
const ausenciaAccionSchema = z.object({
  accion: z.enum(['aprobar', 'rechazar']),
  motivoRechazo: z.string().optional(),
});

// PATCH /api/ausencias/[id] - Aprobar/Rechazar o Editar ausencia (HR Admin o Manager)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
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
    const body = await getJsonBody<Record<string, unknown>>(req);

    // Detectar si es aprobar/rechazar o edición
    if (body.accion && (body.accion === 'aprobar' || body.accion === 'rechazar')) {
      // MODO 1: Aprobar/Rechazar
      const validationResult = ausenciaAccionSchema.safeParse(body);
      if (!validationResult.success) {
        return badRequestResponse(validationResult.error.issues[0]?.message || 'Datos inválidos');
      }
      const validatedData = validationResult.data;
      
      const { accion, motivoRechazo } = validatedData;
      const diasSolicitados = Number(ausencia.diasSolicitados);
      const diasDesdeCarryOriginal = Number(ausencia.diasDesdeCarryOver ?? 0);

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
      const ejecutarTransaccion = () => prisma.$transaction(async (tx) => {
        if (accion === 'aprobar' && ausencia.descuentaSaldo) {
          const año = ausencia.fechaInicio.getFullYear();
          const validacionSaldo = await validarSaldoSuficiente(
            ausencia.empleadoId,
            año,
            diasSolicitados,
            tx,
            { lock: true }
          );

          if (!validacionSaldo.suficiente) {
            throw new SaldoInsuficienteError(validacionSaldo.saldoActual, validacionSaldo.mensaje);
          }
        }

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
      const accionSaldo = accion === 'aprobar' ? 'aprobar' : 'rechazar';
      await actualizarSaldo(
        ausencia.empleadoId,
        año,
        accionSaldo,
        diasSolicitados,
        tx,
        { diasDesdeCarryOver: diasDesdeCarryOriginal }
      );
    }

        return updatedAusencia;
      });

      let result;
      try {
        result = await ejecutarTransaccion();
      } catch (error) {
        if (error instanceof SaldoInsuficienteError) {
          return badRequestResponse(
            error.message,
            {
              saldoDisponible: error.saldoDisponible,
              diasSolicitados: Number(ausencia.diasSolicitados),
            }
          );
        }
        throw error;
      }

      // Crear notificación usando el servicio centralizado
      if (accion === 'aprobar') {
        try {
          await crearNotificacionAusenciaAprobada(prisma, {
            ausenciaId: result.id,
            empresaId: session.user.empresaId,
            empleadoId: ausencia.empleadoId,
            empleadoNombre: `${result.empleado.nombre} ${result.empleado.apellidos}`,
            tipo: ausencia.tipo,
            fechaInicio: ausencia.fechaInicio,
            fechaFin: ausencia.fechaFin,
          });
        } catch (error) {
          console.error('[Ausencias] Error creando notificación de aprobación:', error);
        }

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
        try {
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
        } catch (error) {
          console.error('[Ausencias] Error creando notificación de rechazo:', error);
        }

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
        periodo: z.enum(['manana', 'tarde']).optional(),
        motivo: z.string().nullable().optional(),
        justificanteUrl: z.string().nullable().optional(),
        documentoId: z.string().uuid().nullable().optional(),
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

      if (
        dataEdicion.tipo &&
        dataEdicion.tipo !== ausencia.tipo &&
        ausencia.estado !== EstadoAusencia.pendiente
      ) {
        return badRequestResponse('Solo puedes cambiar el tipo cuando la ausencia está pendiente');
      }

      // Determinar fechas a usar (nuevas o existentes)
      const nuevaFechaInicio = dataEdicion.fechaInicio 
        ? new Date(dataEdicion.fechaInicio)
        : new Date(ausencia.fechaInicio);
      const nuevaFechaFin = dataEdicion.fechaFin 
        ? new Date(dataEdicion.fechaFin)
        : new Date(ausencia.fechaFin);

      // Recalcular días si cambiaron las fechas o medioDia
      const recalcularDias =
        dataEdicion.fechaInicio ||
        dataEdicion.fechaFin ||
        dataEdicion.medioDia !== undefined;
      
      let diasNaturales = ausencia.diasNaturales;
      let diasLaborables = ausencia.diasLaborables;
      let nuevosDiasSolicitados = Number(ausencia.diasSolicitados);
      const nuevoMedioDia =
        dataEdicion.medioDia !== undefined ? dataEdicion.medioDia : ausencia.medioDia;
      const nuevoPeriodo =
        nuevoMedioDia ? dataEdicion.periodo || ausencia.periodo : null;
      const debeActualizarPeriodo = dataEdicion.medioDia !== undefined || dataEdicion.periodo !== undefined;

      if (nuevoMedioDia) {
        const esMismoDia = nuevaFechaInicio.toDateString() === nuevaFechaFin.toDateString();
        if (!esMismoDia) {
          return badRequestResponse('El medio día solo se puede aplicar a ausencias de un solo día');
        }
        if (!nuevoPeriodo) {
          return badRequestResponse('Debes especificar el periodo (mañana o tarde) para el medio día');
        }
      }

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

      const motivoResultante =
        dataEdicion.motivo !== undefined ? dataEdicion.motivo : ausencia.motivo;
      if (
        nuevoTipo === TipoAusencia.otro &&
        !(typeof motivoResultante === 'string' && motivoResultante.trim().length > 0)
      ) {
        return badRequestResponse('El motivo es obligatorio para ausencias de tipo "Otro"');
      }

      let diasDesdeCarryActual = Number(ausencia.diasDesdeCarryOver ?? 0);

      // Manejar cambios en el tipo (vacaciones ↔ otro tipo)
      if (cambioTipo) {
        const diasAnteriores = Number(ausencia.diasSolicitados);
        
        if (ausencia.descuentaSaldo && !nuevoDescuentaSaldo) {
          // Cambió de vacaciones a otro tipo: devolver días al saldo
          if (ausencia.estado === EstadoAusencia.pendiente) {
            const liberarCarry = Math.min(diasDesdeCarryActual, diasAnteriores);
            await actualizarSaldo(
              ausencia.empleadoId,
              año,
              'cancelar',
              diasAnteriores,
              undefined,
              { diasDesdeCarryOver: liberarCarry }
            );
            diasDesdeCarryActual = Math.max(0, diasDesdeCarryActual - liberarCarry);
          } else if (ausencia.estado === EstadoAusencia.confirmada || ausencia.estado === EstadoAusencia.completada) {
            // Devolver días usados
            await prisma.empleadoSaldoAusencias.updateMany({
              where: { empleadoId: ausencia.empleadoId, año },
              data: {
                diasUsados: { decrement: diasAnteriores },
                ...(diasDesdeCarryActual > 0 && {
                  carryOverUsado: {
                    decrement: Math.min(diasDesdeCarryActual, diasAnteriores),
                  },
                }),
              },
            });
            diasDesdeCarryActual = Math.max(
              0,
              diasDesdeCarryActual - Math.min(diasDesdeCarryActual, diasAnteriores)
            );
          }
        } else if (!ausencia.descuentaSaldo && nuevoDescuentaSaldo) {
          // Cambió de otro tipo a vacaciones: reservar días
          const validacion = await validarSaldoSuficiente(ausencia.empleadoId, año, nuevosDiasSolicitados);
          if (!validacion.suficiente) {
            return badRequestResponse(validacion.mensaje || 'Saldo insuficiente');
          }
          
          if (ausencia.estado === EstadoAusencia.pendiente) {
            const resultadoSaldo = await actualizarSaldo(
              ausencia.empleadoId,
              año,
              'solicitar',
              nuevosDiasSolicitados
            );
            diasDesdeCarryActual = resultadoSaldo.diasDesdeCarryOver;
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
          if (diferenciaDias > 0) {
            const resultadoSaldo = await actualizarSaldo(
              ausencia.empleadoId,
              año,
              'solicitar',
              diferenciaDias
            );
            diasDesdeCarryActual += resultadoSaldo.diasDesdeCarryOver;
          } else {
            const reducir = Math.abs(diferenciaDias);
            const liberarCarry = Math.min(diasDesdeCarryActual, reducir);
            await actualizarSaldo(
              ausencia.empleadoId,
              año,
              'cancelar',
              reducir,
              undefined,
              { diasDesdeCarryOver: liberarCarry }
            );
            diasDesdeCarryActual = Math.max(0, diasDesdeCarryActual - liberarCarry);
          }
        } else if (ausencia.estado === EstadoAusencia.confirmada || ausencia.estado === EstadoAusencia.completada) {
          await prisma.empleadoSaldoAusencias.updateMany({
            where: { empleadoId: ausencia.empleadoId, año },
            data: {
              diasUsados: { increment: diferenciaDias },
              ...(diferenciaDias < 0 &&
                diasDesdeCarryActual > 0 && {
                  carryOverUsado: {
                    decrement: Math.min(diasDesdeCarryActual, Math.abs(diferenciaDias)),
                  },
                }),
            },
          });
          if (diferenciaDias < 0) {
            diasDesdeCarryActual = Math.max(
              0,
              diasDesdeCarryActual - Math.min(diasDesdeCarryActual, Math.abs(diferenciaDias))
            );
          }
        }
      }

      // Actualizar ausencia
      const updatedAusencia = await prisma.ausencia.update({
        where: { id },
        data: {
          ...(dataEdicion.tipo && { tipo: dataEdicion.tipo }),
          ...(dataEdicion.fechaInicio && { fechaInicio: nuevaFechaInicio }),
          ...(dataEdicion.justificanteUrl !== undefined && { justificanteUrl: dataEdicion.justificanteUrl }),
          ...(dataEdicion.documentoId !== undefined && { documentoId: dataEdicion.documentoId || null }),
          ...(dataEdicion.fechaFin && { fechaFin: nuevaFechaFin }),
          ...(dataEdicion.medioDia !== undefined && { medioDia: nuevoMedioDia }),
          ...(debeActualizarPeriodo && {
            periodo: nuevoMedioDia ? nuevoPeriodo : null,
          }),
          ...(dataEdicion.motivo !== undefined && { motivo: dataEdicion.motivo }),
          ...(dataEdicion.estado && { estado: dataEdicion.estado }),
          ...(recalcularDias && {
            diasNaturales,
            diasLaborables,
            diasSolicitados: nuevosDiasSolicitados,
          }),
          diasDesdeCarryOver: diasDesdeCarryActual,
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
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
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
      const diasDesdeCarry = Math.min(
        Number(ausencia.diasDesdeCarryOver ?? 0),
        diasSolicitados
      );
      
      // Devolver días pendientes
      await actualizarSaldo(
        ausencia.empleadoId,
        año,
        'cancelar',
        diasSolicitados,
        undefined,
        { diasDesdeCarryOver: diasDesdeCarry }
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
      try {
        await crearNotificacionAusenciaCancelada(prisma, {
          ausenciaId: ausencia.id,
          empresaId: session.user.empresaId,
          empleadoId: ausencia.empleadoId,
          empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
          tipo: ausencia.tipo,
          fechaInicio: ausencia.fechaInicio,
          fechaFin: ausencia.fechaFin,
        });
      } catch (error) {
        console.error('[Ausencias] Error creando notificación de cancelación:', error);
      }
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error, 'API DELETE /api/ausencias/[id]');
  }
}

