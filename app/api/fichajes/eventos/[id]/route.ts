// ========================================
// API FichajeEventos - Editar / Eliminar evento
// ========================================

import { NextRequest } from 'next/server';
import { prisma, Prisma } from '@/lib/prisma';
import {
  requireAuth,
  validateRequest,
  handleApiError,
  successResponse,
  notFoundResponse,
} from '@/lib/api-handler';
import { z } from 'zod';

const fichajeEventoUpdateSchema = z.object({
  tipo: z.enum(['entrada', 'pausa_inicio', 'pausa_fin', 'salida']).optional(),
  hora: z.string().optional(),
  motivoEdicion: z.string().optional(),
});

// PATCH /api/fichajes/eventos/[id] - Editar evento de fichaje
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Validar request body
    const validationResult = await validateRequest(req, fichajeEventoUpdateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const { tipo, hora, motivoEdicion } = validatedData;

    // Verificar que el evento existe y pertenece a la empresa
    const evento = await prisma.fichajeEvento.findUnique({
      where: { id },
      include: { fichaje: true },
    });
    if (!evento || evento.fichaje.empresaId !== session.user.empresaId) {
      return notFoundResponse('Evento no encontrado');
    }

    await prisma.fichajeEvento.update({
      where: { id },
      data: {
        tipo: (tipo as Prisma.TipoFichajeEvento) || evento.tipo,
        hora: hora ? new Date(hora) : evento.hora,
        editado: true,
        motivoEdicion: motivoEdicion ?? evento.motivoEdicion,
        horaOriginal: evento.horaOriginal ?? evento.hora,
      },
    });

    // Recalcular
    const { calcularHorasTrabajadas, calcularTiempoEnPausa } = await import('@/lib/calculos/fichajes');
    const actualizado = await prisma.fichaje.findUnique({ where: { id: evento.fichajeId }, include: { eventos: true } });
    if (actualizado) {
      const horasTrabajadas = calcularHorasTrabajadas(actualizado.eventos);
      const horasEnPausa = calcularTiempoEnPausa(actualizado.eventos);
      await prisma.fichaje.update({ where: { id: evento.fichajeId }, data: { horasTrabajadas, horasEnPausa } });
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/fichajes/eventos/[id]');
  }
}

// DELETE /api/fichajes/eventos/[id] - Eliminar evento de fichaje
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(_req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Verificar que el evento existe y pertenece a la empresa
    const evento = await prisma.fichajeEvento.findUnique({
      where: { id },
      include: { fichaje: true },
    });
    if (!evento || evento.fichaje.empresaId !== session.user.empresaId) {
      return notFoundResponse('Evento no encontrado');
    }

    await prisma.fichajeEvento.delete({ where: { id } });

    // Recalcular
    const { calcularHorasTrabajadas, calcularTiempoEnPausa } = await import('@/lib/calculos/fichajes');
    const actualizado = await prisma.fichaje.findUnique({ where: { id: evento.fichajeId }, include: { eventos: true } });
    if (actualizado) {
      const horasTrabajadas = calcularHorasTrabajadas(actualizado.eventos);
      const horasEnPausa = calcularTiempoEnPausa(actualizado.eventos);
      await prisma.fichaje.update({ where: { id: evento.fichajeId }, data: { horasTrabajadas, horasEnPausa } });
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error, 'API DELETE /api/fichajes/eventos/[id]');
  }
}


