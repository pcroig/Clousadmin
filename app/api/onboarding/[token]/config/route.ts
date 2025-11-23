// ========================================
// API Route: Onboarding Config - Obtener configuración de onboarding (público)
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { verificarTokenOnboarding } from '@/lib/onboarding';
import { obtenerOnboardingConfig } from '@/lib/onboarding-config';

// GET /api/onboarding/[token]/config - Obtener configuración de onboarding (público con token)
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    // Verificar token
    const verificacion = await verificarTokenOnboarding(token);
    if (!verificacion.valido || !verificacion.onboarding) {
      return NextResponse.json(
        {
          success: false,
          error: verificacion.error || 'Token inválido',
        },
        { status: 401 }
      );
    }

    const { onboarding } = verificacion;

    // Obtener configuración de onboarding
    const resultado = await obtenerOnboardingConfig(onboarding.empresaId);

    if (!resultado.success) {
      return NextResponse.json(
        {
          success: false,
          error: resultado.error || 'Error al obtener configuración',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      config: resultado.config,
    });
  } catch (error) {
    console.error('[GET /api/onboarding/[token]/config] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}




























