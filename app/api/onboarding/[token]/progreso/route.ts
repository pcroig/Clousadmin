// ========================================
// API Route: Update Onboarding Progress
// ========================================
// Update progress for a specific workflow action

import { NextRequest, NextResponse } from 'next/server';

import { actualizarProgresoAccion, verificarTokenOnboarding } from '@/lib/onboarding';

/**
 * POST /api/onboarding/:token/progreso
 * Actualizar progreso de una acción específica
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Verificar token
    const verificacion = await verificarTokenOnboarding(token);
    if (!verificacion.valido || !verificacion.onboarding) {
      return NextResponse.json(
        { error: verificacion.error || 'Token inválido' },
        { status: 400 }
      );
    }

    const { onboarding } = verificacion;

    // Parsear body
    const body = (await req.json()) as {
      accionId?: string;
      completado?: boolean;
      datos?: Record<string, unknown>;
    };
    const { accionId, completado, datos } = body;

    // Validar parámetros
    if (!accionId || typeof accionId !== 'string') {
      return NextResponse.json({ error: 'accionId es requerido' }, { status: 400 });
    }

    if (typeof completado !== 'boolean') {
      return NextResponse.json({ error: 'completado debe ser boolean' }, { status: 400 });
    }

    // Actualizar progreso
    const resultado = await actualizarProgresoAccion(
      onboarding.empleadoId,
      accionId,
      completado,
      datos
    );

    if (!resultado.success) {
      return NextResponse.json({ error: resultado.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/onboarding/:token/progreso] Error:', error);
    return NextResponse.json({ error: 'Error al actualizar progreso' }, { status: 500 });
  }
}
