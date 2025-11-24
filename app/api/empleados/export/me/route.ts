import { NextRequest, NextResponse } from 'next/server';

import { handleApiError, requireAuth } from '@/lib/api-handler';
import { logAccesoSensibles } from '@/lib/auditoria';
import { buildEmpleadoExcelBuffer, loadEmpleadoExportData } from '@/lib/empleados/export-data';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { session } = authResult;

    if (!session.user.empleadoId) {
      return NextResponse.json(
        { error: 'No hay un empleado vinculado a la sesión actual' },
        { status: 400 }
      );
    }

    const exportData = await loadEmpleadoExportData(prisma, {
      empresaId: session.user.empresaId,
      empleadoId: session.user.empleadoId,
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
      empleadoAccedidoId: session.user.empleadoId,
      camposAccedidos: ['perfil_completo'],
      motivo: 'derecho_acceso_usuario',
    });

    const today = new Date().toISOString().split('T')[0];

    return new NextResponse(excelBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="datos-personales-${today}.xlsx"`,
      },
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/empleados/export/me');
  }
}








