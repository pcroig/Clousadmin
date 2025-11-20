/**
 * API: /api/plantillas/[id]
 * GET: Obtener plantilla por ID
 * PATCH: Actualizar plantilla (metadata)
 * DELETE: Eliminar plantilla
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma, Prisma } from '@/lib/prisma';

/**
 * GET /api/plantillas/[id]
 * Obtener detalles de una plantilla
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const plantilla = await prisma.plantillaDocumento.findUnique({
      where: { id },
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
    if (plantilla.empresaId && plantilla.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      plantilla: {
        ...plantilla,
        variablesUsadas: plantilla.variablesUsadas as string[],
        totalDocumentosGenerados: plantilla._count.documentosGenerados,
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
 * Actualizar metadata de plantilla
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verificar que la plantilla existe y pertenece a su empresa
    const plantillaExistente = await prisma.plantillaDocumento.findUnique({
      where: { id },
    });

    if (!plantillaExistente) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    // No permitir editar plantillas oficiales
    if (plantillaExistente.esOficial) {
      return NextResponse.json(
        { error: 'No se pueden editar plantillas oficiales' },
        { status: 403 }
      );
    }

    // Verificar permisos
    if (plantillaExistente.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Actualizar solo campos permitidos
    const {
      nombre,
      descripcion,
      categoria,
      activa,
      carpetaDestinoDefault,
      requiereFirma,
      configuracionIA,
    } = body;

    const carpetaDestinoSanitizada =
      carpetaDestinoDefault === undefined
        ? undefined
        : (carpetaDestinoDefault?.toString().trim() || 'Otros');

    const plantillaActualizada = await prisma.plantillaDocumento.update({
      where: { id },
      data: {
        ...(nombre && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(categoria !== undefined && { categoria }),
        ...(activa !== undefined && { activa }),
        ...(carpetaDestinoSanitizada !== undefined && {
          carpetaDestinoDefault: carpetaDestinoSanitizada,
        }),
        ...(requiereFirma !== undefined && { requiereFirma }),
        ...(configuracionIA !== undefined && { 
          configuracionIA: {
            ...(typeof plantillaExistente.configuracionIA === 'object' && plantillaExistente.configuracionIA !== null 
              ? plantillaExistente.configuracionIA as Record<string, unknown>
              : {}),
            ...configuracionIA,
          } as Prisma.InputJsonValue,
        }),
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
 * Eliminar plantilla personalizada
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar que la plantilla existe
    const plantilla = await prisma.plantillaDocumento.findUnique({
      where: { id },
    });

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    // No permitir eliminar plantillas oficiales
    if (plantilla.esOficial) {
      return NextResponse.json(
        { error: 'No se pueden eliminar plantillas oficiales' },
        { status: 403 }
      );
    }

    // Verificar permisos
    if (plantilla.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Eliminar plantilla (los documentos generados se mantienen por integridad)
    await prisma.plantillaDocumento.delete({
      where: { id },
    });

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
