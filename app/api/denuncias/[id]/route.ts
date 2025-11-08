// ========================================
// API Route: Denuncias - Detalle
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  validateRequest,
  handleApiError,
  successResponse,
  notFoundResponse,
  forbiddenResponse,
} from '@/lib/api-handler';
import { crearNotificacionDenunciaActualizada } from '@/lib/notificaciones';
import { UsuarioRol } from '@/lib/constants/enums';

// Schema de validación para actualizar denuncia
const denunciaUpdateSchema = z.object({
  estado: z.enum(['pendiente', 'en_revision', 'resuelta', 'archivada']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  asignadaA: z.string().nullable().optional(),
  resolucion: z.string().optional(),
  notasInternas: z.string().optional(),
});

// GET /api/denuncias/[id] - Obtener detalle de una denuncia
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const denunciaId = params.id;

    // Buscar la denuncia
    const denuncia = await prisma.denuncia.findUnique({
      where: { id: denunciaId },
      include: {
        denunciante: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
            fotoUrl: true,
          },
        },
      },
    });

    if (!denuncia) {
      return notFoundResponse('Denuncia no encontrada');
    }

    // Verificar permisos
    // HR puede ver todas las denuncias de su empresa
    if (session.user.rol === UsuarioRol.hr_admin) {
      if (denuncia.empresaId !== session.user.empresaId) {
        return forbiddenResponse('No tienes permiso para ver esta denuncia');
      }
    } else {
      // Empleados solo pueden ver sus propias denuncias (si NO son anónimas)
      if (
        !denuncia.denuncianteId ||
        denuncia.denuncianteId !== session.user.empleadoId
      ) {
        return forbiddenResponse('No tienes permiso para ver esta denuncia');
      }
    }

    return successResponse(denuncia);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/denuncias/[id] - Actualizar denuncia (solo HR)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR puede actualizar denuncias
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return forbiddenResponse('No tienes permiso para actualizar denuncias');
    }

    const denunciaId = params.id;

    // Validar el body
    const validationResult = await validateRequest(req, denunciaUpdateSchema);
    if (validationResult instanceof Response) return validationResult;
    const data = validationResult.data;

    // Buscar la denuncia
    const denunciaExistente = await prisma.denuncia.findUnique({
      where: { id: denunciaId },
    });

    if (!denunciaExistente) {
      return notFoundResponse('Denuncia no encontrada');
    }

    if (denunciaExistente.empresaId !== session.user.empresaId) {
      return forbiddenResponse('No tienes permiso para actualizar esta denuncia');
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (data.estado !== undefined) {
      updateData.estado = data.estado;
      // Si se marca como resuelta, actualizar fechaResuelta
      if (data.estado === 'resuelta') {
        updateData.resueltaEn = new Date();
      }
    }

    if (data.prioridad !== undefined) {
      updateData.prioridad = data.prioridad;
    }

    if (data.asignadaA !== undefined) {
      updateData.asignadaA = data.asignadaA;
      if (data.asignadaA) {
        updateData.asignadaEn = new Date();
      } else {
        updateData.asignadaEn = null;
      }
    }

    if (data.resolucion !== undefined) {
      updateData.resolucion = data.resolucion;
    }

    if (data.notasInternas !== undefined) {
      updateData.notasInternas = data.notasInternas;
    }

    // Actualizar la denuncia
    const denunciaActualizada = await prisma.denuncia.update({
      where: { id: denunciaId },
      data: updateData,
      include: {
        denunciante: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
            fotoUrl: true,
          },
        },
      },
    });

    // Notificar al denunciante si NO es anónima y hay cambio de estado
    if (
      !denunciaActualizada.esAnonima &&
      denunciaActualizada.denuncianteId &&
      data.estado
    ) {
      const estadoLabels: Record<string, string> = {
        pendiente: 'pendiente',
        en_revision: 'en revisión',
        resuelta: 'resuelta',
        archivada: 'archivada',
      };

      await crearNotificacionDenunciaActualizada(prisma, {
        denunciaId: denunciaActualizada.id,
        empresaId: session.user.empresaId,
        empleadoId: denunciaActualizada.denuncianteId,
        nuevoEstado: data.estado,
        mensaje: `Tu denuncia ha sido actualizada al estado: ${estadoLabels[data.estado] || data.estado}`,
      });
    }

    return successResponse(denunciaActualizada);
  } catch (error) {
    return handleApiError(error);
  }
}
