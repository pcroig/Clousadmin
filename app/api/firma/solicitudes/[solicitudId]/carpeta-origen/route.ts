// ========================================
// API: Firma Digital - Obtener Carpeta Origen
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/firma/solicitudes/[solicitudId]/carpeta-origen
 *
 * Obtiene información sobre la carpeta donde está el documento original
 * y si es necesario seleccionar carpeta destino para documentos firmados
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ solicitudId: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { solicitudId } = await context.params;

    // Obtener empleado del usuario autenticado
    const empleado = await prisma.empleados.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'No se encontró empleado asociado' },
        { status: 404 }
      );
    }

    // Obtener solicitud con documento y carpeta
    const solicitud = await prisma.solicitudes_firma.findUnique({
      where: { id: solicitudId },
      select: {
        id: true,
        documentoId: true,
        empresaId: true,
        documentos: {
          select: {
            id: true,
            nombre: true,
            documento_carpetas: {
              select: {
                carpeta: {
                  select: {
                    id: true,
                    nombre: true,
                    compartida: true,
                    asignadoA: true,
                    empleadoId: true,
                  },
                },
              },
              take: 1, // Solo necesitamos la primera carpeta
            },
          },
        },
      },
    });

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    // Validar que la solicitud pertenece a la empresa del usuario
    if (solicitud.empresaId !== session.user.empresaId) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta solicitud' },
        { status: 403 }
      );
    }

    // Validar que el usuario tiene una firma pendiente en esta solicitud
    const firmaPendiente = await prisma.firmas.findFirst({
      where: {
        solicitudFirmaId: solicitudId,
        empleadoId: empleado.id,
      },
      select: { id: true },
    });

    if (!firmaPendiente) {
      return NextResponse.json(
        { error: 'No tienes una firma pendiente en esta solicitud' },
        { status: 403 }
      );
    }

    const carpeta = solicitud.documentos.documento_carpetas[0]?.carpeta;

    if (!carpeta) {
      return NextResponse.json({
        necesitaSeleccion: false,
        motivo: 'sin_carpeta',
      });
    }

    // Determinar si necesita selección de carpeta destino
    // Solo para carpetas compartidas (no HR/master)
    const esCompartida = carpeta.compartida && carpeta.asignadoA !== 'hr';

    if (!esCompartida) {
      return NextResponse.json({
        necesitaSeleccion: false,
        motivo: carpeta.empleadoId ? 'carpeta_personal' : 'carpeta_centralizada',
        carpeta: {
          id: carpeta.id,
          nombre: carpeta.nombre,
        },
      });
    }

    // Es carpeta compartida → necesita selección
    // Obtener carpetas centralizadas disponibles
    const carpetasCentralizadas = await prisma.carpetas.findMany({
      where: {
        empresaId: session.user.empresaId,
        empleadoId: null, // Carpetas centralizadas
        asignadoA: 'hr', // Solo para HR
      },
      select: {
        id: true,
        nombre: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return NextResponse.json({
      necesitaSeleccion: true,
      motivo: 'carpeta_compartida',
      carpeta: {
        id: carpeta.id,
        nombre: carpeta.nombre,
      },
      carpetasCentralizadas,
    });
  } catch (error: unknown) {
    console.error('[GET /api/firma/solicitudes/:solicitudId/carpeta-origen] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener información de carpeta' },
      { status: 500 }
    );
  }
}
