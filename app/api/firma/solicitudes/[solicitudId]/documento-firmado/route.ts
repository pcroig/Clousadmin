// ========================================
// API: Firma Digital - Documento Firmado
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { downloadFromS3 } from '@/lib/s3';

interface RouteContext {
  params: Promise<{ solicitudId: string }>;
}

/**
 * GET /api/firma/solicitudes/[solicitudId]/documento-firmado
 *
 * Descarga el PDF firmado desde S3
 * Solo accesible por HR admins o empleados que son firmantes
 *
 * Query params:
 * - inline: si es "1", se muestra inline en el navegador (para iframe)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { solicitudId } = await context.params;
    const { searchParams } = new URL(request.url);
    const inline = searchParams.get('inline') === '1';

    // Obtener la solicitud
    const solicitud = await prisma.solicitudes_firma.findUnique({
      where: { id: solicitudId },
      select: {
        id: true,
        pdfFirmadoS3Key: true,
        documentos: {
          select: {
            id: true,
            nombre: true,
            empresaId: true,
          },
        },
        firmas: {
          select: {
            empleado: {
              select: {
                usuarioId: true,
              },
            },
          },
        },
      },
    });

    if (!solicitud) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que pertenece a la empresa del usuario
    if (solicitud.documentos.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Verificar permisos
    const esHRAdmin = session.user.rol === 'hr_admin';
    const esFirmante = solicitud.firmas.some(
      (firma) => firma.empleado.usuarioId === session.user.id
    );

    if (!esHRAdmin && !esFirmante) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a este documento' },
        { status: 403 }
      );
    }

    // Verificar que existe el documento firmado
    if (!solicitud.pdfFirmadoS3Key) {
      return NextResponse.json(
        { error: 'El documento aún no ha sido firmado por todos los firmantes' },
        { status: 404 }
      );
    }

    // Descargar desde S3 usando helper
    const buffer = await downloadFromS3(solicitud.pdfFirmadoS3Key);

    // Determinar nombre del archivo
    const nombreArchivo = solicitud.documentos.nombre.endsWith('.pdf')
      ? solicitud.documentos.nombre.replace('.pdf', '_firmado.pdf')
      : `${solicitud.documentos.nombre}_firmado.pdf`;

    // Retornar el PDF
    // Convertir Buffer a Uint8Array para NextResponse
    const uint8Array = new Uint8Array(buffer);
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': inline
          ? `inline; filename="${nombreArchivo}"`
          : `attachment; filename="${nombreArchivo}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[GET /api/firma/solicitudes/[solicitudId]/documento-firmado] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener documento firmado' },
      { status: 500 }
    );
  }
}
