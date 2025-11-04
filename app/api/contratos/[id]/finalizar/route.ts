// ========================================
// API Contratos - Finalizar Contrato
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  validateRequest,
  handleApiError,
  successResponse,
  notFoundResponse,
  forbiddenResponse,
} from '@/lib/api-handler';
import { z } from 'zod';

// Schema de validación
const finalizarContratoSchema = z.object({
  fechaFin: z.string(),
  motivo: z.string().optional(),
});

// POST /api/contratos/[id]/finalizar - Finalizar contrato (solo HR Admin)
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

    // Validar request body
    const validationResult = await validateRequest(request, finalizarContratoSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Obtener contrato y empleado
    const contrato = await prisma.contrato.findUnique({
      where: {
        id,
      },
      include: {
        empleado: {
          include: {
            usuario: true,
          },
        },
      },
    });

    if (!contrato) {
      return notFoundResponse('Contrato no encontrado');
    }

    if (contrato.empleado.empresaId !== session.user.empresaId) {
      return forbiddenResponse('No tienes permisos para acceder a este contrato');
    }

    // Finalizar contrato y desactivar empleado/usuario en una transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar fecha fin del contrato
      await tx.contrato.update({
        where: { id },
        data: {
          fechaFin: new Date(validatedData.fechaFin),
        },
      });

      // Desactivar empleado
      await tx.empleado.update({
        where: { id: contrato.empleadoId },
        data: {
          activo: false,
          fechaBaja: new Date(validatedData.fechaFin),
          estadoEmpleado: 'baja',
        },
      });

      // Desactivar usuario (deshabilitar acceso)
      await tx.usuario.update({
        where: { id: contrato.empleado.usuarioId },
        data: {
          activo: false,
        },
      });
    });

    return successResponse({
      success: true,
      message: 'Contrato finalizado y acceso deshabilitado correctamente',
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/contratos/[id]/finalizar');
  }
}

