// ========================================
// API: Clasificar Fichajes Incompletos
// ========================================
// Endpoint para ejecutar el clasificador manualmente (solo HR admins)

import { NextRequest } from 'next/server';
import {
  requireAuthAsHR,
  validateRequest,
  handleApiError,
  successResponse,
} from '@/lib/api-handler';
import { z } from 'zod';
import {
  clasificarFichajesIncompletos,
  aplicarAutoCompletado,
  guardarRevisionManual,
} from '@/lib/ia/clasificador-fichajes';

const clasificarSchema = z.object({
  fecha: z.string().optional(), // YYYY-MM-DD format
});

// POST /api/fichajes/clasificar - Ejecutar clasificador de fichajes (solo HR Admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body (puede estar vacío)
    let fechaParam: string | undefined = undefined;
    try {
      const validationResult = await validateRequest(request, clasificarSchema);
      if (validationResult instanceof Response) return validationResult;
      fechaParam = validationResult.data.fecha;
    } catch {
      // Si el body no es JSON válido, usar valores por defecto
      fechaParam = undefined;
    }
    const fecha = fechaParam ? new Date(fechaParam) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 3. Ejecutar clasificador
    const { autoCompletar, revisionManual } = await clasificarFichajesIncompletos(
      session.user.empresaId,
      fecha
    );

    // 4. Aplicar auto-completados
    const resultadoAutoCompletar =       await aplicarAutoCompletado(
        autoCompletar,
        session.user.empresaId
      );

    // 5. Guardar fichajes que requieren revisión manual
    const resultadoRevision = await guardarRevisionManual(
      session.user.empresaId,
      revisionManual
    );

    // Retornar resumen
    return successResponse({
      success: true,
      fecha: fecha.toISOString().split('T')[0],
      resumen: {
        autoCompletados: resultadoAutoCompletar.completados,
        enRevision: resultadoRevision.guardados,
        errores: [
          ...resultadoAutoCompletar.errores,
          ...resultadoRevision.errores,
        ],
      },
      detalle: {
        autoCompletados: autoCompletar.map(f => ({
          empleado: f.empleadoNombre,
          razon: f.razon,
          salidaSugerida: f.salidaSugerida?.toISOString(),
        })),
        enRevision: revisionManual.map(f => ({
          empleado: f.empleadoNombre,
          razon: f.razon,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes/clasificar');
  }
}

