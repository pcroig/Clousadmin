import { NextRequest, NextResponse as Response } from 'next/server';

import {
  handleApiError,
  requireAuthAsHR,
  successResponse,
} from '@/lib/api-handler';
import { obtenerLogAuditoria } from '@/lib/auditoria';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const desdeParam = searchParams.get('desde');
    const hastaParam = searchParams.get('hasta');
    const accion = searchParams.get('accion') ?? undefined;
    const limite = Number(searchParams.get('limite') ?? '100');

    const desde = desdeParam ? new Date(desdeParam) : undefined;
    const hasta = hastaParam ? new Date(hastaParam) : undefined;

    const logs = await obtenerLogAuditoria(
      session.user.empresaId,
      id,
      {
        desde: desde && !Number.isNaN(desde.getTime()) ? desde : undefined,
        hasta: hasta && !Number.isNaN(hasta.getTime()) ? hasta : undefined,
        accion,
        limite: Number.isNaN(limite) ? 100 : Math.min(Math.max(limite, 1), 500),
      }
    );

    return successResponse({ logs });
  } catch (error) {
    return handleApiError(error, 'API GET /api/auditoria/empleados/[id]');
  }
}

