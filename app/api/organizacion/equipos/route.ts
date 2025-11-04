// ========================================
// API Organizacion - Equipos
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAuthAsHR,
  validateRequest,
  handleApiError,
  successResponse,
  createdResponse,
} from '@/lib/api-handler';
import { z } from 'zod';

// Schema de validación
const equipoCreateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  descripcion: z.string().optional(),
  tipo: z.enum(['proyecto', 'squad', 'temporal']).default('proyecto'),
});

// GET /api/organizacion/equipos - Listar equipos
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const equipos = await prisma.equipo.findMany({
      where: {
        empresaId: session.user.empresaId,
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return successResponse(equipos);
  } catch (error) {
    return handleApiError(error, 'API GET /api/organizacion/equipos');
  }
}

// POST /api/organizacion/equipos - Crear nuevo equipo
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(request, equipoCreateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Crear equipo
    const equipo = await prisma.equipo.create({
      data: {
        empresaId: session.user.empresaId,
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        tipo: validatedData.tipo,
      },
    });

    return createdResponse(equipo);
  } catch (error) {
    return handleApiError(error, 'API POST /api/organizacion/equipos');
  }
}
