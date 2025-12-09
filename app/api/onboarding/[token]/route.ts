// ========================================
// API Route: Get Onboarding Data
// ========================================
// Retrieve onboarding workflow, progress, and temp data for employee

import { NextRequest, NextResponse } from 'next/server';

import { obtenerWorkflowConfig, verificarTokenOnboarding } from '@/lib/onboarding';

/**
 * GET /api/onboarding/:token
 * Obtener datos del onboarding (workflow, progreso, datos temporales)
 */
export async function GET(
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

    // Obtener workflow de la empresa
    const workflow = await obtenerWorkflowConfig(onboarding.empresaId);

    return NextResponse.json({
      workflow,
      progreso: onboarding.progreso,
      datosTemporales: onboarding.datosTemporales,
      empleado: {
        id: onboarding.empleado.id,
        nombre: onboarding.empleado.nombre,
        apellidos: onboarding.empleado.apellidos,
        email: onboarding.empleado.usuario.email,
      },
      empresa: {
        nombre: onboarding.empresa.nombre,
      },
    });
  } catch (error) {
    console.error('[GET /api/onboarding/:token] Error:', error);
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 });
  }
}
