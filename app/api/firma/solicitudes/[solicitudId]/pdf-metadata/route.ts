/**
 * API: Firma Digital - PDF Metadata
 *
 * GET /api/firma/solicitudes/[solicitudId]/pdf-metadata
 * Retorna metadatos del PDF para firma (con firma empresa si aplica)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { downloadFromS3 } from '@/lib/s3';
import { convertirWordAPDF, esDocumentoWord } from '@/lib/documentos/convertir-word';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ solicitudId: string }> }
) {
  const params = await context.params;

  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { solicitudId } = params;

    // Obtener la solicitud de firma
    const solicitud = await prisma.solicitudes_firma.findUnique({
      where: { id: solicitudId },
      select: {
        id: true,
        empresaId: true,
        pdfTemporalS3Key: true,
        documentos: {
          select: {
            s3Key: true,
            mimeType: true,
          },
        },
      },
    });

    if (!solicitud || solicitud.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    // Determinar qué PDF analizar
    let pdfBuffer: Buffer;

    if (solicitud.pdfTemporalS3Key) {
      // Usar PDF temporal (ya tiene firma empresa si aplica)
      pdfBuffer = await downloadFromS3(solicitud.pdfTemporalS3Key);
    } else {
      // Usar documento original
      const esWord = esDocumentoWord(solicitud.documentos.mimeType);

      if (esWord) {
        // Convertir Word a PDF
        const docBuffer = await downloadFromS3(solicitud.documentos.s3Key);
        pdfBuffer = await convertirWordAPDF(docBuffer);
      } else {
        // Ya es PDF
        pdfBuffer = await downloadFromS3(solicitud.documentos.s3Key);
      }
    }

    // Extraer metadatos del PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    return NextResponse.json({
      metadata: {
        paginaPrincipal: {
          width,
          height,
        },
        numPaginas: pages.length,
      },
    });
  } catch (error) {
    console.error('[API PDF Metadata Firma] Error:', error);

    const message = error instanceof Error ? error.message : 'Error al obtener metadatos del PDF';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
