// ========================================
// API Route: Ausencias
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  createdResponse,
  handleApiError,
  requireAuth,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import {
  actualizarSaldo,
  calcularDias,
  validarPoliticasEquipo,
  validarSaldoSuficiente,
} from '@/lib/calculos/ausencias';
import { determinarEstadoTrasAprobacion } from '@/lib/calculos/ausencias';
import { TIPOS_AUTO_APROBABLES, TIPOS_DESCUENTAN_SALDO } from '@/lib/constants/ausencias';
import { EstadoAusencia, UsuarioRol } from '@/lib/constants/enums';
import { eliminarDocumentoPorId } from '@/lib/documentos';
import { CalendarManager } from '@/lib/integrations/calendar/calendar-manager';
import { crearNotificacionAusenciaAutoAprobada, crearNotificacionAusenciaSolicitada } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { asJsonValue, JSON_NULL } from '@/lib/prisma/json';
import {
  buildPaginationMeta,
  parsePaginationParams,
} from '@/lib/utils/pagination';
import { ausenciaCreateSchema } from '@/lib/validaciones/schemas';

import { Prisma } from '@prisma/client';

const ausenciaConEmpleadoInclude = Prisma.validator<Prisma.AusenciaInclude>()({
  empleado: {
    select: {
      nombre: true,
      apellidos: true,
      puesto: true,
      fotoUrl: true,
      managerId: true,
    },
  },
});

type AusenciaConEmpleado = Prisma.AusenciaGetPayload<{
  include: typeof ausenciaConEmpleadoInclude;
}>;

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
      where.estado = estado as EstadoAusencia;
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

    const { page, limit, skip } = parsePaginationParams(searchParams);

    const [ausencias, total] = await Promise.all([
      prisma.ausencia.findMany({
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
        },
        skip,
        take: limit,
      }),
      prisma.ausencia.count({ where }),
    ]);

    return successResponse({
      data: ausencias,
      pagination: buildPaginationMeta(page, limit, total),
    });
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
    const empleadoId = session.user.empleadoId;

    // Validar request body
    const validationResult = await validateRequest(req, ausenciaCreateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const cleanupDocumentoHuérfano = async () => {
      if (validatedData.documentoId) {
        try {
          await eliminarDocumentoPorId(validatedData.documentoId);
        } catch (error) {
          console.error('[Ausencias] Error limpiando documento huérfano:', error);
        }
      }
    };

    // Validar fechas
    if (validatedData.fechaInicio > validatedData.fechaFin) {
      await cleanupDocumentoHuérfano();
      return badRequestResponse('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    // Validar que no hay solapamiento con ausencias existentes del mismo empleado
    const fechaInicioCheck = validatedData.fechaInicio instanceof Date 
      ? validatedData.fechaInicio 
      : new Date(validatedData.fechaInicio);
    const fechaFinCheck = validatedData.fechaFin instanceof Date 
      ? validatedData.fechaFin 
      : new Date(validatedData.fechaFin);

    if (validatedData.medioDia) {
      if (!validatedData.periodo) {
        await cleanupDocumentoHuérfano();
        return badRequestResponse('Debes especificar si el medio día es de mañana o tarde');
      }
      const esMismoDia = fechaInicioCheck.toDateString() === fechaFinCheck.toDateString();
      if (!esMismoDia) {
        await cleanupDocumentoHuérfano();
        return badRequestResponse('El medio día solo se puede aplicar a ausencias de un solo día');
      }
    }

    const ausenciasSolapadas = await prisma.ausencia.findMany({
      where: {
        empleadoId,
        estado: {
          in: [EstadoAusencia.pendiente, EstadoAusencia.confirmada, EstadoAusencia.completada],
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
      await cleanupDocumentoHuérfano();
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
    const descuentaSaldo = TIPOS_DESCUENTAN_SALDO.includes(validatedData.tipo);

    // Obtener equipoId del empleado si no se proporcionó
    let equipoId: string | null = validatedData.equipoId || null;
    if (!equipoId) {
      const empleadoEquipo = await prisma.empleadoEquipo.findFirst({
        where: { empleadoId },
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
        empleadoId,
        fechaInicio,
        fechaFin,
        validatedData.tipo
      );

      if (!validacionPoliticas.valida) {
        await cleanupDocumentoHuérfano();
        return badRequestResponse(
          validacionPoliticas.errores.join('. '),
          { errores: validacionPoliticas.errores }
        );
      }
    }

    // Determinar si la ausencia es auto-aprobable
    const esAutoAprobable = TIPOS_AUTO_APROBABLES.includes(validatedData.tipo);
    const estadoInicial = esAutoAprobable
      ? determinarEstadoTrasAprobacion(fechaFin)
      : EstadoAusencia.pendiente;

    class SaldoInsuficienteError extends Error {
      saldoDisponible: number;

      constructor(saldoDisponible: number, mensaje?: string) {
        super(mensaje || 'Saldo insuficiente');
        this.name = 'SaldoInsuficienteError';
        this.saldoDisponible = saldoDisponible;
      }
    }

    let ausencia: AusenciaConEmpleado;
    try {
      ausencia = await prisma.$transaction(async (tx) => {
        if (descuentaSaldo) {
          const año = fechaInicio.getFullYear();
          const validacion = await validarSaldoSuficiente(
            empleadoId,
            año,
            diasSolicitadosFinal,
            tx,
            { lock: true }
          );

          if (!validacion.suficiente) {
            throw new SaldoInsuficienteError(validacion.saldoActual, validacion.mensaje);
          }

          await actualizarSaldo(
            empleadoId,
            año,
            'solicitar',
            diasSolicitadosFinal,
            tx
          );
        }

        return tx.ausencia.create({
          data: {
            empleadoId,
            empresaId: session.user.empresaId,
            equipoId,
            tipo: validatedData.tipo,
            fechaInicio,
            fechaFin,
            medioDia: validatedData.medioDia || false,
            periodo: validatedData.medioDia ? (validatedData.periodo || null) : null,
            diasNaturales,
            diasLaborables,
            diasSolicitados: diasSolicitadosFinal,
            motivo: validatedData.motivo,
            justificanteUrl: validatedData.justificanteUrl,
            documentoId: validatedData.documentoId,
            descuentaSaldo,
            diasIdeales: validatedData.diasIdeales
              ? asJsonValue(validatedData.diasIdeales)
              : JSON_NULL,
            diasPrioritarios: validatedData.diasPrioritarios
              ? asJsonValue(validatedData.diasPrioritarios)
              : JSON_NULL,
            diasAlternativos: validatedData.diasAlternativos
              ? asJsonValue(validatedData.diasAlternativos)
              : JSON_NULL,
            estado: estadoInicial,
          },
          include: ausenciaConEmpleadoInclude,
        });
      });
    } catch (error) {
      if (error instanceof SaldoInsuficienteError) {
        await cleanupDocumentoHuérfano();
        return badRequestResponse(error.message, {
          saldoDisponible: error.saldoDisponible,
          diasSolicitados: diasSolicitadosFinal,
        });
      }
      throw error;
    }

    // Actualizar saldo y crear notificaciones según si fue auto-aprobada o requiere aprobación
    if (esAutoAprobable) {
      try {
        await crearNotificacionAusenciaAutoAprobada(prisma, {
          ausenciaId: ausencia.id,
          empresaId: session.user.empresaId,
          empleadoId,
          empleadoNombre: `${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}`,
          managerId: ausencia.empleado.managerId,
          tipo: ausencia.tipo,
          fechaInicio: ausencia.fechaInicio,
          fechaFin: ausencia.fechaFin,
        });
      } catch (error) {
        console.error('[Ausencias] Error creando notificación auto-aprobada:', error);
      }

      try {
        await CalendarManager.syncAusenciaToCalendars({
          ...ausencia,
          empleado: {
            nombre: ausencia.empleado.nombre,
            apellidos: ausencia.empleado.apellidos,
          },
        });
      } catch (error) {
        console.error('[Ausencias] Error sincronizando ausencia auto-aprobada:', error);
      }
    } else {
      try {
        await crearNotificacionAusenciaSolicitada(prisma, {
          ausenciaId: ausencia.id,
          empresaId: session.user.empresaId,
          empleadoId,
          empleadoNombre: `${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}`,
          tipo: ausencia.tipo,
          fechaInicio: ausencia.fechaInicio,
          fechaFin: ausencia.fechaFin,
          diasSolicitados: diasSolicitadosFinal,
        });
      } catch (error) {
        console.error('[Ausencias] Error creando notificación de solicitud:', error);
      }
    }

    return createdResponse(ausencia);
  } catch (error) {
    return handleApiError(error, 'API POST /api/ausencias');
  }
}

