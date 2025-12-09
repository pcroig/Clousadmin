// ========================================
// API Route: Marcar Integraciones Completadas - Onboarding Unificado
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { guardarProgresoIntegraciones, verificarTokenOnboarding } from '@/lib/onboarding';

// POST /api/onboarding/[token]/integraciones-completado - Marcar integraciones como completadas
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    // Verificar token de onboarding
    const verificacion = await verificarTokenOnboarding(token);
    if (!verificacion.valido || !verificacion.onboarding) {
      return NextResponse.json(
        { success: false, error: verificacion.error || 'Token inválido' },
        { status: 400 }
      );
    }

    // Marcar progreso de integraciones (funciona para ambos tipos de onboarding)
    const resultado = await guardarProgresoIntegraciones(token);

    if (!resultado.success) {
      return NextResponse.json(
        {
          success: false,
          error: resultado.error || 'Error al marcar integraciones como completadas',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Paso de integraciones marcado como completado',
    });
  } catch (error) {
    console.error('[POST /api/onboarding/[token]/integraciones-completado] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}
