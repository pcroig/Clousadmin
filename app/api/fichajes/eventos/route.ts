// ========================================
// API FichajeEventos - Crear evento
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  handleApiError,
  notFoundResponse,
  requireAuth,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';

const fichajeEventoSchema = z.object({
  fichajeId: z.string().uuid(),
  tipo: z.enum(['entrada', 'pausa_inicio', 'pausa_fin', 'salida']),
  hora: z.string(),
  motivoEdicion: z.string().optional(),
});

// POST /api/fichajes/eventos - Crear evento de fichaje
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(req, fichajeEventoSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const { fichajeId, tipo, hora, motivoEdicion } = validatedData;

    // Verificar que el fichaje existe y pertenece a la empresa
    const fichaje = await prisma.fichaje.findFirst({
      where: { id: fichajeId, empresaId: session.user.empresaId },
    });
    if (!fichaje) {
      return notFoundResponse('Fichaje no encontrado');
    }

    const evento = await prisma.fichajeEvento.create({
      data: {
        fichajeId,
        tipo,
        hora: new Date(hora),
        editado: Boolean(motivoEdicion),
        motivoEdicion: motivoEdicion || null,
      },
    });

    // Recalcular
    const { calcularHorasTrabajadas, calcularTiempoEnPausa } = await import('@/lib/calculos/fichajes');
    const actualizado = await prisma.fichaje.findUnique({ where: { id: fichajeId }, include: { eventos: true } });
    if (actualizado) {
      const horasTrabajadas = calcularHorasTrabajadas(actualizado.eventos);
      const horasEnPausa = calcularTiempoEnPausa(actualizado.eventos);
      await prisma.fichaje.update({ where: { id: fichajeId }, data: { horasTrabajadas, horasEnPausa } });
    }

    return successResponse({ success: true, eventoId: evento.id });
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes/eventos');
  }
}


