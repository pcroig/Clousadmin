// ========================================
// API Route: Guardar Datos Bancarios - Onboarding Paso 2
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { guardarDatosBancarios } from '@/lib/onboarding';
import { datosBancariosSchema } from '@/lib/validaciones/onboarding';

// POST /api/onboarding/[token]/datos-bancarios - Guardar datos bancarios (Paso 2)
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    // Parsear body
    const body = await req.json();

    // Validar datos con Zod
    const validacion = datosBancariosSchema.safeParse(body);
    if (!validacion.success) {
      console.error('[POST /api/onboarding/[token]/datos-bancarios] Errores de validación:', validacion.error.flatten().fieldErrors);
      console.error('[POST /api/onboarding/[token]/datos-bancarios] IBAN recibido:', body.iban);
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: validacion.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const datosValidados = validacion.data;

    // Guardar datos temporalmente
    const resultado = await guardarDatosBancarios(token, datosValidados);

    if (!resultado.success) {
      return NextResponse.json(
        {
          success: false,
          error: resultado.error || 'Error al guardar datos bancarios',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Datos bancarios guardados correctamente',
    });
  } catch (error) {
    console.error('[POST /api/onboarding/[token]/datos-bancarios] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}








