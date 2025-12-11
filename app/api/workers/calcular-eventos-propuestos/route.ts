// ========================================
// Worker: Calcular Eventos Propuestos
// ========================================
// Procesa batches de fichajes para calcular eventos propuestos
// y guardarlos en la tabla fichaje_eventos_propuestos

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { calcularEventosPropuestos } from '@/lib/calculos/fichajes-propuestos';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Schema de validación para el payload del worker
 */
const workerPayloadSchema = z.object({
  fichajeIds: z.array(z.string()).min(1).max(100), // Máximo 100 por batch
});

/**
 * POST /api/workers/calcular-eventos-propuestos
 * Procesa un batch de fichajes calculando eventos propuestos
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Verificar autenticación del worker
    const workerSecret = req.headers.get('authorization');
    const expectedSecret = `Bearer ${process.env.WORKER_SECRET || 'dev-secret'}`;

    if (workerSecret !== expectedSecret) {
      console.warn('[Worker] Intento de acceso no autorizado');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Validar payload
    const body = await req.json();
    const validation = workerPayloadSchema.safeParse(body);

    if (!validation.success) {
      console.error('[Worker] Payload inválido:', validation.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Payload inválido',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { fichajeIds } = validation.data;
    console.log(`[Worker] Procesando batch de ${fichajeIds.length} fichajes`);

    let procesados = 0;
    let errores = 0;
    const erroresDetalle: Array<{ fichajeId: string; error: string }> = [];

    // 3. Procesar cada fichaje
    for (const fichajeId of fichajeIds) {
      try {
        // 3.1. Calcular eventos propuestos
        const eventosPropuestos = await calcularEventosPropuestos(fichajeId);

        // 3.2. Guardar en base de datos (transacción)
        await prisma.$transaction(async (tx) => {
          // Eliminar eventos propuestos anteriores (por si se re-calcula)
          await tx.fichaje_eventos_propuestos.deleteMany({
            where: { fichajeId },
          });

          // Crear nuevos eventos propuestos (si los hay)
          if (eventosPropuestos.length > 0) {
            await tx.fichaje_eventos_propuestos.createMany({
              data: eventosPropuestos.map(evento => ({
                fichajeId,
                tipo: evento.tipo,
                hora: evento.hora,
                metodo: evento.metodo,
              })),
            });
          }

          // Marcar como calculado (incluso si retorna 0 eventos, ya se intentó)
          await tx.fichajes.update({
            where: { id: fichajeId },
            data: { eventosPropuestosCalculados: true },
          });
        });

        procesados++;
        console.log(
          `[Worker] Fichaje ${fichajeId} procesado: ${eventosPropuestos.length} eventos propuestos`
        );
      } catch (error) {
        errores++;
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        erroresDetalle.push({ fichajeId, error: errorMsg });
        console.error(`[Worker] Error procesando fichaje ${fichajeId}:`, error);

        // NO marcar como calculado si hubo error
        // El fichaje permanecerá con eventosPropuestosCalculados = false
        // y se reintentará la próxima vez que corra el CRON
      }
    }

    // 4. Retornar resultado
    const duration = Date.now() - startTime;
    const resultado = {
      success: true,
      procesados,
      errores,
      total: fichajeIds.length,
      duration: `${duration}ms`,
      erroresDetalle: errores > 0 ? erroresDetalle : undefined,
    };

    console.log(`[Worker] Batch completado:`, resultado);

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Worker] Error fatal:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}
