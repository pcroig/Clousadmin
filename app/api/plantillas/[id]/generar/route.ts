/**
 * API: /api/plantillas/[id]/generar
 * POST: Generar documentos desde plantilla (async con queue)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { agregarJobGeneracion } from '@/lib/plantillas';

/**
 * POST /api/plantillas/[id]/generar
 * Generar documentos para uno o múltiples empleados
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Await params en Next.js 15+
    const { id } = await params;

    const body = await request.json();
    const {
      empleadoIds,
      empleadosIds,
      nombreDocumento,
      carpetaDestino,
      notificarEmpleado = true,
      requiereFirma,
      fechaLimiteFirma,
      mensajeFirma,
    } = body;

    const ids: string[] = Array.isArray(empleadoIds)
      ? empleadoIds
      : Array.isArray(empleadosIds)
        ? empleadosIds
        : [];

    // Validaciones
    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un empleado' },
        { status: 400 }
      );
    }

    if (ids.length > 500) {
      return NextResponse.json(
        { error: 'Máximo 500 empleados por generación' },
        { status: 400 }
      );
    }

    // Verificar que la plantilla existe
    const plantilla = await prisma.plantillaDocumento.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        empresaId: true,
        activa: true,
      },
    });

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    // Verificar permisos
    if (plantilla.empresaId && plantilla.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!plantilla.activa) {
      return NextResponse.json({ error: 'Plantilla inactiva' }, { status: 400 });
    }

    // Verificar que todos los empleados existen y pertenecen a la empresa
    const empleados = await prisma.empleado.findMany({
      where: {
        id: { in: ids },
        empresaId: session.user.empresaId,
      },
      select: { id: true },
    });

    if (empleados.length !== ids.length) {
      return NextResponse.json(
        { error: 'Algunos empleados no fueron encontrados' },
        { status: 400 }
      );
    }

    // Configuración de generación
    const configuracion = {
      nombreDocumento,
      carpetaDestino,
      notificarEmpleado,
      requiereFirma,
      fechaLimiteFirma: fechaLimiteFirma ? new Date(fechaLimiteFirma) : undefined,
      mensajeFirma,
    };

    // Crear job en la cola
    console.log(`[API] Creando job para generar ${ids.length} documentos...`);

    const jobId = await agregarJobGeneracion({
      plantillaId: id,
      empleadoIds: ids,
      configuracion,
      solicitadoPor: session.user.id,
      empresaId: session.user.empresaId,
    });

    console.log(`[API] Job creado: ${jobId}`);

    return NextResponse.json({
      success: true,
      jobId,
      totalEmpleados: ids.length,
      message: `Job de generación creado. Procesando ${ids.length} documento(s)...`,
    });
  } catch (error) {
    console.error('[API] Error al generar documentos:', error);
    return NextResponse.json(
      {
        error: 'Error al generar documentos',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
