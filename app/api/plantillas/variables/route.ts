/**
 * API: /api/plantillas/variables
 * GET: Listar variables disponibles del sistema
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession} from '@/lib/auth';
import { VARIABLES_DISPONIBLES } from '@/lib/plantillas';

/**
 * GET /api/plantillas/variables
 * Listar todas las variables disponibles, opcionalmente filtradas por categoría
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');

    let variables = VARIABLES_DISPONIBLES;

    // Filtrar por categoría si se especifica
    if (categoria) {
      variables = variables.filter((v) => v.categoria === categoria);
    }

    // Agrupar por categoría
    const porCategoria: Record<string, typeof VARIABLES_DISPONIBLES> = {};
    variables.forEach((variable) => {
      if (!porCategoria[variable.categoria]) {
        porCategoria[variable.categoria] = [];
      }
      porCategoria[variable.categoria].push(variable);
    });

    // Estadísticas
    const estadisticas = {
      total: variables.length,
      porCategoria: Object.keys(porCategoria).map((cat) => ({
        categoria: cat,
        total: porCategoria[cat].length,
      })),
    };

    return NextResponse.json({
      success: true,
      variables,
      porCategoria,
      estadisticas,
    });
  } catch (error) {
    console.error('[API] Error al listar variables:', error);
    return NextResponse.json(
      {
        error: 'Error al listar variables',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
