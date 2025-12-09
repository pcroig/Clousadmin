/**
 * API: Firma Digital - Preview de documento para firma
 *
 * GET /api/firma/solicitudes/[solicitudId]/preview
 * Retorna el documento PDF para firma, con la firma de empresa aplicada si corresponde
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { downloadFromS3 } from '@/lib/s3';
import { convertirWordAPDF, esDocumentoWord } from '@/lib/documentos/convertir-word';
import { getPreviewHeaders } from '@/lib/documentos/preview-headers';

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
        documentoId: true,
        pdfTemporalS3Key: true,
        nombreDocumento: true,
        documentos: {
          select: {
            id: true,
            s3Key: true,
            nombre: true,
            mimeType: true,
          },
        },
      },
    });

    if (!solicitud || solicitud.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    // Determinar qué PDF servir:
    // 1. Si existe pdfTemporalS3Key, usar ese (ya tiene firma empresa si aplica)
    // 2. Si no, usar el documento original
    let pdfBuffer: Buffer;
    let fileName: string;
    let wasConverted = false;

    if (solicitud.pdfTemporalS3Key) {
      // Ya hay un PDF temporal (convertido de Word o con firma empresa)
      console.log('[Preview Firma] Usando PDF temporal:', solicitud.pdfTemporalS3Key);
      pdfBuffer = await downloadFromS3(solicitud.pdfTemporalS3Key);
      fileName = solicitud.nombreDocumento;
    } else {
      // Usar documento original
      console.log('[Preview Firma] Usando documento original:', solicitud.documentos.s3Key);
      const esWord = esDocumentoWord(solicitud.documentos.mimeType);

      if (esWord) {
        // Convertir Word a PDF on-the-fly
        const docBuffer = await downloadFromS3(solicitud.documentos.s3Key);
        pdfBuffer = await convertirWordAPDF(docBuffer);
        wasConverted = true;
        fileName = solicitud.documentos.nombre.replace(/\.(docx?|DOCX?)$/i, '.pdf');
      } else {
        // Ya es PDF
        pdfBuffer = await downloadFromS3(solicitud.documentos.s3Key);
        fileName = solicitud.documentos.nombre;
      }
    }

    // Retornar PDF con headers optimizados
    const headers = getPreviewHeaders({
      mimeType: 'application/pdf',
      fileName,
      wasConverted,
      contentLength: pdfBuffer.length,
    });

    return new NextResponse(pdfBuffer as BodyInit, { headers });
  } catch (error) {
    console.error('[API Preview Firma] Error:', error);

    const message = error instanceof Error ? error.message : 'Error al generar vista previa';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
