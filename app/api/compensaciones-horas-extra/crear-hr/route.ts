// ========================================
// API: Crear Compensación de Horas Extra (Solo HR)
// ========================================
// Permite a HR crear compensaciones directamente aprobadas

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  validateRequest,
  handleApiError,
  createdResponse,
  badRequestResponse,
  notFoundResponse,
} from '@/lib/api-handler';
import { z } from 'zod';
import { EstadoAusencia } from '@/lib/constants/enums';

const crearCompensacionHRSchema = z.object({
  empleadoId: z.string(),
  horasBalance: z.number().positive(),
  tipoCompensacion: z.enum(['nomina', 'ausencia']),
});

// POST /api/compensaciones-horas-extra/crear-hr - Crear compensación directamente aprobada (HR)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const validationResult = await validateRequest(request, crearCompensacionHRSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const { empleadoId, horasBalance, tipoCompensacion } = validatedData;

    // Validar que las horas sean positivas
    if (horasBalance <= 0) {
      return badRequestResponse('Las horas de balance deben ser positivas');
    }

    // Verificar que el empleado existe y pertenece a la misma empresa
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        empresaId: true,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    if (empleado.empresaId !== session.user.empresaId) {
      return badRequestResponse('No autorizado');
    }

    // Procesar según tipo de compensación
    if (tipoCompensacion === 'ausencia') {
      // Convertir horas a días (8 horas = 1 día)
      const diasAusencia = Math.round((horasBalance / 8) * 10) / 10;

      console.info(
        `[Compensación HR] Creando compensación para ${empleadoId}: ${horasBalance}h → ${diasAusencia} días de ausencia`
      );

      // Crear ausencia de compensación
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() + 1); // Mañana como fecha simbólica
      const fechaFin = new Date(fechaInicio);

      const ausencia = await prisma.ausencia.create({
        data: {
          empresaId: empleado.empresaId,
          empleadoId: empleado.id,
          tipo: 'otro', // Usar 'otro' ya que 'compensacion_horas' no existe en el enum
          fechaInicio,
          fechaFin,
          medioDia: false,
          diasNaturales: 0,
          diasLaborables: 0,
          diasSolicitados: diasAusencia,
          descuentaSaldo: false, // No descuenta, suma al saldo
          estado: EstadoAusencia.auto_aprobada,
          descripcion: `Compensación de ${horasBalance} horas extra`,
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
            empleadoId: empleado.id,
            año: añoActual,
          },
        },
        update: {
          diasTotales: {
            increment: Math.floor(diasAusencia),
          },
        },
        create: {
          empresaId: empleado.empresaId,
          empleadoId: empleado.id,
          año: añoActual,
          diasTotales: Math.floor(diasAusencia),
          diasUsados: 0,
          diasPendientes: 0,
          origen: 'manual_hr',
        },
      });

      // Crear compensación con estado aprobada
      const compensacion = await prisma.compensacionHoraExtra.create({
        data: {
          empresaId: empleado.empresaId,
          empleadoId: empleado.id,
          horasBalance,
          tipoCompensacion,
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

      console.info(
        `[Compensación HR] Aprobada ${compensacion.id}: ${diasAusencia} días añadidos al saldo`
      );

      return createdResponse(compensacion);
    } else {
      // Compensación por nómina
      const compensacion = await prisma.compensacionHoraExtra.create({
        data: {
          empresaId: empleado.empresaId,
          empleadoId: empleado.id,
          horasBalance,
          tipoCompensacion,
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
      // Esto se integrará cuando tengamos el sistema de pre-nóminas
      // Por ahora, la compensación queda registrada con estado 'aprobada' 
      // y campo 'tipoCompensacion' = 'nomina' para que pueda ser consultada

      console.info(`[Compensación HR] Aprobada ${compensacion.id} vía nómina`);

      return createdResponse(compensacion);
    }
  } catch (error) {
    return handleApiError(error, 'API POST /api/compensaciones-horas-extra/crear-hr');
  }
}

