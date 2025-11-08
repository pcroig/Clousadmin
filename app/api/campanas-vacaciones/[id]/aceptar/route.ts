// ========================================
// API Route: Aceptar Propuesta de Vacaciones
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcularDias } from '@/lib/calculos/ausencias';
import { EstadoAusencia } from '@/lib/constants/enums';

import {
  requireAuth,
  handleApiError,
  successResponse,
  createdResponse,
  badRequestResponse,
} from '@/lib/api-handler';

// POST /api/campanas-vacaciones/[id]/aceptar - Empleado acepta propuesta de vacaciones
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const preferencia = await prisma.preferenciaVacaciones.findFirst({
      where: {
        campanaId,
        empleadoId: session.user.empleadoId,
      },
      include: {
        campana: true,
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

    if (preferencia.campana.estado !== 'cuadrada') {
      return badRequestResponse('La campaña aún no ha sido cuadrada');
    }

    if (preferencia.aceptada) {
      return badRequestResponse('Ya has aceptado esta propuesta');
    }

    if (!preferencia.propuestaIA) {
      return badRequestResponse('No hay propuesta disponible para ti');
    }

    const propuesta = preferencia.propuestaIA as any;

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
      session.user.empresaId
    );

    // Obtener equipoId del empleado (si tiene)
    const equipoId = preferencia.empleado.equipos[0]?.equipoId || null;

    // Crear ausencia automáticamente en estado pendiente_aprobacion
    const ausencia = await prisma.ausencia.create({
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
        descripcion: `Vacaciones de campaña: ${preferencia.campana.titulo}`,
        descuentaSaldo: true,
        estado: EstadoAusencia.pendiente_aprobacion,
        diasIdeales: preferencia.diasIdeales as any,
        diasPrioritarios: preferencia.diasPrioritarios as any,
        diasAlternativos: preferencia.diasAlternativos as any,
      },
    });

    // Marcar preferencia como aceptada
    await prisma.preferenciaVacaciones.update({
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
        año: añoActual,
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

