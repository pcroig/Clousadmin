// ========================================
// API: Resolver Alerta de Nómina
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { resolverAlerta } from '@/lib/validaciones/nominas';

import { UsuarioRol } from '@/lib/constants/enums';

interface Params {
  id: string;
}

// POST /api/nominas/alertas/[id]/resolver
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getSession();

    // Verificar autenticación y rol
    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Resolver alerta
    await resolverAlerta(id);

    return NextResponse.json({
      success: true,
      message: 'Alerta resuelta correctamente',
    });
  } catch (error) {
    console.error('[API resolver alerta] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al resolver alerta',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}






























