// ========================================
// API: Firma Digital - Detalle de Solicitud
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { obtenerEstadoSolicitud } from '@/lib/firma-digital/db-helpers';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ solicitudId: string }>;
}

/**
 * GET /api/firma/solicitudes/[solicitudId] - Obtener detalles y estado de una solicitud
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { solicitudId } = await context.params;

    // Obtener la solicitud con documento y firmantes
    const solicitud = await prisma.solicitudes_firma.findUnique({
      where: { id: solicitudId },
      include: {
        documentos: {
          select: {
            id: true,
            nombre: true,
            empresaId: true,
          },
        },
        firmas: {
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
                usuarioId: true,
              },
            },
          },
          orderBy: {
            orden: 'asc',
          },
        },
      },
    });

    if (!solicitud) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    if (!solicitud.documentos || solicitud.documentos.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const esHRAdmin = session.user.rol === UsuarioRol.hr_admin;
    const esFirmante = solicitud.firmas.some(
      (firma) => firma.empleado.usuarioId === session.user.id
    );

    if (!esHRAdmin && !esFirmante) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver esta solicitud' },
        { status: 403 }
      );
    }

    const solicitudFormateada = {
      id: solicitud.id,
      titulo: solicitud.titulo,
      mensaje: solicitud.mensaje ?? undefined,
      estado: solicitud.estado,
      ordenFirma: solicitud.ordenFirma,
      pdfFirmadoS3Key: solicitud.pdfFirmadoS3Key ?? undefined,
      documentos: {
        id: solicitud.documentos.id,
        nombre: solicitud.documentos.nombre,
      },
      firmas: solicitud.firmas.map((firma) => ({
        id: firma.id,
        orden: firma.orden,
        firmado: firma.firmado,
        firmadoEn: firma.firmadoEn ?? undefined,
        empleado: {
          nombre: firma.empleado.nombre,
          apellidos: firma.empleado.apellidos,
          email: firma.empleado.email,
        },
      })),
    };

    let estadoDetallado = null;
    try {
      estadoDetallado = await obtenerEstadoSolicitud(solicitudId, session.user.empresaId);
    } catch (error) {
      console.error('[GET /api/firma/solicitudes/:solicitudId] estadoDetallado error:', error);
    }

    return NextResponse.json({
      solicitud: solicitudFormateada,
      estadoDetallado,
    });
  } catch (error: unknown) {
    console.error('[GET /api/firma/solicitudes/:solicitudId] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitud' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/firma/solicitudes/[id] - Actualizar solicitud
 *
 * Permite cancelar una solicitud de firma
 *
 * Body:
 * {
 *   accion: 'cancelar';
 *   motivo?: string;
 * }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo HR admins pueden modificar solicitudes
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'Solo HR admins pueden modificar solicitudes' },
        { status: 403 }
      );
    }

    const { solicitudId } = await context.params;
    const body = await request.json() as Record<string, unknown>;

    // Validar acción
    if (body.accion !== 'cancelar') {
      return NextResponse.json(
        { error: 'Acción no soportada. Solo se permite "cancelar"' },
        { status: 400 }
      );
    }

    // Verificar que la solicitud existe y pertenece a la empresa
    const solicitud = await prisma.solicitudes_firma.findUnique({
      where: {
        id: solicitudId,
        empresaId: session.user.empresaId,
      },
    });

    if (!solicitud) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    // Validar que la solicitud no esté ya completada o cancelada
    if (solicitud.estado === 'completada') {
      return NextResponse.json(
        { error: 'No se puede cancelar una solicitud completada' },
        { status: 400 }
      );
    }

    if (solicitud.estado === 'cancelada') {
      return NextResponse.json(
        { error: 'La solicitud ya está cancelada' },
        { status: 400 }
      );
    }

    // Cancelar solicitud
    const solicitudActualizada = await prisma.solicitudes_firma.update({
      where: { id: solicitudId },
      data: {
        estado: 'cancelada',
        canceladaEn: new Date(),
        motivoCancelacion: body.motivo || 'Cancelada por HR',
      },
    });

    // TODO: Notificar a los firmantes que la solicitud fue cancelada (Fase 2)

    return NextResponse.json({
      success: true,
      solicitud: solicitudActualizada,
    });
  } catch (error) {
    console.error('[PATCH /api/firma/solicitudes/:solicitudId] Error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar solicitud' },
      { status: 500 }
    );
  }
}
