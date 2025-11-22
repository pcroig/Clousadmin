// ========================================
// API: Gestión Individual de Compensación de Horas Extra
// ========================================
// PATCH: Aprobar o rechazar compensación

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  handleApiError,
  notFoundResponse,
  requireAuthAsHR,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { determinarEstadoTrasAprobacion } from '@/lib/calculos/ausencias';
import { prisma } from '@/lib/prisma';

const aprobarRechazarSchema = z.object({
  accion: z.enum(['aprobar', 'rechazar']),
  motivoRechazo: z.string().optional(),
});

// PATCH /api/compensaciones-horas-extra/[id] - Aprobar/Rechazar compensación
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await context.params;

    const validationResult = await validateRequest(request, aprobarRechazarSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const { accion, motivoRechazo } = validatedData;

    // Buscar compensación
    const compensacion = await prisma.compensacionHoraExtra.findUnique({
      where: { id },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
            empresaId: true,
          },
        },
      },
    });

    if (!compensacion) {
      return notFoundResponse('Compensación no encontrada');
    }

    // Verificar que pertenece a la misma empresa
    if (compensacion.empresaId !== session.user.empresaId) {
      return badRequestResponse('No autorizado');
    }

    // Verificar que está pendiente
    if (compensacion.estado !== 'pendiente') {
      return badRequestResponse(`La compensación ya está ${compensacion.estado}`);
    }

    if (accion === 'rechazar') {
      // Rechazar compensación
      const compensacionActualizada = await prisma.compensacionHoraExtra.update({
        where: { id },
        data: {
          estado: 'rechazada',
          aprobadoPor: session.user.id,
          aprobadoEn: new Date(),
          motivoRechazo: motivoRechazo || 'Sin motivo especificado',
        },
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              email: true,
            },
          },
        },
      });

      // TODO: Crear notificación al empleado

      console.info(`[Compensación Horas Extra] Rechazada ${id} por ${session.user.id}`);

      return successResponse(compensacionActualizada);
    }

    // Aprobar compensación
    if (compensacion.tipoCompensacion === 'ausencia') {
      // Convertir horas a días (8 horas = 1 día)
      const diasAusencia = Math.round((Number(compensacion.horasBalance) / 8) * 10) / 10;

      console.info(`[Compensación Horas Extra] Aprobando ${id}: ${compensacion.horasBalance}h → ${diasAusencia} días de ausencia`);

      // Crear ausencia de compensación
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() + 1); // Mañana como fecha simbólica
      const fechaFin = new Date(fechaInicio);

      const ausencia = await prisma.ausencia.create({
        data: {
          empresaId: compensacion.empresaId,
          empleadoId: compensacion.empleadoId,
          tipo: 'otro', // Usar 'otro' ya que 'compensacion_horas' no existe en el enum
          fechaInicio,
          fechaFin,
          medioDia: false,
          diasNaturales: 0,
          diasLaborables: 0,
          diasSolicitados: diasAusencia,
          descuentaSaldo: false, // No descuenta, suma al saldo
          estado: determinarEstadoTrasAprobacion(fechaFin),
          descripcion: `Compensación de ${compensacion.horasBalance} horas extra`,
          motivo: 'Compensación de horas extra trabajadas', // Requerido para tipo 'otro'
          aprobadaPor: session.user.id,
          aprobadaEn: new Date(),
        },
      });

      // Actualizar saldo del empleado (sumar días)
      const añoActual = new Date().getFullYear();
      
      await prisma.empleadoSaldoAusencias.upsert({
        where: {
          empleadoId_año: {
            empleadoId: compensacion.empleadoId,
            año: añoActual,
          },
        },
        update: {
          diasTotales: {
            increment: Math.floor(diasAusencia),
          },
        },
        create: {
          empresaId: compensacion.empresaId,
          empleadoId: compensacion.empleadoId,
          año: añoActual,
          diasTotales: Math.floor(diasAusencia),
          diasUsados: 0,
          diasPendientes: 0,
          origen: 'manual_hr',
        },
      });

      // Actualizar compensación
      const compensacionActualizada = await prisma.compensacionHoraExtra.update({
        where: { id },
        data: {
          estado: 'aprobada',
          aprobadoPor: session.user.id,
          aprobadoEn: new Date(),
          diasAusencia,
          ausenciaId: ausencia.id,
        },
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              email: true,
            },
          },
          ausencia: true,
        },
      });

      // TODO: Crear notificación al empleado

      console.info(`[Compensación Horas Extra] Aprobada ${id}: ${diasAusencia} días añadidos al saldo`);

      return successResponse(compensacionActualizada);
    } else {
      // Compensación por nómina
      const compensacionActualizada = await prisma.compensacionHoraExtra.update({
        where: { id },
        data: {
          estado: 'aprobada',
          aprobadoPor: session.user.id,
          aprobadoEn: new Date(),
        },
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              email: true,
            },
          },
        },
      });

      // TODO: Marcar para incluir en próxima nómina
      // TODO: Crear notificación al empleado

      console.info(`[Compensación Horas Extra] Aprobada ${id} vía nómina`);

      return successResponse(compensacionActualizada);
    }
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/compensaciones-horas-extra/[id]');
  }
}

