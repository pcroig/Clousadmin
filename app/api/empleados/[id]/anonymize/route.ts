import { NextRequest, NextResponse } from 'next/server';

import { handleApiError, isNextResponse, requireAuthAsHR } from '@/lib/api-handler';
import { logAccesoSensibles } from '@/lib/auditoria';
import { anonymizeEmpleado } from '@/lib/empleados/anonymize';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const authResult = await requireAuthAsHR(request);
    if (isNextResponse(authResult)) {
      return authResult;
    }
    const { session } = authResult;

    const result = await prisma.$transaction(async (tx) => {
      return anonymizeEmpleado(tx, {
        empleadoId: params.id,
        empresaId: session.user.empresaId,
      });
    });

    await logAccesoSensibles({
      request,
      session,
      recurso: 'empleado',
      accion: 'eliminacion',
      empleadoAccedidoId: params.id,
      motivo: 'derecho_olvido',
    });

    return NextResponse.json({
      success: true,
      anonymizedEmail: result.anonymizedEmail,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/empleados/[id]/anonymize');
  }
}










