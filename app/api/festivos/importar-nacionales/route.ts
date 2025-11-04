// ========================================
// API Route: /api/festivos/importar-nacionales
// POST - Importar festivos nacionales
// ========================================

import { NextRequest } from 'next/server';
import {
  requireAuth,
  successResponse,
  badRequestResponse,
  handleApiError,
} from '@/lib/api-handler';
import { importarFestivosNacionales } from '@/lib/festivos/importar-nacionales';
import { importarFestivosSchema } from '@/lib/validaciones/schemas';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// POST /api/festivos/importar-nacionales - Importar festivos nacionales
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR Admin puede importar festivos
    if (session.user.rol !== 'hr_admin') {
      return badRequestResponse('No tienes permisos para importar festivos');
    }

    const { searchParams } = new URL(req.url);
    const añoInicioParam = searchParams.get('añoInicio');
    const añoFinParam = searchParams.get('añoFin');

    const añoActual = new Date().getFullYear();

    // Validar parámetros
    const validationData = {
      añoInicio: añoInicioParam ? parseInt(añoInicioParam) : añoActual,
      añoFin: añoFinParam ? parseInt(añoFinParam) : añoActual + 1,
    };

    const validationResult = importarFestivosSchema.safeParse(validationData);

    if (!validationResult.success) {
      return badRequestResponse(
        validationResult.error.issues[0]?.message || 'Parámetros inválidos'
      );
    }

    const { añoInicio, añoFin } = validationResult.data;

    console.info(
      `[Festivos] Iniciando importación de festivos nacionales para ${session.user.empresaId}, años ${añoInicio}-${añoFin}`
    );

    // Ejecutar importación
    const resultado = await importarFestivosNacionales(
      session.user.empresaId,
      añoInicio,
      añoFin
    );

    return successResponse({
      message: `Importación completada: ${resultado.importados} festivos importados, ${resultado.omitidos} ya existían`,
      importados: resultado.importados,
      omitidos: resultado.omitidos,
      años: resultado.años,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/festivos/importar-nacionales');
  }
}

