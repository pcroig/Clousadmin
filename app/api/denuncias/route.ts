// ========================================
// API Route: Denuncias
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  validateRequest,
  handleApiError,
  successResponse,
  createdResponse,
  forbiddenResponse,
} from '@/lib/api-handler';
import { crearNotificacionDenunciaRecibida } from '@/lib/notificaciones';
import { UsuarioRol } from '@/lib/constants/enums';

// Schema de validación para crear denuncia
const denunciaCreateSchema = z.object({
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  fechaIncidente: z.string().optional(),
  ubicacion: z.string().optional(),
  esAnonima: z.boolean().default(false),
  documentos: z.array(z.object({
    id: z.string(),
    nombre: z.string(),
    s3Key: z.string(),
    mimeType: z.string(),
    tamano: z.number(),
    uploadedAt: z.string(),
  })).optional(),
});

// GET /api/denuncias - Listar denuncias (solo HR)
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR Admins pueden ver la lista de denuncias
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return forbiddenResponse('No tienes permiso para ver denuncias');
    }

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado');

    // Filtros
    const where: any = {
      empresaId: session.user.empresaId,
    };

    if (estado && estado !== 'todas') {
      where.estado = estado;
    }

    // Obtener denuncias
    const denuncias = await prisma.denuncia.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return successResponse(denuncias);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/denuncias - Crear denuncia
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar que el usuario tenga un empleado asignado
    if (!session.user.empleadoId) {
      return forbiddenResponse('Solo empleados pueden crear denuncias');
    }

    // Validar el body
    const validationResult = await validateRequest(req, denunciaCreateSchema);
    if (validationResult instanceof Response) return validationResult;
    const data = validationResult.data;

    // Crear la denuncia
    const denuncia = await prisma.denuncia.create({
      data: {
        empresaId: session.user.empresaId,
        denuncianteId: data.esAnonima ? null : session.user.empleadoId,
        descripcion: data.descripcion,
        fechaIncidente: data.fechaIncidente ? new Date(data.fechaIncidente) : null,
        ubicacion: data.ubicacion,
        esAnonima: data.esAnonima,
        documentos: data.documentos || [],
        estado: 'pendiente',
        prioridad: 'media',
      },
    });

    // Crear notificación para HR Admins
    await crearNotificacionDenunciaRecibida(prisma, {
      denunciaId: denuncia.id,
      empresaId: session.user.empresaId,
      esAnonima: data.esAnonima,
      descripcionBreve: data.descripcion,
    });

    return createdResponse(denuncia);
  } catch (error) {
    return handleApiError(error);
  }
}
