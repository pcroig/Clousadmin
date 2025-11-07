// ========================================
// API Contratos - Dar de Baja / Offboarding
// ========================================
// Este endpoint maneja el proceso completo de offboarding de un empleado:
// 1. Finaliza el contrato con fecha especificada
// 2. Desactiva el empleado (cambia estado a 'baja')
// 3. Desactiva el acceso del usuario
// 4. Opcionalmente procesa documentos de offboarding

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  handleApiError,
  successResponse,
  notFoundResponse,
} from '@/lib/api-handler';
import { z } from 'zod';

// Schema de validación - Fecha de finalización es obligatoria
const finalizarContratoSchema = z.object({
  fechaFin: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, 'Fecha inválida'),
  motivo: z.string().optional(),
  documentosIds: z.array(z.string()).optional(), // IDs de documentos de offboarding ya subidos
});

// POST /api/contratos/[id]/finalizar - Dar de baja empleado (solo HR Admin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Parsear y validar request body
    const body = await request.json();
    const validation = finalizarContratoSchema.safeParse(body);
    
    if (!validation.success) {
      return successResponse(
        { error: 'Datos inválidos', details: validation.error.issues },
        400
      );
    }

    const validatedData = validation.data;

    // Obtener contrato y empleado con todas las relaciones necesarias
    const contrato = await prisma.contrato.findUnique({
      where: { id },
      include: {
        empleado: {
          include: {
            usuario: true,
            carpetas: {
              where: {
                nombre: 'Offboarding',
                esSistema: true,
              },
            },
          },
        },
      },
    });

    if (!contrato) {
      return notFoundResponse('Contrato no encontrado');
    }

    // Verificar que el contrato pertenece a la empresa del HR admin
    if (contrato.empleado.empresaId !== session.user.empresaId) {
      return successResponse(
        { error: 'No tienes permisos para finalizar este contrato' },
        { status: 403 }
      );
    }

    // Validar que la fecha de finalización no sea anterior a la fecha de inicio
    const fechaFin = new Date(validatedData.fechaFin);
    const fechaInicio = new Date(contrato.fechaInicio);
    
    if (fechaFin < fechaInicio) {
      return successResponse(
        { error: 'La fecha de finalización no puede ser anterior a la fecha de inicio del contrato' },
        { status: 400 }
      );
    }

    // Proceso completo de offboarding en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar fecha fin del contrato
      await tx.contrato.update({
        where: { id },
        data: {
          fechaFin,
        },
      });

      // 2. Desactivar empleado y establecer fecha de baja
      await tx.empleado.update({
        where: { id: contrato.empleadoId },
        data: {
          activo: false,
          fechaBaja: fechaFin,
          estadoEmpleado: 'baja',
        },
      });

      // 3. Desactivar usuario (deshabilitar acceso a la plataforma)
      await tx.usuario.update({
        where: { id: contrato.empleado.usuarioId },
        data: {
          activo: false,
        },
      });

      // 4. Procesar documentos de offboarding si se proporcionaron
      if (validatedData.documentosIds && validatedData.documentosIds.length > 0) {
        // Buscar o crear carpeta de Offboarding
        let carpetaOffboarding = contrato.empleado.carpetas[0];
        
        if (!carpetaOffboarding) {
          carpetaOffboarding = await tx.carpeta.create({
            data: {
              empresaId: session.user.empresaId,
              empleadoId: contrato.empleadoId,
              nombre: 'Offboarding',
              esSistema: true,
            },
          });
        }

        // Asociar documentos a la carpeta de offboarding
        await tx.documento.updateMany({
          where: {
            id: { in: validatedData.documentosIds },
            empresaId: session.user.empresaId,
          },
          data: {
            carpetaId: carpetaOffboarding.id,
            tipoDocumento: 'offboarding',
          },
        });
      }

      return {
        contratoId: contrato.id,
        empleadoId: contrato.empleadoId,
        usuarioId: contrato.empleado.usuarioId,
        fechaFinalizacion: fechaFin,
        documentosProcesados: validatedData.documentosIds?.length || 0,
      };
    });

    console.info('[Offboarding] Empleado dado de baja:', {
      empleadoId: result.empleadoId,
      contratoId: result.contratoId,
      fechaFin: result.fechaFinalizacion,
      documentos: result.documentosProcesados,
      hrAdminId: session.user.id,
    });

    return successResponse({
      success: true,
      message: 'Empleado dado de baja correctamente',
      data: result,
    });
  } catch (error) {
    console.error('[API Error] /api/contratos/[id]/finalizar:', error);
    return handleApiError(error, 'API POST /api/contratos/[id]/finalizar');
  }
}
