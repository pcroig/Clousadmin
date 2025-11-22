// ========================================
// API Organizacion - Puestos
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  createdResponse,
  handleApiError,
  requireAuth,
  requireAuthAsHR,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';

// Schema de validación
const puestoCreateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  descripcion: z.string().optional(),
});

// GET /api/organizacion/puestos - Listar todos los puestos activos
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const puestos = await prisma.puesto.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
      },
      orderBy: {
        nombre: 'asc',
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        _count: {
          select: { empleados: true },
        },
      },
    });

    return successResponse(puestos);
  } catch (error) {
    return handleApiError(error, 'API GET /api/organizacion/puestos');
  }
}

// POST /api/organizacion/puestos - Crear nuevo puesto
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(request, puestoCreateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Crear puesto
    const puesto = await prisma.puesto.create({
      data: {
        empresaId: session.user.empresaId,
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
      },
    });

    return createdResponse(puesto);
  } catch (error) {
    return handleApiError(error, 'API POST /api/organizacion/puestos');
  }
}
