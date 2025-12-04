// ========================================
// API Route: Aceptar Propuesta de Vacaciones
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  createdResponse,
  featureDisabledResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-handler';
import { calcularDias } from '@/lib/calculos/ausencias';
import {
  CAMPANAS_VACACIONES_ENABLED,
  CAMPANAS_VACACIONES_FEATURE_NAME,
} from '@/lib/constants/feature-flags';
import { EstadoAusencia } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';

// POST /api/campanas-vacaciones/[id]/aceptar - Empleado acepta propuesta de vacaciones
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    if (!CAMPANAS_VACACIONES_ENABLED) {
      return featureDisabledResponse(CAMPANAS_VACACIONES_FEATURE_NAME);
    }

    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo empleados
    if (!session.user.empleadoId) {
      return badRequestResponse('Debes ser un empleado para aceptar propuestas');
    }

    const { id: campanaId } = await params;

    // Buscar preferencia del empleado en esta campaña
    const preferencia = await prisma.preferencias_vacaciones.findFirst({
      where: {
        campanaId,
        empleadoId: session.user.empleadoId,
      },
      include: {
        campana_vacaciones: true,
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            equipos: {
              select: {
                equipoId: true,
              },
            },
          },
        },
      },
    });

    if (!preferencia) {
      return badRequestResponse('No estás asignado a esta campaña');
    }

    if (preferencia.campana_vacaciones.estado !== 'cuadrada') {
      return badRequestResponse('La campaña aún no ha sido cuadrada');
    }

    if (preferencia.aceptada) {
      return badRequestResponse('Ya has aceptado esta propuesta');
    }

    if (!preferencia.propuestaIA) {
      return badRequestResponse('No hay propuesta disponible para ti');
    }

    interface VacacionesPropuesta {
      fechaInicio: string | Date;
      fechaFin: string | Date;
      [key: string]: unknown;
    }
    
    const propuesta = preferencia.propuestaIA as VacacionesPropuesta;

    // Validar fechas
    const fechaInicio = new Date(propuesta.fechaInicio);
    const fechaFin = new Date(propuesta.fechaFin);

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
      return badRequestResponse('Fechas de propuesta inválidas');
    }

    // Calcular días reales
    const { diasNaturales, diasLaborables, diasSolicitados } = await calcularDias(
      fechaInicio,
      fechaFin,
      session.user.empresaId,
      session.user.empleadoId || undefined
    );

    // Obtener equipoId del empleado (si tiene)
    const equipoId = preferencia.empleado.equipos[0]?.equipoId || null;

    // Crear ausencia automáticamente en estado pendiente
    const ausencia = await prisma.ausencias.create({
      data: {
        empresaId: session.user.empresaId,
        empleadoId: session.user.empleadoId,
        equipoId,
        tipo: 'vacaciones',
        fechaInicio,
        fechaFin,
        medioDia: false,
        diasNaturales,
        diasLaborables,
        diasSolicitados,
        descuentaSaldo: true,
        estado: EstadoAusencia.pendiente,
        motivo: `Vacaciones de campaña: ${preferencia.campana_vacaciones.titulo}`,
          diasIdeales: asJsonValue(preferencia.diasIdeales),
          diasPrioritarios: asJsonValue(preferencia.diasPrioritarios),
          diasAlternativos: asJsonValue(preferencia.diasAlternativos),
      },
    });

    // Marcar preferencia como aceptada
    await prisma.preferencias_vacaciones.update({
      where: { id: preferencia.id },
      data: {
        aceptada: true,
      },
    });

    // Actualizar saldo pendiente
    const añoActual = fechaInicio.getFullYear();
    const saldo = await prisma.empleadoSaldoAusencias.findFirst({
      where: {
        empleadoId: session.user.empleadoId,
        anio: añoActual,
      },
    });

    if (saldo) {
      await prisma.empleadoSaldoAusencias.update({
        where: { id: saldo.id },
        data: {
          diasPendientes: {
            increment: diasSolicitados,
          },
        },
      });
    }

    console.info(`[Aceptar] Empleado ${session.user.empleadoId} aceptó propuesta de campaña ${campanaId}`);

    return createdResponse({
      ausencia,
      message: 'Propuesta aceptada y ausencia creada',
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/campanas-vacaciones/[id]/aceptar');
  }
}

