// ========================================
// CRON: Renovar saldo de horas extra
// ========================================
// Ejecutado cada 1 de enero (00:10 UTC) para garantizar que el contador anual de
// horas extra se reinicie automáticamente. Puede forzarse manualmente mediante
// query param (?force=1) si se necesita re-sincronizar.

import { NextRequest } from 'next/server';

import { initCronLogger } from '@/lib/cron/logger';
import { renovarSaldoHorasAnual } from '@/lib/cron/renovar-saldo-horas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const force = ['1', 'true', 'yes'].includes(
    (searchParams.get('force') ?? '').toLowerCase()
  );

  const cronLogger = initCronLogger('Renovar saldo horas');

  try {
    const resultado = await renovarSaldoHorasAnual(new Date(), { force });

    await cronLogger.finish({
      success: true,
      metadata: {
        empleadosEvaluados: resultado.empleadosEvaluados,
        empleadosActualizados: resultado.empleadosActualizados,
        inicioAnio: resultado.inicioAnio.toISOString(),
        ejecutado: resultado.ejecutado,
        force,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        inicioAnio: resultado.inicioAnio.toISOString(),
        empleadosEvaluados: resultado.empleadosEvaluados,
        empleadosActualizados: resultado.empleadosActualizados,
        ejecutado: resultado.ejecutado,
        force,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'Error desconocido';
    await cronLogger.finish({
      success: false,
      errors: [mensaje],
    });

    return new Response(
      JSON.stringify({ error: 'Error al renovar saldo de horas' }),
      { status: 500 }
    );
  }
}

