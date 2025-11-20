// ========================================
// API: Firma Digital - Detalle de Solicitud
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UsuarioRol } from '@/lib/constants/enums';
import { obtenerEstadoSolicitud } from '@/lib/firma-digital/db-helpers';

/**
 * GET /api/firma/solicitudes/[id] - Obtener estado detallado de solicitud
 *
 * Retorna información completa de una solicitud de firma:
 * - Estado general
 * - Progreso de firmantes
 * - Información del documento
 * - Certificados generados
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const solicitudId = params.id;

    // Obtener estado de la solicitud
    const estado = await obtenerEstadoSolicitud(solicitudId, session.user.empresaId);

    // Si no es HR admin, validar que el usuario es uno de los firmantes
    if (session.user.rol !== UsuarioRol.hr_admin) {
      const empleado = await prisma.empleado.findUnique({
        where: { usuarioId: session.user.id },
        select: { id: true },
      });

      if (!empleado) {
        return NextResponse.json(
          { error: 'No se encontró empleado asociado al usuario' },
          { status: 404 }
        );
      }

      // Verificar que el empleado es uno de los firmantes
      const esFirmante = estado.firmas.some((f) => f.empleadoId === empleado.id);

      if (!esFirmante) {
        return NextResponse.json(
          { error: 'No tienes permisos para ver esta solicitud' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ solicitud: estado });
  } catch (error: unknown) {
    console.error('[GET /api/firma/solicitudes/:id] Error:', error);

    // Manejar error de solicitud no encontrada
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('no encontrada')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Error al obtener estado de solicitud' },
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
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const solicitudId = params.id;
    const body = await request.json();

    // Validar acción
    if (body.accion !== 'cancelar') {
      return NextResponse.json(
        { error: 'Acción no soportada. Solo se permite "cancelar"' },
        { status: 400 }
      );
    }

    // Verificar que la solicitud existe y pertenece a la empresa
    const solicitud = await prisma.solicitudFirma.findUnique({
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
    const solicitudActualizada = await prisma.solicitudFirma.update({
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
    console.error('[PATCH /api/firma/solicitudes/:id] Error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar solicitud' },
      { status: 500 }
    );
  }
}
