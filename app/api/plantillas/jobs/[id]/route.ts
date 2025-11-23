/**
 * API: /api/plantillas/jobs/[id]
 * GET: Obtener estado de job de generación
 * DELETE: Cancelar job
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { cancelarJob, obtenerEstadoJob } from '@/lib/plantillas';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/plantillas/jobs/[id]
 * Obtener estado actual del job
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener estado del job
    const estado = await obtenerEstadoJob(params.id);

    if (!estado) {
      return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 });
    }

    // Verificar permisos (el job debe ser de la empresa del usuario)
    const job = await prisma.jobGeneracionDocumentos.findUnique({
      where: { id: params.id },
      select: { empresaId: true },
    });

    if (!job || job.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      job: estado,
    });
  } catch (error) {
    console.error('[API] Error al obtener estado de job:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener estado del job',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/plantillas/jobs/[id]
 * Cancelar job en progreso
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Verificar permisos
    const job = await prisma.jobGeneracionDocumentos.findUnique({
      where: { id: params.id },
      select: { empresaId: true, estado: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 });
    }

    if (job.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Solo se pueden cancelar jobs en cola o procesando
    if (job.estado !== 'en_cola' && job.estado !== 'procesando') {
      return NextResponse.json(
        { error: `No se puede cancelar un job en estado: ${job.estado}` },
        { status: 400 }
      );
    }

    // Cancelar job
    const cancelado = await cancelarJob(params.id);

    if (!cancelado) {
      return NextResponse.json(
        { error: 'No se pudo cancelar el job' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelado correctamente',
    });
  } catch (error) {
    console.error('[API] Error al cancelar job:', error);
    return NextResponse.json(
      {
        error: 'Error al cancelar job',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
