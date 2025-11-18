// ========================================
// API Route: Crear Ausencia (HR Admin)
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  calcularDias,
  validarSaldoSuficiente,
  actualizarSaldo,
  validarPoliticasEquipo,
  determinarEstadoTrasAprobacion,
} from '@/lib/calculos/ausencias';
import {
  requireAuth,
  validateRequest,
  handleApiError,
  badRequestResponse,
  createdResponse,
  forbiddenResponse,
} from '@/lib/api-handler';
import {
  crearNotificacionAusenciaAprobada,
  crearNotificacionAusenciaRechazada,
  crearNotificacionAusenciaSolicitada,
} from '@/lib/notificaciones';
import { CalendarManager } from '@/lib/integrations/calendar/calendar-manager';

import { EstadoAusencia, UsuarioRol, TipoAusencia } from '@/lib/constants/enums';

// Schema de validación para creación por HR
const ausenciaHRCreateSchema = z.object({
  empleadoId: z.string().uuid('ID de empleado inválido'),
  tipo: z.enum(['vacaciones', 'enfermedad', 'enfermedad_familiar', 'maternidad_paternidad', 'otro']),
  fechaInicio: z.union([
    z.string().refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'fechaInicio debe ser una fecha válida',
    }),
    z.date(),
  ]),
  fechaFin: z.union([
    z.string().refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'fechaFin debe ser una fecha válida',
    }),
    z.date(),
  ]),
  medioDia: z.boolean().default(false),
  periodo: z.enum(['manana', 'tarde']).optional(),
  descripcion: z.string().optional(),
  motivo: z.string().optional(),
  justificanteUrl: z.string().url().optional(),
  documentoId: z.string().uuid().optional(),
  estadoInicial: z.enum(['pendiente', 'confirmada', 'completada', 'rechazada']).default('confirmada'),
  motivoRechazo: z.string().optional(),
}).refine(
  (data) => {
    const inicio = new Date(data.fechaInicio);
    const fin = new Date(data.fechaFin);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return false;
    }
    return fin >= inicio;
  },
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['fechaFin'],
  }
).refine(
  (data) => {
    // Validar que medio día solo aplica a un solo día
    if (data.medioDia) {
      const inicio = new Date(data.fechaInicio);
      const fin = new Date(data.fechaFin);
      return inicio.toDateString() === fin.toDateString();
    }
    return true;
  },
  {
    message: 'El medio día solo se puede aplicar a ausencias de un solo día',
    path: ['medioDia'],
  }
).refine(
  (data) => {
    // Validar periodo obligatorio si medioDia=true
    if (data.medioDia && !data.periodo) {
      return false;
    }
    return true;
  },
  {
    message: 'Debe especificar el periodo (mañana/tarde) cuando es medio día',
    path: ['periodo'],
  }
).refine(
  (data) => {
    // Validar motivo obligatorio si tipo='otro'
    if (data.tipo === 'otro' && !data.motivo?.trim()) {
      return false;
    }
    return true;
  },
  {
    message: 'El motivo es obligatorio para ausencias de tipo "Otro"',
    path: ['motivo'],
  }
).refine(
  (data) => {
    // Validar motivoRechazo obligatorio si estado='rechazada'
    if (data.estadoInicial === 'rechazada' && !data.motivoRechazo?.trim()) {
      return false;
    }
    return true;
  },
  {
    message: 'El motivo de rechazo es obligatorio cuando el estado es "Rechazada"',
    path: ['motivoRechazo'],
  }
);

// POST /api/ausencias/crear-hr - Crear ausencia como HR Admin
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación y que sea HR Admin
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Verificar que el usuario sea HR Admin
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return forbiddenResponse('Solo HR Admin puede crear ausencias directamente');
    }

    // Validar request body
    const validationResult = await validateRequest(req, ausenciaHRCreateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Verificar que el empleado existe y pertenece a la misma empresa
    const empleado = await prisma.empleado.findFirst({
      where: {
        id: validatedData.empleadoId,
        empresaId: session.user.empresaId,
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        managerId: true,
        equipos: {
          select: { equipoId: true },
          orderBy: { fechaIncorporacion: 'desc' },
          take: 1,
        },
      },
    });

    if (!empleado) {
      return badRequestResponse('Empleado no encontrado o no pertenece a tu empresa');
    }

    // Convertir fechas
    const fechaInicio = validatedData.fechaInicio instanceof Date
      ? validatedData.fechaInicio
      : new Date(validatedData.fechaInicio);
    const fechaFin = validatedData.fechaFin instanceof Date
      ? validatedData.fechaFin
      : new Date(validatedData.fechaFin);

    // Obtener equipoId
    const equipoId = empleado.equipos[0]?.equipoId || null;

    // Calcular días
    const { diasNaturales, diasLaborables, diasSolicitados } = await calcularDias(
      fechaInicio,
      fechaFin,
      session.user.empresaId
    );

    // Aplicar medio día si corresponde
    const diasSolicitadosFinal = validatedData.medioDia
      ? diasSolicitados * 0.5
      : diasSolicitados;

    // Determinar si descuenta saldo
    const descuentaSaldo = validatedData.tipo === 'vacaciones';

    // Validar saldo si descuenta y el estado es aprobado (confirmada o completada)
    const estadosAprobados = [EstadoAusencia.confirmada, EstadoAusencia.completada];
    if (descuentaSaldo && estadosAprobados.includes(validatedData.estadoInicial as EstadoAusencia)) {
      const año = fechaInicio.getFullYear();
      const validacion = await validarSaldoSuficiente(
        empleado.id,
        año,
        diasSolicitadosFinal
      );

      if (!validacion.suficiente) {
        return badRequestResponse(validacion.mensaje || 'Saldo insuficiente', {
          saldoDisponible: validacion.saldoActual,
          diasSolicitados: diasSolicitadosFinal,
        });
      }
    }

    // Validar políticas del equipo solo si estado es pendiente o aprobado
    if ((validatedData.tipo === 'vacaciones' || validatedData.tipo === 'otro') && equipoId) {
      const estadosValidarPolitica = [EstadoAusencia.pendiente, EstadoAusencia.confirmada, EstadoAusencia.completada];
      if (estadosValidarPolitica.includes(validatedData.estadoInicial as EstadoAusencia)) {
        const validacionPoliticas = await validarPoliticasEquipo(
          equipoId,
          empleado.id,
          fechaInicio,
          fechaFin,
          validatedData.tipo
        );

        if (!validacionPoliticas.valida) {
          return badRequestResponse(
            validacionPoliticas.errores.join('. '),
            { errores: validacionPoliticas.errores }
          );
        }
      }
    }

    // Determinar el estado final
    let estadoFinal: EstadoAusencia;
    if (validatedData.estadoInicial === 'confirmada' || validatedData.estadoInicial === 'completada') {
      // Si HR marca como aprobada, determinar si es confirmada o completada según fecha
      estadoFinal = determinarEstadoTrasAprobacion(fechaFin);
    } else {
      estadoFinal = validatedData.estadoInicial as EstadoAusencia;
    }

    // Crear ausencia
    const ausencia = await prisma.ausencia.create({
      data: {
        empleadoId: empleado.id,
        empresaId: session.user.empresaId,
        equipoId,
        tipo: validatedData.tipo,
        fechaInicio,
        fechaFin,
        medioDia: validatedData.medioDia || false,
        periodo: validatedData.periodo || null,
        diasNaturales,
        diasLaborables,
        diasSolicitados: diasSolicitadosFinal,
        descripcion: validatedData.descripcion,
        motivo: validatedData.motivo,
        justificanteUrl: validatedData.justificanteUrl,
        documentoId: validatedData.documentoId,
        descuentaSaldo,
        estado: estadoFinal,
        // Si fue aprobada directamente por HR, registrar quién la aprobó
        ...(estadosAprobados.includes(estadoFinal) && {
          aprobadaPor: session.user.id,
          aprobadaEn: new Date(),
        }),
        // Si fue rechazada, guardar motivo
        ...(estadoFinal === EstadoAusencia.rechazada && {
          motivoRechazo: validatedData.motivoRechazo,
        }),
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            email: true,
          },
        },
      },
    });

    // Actualizar saldo según el estado
    if (descuentaSaldo) {
      const año = fechaInicio.getFullYear();

      if (estadosAprobados.includes(estadoFinal)) {
        // Aprobada: pasar directamente a usados
        await actualizarSaldo(empleado.id, año, 'aprobar', diasSolicitadosFinal);
      } else if (estadoFinal === EstadoAusencia.pendiente) {
        // Pendiente: incrementar pendientes
        await actualizarSaldo(empleado.id, año, 'solicitar', diasSolicitadosFinal);
      }
      // Si es rechazada, no actualizamos saldo
    }

    // Crear notificaciones según el estado
    const empleadoNombre = `${empleado.nombre} ${empleado.apellidos}`;

    if (estadosAprobados.includes(estadoFinal)) {
      // Notificar al empleado que fue aprobada
      await crearNotificacionAusenciaAprobada(prisma, {
        ausenciaId: ausencia.id,
        empresaId: session.user.empresaId,
        empleadoId: empleado.id,
        empleadoNombre,
        tipo: ausencia.tipo,
        fechaInicio: ausencia.fechaInicio,
        fechaFin: ausencia.fechaFin,
      });

      // Sincronizar con calendarios
      try {
        await CalendarManager.syncAusenciaToCalendars({
          ...ausencia,
          empleado: {
            nombre: ausencia.empleado.nombre,
            apellidos: ausencia.empleado.apellidos,
          },
        });
      } catch (error) {
        console.error('Error syncing ausencia to calendars:', error);
        // No fallar la creación si falla la sincronización
      }
    } else if (estadoFinal === EstadoAusencia.rechazada) {
      // Notificar al empleado que fue rechazada
      await crearNotificacionAusenciaRechazada(prisma, {
        ausenciaId: ausencia.id,
        empresaId: session.user.empresaId,
        empleadoId: empleado.id,
        empleadoNombre,
        tipo: ausencia.tipo,
        fechaInicio: ausencia.fechaInicio,
        fechaFin: ausencia.fechaFin,
        motivoRechazo: validatedData.motivoRechazo,
      });
    } else if (estadoFinal === EstadoAusencia.pendiente) {
      // Notificar a HR/Manager que hay una ausencia pendiente
      await crearNotificacionAusenciaSolicitada(prisma, {
        ausenciaId: ausencia.id,
        empresaId: session.user.empresaId,
        empleadoId: empleado.id,
        empleadoNombre,
        tipo: ausencia.tipo,
        fechaInicio: ausencia.fechaInicio,
        fechaFin: ausencia.fechaFin,
        diasSolicitados: diasSolicitadosFinal,
      });
    }

    return createdResponse(ausencia);
  } catch (error) {
    return handleApiError(error, 'API POST /api/ausencias/crear-hr');
  }
}
