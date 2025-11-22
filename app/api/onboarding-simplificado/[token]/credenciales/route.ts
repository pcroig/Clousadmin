// ========================================
// API Route: Guardar Credenciales - Onboarding Simplificado Paso 1
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { guardarCredenciales, verificarTokenOnboarding } from '@/lib/onboarding';

const credencialesSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// POST /api/onboarding-simplificado/[token]/credenciales - Guardar credenciales (Paso 1)
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

    const formData = await req.formData();
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const avatarFile = formData.get('avatar') as File | null;

    // Validar datos con Zod
    const validacion = credencialesSchema.safeParse({ password, confirmPassword });
    if (!validacion.success) {
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

    let avatarParam;
    if (avatarFile) {
      const buffer = Buffer.from(await avatarFile.arrayBuffer());
      avatarParam = {
        buffer,
        mimeType: avatarFile.type,
        filename: avatarFile.name,
      };
    }

    // Guardar credenciales (actualiza usuario y progreso)
    const resultado = await guardarCredenciales(
      token,
      validacion.data.password,
      avatarParam
    );

    if (!resultado.success) {
      return NextResponse.json(
        {
          success: false,
          error: resultado.error || 'Error al guardar credenciales',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Credenciales guardadas correctamente',
    });
  } catch (error) {
    console.error('[POST /api/onboarding-simplificado/[token]/credenciales] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}

