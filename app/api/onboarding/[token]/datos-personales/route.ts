// ========================================
// API Route: Guardar Datos Personales - Onboarding Paso 1
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { guardarDatosPersonales } from '@/lib/onboarding';
import { datosPersonalesSchema } from '@/lib/validaciones/onboarding';

// POST /api/onboarding/[token]/datos-personales - Guardar datos personales (Paso 1)
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    // Parsear body
    const body = await req.json();

    // Validar datos con Zod
    const validacion = datosPersonalesSchema.safeParse(body);
    if (!validacion.success) {
      console.error('[POST /api/onboarding/[token]/datos-personales] Errores de validación:', validacion.error.flatten().fieldErrors);
      console.error('[POST /api/onboarding/[token]/datos-personales] Payload recibido:', body);
      const fieldErrors = validacion.error.flatten().fieldErrors;
      
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    const datosValidados = validacion.data;

    // Guardar datos temporalmente
    const resultado = await guardarDatosPersonales(token, datosValidados);

    if (!resultado.success) {
      return NextResponse.json(
        {
          success: false,
          error: resultado.error || 'Error al guardar datos personales',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Datos personales guardados correctamente',
    });
  } catch (error) {
    console.error('[POST /api/onboarding/[token]/datos-personales] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}




