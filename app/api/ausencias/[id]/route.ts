// ========================================
// API Route: Ausencias [ID]
// ========================================

import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import {
  actualizarSaldo,
  calcularDias,
  determinarEstadoTrasAprobacion,
  validarPoliticasEquipo,
  validarSaldoSuficiente,
} from '@/lib/calculos/ausencias';
import { TIPOS_AUTO_APROBABLES } from '@/lib/constants/ausencias';
import { EstadoAusencia, TipoAusencia, UsuarioRol } from '@/lib/constants/enums';
import { CalendarManager } from '@/lib/integrations/calendar/calendar-manager';
import {
  crearNotificacionAusenciaAprobada,
  crearNotificacionAusenciaAutoAprobada,
  crearNotificacionAusenciaCancelada,
  crearNotificacionAusenciaModificada,
  crearNotificacionAusenciaRechazada,
  crearNotificacionAusenciaSolicitada,
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

// PATCH /api/ausencias/[id] - Aprobar/Rechazar o Editar ausencia
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación básica
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Verificar que la ausencia existe y es de la misma empresa
    const ausencia = await prisma.ausencias.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      }
    });

    if (!ausencia) {
      return notFoundResponse('Ausencia no encontrada');
    }

    // Leer body para determinar el tipo de operación
    const body = await getJsonBody<Record<string, unknown>>(req);

    // Detectar si es aprobar/rechazar o edición
    if (body.accion && (body.accion === 'aprobar' || body.accion === 'rechazar')) {
      // MODO 1: Aprobar/Rechazar - Solo HR Admin o Manager
      if (session.user.rol !== UsuarioRol.hr_admin && session.user.rol !== UsuarioRol.manager) {
        return forbiddenResponse('No tienes permisos para aprobar/rechazar ausencias');
      }

      // Si es manager, verificar que la ausencia es de un empleado a su cargo
      if (session.user.rol === UsuarioRol.manager) {
        if (!session.user.empleadoId) {
          return forbiddenResponse('No tienes un empleado asignado. Contacta con HR.');
        }

        const empleado = await prisma.empleados.findUnique({
          where: { id: ausencia.empleadoId },
          select: { managerId: true },
        });

        if (!empleado || empleado.managerId !== session.user.empleadoId) {
          return forbiddenResponse('Solo puedes aprobar ausencias de empleados a tu cargo');
        }
      }
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
        const updatedAusencia = await tx.ausencias.update({
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
          await crearNotificacionAusenciaAprobada(
            prisma,
            {
              ausenciaId: result.id,
              empresaId: session.user.empresaId,
              empleadoId: ausencia.empleadoId,
              empleadoNombre: `${result.empleado.nombre} ${result.empleado.apellidos}`,
              tipo: ausencia.tipo,
              fechaInicio: ausencia.fechaInicio,
              fechaFin: ausencia.fechaFin,
            },
            { actorUsuarioId: session.user.id }
          );
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
          await crearNotificacionAusenciaRechazada(
            prisma,
            {
              ausenciaId: result.id,
              empresaId: session.user.empresaId,
              empleadoId: ausencia.empleadoId,
              empleadoNombre: `${result.empleado.nombre} ${result.empleado.apellidos}`,
              tipo: ausencia.tipo,
              fechaInicio: ausencia.fechaInicio,
              fechaFin: ausencia.fechaFin,
              motivoRechazo,
            },
            { actorUsuarioId: session.user.id }
          );
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
      // MODO 2: Editar ausencia - Solo empleado dueño, HR Admin o Manager
      const esEmpleadoDueno = session.user.empleadoId === ausencia.empleadoId;
      const esHRAdmin = session.user.rol === UsuarioRol.hr_admin;
      const esManager = session.user.rol === UsuarioRol.manager;
      const resetWorkflow = esEmpleadoDueno && !esHRAdmin && !esManager;

      // Verificar permisos para editar
      if (!esEmpleadoDueno && !esHRAdmin) {
        if (!esManager) {
          return forbiddenResponse('No tienes permisos para editar esta ausencia');
        }

        // Si es manager, verificar que el empleado está a su cargo
        if (!session.user.empleadoId) {
          return forbiddenResponse('No tienes un empleado asignado. Contacta con HR.');
        }

        const empleado = await prisma.empleados.findUnique({
          where: { id: ausencia.empleadoId },
          select: { managerId: true },
        });

        if (!empleado || empleado.managerId !== session.user.empleadoId) {
          return forbiddenResponse('Solo puedes editar ausencias de empleados a tu cargo');
        }
      }

      // Empleados solo pueden editar ausencias que aún no han comenzado
      if (resetWorkflow) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaInicio = new Date(ausencia.fechaInicio);
        fechaInicio.setHours(0, 0, 0, 0);
        if (fechaInicio < hoy) {
          return forbiddenResponse('No puedes editar ausencias que ya han comenzado');
        }
      }

      // Validar campos de edición
      const validationResult = z.object({
        tipo: z.enum(['vacaciones', 'enfermedad', 'enfermedad_familiar', 'maternidad_paternidad', 'otro']).optional(),
        fechaInicio: z.string().optional(),
        fechaFin: z.string().optional(),
        medioDia: z.boolean().optional(),
        periodo: z.enum(['manana', 'tarde']).optional(),
        motivo: z.string().nullable().optional(),
        justificanteUrl: z.string().nullable().optional(),
        documentoId: z.string().nullable().optional(), // CUID, no UUID
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

      // Validar que no se solape con otras ausencias del mismo empleado
      const ausenciasSolapadas = await prisma.ausencias.findMany({
        where: {
          empleadoId: ausencia.empleadoId,
          id: { not: ausencia.id },
          estado: {
            in: [EstadoAusencia.pendiente, EstadoAusencia.confirmada, EstadoAusencia.completada],
          },
          OR: [
            {
              AND: [{ fechaInicio: { lte: nuevaFechaInicio } }, { fechaFin: { gte: nuevaFechaInicio } }],
            },
            {
              AND: [{ fechaInicio: { lte: nuevaFechaFin } }, { fechaFin: { gte: nuevaFechaFin } }],
            },
            {
              AND: [{ fechaInicio: { gte: nuevaFechaInicio } }, { fechaFin: { lte: nuevaFechaFin } }],
            },
          ],
        },
        select: {
          id: true,
          tipo: true,
          fechaInicio: true,
          fechaFin: true,
          estado: true,
        },
        take: 1,
      });

      if (ausenciasSolapadas.length > 0) {
        const conflicto = ausenciasSolapadas[0];
        const formatFecha = (date: Date) =>
          date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return badRequestResponse(
          `Ya tienes una ausencia de tipo "${conflicto.tipo}" en este período (${formatFecha(conflicto.fechaInicio)} - ${formatFecha(conflicto.fechaFin)}). No puedes solapar ausencias.`,
          { ausenciaSolapada: conflicto }
        );
      }

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
          session.user.empresaId,
          ausencia.empleadoId
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
              where: { empleadoId: ausencia.empleadoId, anio: año },
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
              where: { empleadoId: ausencia.empleadoId, anio: año },
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
            where: { empleadoId: ausencia.empleadoId, anio: año },
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

      const esAutoAprobableEdicion = TIPOS_AUTO_APROBABLES.includes(
        nuevoTipo as (typeof TIPOS_AUTO_APROBABLES)[number]
      );

      const updateData: Prisma.ausenciasUpdateInput = {
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
        ...(recalcularDias && {
          diasNaturales,
          diasLaborables,
          diasSolicitados: nuevosDiasSolicitados,
        }),
        diasDesdeCarryOver: diasDesdeCarryActual,
        descuentaSaldo: nuevoDescuentaSaldo,
      };

      if (resetWorkflow) {
        updateData.estado = esAutoAprobableEdicion
          ? determinarEstadoTrasAprobacion(nuevaFechaFin)
          : EstadoAusencia.pendiente;
        updateData.aprobadaPor = null;
        updateData.aprobadaEn = null;
        updateData.motivoRechazo = null;
      } else if (dataEdicion.estado) {
        updateData.estado = dataEdicion.estado;
      }

      const updatedAusencia = await prisma.ausencias.update({
        where: { id },
        data: updateData,
        include: {
          empleado: {
            select: {
              nombre: true,
              apellidos: true,
              email: true,
              managerId: true,
            },
          },
        },
      });

      if (resetWorkflow) {
        if (esAutoAprobableEdicion) {
          try {
            await crearNotificacionAusenciaAutoAprobada(
              prisma,
              {
                ausenciaId: updatedAusencia.id,
                empresaId: session.user.empresaId,
                empleadoId: updatedAusencia.empleadoId,
                empleadoNombre: `${updatedAusencia.empleado.nombre} ${updatedAusencia.empleado.apellidos}`,
                managerId: updatedAusencia.empleado.managerId,
                tipo: updatedAusencia.tipo,
                fechaInicio: updatedAusencia.fechaInicio,
                fechaFin: updatedAusencia.fechaFin,
              },
              { actorUsuarioId: session.user.id }
            );
          } catch (error) {
            console.error('[Ausencias] Error creando notificación auto-aprobada tras edición:', error);
          }

          try {
            await CalendarManager.syncAusenciaToCalendars({
              ...updatedAusencia,
              empleado: {
                nombre: updatedAusencia.empleado.nombre,
                apellidos: updatedAusencia.empleado.apellidos,
              },
            });
          } catch (error) {
            console.error('[Ausencias] Error sincronizando ausencia editada auto-aprobable:', error);
          }
        } else {
          try {
            await crearNotificacionAusenciaSolicitada(
              prisma,
              {
                ausenciaId: updatedAusencia.id,
                empresaId: session.user.empresaId,
                empleadoId: updatedAusencia.empleadoId,
                empleadoNombre: `${updatedAusencia.empleado.nombre} ${updatedAusencia.empleado.apellidos}`,
                tipo: updatedAusencia.tipo,
                fechaInicio: updatedAusencia.fechaInicio,
                fechaFin: updatedAusencia.fechaFin,
                diasSolicitados: Number(updatedAusencia.diasSolicitados ?? nuevosDiasSolicitados),
              },
              { actorUsuarioId: session.user.id }
            );
          } catch (error) {
            console.error('[Ausencias] Error creando notificación de edición pendiente:', error);
          }

          try {
            await CalendarManager.deleteAusenciaFromCalendars(
              updatedAusencia.id,
              session.user.empresaId,
              updatedAusencia.empleadoId
            );
          } catch (error) {
            console.error('[Ausencias] Error eliminando evento tras edición pendiente:', error);
          }
        }
      } else {
        // Cuando HR/Manager edita directamente, notificar a HR admins y managers
        try {
          await crearNotificacionAusenciaModificada(
            prisma,
            {
              ausenciaId: updatedAusencia.id,
              empresaId: session.user.empresaId,
              empleadoId: updatedAusencia.empleadoId,
              empleadoNombre: `${updatedAusencia.empleado.nombre} ${updatedAusencia.empleado.apellidos}`,
              tipo: updatedAusencia.tipo,
              fechaInicio: updatedAusencia.fechaInicio,
              fechaFin: updatedAusencia.fechaFin,
              diasSolicitados: Number(updatedAusencia.diasSolicitados ?? nuevosDiasSolicitados),
              modificadoPor: session.user.id,
            },
            { actorUsuarioId: session.user.id }
          );
        } catch (error) {
          console.error('[Ausencias] Error creando notificación de modificación:', error);
        }
      }

    return successResponse(updatedAusencia);
    }
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/ausencias/[id]');
  }
}

// DELETE /api/ausencias/[id] - Cancelar/Eliminar ausencia
// - Empleado: solo puede cancelar sus propias ausencias pendientes
// - HR Admin: puede eliminar cualquier ausencia de su empresa
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Await params in Next.js 15+
    const { id } = await params;

    // Determinar permisos según rol
    const esHRAdmin = session.user.rol === UsuarioRol.hr_admin;
    const esEmpleado = session.user.rol === UsuarioRol.empleado;

    // Construir WHERE clause según permisos
    const whereClause: Prisma.ausenciasWhereInput = {
      id,
      empresaId: session.user.empresaId, // Siempre verificar que pertenece a la empresa
    };

    if (esHRAdmin) {
      // HR Admin puede eliminar cualquier ausencia de su empresa (sin restricciones de estado ni empleado)
      // No agregar filtros adicionales
    } else if (esEmpleado && session.user.empleadoId) {
      // Empleado solo puede cancelar sus propias ausencias en estado pendiente
      whereClause.empleadoId = session.user.empleadoId;
      whereClause.estado = EstadoAusencia.pendiente;
    } else {
      return forbiddenResponse('No tienes permisos para eliminar ausencias');
    }

    // Buscar la ausencia con los filtros apropiados
    const ausencia = await prisma.ausencias.findFirst({
      where: whereClause,
    });

    if (!ausencia) {
      if (esHRAdmin) {
        return notFoundResponse('Ausencia no encontrada');
      } else {
        return notFoundResponse('Ausencia no encontrada o no se puede cancelar (solo ausencias pendientes)');
      }
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
    const empleado = await prisma.empleados.findUnique({
      where: { id: ausencia.empleadoId },
      select: { nombre: true, apellidos: true },
    });

    // Eliminar ausencia
    await prisma.ausencias.delete({
      where: { id }
    });

    // Crear notificación de cancelación
    if (empleado) {
      try {
        await crearNotificacionAusenciaCancelada(
          prisma,
          {
            ausenciaId: ausencia.id,
            empresaId: session.user.empresaId,
            empleadoId: ausencia.empleadoId,
            empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
            tipo: ausencia.tipo,
            fechaInicio: ausencia.fechaInicio,
            fechaFin: ausencia.fechaFin,
          },
          { actorUsuarioId: session.user.id }
        );
      } catch (error) {
        console.error('[Ausencias] Error creando notificación de cancelación:', error);
      }
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error, 'API DELETE /api/ausencias/[id]');
  }
}

