// ========================================
// API Route: Onboarding Credenciales - Guardar avatar y contraseña (Paso 0)
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { guardarCredenciales } from '@/lib/onboarding';
import { z } from 'zod';

// Schema de validación
const credencialesSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// POST /api/onboarding/[token]/credenciales - Guardar credenciales (Paso 0)
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    // Leer FormData
    const formData = await req.formData();
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const avatarFile = formData.get('avatar') as File | null;

    // Validar datos
    const validacion = credencialesSchema.safeParse({
      password,
      confirmPassword,
    });

    if (!validacion.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: validacion.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Procesar avatar si se proporciona
    let avatarData: { buffer: Buffer; mimeType: string; filename: string } | undefined;
    if (avatarFile && avatarFile.size > 0) {
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(avatarFile.type)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Tipo de archivo no permitido. Solo imágenes JPG, PNG o WEBP.',
          },
          { status: 400 }
        );
      }

      // Validar tamaño (2MB máximo)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (avatarFile.size > maxSize) {
        return NextResponse.json(
          {
            success: false,
            error: 'El archivo es demasiado grande. Máximo 2MB.',
          },
          { status: 400 }
        );
      }

      // Convertir File a Buffer
      const arrayBuffer = await avatarFile.arrayBuffer();
      avatarData = {
        buffer: Buffer.from(arrayBuffer),
        mimeType: avatarFile.type,
        filename: avatarFile.name,
      };
    }

    // Guardar credenciales
    const resultado = await guardarCredenciales(
      token,
      validacion.data.password,
      avatarData
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
    console.error('[POST /api/onboarding/[token]/credenciales] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}







