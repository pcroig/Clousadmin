// ========================================
// API: Estadísticas de Fichajes Auto-completados
// ========================================
// GET: Obtener estadísticas para el widget del dashboard HR

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener fecha desde query params o usar hoy por defecto
    const { searchParams } = new URL(request.url);
    const fechaParam = searchParams.get('fecha');
    
    const hoy = fechaParam ? new Date(fechaParam) : new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    // Contar auto-completados del día (estado: aprobado, tipo: fichaje_completado)
    const autoCompletados = await prisma.autoCompletado.count({
      where: {
        empresaId: session.user.empresaId,
        tipo: 'fichaje_completado',
        estado: 'aprobado',
        createdAt: {
          gte: hoy,
          lt: manana,
        },
      },
    });

    // Contar fichajes en revisión (estado: pendiente, tipo: fichaje_revision)
    const enRevision = await prisma.autoCompletado.count({
      where: {
        empresaId: session.user.empresaId,
        tipo: 'fichaje_revision',
        estado: 'pendiente',
      },
    });

    return NextResponse.json({
      autoCompletados,
      enRevision,
      fecha: hoy.toISOString().split('T')[0],
    });

  } catch (error) {
    console.error('[API Stats] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}



