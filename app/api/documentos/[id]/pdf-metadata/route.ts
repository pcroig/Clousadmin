// ========================================
// API: Documentos - PDF Metadata
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { obtenerMetadataPDF } from '@/lib/firma-digital';
import { prisma } from '@/lib/prisma';
import { downloadFromS3 } from '@/lib/s3';

/**
 * GET /api/documentos/[id]/pdf-metadata
 *
 * Obtiene metadata del PDF (número de páginas, dimensiones, etc.)
 * Necesario para calcular posiciones de firma correctamente
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;

    // Buscar documento
    const documento = await prisma.documentos.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        tipoDocumento: true,
        s3Key: true,
        empresaId: true,
      },
    });

    if (!documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    // Verificar que el documento pertenece a la empresa del usuario
    if (documento.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Solo PDFs tienen metadata útil
    if (documento.tipoDocumento !== 'application/pdf') {
      return NextResponse.json(
        { error: 'El documento no es un PDF' },
        { status: 400 }
      );
    }

    // Descargar PDF desde S3
    const pdfBuffer = await downloadFromS3(documento.s3Key);

    // Obtener metadata
    const metadata = await obtenerMetadataPDF(pdfBuffer);

    return NextResponse.json({
      success: true,
      metadata: {
        numPaginas: metadata.numPaginas,
        dimensiones: metadata.tamanoPaginas,
        // Dimensiones de la primera página (más común)
        paginaPrincipal: metadata.tamanoPaginas[0] || { width: 595, height: 842 },
      },
    });
  } catch (error) {
    console.error('[GET /api/documentos/:id/pdf-metadata] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener metadata del PDF' },
      { status: 500 }
    );
  }
}
