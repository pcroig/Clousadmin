// ========================================
// CRON Job - Auto-aprobar ediciones de fichajes expiradas
// ========================================
// Se ejecuta cada hora para aprobar automáticamente las ediciones
// que llevan más de 48h sin ser rechazadas por el empleado

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/cron/aprobar-ediciones-expiradas
export async function GET(req: NextRequest) {
  try {
    // Verificar cron secret para seguridad
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const ahora = new Date();

    // Buscar ediciones pendientes que ya expiraron
    const edicionesExpiradas = await prisma.ediciones_fichaje_pendientes.findMany({
      where: {
        estado: 'pendiente',
        expiraEn: {
          lte: ahora,
        },
      },
      include: {
        notificacion: true,
      },
    });

    console.log(`[CRON] Encontradas ${edicionesExpiradas.length} ediciones expiradas`);

    // Aprobar cada edición expirada
    for (const edicion of edicionesExpiradas) {
      try {
        await prisma.$transaction(async (tx) => {
          // Marcar edición como aprobada
          await tx.ediciones_fichaje_pendientes.update({
            where: { id: edicion.id },
            data: {
              estado: 'aprobado',
              aprobadoEn: ahora,
            },
          });

          // Marcar notificación como leída
          await tx.notificaciones.update({
            where: { id: edicion.notificacionId },
            data: { leida: true },
          });
        });

        console.log(`[CRON] Edición ${edicion.id} aprobada automáticamente`);
      } catch (error) {
        console.error(`[CRON] Error al aprobar edición ${edicion.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      edicionesAprobadas: edicionesExpiradas.length,
      timestamp: ahora.toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Error en aprobar-ediciones-expiradas:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
