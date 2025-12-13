import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedDownloadUrl } from '@/lib/s3';

// Extrae bucket y key desde una URL path-style de Object Storage (Hetzner)
function parseS3PathFromUrl(url: string): { bucket: string; key: string } | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return null;

    const [bucket, ...rest] = segments;
    const key = rest.join('/');
    return { bucket, key };
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    const ausencia = await prisma.ausencias.findUnique({
      where: { id },
      select: {
        empresaId: true,
        empleadoId: true,
        documentoId: true,
        justificanteUrl: true,
      },
    });

    if (!ausencia || ausencia.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Ausencia no encontrada' }, { status: 404 });
    }

    // Camino recomendado: usar el documento asociado y delegar en el flujo de documentos
    if (ausencia.documentoId) {
      const previewUrl = `/api/documentos/${ausencia.documentoId}?inline=1`;
      return NextResponse.redirect(previewUrl, 302);
    }

    // Soporte legado: solo tenemos la URL en bruto del storage
    if (ausencia.justificanteUrl) {
      const parsed = parseS3PathFromUrl(ausencia.justificanteUrl);
      if (!parsed) {
        return NextResponse.json({ error: 'Ruta de justificante inválida' }, { status: 400 });
      }

      const expectedBucket = process.env.STORAGE_BUCKET;
      if (expectedBucket && parsed.bucket !== expectedBucket) {
        return NextResponse.json({ error: 'Bucket de justificante no coincide' }, { status: 403 });
      }

      const signedUrl = await getSignedDownloadUrl(parsed.key, {
        responseContentDisposition: 'inline',
      });

      return NextResponse.redirect(signedUrl, 302);
    }

    return NextResponse.json({ error: 'La ausencia no tiene justificante' }, { status: 404 });
  } catch (error) {
    console.error('[Ausencias Justificante] Error:', error);
    return NextResponse.json({ error: 'Error al obtener justificante' }, { status: 500 });
  }
}






