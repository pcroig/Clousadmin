// ========================================
// API Route: Finalizar Onboarding Simplificado - Completar proceso
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { finalizarOnboarding } from '@/lib/onboarding';

// POST /api/onboarding-simplificado/[token]/finalizar - Finalizar onboarding simplificado
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    // Finalizar onboarding (incluye validación de progreso)
    const resultado = await finalizarOnboarding(token);

    if (!resultado.success) {
      return NextResponse.json(
        {
          success: false,
          error: resultado.error || 'Error al finalizar onboarding simplificado',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding simplificado completado correctamente',
      empleadoId: resultado.empleadoId,
    });
  } catch (error) {
    console.error('[POST /api/onboarding-simplificado/[token]/finalizar] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}

