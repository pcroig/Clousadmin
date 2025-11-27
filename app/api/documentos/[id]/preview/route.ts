/**
 * API: Document Preview
 *
 * GET /api/documentos/[id]/preview
 * Returns the document as an inline PDF stream for in-app viewing.
 * - PDFs and images are served directly.
 * - DOCX files are converted to PDF on-the-fly (with caching).
 */

import { NextRequest, NextResponse } from 'next/server';

import { logAccesoSensibles } from '@/lib/auditoria';
import { getSession } from '@/lib/auth';
import { getDocumentPreview, supportsPreview } from '@/lib/documentos/preview';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;

  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    // Quick check if document exists and supports preview
    const documento = await prisma.documento.findUnique({
      where: { id },
      select: {
        id: true,
        mimeType: true,
        empresaId: true,
        empleadoId: true,
        tipoDocumento: true,
      },
    });

    if (!documento || documento.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    if (!supportsPreview(documento.mimeType)) {
      return NextResponse.json(
        {
          error: 'Tipo de documento no soportado para vista previa',
          supported: false,
          mimeType: documento.mimeType,
        },
        { status: 415 }
      );
    }

    // Check for force regeneration
    const searchParams = request.nextUrl.searchParams;
    const forceRegenerate = searchParams.get('regenerate') === '1';

    // Get the preview
    const preview = await getDocumentPreview({
      documentoId: id,
      userId: session.user.id,
      userRole: session.user.rol,
      empresaId: session.user.empresaId,
      options: { forceRegenerate },
    });

    // Log access for audit
    await logAccesoSensibles({
      request,
      session,
      recurso: 'documento',
      accion: 'preview',
      empleadoAccedidoId: documento.empleadoId ?? undefined,
      camposAccedidos: [documento.tipoDocumento ?? 'documento'],
    });

    // Return the preview with appropriate headers
    return new NextResponse(preview.buffer, {
      headers: {
        'Content-Type': preview.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(preview.fileName)}"`,
        'Content-Length': preview.buffer.length.toString(),
        // Security headers to prevent XSS in the viewer
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        'X-Content-Type-Options': 'nosniff',
        // Cache control - cache for 1 hour if converted, otherwise 5 minutes
        'Cache-Control': preview.wasConverted
          ? 'private, max-age=3600'
          : 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('[API Preview] Error:', error);

    const message = error instanceof Error ? error.message : 'Error al generar vista previa';

    // Determine appropriate status code
    let status = 500;
    if (message.includes('No tienes permisos')) {
      status = 403;
    } else if (message.includes('no encontrado')) {
      status = 404;
    } else if (message.includes('no soporta') || message.includes('no está disponible')) {
      status = 415;
    }

    return NextResponse.json({ error: message }, { status });
  }
}

