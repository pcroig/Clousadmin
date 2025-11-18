// ========================================
// API Route: Listar Invitaciones de Signup (Platform Admin Only)
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { UsuarioRol } from '@/lib/constants/enums';

// GET /api/admin/invitaciones - Listar todas las invitaciones de signup
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

    const invitaciones = await prisma.invitacionSignup.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: invitaciones,
    });
  } catch (error) {
    console.error('[Invitaciones GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener las invitaciones' },
      { status: 500 }
    );
  }
}
























