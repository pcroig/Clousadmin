// ========================================
// API Route: Gestionar Waitlist (Platform Admin Only)
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertirWaitlistEnInvitacion } from '@/lib/invitaciones-signup';

import { UsuarioRol } from '@/lib/constants/enums';

// GET /api/admin/waitlist - Obtener lista de espera
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación y rol platform_admin
    const session = await getSession();
    if (!session || session.user.rol !== UsuarioRol.platform_admin) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const waitlist = await prisma.waitlist.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: waitlist,
    });
  } catch (error) {
    console.error('[Waitlist GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la lista de espera' },
      { status: 500 }
    );
  }
}

// POST /api/admin/waitlist/convertir - Convertir waitlist en invitación
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación y rol platform_admin
    const session = await getSession();
    if (!session || session.user.rol !== UsuarioRol.platform_admin) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email requerido' },
        { status: 400 }
      );
    }

    // Convertir waitlist en invitación
    const result = await convertirWaitlistEnInvitacion(
      email,
      session.user.email
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitación creada y enviada correctamente',
      url: result.url,
    });
  } catch (error) {
    console.error('[Waitlist POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al convertir waitlist en invitación' },
      { status: 500 }
    );
  }
}















