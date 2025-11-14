// ========================================
// API Route: Aceptar Invitación de Empleado
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { aceptarInvitacion } from '@/lib/invitaciones';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Validar password
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    const result = await aceptarInvitacion(token, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta creada correctamente',
    });
  } catch (error) {
    console.error('[POST /api/empleados/aceptar-invitacion] Error:', error);
    return NextResponse.json(
      { error: 'Error al crear la cuenta' },
      { status: 500 }
    );
  }
}





























