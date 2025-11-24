// ========================================
// API Route: Invitar Usuario al Signup
// ========================================
// Protegido con clave secreta (PLATFORM_ADMIN_SECRET_KEY)
// Permite al creador de la plataforma invitar usuarios sin necesidad de autenticación

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { crearInvitacionSignup } from '@/lib/invitaciones-signup';
import { getJsonBody } from '@/lib/utils/json';

const invitacionSignupSchema = z.object({
  email: z.string().email('Email inválido'),
});

// POST /api/admin/invitar-signup - Invitar usuario al signup
// Autenticación: Clave secreta en header 'x-admin-key' o query param 'key'
export async function POST(req: NextRequest) {
  try {
    // Verificar clave secreta (puede venir en header o query param)
    const adminKeyFromHeader = req.headers.get('x-admin-key');
    const url = new URL(req.url);
    const adminKeyFromQuery = url.searchParams.get('key');
    const adminKey = adminKeyFromHeader || adminKeyFromQuery;

    const expectedKey = process.env.PLATFORM_ADMIN_SECRET_KEY;

    if (!expectedKey) {
      console.error('[InvitarSignup] PLATFORM_ADMIN_SECRET_KEY no está configurada');
      return NextResponse.json(
        { success: false, error: 'Configuración del servidor incorrecta' },
        { status: 500 }
      );
    }

    if (!adminKey || adminKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Clave secreta inválida.' },
        { status: 403 }
      );
    }

    // Validar request body
    const body = await getJsonBody<Record<string, unknown>>(req);
    const validatedData = invitacionSignupSchema.parse(body);

    const { email } = validatedData;

    // Email del admin (si está disponible desde variable de entorno, sino usar email genérico)
    const adminEmail = process.env.PLATFORM_ADMIN_EMAIL || 'admin@clousadmin.com';

    // Crear invitación
    const result = await crearInvitacionSignup(
      email,
      adminEmail // Email del admin que invita
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitación enviada correctamente',
      url: result.url, // Para mostrar en UI si es necesario
    });
  } catch (error) {
    console.error('[InvitarSignup] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || 'Error de validación' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error al enviar la invitación' },
      { status: 500 }
    );
  }
}

