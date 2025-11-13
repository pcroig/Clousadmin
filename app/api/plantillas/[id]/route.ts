/**
 * API: /api/plantillas/[id]
 * GET: Obtener detalle de plantilla
 * PATCH: Actualizar plantilla
 * DELETE: Eliminar plantilla
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/plantillas/[id]
 * Obtener detalle completo de una plantilla
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const plantilla = await prisma.plantillaDocumento.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            documentosGenerados: true,
            jobsGeneracion: true,
          },
        },
      },
    });

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    // Verificar permisos
    if (plantilla.empresaId && plantilla.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      plantilla: {
        ...plantilla,
        variablesUsadas: plantilla.variablesUsadas as string[],
        totalDocumentosGenerados: plantilla._count.documentosGenerados,
        totalJobsGeneracion: plantilla._count.jobsGeneracion,
      },
    });
  } catch (error) {
    console.error('[API] Error al obtener plantilla:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener plantilla',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/plantillas/[id]
 * Actualizar plantilla (solo personalizadas)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, descripcion, activa, carpetaDestinoDefault, requiereFirma } = body;

    // Obtener plantilla
    const plantilla = await prisma.plantillaDocumento.findUnique({
      where: { id: params.id },
    });

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    // Verificar que sea de la empresa y no sea oficial
    if (plantilla.empresaId !== session.user.empresaId || plantilla.esOficial) {
      return NextResponse.json(
        { error: 'No se pueden modificar plantillas oficiales' },
        { status: 403 }
      );
    }

    // Actualizar
    const plantillaActualizada = await prisma.plantillaDocumento.update({
      where: { id: params.id },
      data: {
        nombre,
        descripcion,
        activa,
        carpetaDestinoDefault,
        requiereFirma,
      },
    });

    return NextResponse.json({
      success: true,
      plantilla: plantillaActualizada,
    });
  } catch (error) {
    console.error('[API] Error al actualizar plantilla:', error);
    return NextResponse.json(
      {
        error: 'Error al actualizar plantilla',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/plantillas/[id]
 * Eliminar plantilla (solo personalizadas sin documentos generados)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener plantilla
    const plantilla = await prisma.plantillaDocumento.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            documentosGenerados: true,
          },
        },
      },
    });

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    // Verificar permisos
    if (plantilla.empresaId !== session.user.empresaId || plantilla.esOficial) {
      return NextResponse.json(
        { error: 'No se pueden eliminar plantillas oficiales' },
        { status: 403 }
      );
    }

    // Verificar que no tenga documentos generados
    if (plantilla._count.documentosGenerados > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar: hay ${plantilla._count.documentosGenerados} documentos generados con esta plantilla`,
        },
        { status: 400 }
      );
    }

    // Eliminar
    await prisma.plantillaDocumento.delete({
      where: { id: params.id },
    });

    // TODO: Eliminar archivo de S3

    return NextResponse.json({
      success: true,
      message: 'Plantilla eliminada correctamente',
    });
  } catch (error) {
    console.error('[API] Error al eliminar plantilla:', error);
    return NextResponse.json(
      {
        error: 'Error al eliminar plantilla',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
