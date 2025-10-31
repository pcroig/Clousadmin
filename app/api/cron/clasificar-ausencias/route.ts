// ========================================
// CRON Job: Clasificar Ausencias
// ========================================
// Ejecutar diariamente 00:30 - Auto-aprueba ausencias < 2 días

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clasificarAusenciasAutoAprobables } from '@/lib/ia/clasificador-ausencias';

export async function POST(req: NextRequest) {
  try {
    // Verificar CRON_SECRET
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('[CRON Clasificar Ausencias] Iniciando...');

    // Obtener todas las empresas
    const empresas = await prisma.empresa.findMany({
      select: { id: true, nombre: true },
    });

    const resultados = [];

    for (const empresa of empresas) {
      try {
        const resultadosEmpresa = await clasificarAusenciasAutoAprobables(empresa.id);
        resultados.push({
          empresaId: empresa.id,
          empresaNombre: empresa.nombre,
          ausenciasEvaluadas: resultadosEmpresa.length,
          ausenciasAutoAprobadas: resultadosEmpresa.filter(
            (r) => r.resultado.autoAprobar
          ).length,
        });

        console.log(
          `[CRON] Empresa ${empresa.nombre}: ${resultadosEmpresa.length} ausencias evaluadas`
        );
      } catch (error) {
        console.error(`[CRON] Error procesando empresa ${empresa.id}:`, error);
        resultados.push({
          empresaId: empresa.id,
          empresaNombre: empresa.nombre,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    console.log('[CRON Clasificar Ausencias] Completado');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      empresasProcesadas: empresas.length,
      resultados,
    });
  } catch (error) {
    console.error('[CRON Clasificar Ausencias] Error:', error);
    return NextResponse.json(
      {
        error: 'Error en clasificación CRON',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
