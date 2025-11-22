// ========================================
// API Route: /api/festivos/[id]
// GET - Obtener festivo específico
// PATCH - Editar festivo
// DELETE - Eliminar festivo
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  notFoundResponse,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma, Prisma } from '@/lib/prisma';
import { festivoUpdateSchema } from '@/lib/validaciones/schemas';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/festivos/[id] - Obtener festivo específico
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    const festivo = await prisma.festivo.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!festivo) {
      return notFoundResponse('Festivo no encontrado');
    }

    return successResponse({
      id: festivo.id,
      fecha: festivo.fecha.toISOString().split('T')[0],
      nombre: festivo.nombre,
      tipo: festivo.tipo,
      activo: festivo.activo,
      origen: festivo.origen,
      createdAt: festivo.createdAt.toISOString(),
      updatedAt: festivo.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/festivos/[id]');
  }
}

// PATCH /api/festivos/[id] - Editar festivo
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR Admin puede editar festivos
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return badRequestResponse('No tienes permisos para editar festivos');
    }

    const { id } = await params;

    // Verificar que el festivo existe y pertenece a la empresa
    const festivoExistente = await prisma.festivo.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!festivoExistente) {
      return notFoundResponse('Festivo no encontrado');
    }

    const body = await req.json();
    const validationResult = festivoUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(
        validationResult.error.issues[0]?.message || 'Datos inválidos'
      );
    }

    const data = validationResult.data;

    // Si es festivo nacional, solo se puede activar/desactivar
    if (festivoExistente.tipo === 'nacional') {
      if (data.nombre || data.fecha) {
        return badRequestResponse(
          'No se puede modificar el nombre o fecha de festivos nacionales. Solo se pueden activar/desactivar.'
        );
      }
    }

    // Preparar datos de actualización
    const updateData: Prisma.FestivoUpdateInput = {};

    if (data.nombre !== undefined) {
      updateData.nombre = data.nombre;
    }

    if (data.activo !== undefined) {
      updateData.activo = data.activo;
    }

    if (data.fecha !== undefined && festivoExistente.tipo === 'empresa') {
      // Convertir fecha
      let nuevaFecha: Date;
      if (typeof data.fecha === 'string') {
        const [year, month, day] = data.fecha.split('-').map(Number);
        nuevaFecha = new Date(Date.UTC(year, month - 1, day));
      } else {
        nuevaFecha = data.fecha;
      }

      // Verificar que no exista otro festivo en esa fecha
      const otraFechaExistente = await prisma.festivo.findFirst({
        where: {
          empresaId: session.user.empresaId,
          fecha: nuevaFecha,
          id: { not: id },
        },
      });

      if (otraFechaExistente) {
        return badRequestResponse('Ya existe un festivo en esa fecha');
      }

      updateData.fecha = nuevaFecha;
    }

    // Actualizar festivo
    const festivoActualizado = await prisma.festivo.update({
      where: { id },
      data: updateData,
    });

    console.info(`[Festivos] Festivo actualizado: ${festivoActualizado.nombre} (${festivoActualizado.id})`);

    return successResponse({
      id: festivoActualizado.id,
      fecha: festivoActualizado.fecha.toISOString().split('T')[0],
      nombre: festivoActualizado.nombre,
      tipo: festivoActualizado.tipo,
      activo: festivoActualizado.activo,
      updatedAt: festivoActualizado.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/festivos/[id]');
  }
}

// DELETE /api/festivos/[id] - Eliminar festivo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR Admin puede eliminar festivos
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return badRequestResponse('No tienes permisos para eliminar festivos');
    }

    const { id } = await params;

    // Verificar que el festivo existe y pertenece a la empresa
    const festivo = await prisma.festivo.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!festivo) {
      return notFoundResponse('Festivo no encontrado');
    }

    // No permitir eliminar festivos nacionales
    if (festivo.tipo === 'nacional') {
      return badRequestResponse(
        'No se pueden eliminar festivos nacionales. Puedes desactivarlos en su lugar.'
      );
    }

    // Eliminar festivo
    await prisma.festivo.delete({
      where: { id },
    });

    console.info(`[Festivos] Festivo eliminado: ${festivo.nombre} (${id})`);

    return successResponse({ message: 'Festivo eliminado exitosamente' });
  } catch (error) {
    return handleApiError(error, 'API DELETE /api/festivos/[id]');
  }
}

