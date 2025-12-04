// ========================================
// API Empleados - Dar de Baja / Offboarding (sin contrato)
// ========================================
// Este endpoint permite dar de baja a un empleado aunque no tenga contrato registrado
// Útil cuando el empleado está activo pero aún no se ha procesado/subido su contrato

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  handleApiError,
  notFoundResponse,
  requireAuthAsHR,
  successResponse,
} from '@/lib/api-handler';
import { autoGenerarDocumentosOffboarding } from '@/lib/plantillas';
import { prisma } from '@/lib/prisma';

// Schema de validación
const darDeBajaSchema = z.object({
  fechaFin: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, 'Fecha inválida'),
  motivo: z.string().optional(),
  documentosIds: z.array(z.string()).optional(),
});

// POST /api/empleados/[id]/dar-de-baja - Dar de baja empleado (solo HR Admin)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: empleadoId } = await params;

    // Parsear y validar request body
    const body = await request.json() as Record<string, unknown>;
    const validation = darDeBajaSchema.safeParse(body);
    
    if (!validation.success) {
      return successResponse(
        { error: 'Datos inválidos', details: validation.error.issues },
        400
      );
    }

    const validatedData = validation.data;

    // Obtener empleado con todas las relaciones necesarias
    const empleado = await prisma.empleados.findUnique({
      where: { 
        id: empleadoId,
        empresaId: session.user.empresaId, // Seguridad: solo de la misma empresa
      },
      include: {
        usuario: true,
        carpetas: {
          where: {
            nombre: 'Offboarding',
            esSistema: true,
          },
        },
        contratos: {
          where: {
            fechaFin: null, // Solo contratos activos
          },
          orderBy: {
            fechaInicio: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    // Verificar que el empleado no esté ya dado de baja
    if (empleado.estadoEmpleado === 'baja') {
      return successResponse(
        { error: 'El empleado ya está dado de baja' },
        400
      );
    }

    // Validar que la fecha de finalización no sea anterior a la fecha de alta
    const fechaFin = new Date(validatedData.fechaFin);
    const fechaAlta = new Date(empleado.fechaAlta);
    
    if (fechaFin < fechaAlta) {
      return successResponse(
        { error: 'La fecha de finalización no puede ser anterior a la fecha de alta del empleado' },
        400
      );
    }

    // Proceso completo de offboarding en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Si hay contrato activo, actualizar su fecha fin
      if (empleado.contratos.length > 0) {
        await tx.contratos.update({
          where: { id: empleado.contratos[0].id },
          data: {
            fechaFin,
          },
        });
      } else {
        // Si no hay contrato, crear uno básico para mantener el historial
        await tx.contratos.create({
          data: {
            empleadoId: empleado.id,
            tipoContrato: empleado.tipoContrato || 'indefinido',
            fechaInicio: fechaAlta,
            fechaFin,
            salarioBaseAnual: empleado.salarioBaseAnual || 0,
          },
        });
      }

      // 2. Desactivar empleado y establecer fecha de baja
      await tx.empleados.update({
        where: { id: empleadoId },
        data: {
          activo: false,
          fechaBaja: fechaFin,
          estadoEmpleado: 'baja',
        },
      });

      // 3. Desactivar usuario (deshabilitar acceso a la plataforma)
      await tx.usuarios.update({
        where: { id: empleado.usuarioId },
        data: {
          activo: false,
        },
      });

      // 4. Procesar documentos de offboarding si se proporcionaron
      if (validatedData.documentosIds && validatedData.documentosIds.length > 0) {
        // Buscar o crear carpeta de Offboarding
        let carpetaOffboarding = empleado.carpetas[0];

        if (!carpetaOffboarding) {
          carpetaOffboarding = await tx.carpetas.create({
            data: {
              empresaId: session.user.empresaId,
              empleadoId: empleado.id,
              nombre: 'Offboarding',
              esSistema: true,
            },
          });
        }

        // Actualizar tipo de documento
        await tx.documentos.updateMany({
          where: {
            id: { in: validatedData.documentosIds },
            empresaId: session.user.empresaId,
          },
          data: {
            tipoDocumento: 'offboarding',
          },
        });

        // Asociar documentos a la carpeta de offboarding usando tabla intermedia
        for (const documentoId of validatedData.documentosIds) {
          // Eliminar relaciones existentes
          await tx.documento_carpetas.deleteMany({
            where: { documentoId },
          });

          // Crear nueva relación con carpeta de offboarding
          await tx.documento_carpetas.create({
            data: {
              documentoId,
              carpetaId: carpetaOffboarding.id,
            },
          });
        }
      }

      return {
        empleadoId: empleado.id,
        usuarioId: empleado.usuarioId,
        fechaFinalizacion: fechaFin,
        documentosProcesados: validatedData.documentosIds?.length || 0,
        contratoCreado: empleado.contratos.length === 0,
      };
    });

    let autoGenerados = 0;
    try {
      autoGenerados = await autoGenerarDocumentosOffboarding({
        empresaId: session.user.empresaId,
        empleadoId: empleado.id,
        solicitadoPor: session.user.id,
      });
    } catch (autoError) {
      console.error('[Offboarding] Error auto-generando documentos:', autoError);
    }

    console.info('[Offboarding] Empleado dado de baja (sin contrato previo):', {
      empleadoId: result.empleadoId,
      fechaFin: result.fechaFinalizacion,
      documentos: result.documentosProcesados,
      contratoCreado: result.contratoCreado,
      hrAdminId: session.user.id,
      autoGenerados,
    });

    return successResponse({
      success: true,
      message: 'Empleado dado de baja correctamente',
      data: {
        ...result,
        plantillasAutoGeneradas: autoGenerados,
      },
    });
  } catch (error) {
    console.error('[API Error] /api/empleados/[id]/dar-de-baja:', error);
    return handleApiError(error, 'API POST /api/empleados/[id]/dar-de-baja');
  }
}










