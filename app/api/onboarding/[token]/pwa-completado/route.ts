// ========================================
// API Route: Marcar PWA Completado - Onboarding Completo Paso Final
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { guardarProgresoPWA, verificarTokenOnboarding } from '@/lib/onboarding';

// POST /api/onboarding/[token]/pwa-completado - Marcar PWA como completado
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

    // Marcar progreso de PWA
    const resultado = await guardarProgresoPWA(token);

    if (!resultado.success) {
      return NextResponse.json(
        {
          success: false,
          error: resultado.error || 'Error al marcar PWA como completado',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Paso de PWA marcado como completado',
    });
  } catch (error) {
    console.error('[POST /api/onboarding/[token]/pwa-completado] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}

