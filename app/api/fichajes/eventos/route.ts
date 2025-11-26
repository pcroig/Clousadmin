// ========================================
// API FichajeEventos - Crear evento
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  handleApiError,
  isNextResponse,
  notFoundResponse,
  requireAuth,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { calcularHorasTrabajadas, calcularTiempoEnPausa } from '@/lib/calculos/fichajes';
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
    if (isNextResponse(authResult)) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(req, fichajeEventoSchema);
    if (isNextResponse(validationResult)) return validationResult;
    const { data: validatedData } = validationResult;

    const { fichajeId, tipo, hora, motivoEdicion } = validatedData;

    // Verificar que el fichaje existe y pertenece a la empresa
    const fichaje = await prisma.fichaje.findFirst({
      where: { id: fichajeId, empresaId: session.user.empresaId },
      include: {
        eventos: {
          orderBy: {
            hora: 'asc',
          },
        },
      },
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

    // Recalcular con eventos in-memory (incluyendo el recién creado)
    const eventosParaCalculo = [...(fichaje.eventos ?? []), evento].sort(
      (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime()
    );
    const horasTrabajadas = calcularHorasTrabajadas(eventosParaCalculo) ?? 0;
    const horasEnPausa = calcularTiempoEnPausa(eventosParaCalculo);
    await prisma.fichaje.update({
      where: { id: fichajeId },
      data: { horasTrabajadas, horasEnPausa },
    });

    return successResponse({ success: true, eventoId: evento.id });
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes/eventos');
  }
}


