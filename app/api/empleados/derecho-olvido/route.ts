import { NextRequest, NextResponse } from 'next/server';

import { handleApiError, isNextResponse, requireAuth } from '@/lib/api-handler';
import { logAccesoSensibles } from '@/lib/auditoria';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (isNextResponse(authResult)) {
      return authResult;
    }

    const { session } = authResult;

    const empleado = await prisma.empleados.findFirst({
      where: { usuarioId: session.user.id, empresaId: session.user.empresaId },
      select: {
        id: true,
        empresaId: true,
      },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado para la sesión actual' },
        { status: 404 }
      );
    }

    const solicitudExistente = await prisma.solicitudes_eliminacion_datos.findFirst({
      where: {
        empresaId: session.user.empresaId,
        empleadoId: empleado.id,
        estado: 'pendiente',
      },
    });

    if (solicitudExistente) {
      return NextResponse.json(
        { error: 'Ya existe una solicitud de derecho al olvido en curso' },
        { status: 409 }
      );
    }

    const solicitud = await prisma.solicitudes_eliminacion_datos.create({
      data: {
        empresaId: session.user.empresaId,
        empleadoId: empleado.id,
        solicitantePor: session.user.id,
        estado: 'pendiente',
        motivo: 'Solicitud desde ajustes de usuario',
      },
    });

    await logAccesoSensibles({
      request,
      session,
      recurso: 'empleado',
      accion: 'eliminacion',
      empleadoAccedidoId: empleado.id,
      motivo: 'solicitud_derecho_olvido',
    });

    return NextResponse.json({
      success: true,
      solicitudId: solicitud.id,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/empleados/derecho-olvido');
  }
}








