// ========================================
// API: Omitir Alerta Individual
// ========================================
// Marca una alerta específica como resuelta/omitida

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const session = await getSession();

  if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id: alertaId } = params;

  try {
    // Verificar que la alerta existe y pertenece a la empresa
    const alerta = await prisma.alertas_nomina.findFirst({
      where: {
        id: alertaId,
        empresaId: session.user.empresaId,
      },
    });

    if (!alerta) {
      return NextResponse.json({ error: 'Alerta no encontrada' }, { status: 404 });
    }

    if (alerta.resuelta) {
      return NextResponse.json(
        { error: 'La alerta ya está resuelta' },
        { status: 400 }
      );
    }

    // Marcar la alerta como resuelta
    const alertaActualizada = await prisma.alertas_nomina.update({
      where: { id: alertaId },
      data: {
        resuelta: true,
        fechaResolucion: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      alerta: alertaActualizada,
      message: 'Alerta omitida correctamente',
    });
  } catch (error) {
    console.error('[POST /api/alertas-nomina/[id]/omitir] Error:', error);
    return NextResponse.json(
      { error: 'Error al omitir alerta' },
      { status: 500 }
    );
  }
}
