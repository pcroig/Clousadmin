// ========================================
// API: Clasificar Fichajes Incompletos
// ========================================
// Endpoint para ejecutar el clasificador manualmente (solo HR admins)

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { z } from 'zod';
import {
  clasificarFichajesIncompletos,
  aplicarAutoCompletado,
  guardarRevisionManual,
} from '@/lib/ia/clasificador-fichajes';

const clasificarSchema = z.object({
  fecha: z.string().optional(), // YYYY-MM-DD format
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación y permisos
    const session = await getSession();

    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json(
        { error: 'No autorizado. Solo HR admins pueden ejecutar el clasificador.' },
        { status: 403 }
      );
    }

    // 2. Validar y obtener fecha a clasificar (por defecto: día anterior)
    const body = await request.json().catch(() => ({}));
    const validation = clasificarSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: validation.error.issues },
        { status: 400 }
      );
    }

    const fechaParam = validation.data.fecha;
    const fecha = fechaParam ? new Date(fechaParam) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log('[API Clasificar] Iniciando clasificación para empresa:', session.user.empresaId, 'fecha:', fecha.toISOString().split('T')[0]);

    // 3. Ejecutar clasificador
    const { autoCompletar, revisionManual } = await clasificarFichajesIncompletos(
      session.user.empresaId,
      fecha
    );

    console.log('[API Clasificar] Clasificación completada:', {
      autoCompletar: autoCompletar.length,
      revisionManual: revisionManual.length,
    });

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

    // 6. Retornar resumen
    return NextResponse.json({
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
    console.error('[API Clasificar] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al clasificar fichajes',
        detalle: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

