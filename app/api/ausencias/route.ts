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
import { crearNotificacionAusenciaSolicitada, crearNotificacionAusenciaAutoAprobada } from '@/lib/notificaciones';
import { registrarAutoCompletadoAusencia } from '@/lib/auto-completado';

import { EstadoAusencia, UsuarioRol, TipoAusencia } from '@/lib/constants/enums';
import { determinarEstadoTrasAprobacion } from '@/lib/calculos/ausencias';
import type { Prisma } from '@prisma/client';

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
    const where: Prisma.AusenciaWhereInput = {
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
    if (session.user.rol === UsuarioRol.empleado && session.user.empleadoId) {
      where.empleadoId = session.user.empleadoId;
    }

    // Si es manager, solo ver ausencias de sus empleados a cargo
    if (session.user.rol === UsuarioRol.manager) {
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

    // Validar que no hay solapamiento con ausencias existentes del mismo empleado
    const fechaInicioCheck = validatedData.fechaInicio instanceof Date 
      ? validatedData.fechaInicio 
      : new Date(validatedData.fechaInicio);
    const fechaFinCheck = validatedData.fechaFin instanceof Date 
      ? validatedData.fechaFin 
      : new Date(validatedData.fechaFin);

    const ausenciasSolapadas = await prisma.ausencia.findMany({
      where: {
        empleadoId: session.user.empleadoId,
        estado: {
          in: [EstadoAusencia.pendiente, EstadoAusencia.confirmada],
        },
        OR: [
          // Caso 1: La nueva ausencia comienza durante una ausencia existente
          {
            AND: [
              { fechaInicio: { lte: fechaInicioCheck } },
              { fechaFin: { gte: fechaInicioCheck } },
            ],
          },
          // Caso 2: La nueva ausencia termina durante una ausencia existente
          {
            AND: [
              { fechaInicio: { lte: fechaFinCheck } },
              { fechaFin: { gte: fechaFinCheck } },
            ],
          },
          // Caso 3: La nueva ausencia contiene completamente una ausencia existente
          {
            AND: [
              { fechaInicio: { gte: fechaInicioCheck } },
              { fechaFin: { lte: fechaFinCheck } },
            ],
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
    });

    if (ausenciasSolapadas.length > 0) {
      const ausencia = ausenciasSolapadas[0];
      const formatFecha = (date: Date) => date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return badRequestResponse(
        `Ya tienes una ausencia de tipo "${ausencia.tipo}" en este período (${formatFecha(ausencia.fechaInicio)} - ${formatFecha(ausencia.fechaFin)}). No puedes solicitar ausencias que se solapen en fechas.`,
        { ausenciaSolapada: ausencia }
      );
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

    // Determinar si la ausencia es auto-aprobable
    // Tipos auto-aprobables: enfermedad, enfermedad_familiar, maternidad_paternidad
    const tiposAutoAprobables = [
      TipoAusencia.enfermedad,
      TipoAusencia.enfermedad_familiar,
      TipoAusencia.maternidad_paternidad,
    ];
    const esAutoAprobable = tiposAutoAprobables.includes(validatedData.tipo as TipoAusencia);
    const estadoInicial = esAutoAprobable
      ? determinarEstadoTrasAprobacion(fechaFin)
      : EstadoAusencia.pendiente;

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
        documentoId: validatedData.documentoId, // Vincular documento justificante
        descuentaSaldo,
        diasIdeales: validatedData.diasIdeales ? JSON.parse(JSON.stringify(validatedData.diasIdeales)) : null,
        diasPrioritarios: validatedData.diasPrioritarios ? JSON.parse(JSON.stringify(validatedData.diasPrioritarios)) : null,
        diasAlternativos: validatedData.diasAlternativos ? JSON.parse(JSON.stringify(validatedData.diasAlternativos)) : null,
        estado: estadoInicial,
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            puesto: true,
            fotoUrl: true,
            managerId: true,
          },
        },
      }
    });

    // Actualizar saldo y crear notificaciones según si fue auto-aprobada o requiere aprobación
    if (esAutoAprobable) {
      // Ausencias que NO requieren aprobación (enfermedad, etc.)
      // NO se registran en AutoCompletado porque no hubo "aprobación automática"
      // Solo se notifica a HR/Manager para información
      
      // Si descuenta saldo, actualizar saldo como "aprobar" (pendientes -> usados)
      if (descuentaSaldo) {
        const año = fechaInicio.getFullYear();
        await actualizarSaldo(
          session.user.empleadoId,
          año,
          'aprobar', // ✅ Directo a usados porque no requiere aprobación
          diasSolicitadosFinal
        );
      }

      // Notificar a HR/Manager que se registró una ausencia (NO al empleado)
      await crearNotificacionAusenciaAutoAprobada(prisma, {
        ausenciaId: ausencia.id,
        empresaId: session.user.empresaId,
        empleadoId: session.user.empleadoId,
        empleadoNombre: `${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}`,
        managerId: ausencia.empleado.managerId,
        tipo: ausencia.tipo,
        fechaInicio: ausencia.fechaInicio,
        fechaFin: ausencia.fechaFin,
      });
    } else {
      // Si requiere aprobación y descuenta saldo, incrementar días pendientes
      if (descuentaSaldo) {
        const año = fechaInicio.getFullYear();
        await actualizarSaldo(
          session.user.empleadoId,
          año,
          'solicitar', // Pendiente de aprobación: incrementar pendientes
          diasSolicitadosFinal
        );
      }

      // Notificar a HR/Manager que hay una ausencia pendiente de aprobación
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
    }

    return createdResponse(ausencia);
  } catch (error) {
    return handleApiError(error, 'API POST /api/ausencias');
  }
}

