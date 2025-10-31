// ========================================
// API Fichajes - Limpiar Revisados
// ========================================
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Cambiar todos los fichajes "revisado" a "finalizado" de la empresa
    const resultado = await prisma.fichaje.updateMany({
      where: {
        empresaId: session.user.empresaId,
        estado: 'revisado',
      },
      data: {
        estado: 'finalizado',
      },
    });

    return NextResponse.json({
      success: true,
      actualizados: resultado.count,
    });
  } catch (error) {
    console.error('[API POST Limpiar Revisados]', error);
    return NextResponse.json(
      { error: 'Error al limpiar fichajes revisados' },
      { status: 500 }
    );
  }
}

