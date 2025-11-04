// ========================================
// API Route: Ausencias
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ausenciaCreateSchema } from '@/lib/validaciones/schemas';
import {
  calcularDias,
  validarSaldoSuficiente,
  actualizarSaldo,
  validarPoliticasEquipo,
} from '@/lib/calculos/ausencias';
import {
  requireAuth,
  validateRequest,
  handleApiError,
  successResponse,
  createdResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import { crearNotificacionAusenciaSolicitada } from '@/lib/notificaciones';

// GET /api/ausencias - Listar ausencias
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado');
    const empleadoId = searchParams.get('empleadoId');

    // Filtros base
    const where: any = {
      empresaId: session.user.empresaId,
    };

    // Filtrar por estado si se proporciona
    if (estado && estado !== 'todas') {
      where.estado = estado;
    }

    // Filtrar por empleado si se proporciona
    if (empleadoId) {
      where.empleadoId = empleadoId;
    }

    // Si es empleado, solo ver sus propias ausencias
    if (session.user.rol === 'empleado' && session.user.empleadoId) {
      where.empleadoId = session.user.empleadoId;
    }

    // Si es manager, solo ver ausencias de sus empleados a cargo
    if (session.user.rol === 'manager') {
      if (!session.user.empleadoId) {
        return badRequestResponse('No tienes un empleado asignado. Contacta con HR.');
      }

      // Obtener IDs de empleados a cargo
      const empleadosACargo = await prisma.empleado.findMany({
        where: {
          managerId: session.user.empleadoId,
          empresaId: session.user.empresaId,
          activo: true,
        },
        select: {
          id: true,
        },
      });

      const empleadoIds = empleadosACargo.map((e) => e.id);

      if (empleadoIds.length === 0) {
        // Si no tiene empleados a cargo, devolver array vacío
        return successResponse([]);
      }

      where.empleadoId = {
        in: empleadoIds,
      };
    }

    const ausencias = await prisma.ausencia.findMany({
      where,
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            puesto: true,
            fotoUrl: true,
          }
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return successResponse(ausencias);
  } catch (error) {
    return handleApiError(error, 'API GET /api/ausencias');
  }
}

// POST /api/ausencias - Crear solicitud de ausencia
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación y que tenga empleadoId
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    if (!session.user.empleadoId) {
      return badRequestResponse('No tienes un empleado asignado. Contacta con HR.');
    }

    // Validar request body
    const validationResult = await validateRequest(req, ausenciaCreateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Validar fechas
    if (validatedData.fechaInicio > validatedData.fechaFin) {
      return badRequestResponse('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    // Calcular días (naturales, laborables, solicitados)
    const { diasNaturales, diasLaborables, diasSolicitados } = await calcularDias(
      new Date(validatedData.fechaInicio),
      new Date(validatedData.fechaFin),
      session.user.empresaId
    );

    // Aplicar medio día si corresponde
    const diasSolicitadosFinal = validatedData.medioDia
      ? diasSolicitados * 0.5
      : diasSolicitados;

    // Determinar si descuenta saldo según el tipo
    const descuentaSaldo = validatedData.tipo === 'vacaciones';

    // Validar saldo si descuenta
    if (descuentaSaldo) {
      const fechaInicio = validatedData.fechaInicio instanceof Date 
        ? validatedData.fechaInicio 
        : new Date(validatedData.fechaInicio);
      const año = fechaInicio.getFullYear();
      const validacion = await validarSaldoSuficiente(
        session.user.empleadoId,
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

    // Obtener equipoId del empleado si no se proporcionó
    let equipoId: string | null = validatedData.equipoId || null;
    if (!equipoId) {
      const empleadoEquipo = await prisma.empleadoEquipo.findFirst({
        where: { empleadoId: session.user.empleadoId },
        orderBy: { fechaIncorporacion: 'desc' },
      });
      equipoId = empleadoEquipo?.equipoId || null;
    }

    // Convertir fechas a Date si son strings
    const fechaInicio = validatedData.fechaInicio instanceof Date 
      ? validatedData.fechaInicio 
      : new Date(validatedData.fechaInicio);
    const fechaFin = validatedData.fechaFin instanceof Date 
      ? validatedData.fechaFin 
      : new Date(validatedData.fechaFin);

    // Validar políticas del equipo
    // - Antelación: aplica a vacaciones y "otro" (tipos que requieren aprobación)
    // - Solapamiento: solo aplica a vacaciones
    if ((validatedData.tipo === 'vacaciones' || validatedData.tipo === 'otro') && equipoId) {
      const validacionPoliticas = await validarPoliticasEquipo(
        equipoId,
        session.user.empleadoId,
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

    // Crear ausencia
    const ausencia = await prisma.ausencia.create({
      data: {
        empleadoId: session.user.empleadoId,
        empresaId: session.user.empresaId,
        equipoId,
        tipo: validatedData.tipo,
        fechaInicio,
        fechaFin,
        medioDia: validatedData.medioDia || false,
        diasNaturales,
        diasLaborables,
        diasSolicitados: diasSolicitadosFinal,
        descripcion: validatedData.descripcion,
        motivo: validatedData.motivo,
        justificanteUrl: validatedData.justificanteUrl,
        descuentaSaldo,
        diasIdeales: validatedData.diasIdeales ? JSON.parse(JSON.stringify(validatedData.diasIdeales)) : null,
        diasPrioritarios: validatedData.diasPrioritarios ? JSON.parse(JSON.stringify(validatedData.diasPrioritarios)) : null,
        diasAlternativos: validatedData.diasAlternativos ? JSON.parse(JSON.stringify(validatedData.diasAlternativos)) : null,
        estado: 'pendiente_aprobacion',
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            puesto: true,
            fotoUrl: true,
          }
        }
      }
    });

    // Actualizar saldo si descuenta (incrementar días pendientes)
    if (descuentaSaldo) {
      const año = fechaInicio.getFullYear();
      await actualizarSaldo(
        session.user.empleadoId,
        año,
        'solicitar',
        diasSolicitadosFinal
      );
    }

    // Crear notificación para HR/Manager
    await crearNotificacionAusenciaSolicitada(prisma, {
      ausenciaId: ausencia.id,
      empresaId: session.user.empresaId,
      empleadoId: session.user.empleadoId,
      empleadoNombre: `${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}`,
      tipo: ausencia.tipo,
      fechaInicio: ausencia.fechaInicio,
      fechaFin: ausencia.fechaFin,
      diasSolicitados: diasSolicitadosFinal,
    });

    return createdResponse(ausencia);
  } catch (error) {
    return handleApiError(error, 'API POST /api/ausencias');
  }
}

