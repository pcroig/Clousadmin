import { NextRequest, NextResponse } from 'next/server';

import { handleApiError, requireAuthAsHR } from '@/lib/api-handler';
import { logAccesoSensibles } from '@/lib/auditoria';
import { buildEmpleadoExcelBuffer, loadEmpleadoExportData } from '@/lib/empleados/export-data';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { session } = authResult;

    const exportData = await loadEmpleadoExportData(prisma, {
      empresaId: session.user.empresaId,
      empleadoId: params.id,
    });

    if (!exportData) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    const excelBuffer = buildEmpleadoExcelBuffer(exportData);

    await logAccesoSensibles({
      request,
      session,
      recurso: 'empleado',
      accion: 'exportacion',
      empleadoAccedidoId: params.id,
      camposAccedidos: ['perfil_completo'],
      motivo: 'derecho_acceso',
    });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="empleado-${params.id}-datos.xlsx"`,
      },
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/empleados/[id]/export');
  }
}



