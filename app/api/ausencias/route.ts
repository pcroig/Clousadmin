// ========================================
// API Route: Ausencias
// ========================================

import { Prisma } from '@prisma/client';
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
import {
  crearNotificacionAusenciaAprobada,
  crearNotificacionAusenciaAutoAprobada,
  crearNotificacionAusenciaSolicitada,
} from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { asJsonValue, JSON_NULL } from '@/lib/prisma/json';
import {
  buildPaginationMeta,
  parsePaginationParams,
} from '@/lib/utils/pagination';
import { ausenciaCreateSchema } from '@/lib/validaciones/schemas';
import { normalizeToUTCDate } from '@/lib/utils/dates';

const ausenciaConEmpleadoInclude = Prisma.validator<Prisma.ausenciasInclude>()({
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

type AusenciaConEmpleado = Prisma.ausenciasGetPayload<{
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
    const equipoId = searchParams.get('equipoId');
    const fechaInicioParam = searchParams.get('fechaInicio');
    const fechaFinParam = searchParams.get('fechaFin');
    const search = searchParams.get('search');

    // Filtros base
    const where: Prisma.ausenciasWhereInput = {
      empresaId: session.user.empresaId,
    };

    // Filtrar por estado si se proporciona
    if (estado && estado !== 'todos') {
      where.estado = estado as EstadoAusencia;
    }

    // Filtrar por empleado si se proporciona
    if (empleadoId) {
      where.empleadoId = empleadoId;
    }

    const andFilters: Prisma.ausenciasWhereInput[] = [];

    if (equipoId && equipoId !== 'todos') {
      andFilters.push({
        OR: [
          { equipoId },
          {
            empleado: {
              equipos: {
                some: {
                  equipoId,
                },
              },
            },
          },
        ],
      });
    }

    // Normalizar filtros de fecha a UTC para evitar problemas de timezone
    if (fechaInicioParam) {
      const inicio = normalizeToUTCDate(fechaInicioParam);
      if (!Number.isNaN(inicio.getTime())) {
        andFilters.push({ fechaInicio: { gte: inicio } });
      }
    }

    if (fechaFinParam) {
      const fin = normalizeToUTCDate(fechaFinParam);
      // Para fechaFin, queremos incluir todo el día, así que buscamos ausencias que empiecen en o antes de este día
      if (!Number.isNaN(fin.getTime())) {
        andFilters.push({ fechaInicio: { lte: fin } });
      }
    }

    if (search) {
      andFilters.push({
        empleado: {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } },
            { apellidos: { contains: search, mode: 'insensitive' } },
          ],
        },
      });
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
      const empleadosACargo = await prisma.empleados.findMany({
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

    if (andFilters.length > 0) {
      const existingAnd = Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : [];
      where.AND = [...existingAnd, ...andFilters];
    }

    const { page, limit, skip } = parsePaginationParams(searchParams);

    const [ausencias, total] = await Promise.all([
      prisma.ausencias.findMany({
        where,
        include: {
          empleado: {
            select: {
              nombre: true,
              apellidos: true,
              puesto: true,
              email: true,
              fotoUrl: true,
              equipos: {
                select: {
                  equipo: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.ausencias.count({ where }),
    ]);

    const ausenciasFormateadas = ausencias.map((ausencia) => {
      if (!ausencia.empleado) return ausencia;

      const equipoAsignado = ausencia.empleado.equipos?.[0]?.equipo ?? null;
      const { equipos, ...empleadoBase } = ausencia.empleado as typeof ausencia.empleado & {
        equipos?: Array<{ equipo: { id: string; nombre: string } | null }>;
      };

      return {
        ...ausencia,
        empleado: {
          ...empleadoBase,
          equipoId: equipoAsignado?.id ?? null,
          equipoNombre: equipoAsignado?.nombre ?? null,
          equipo: equipoAsignado
            ? {
                id: equipoAsignado.id,
                nombre: equipoAsignado.nombre,
              }
            : null,
        },
      };
    });

    return successResponse({
      data: ausenciasFormateadas,
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

    // Validar request body
    const validationResult = await validateRequest(req, ausenciaCreateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    let empleadoIdDestino: string | null = null;
    if (validatedData.empleadoId) {
      if (
        validatedData.empleadoId !== session.user.empleadoId &&
        session.user.rol !== UsuarioRol.hr_admin
      ) {
        return badRequestResponse('Solo HR Admin puede registrar ausencias para otros empleados');
      }
      empleadoIdDestino = validatedData.empleadoId;
    } else {
      empleadoIdDestino = session.user.empleadoId ?? null;
    }

    if (!empleadoIdDestino) {
      return badRequestResponse('No tienes un empleado asignado. Contacta con HR.');
    }

    const empleadoDestino = await prisma.empleados.findFirst({
      where: {
        id: empleadoIdDestino,
        empresaId: session.user.empresaId,
      },
      select: {
        id: true,
        empresaId: true,
        managerId: true,
      },
    });

    if (!empleadoDestino) {
      return badRequestResponse('Empleado destino no encontrado en tu empresa');
    }

    if (
      session.user.rol === UsuarioRol.manager &&
      empleadoIdDestino !== session.user.empleadoId
    ) {
      // Validar que el empleado pertenezca a sus equipos
      if (!session.user.empleadoId) {
        return badRequestResponse('No tienes permisos para registrar esta ausencia');
      }
      const equiposManager = await prisma.empleado_equipos.findMany({
        where: {
          empleadoId: session.user.empleadoId,
        },
        select: { equipoId: true },
      });
      const equiposDestino = await prisma.empleado_equipos.findMany({
        where: {
          empleadoId: empleadoDestino.id,
        },
        select: { equipoId: true },
      });
      const equiposPermitidos = new Set(equiposManager.map((e) => e.equipoId));
      const pertenece =
        equiposDestino.filter((e) => equiposPermitidos.has(e.equipoId)).length > 0;
      if (!pertenece) {
        return badRequestResponse('No tienes permisos para registrar esta ausencia');
      }
    }

    const empleadoId = empleadoDestino.id;

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
    const fechaInicioCheck = normalizeToUTCDate(validatedData.fechaInicio);
    const fechaFinCheck = normalizeToUTCDate(validatedData.fechaFin);

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

    const ausenciasSolapadas = await prisma.ausencias.findMany({
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
      fechaInicioCheck,
      fechaFinCheck,
      session.user.empresaId,
      empleadoId
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
      const empleadoEquipo = await prisma.empleado_equipos.findFirst({
        where: { empleadoId },
        orderBy: { fechaIncorporacion: 'desc' },
      });
      equipoId = empleadoEquipo?.equipoId || null;
    }

    // Convertir fechas a Date si son strings
    const fechaInicio = fechaInicioCheck;
    const fechaFin = fechaFinCheck;

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
    // Si HR Admin crea la ausencia, se aprueba automáticamente sin importar el tipo
    const esHRAdmin = session.user.rol === UsuarioRol.hr_admin;
    const esAutoAprobable = TIPOS_AUTO_APROBABLES.includes(validatedData.tipo) || esHRAdmin;
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
        let diasDesdeCarryOver = 0;
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

          // Si es auto-aprobable (incluyendo HR Admin), aprobar directamente
          // Si no, solo marcar como pendiente
          if (esAutoAprobable) {
            // Primero solicitar (incrementa pendientes)
            const saldoSolicitar = await actualizarSaldo(
              empleadoId,
              año,
              'solicitar',
              diasSolicitadosFinal,
              tx
            );
            // Luego aprobar (mueve de pendientes a usados)
            const saldoAprobar = await actualizarSaldo(
              empleadoId,
              año,
              'aprobar',
              diasSolicitadosFinal,
              tx,
              { diasDesdeCarryOver: saldoSolicitar.diasDesdeCarryOver }
            );
            diasDesdeCarryOver = saldoAprobar.diasDesdeCarryOver;
          } else {
            const saldoResult = await actualizarSaldo(
              empleadoId,
              año,
              'solicitar',
              diasSolicitadosFinal,
              tx
            );
            diasDesdeCarryOver = saldoResult.diasDesdeCarryOver;
          }
        }

        return tx.ausencias.create({
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
            diasDesdeCarryOver,
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
      // Si HR Admin creó la ausencia, notificar al empleado que fue aprobada
      // Si es auto-aprobable por tipo (enfermedad, etc), notificar a HR/Manager
      const esAusenciaRegistradaPorHR = esHRAdmin && empleadoIdDestino !== session.user.empleadoId;

      if (esAusenciaRegistradaPorHR) {
        // Notificar al empleado que HR registró y aprobó su ausencia
        try {
          await crearNotificacionAusenciaAprobada(
            prisma,
            {
              ausenciaId: ausencia.id,
              empresaId: session.user.empresaId,
              empleadoId,
              empleadoNombre: `${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}`,
              tipo: ausencia.tipo,
              fechaInicio: ausencia.fechaInicio,
              fechaFin: ausencia.fechaFin,
              diasSolicitados: diasSolicitadosFinal,
            },
            { actorUsuarioId: session.user.id }
          );
        } catch (error) {
          console.error('[Ausencias] Error creando notificación para empleado:', error);
        }
      } else {
        // Notificar a HR/Manager sobre ausencia auto-aprobada por tipo
        try {
          await crearNotificacionAusenciaAutoAprobada(
            prisma,
            {
              ausenciaId: ausencia.id,
              empresaId: session.user.empresaId,
              empleadoId,
              empleadoNombre: `${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}`,
              managerId: ausencia.empleado.managerId,
              tipo: ausencia.tipo,
              fechaInicio: ausencia.fechaInicio,
              fechaFin: ausencia.fechaFin,
              diasSolicitados: diasSolicitadosFinal,
            },
            { actorUsuarioId: session.user.id }
          );
        } catch (error) {
          console.error('[Ausencias] Error creando notificación auto-aprobada:', error);
        }
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
        await crearNotificacionAusenciaSolicitada(
          prisma,
          {
            ausenciaId: ausencia.id,
            empresaId: session.user.empresaId,
            empleadoId,
            empleadoNombre: `${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}`,
            tipo: ausencia.tipo,
            fechaInicio: ausencia.fechaInicio,
            fechaFin: ausencia.fechaFin,
            diasSolicitados: diasSolicitadosFinal,
          },
          { actorUsuarioId: session.user.id }
        );
      } catch (error) {
        console.error('[Ausencias] Error creando notificación de solicitud:', error);
      }
    }

    return createdResponse(ausencia);
  } catch (error) {
    return handleApiError(error, 'API POST /api/ausencias');
  }
}

