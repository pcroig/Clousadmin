// ========================================
// API: Descargar PDF de Nómina
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { logAccesoSensibles } from '@/lib/auditoria';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedDownloadUrl } from '@/lib/s3';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Obtener la nómina con su documento
    const nomina = await prisma.nomina.findFirst({
      where: {
        id,
        empleado: {
          empresaId: session.user.empresaId,
        },
      },
      include: {
        documento: true,
      },
    });

    if (!nomina) {
      return NextResponse.json({ error: 'Nómina no encontrada' }, { status: 404 });
    }

    // Registrar acceso a datos sensibles (nómina PDF)
    await logAccesoSensibles({
      request: req,
      session,
      recurso: 'nomina_pdf',
      empleadoAccedidoId: nomina.empleadoId,
      accion: 'lectura',
      camposAccedidos: ['documento_pdf'],
    });

    if (!nomina.documento || !nomina.documento.url) {
      return NextResponse.json({ error: 'No hay PDF disponible' }, { status: 404 });
    }

    // Obtener URL firmada de S3
    const downloadUrl = await getSignedDownloadUrl(nomina.documento.url);

    // Redirigir a la URL firmada
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error('[GET /api/nominas/[id]/pdf] Error:', error);
    return NextResponse.json(
      { error: 'Error al descargar el PDF' },
      { status: 500 }
    );
  }
}












