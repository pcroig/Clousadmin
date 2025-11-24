// ========================================
// API Route: Denuncias - Detalle (Solo lectura)
// ========================================

import { NextRequest } from 'next/server';

import {
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

// GET /api/denuncias/[id] - Obtener detalle de una denuncia
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: denunciaId } = await context.params;

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
    return handleApiError(error, 'API GET /api/denuncias/[id]');
  }
}

