// ========================================
// API: Firma Digital - Descargar PDF Firmado
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { downloadFromS3 } from '@/lib/s3';

/**
 * GET /api/firma/solicitudes/[solicitudId]/pdf-firmado - Descargar PDF con marcas de firma
 *
 * Descarga el PDF firmado con todas las marcas visuales de firma aplicadas
 * Solo disponible cuando la solicitud está completada
 */
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

    const solicitudId = params.solicitudId;

    // Obtener solicitud con verificación de empresa
    const solicitud = await prisma.solicitudes_firma.findUnique({
      where: {
        id: solicitudId,
        empresaId: session.user.empresaId,
      },
      include: {
        firmas: {
          select: {
            empleadoId: true,
          },
        },
        documentos: {
          select: {
            nombre: true,
          },
        },
      },
    });

    if (!solicitud) {
      return NextResponse.json(
        { error: 'Solicitud de firma no encontrada' },
        { status: 404 }
      );
    }

    // Si no es HR admin, validar que es uno de los firmantes
    if (session.user.rol !== UsuarioRol.hr_admin) {
      const empleado = await prisma.empleados.findUnique({
        where: { usuarioId: session.user.id },
        select: { id: true },
      });

      if (!empleado) {
        return NextResponse.json(
          { error: 'No se encontró empleado asociado al usuario' },
          { status: 404 }
        );
      }

      const esFirmante = solicitud.firmas.some((f: { empleadoId: string }) => f.empleadoId === empleado.id);

      if (!esFirmante) {
        return NextResponse.json(
          { error: 'No tienes permisos para descargar este documento' },
          { status: 403 }
        );
      }
    }

    // Verificar que existe el PDF firmado
    if (!solicitud.pdfFirmadoS3Key) {
      return NextResponse.json(
        {
          error: 'No se ha generado el PDF firmado. El documento puede no ser un PDF o hubo un error en la generación.',
        },
        { status: 404 }
      );
    }

    // Descargar PDF firmado de S3
    const pdfBuffer = await downloadFromS3(solicitud.pdfFirmadoS3Key);

    // Generar nombre de archivo para descarga
    const nombreBase = solicitud.documentos.nombre.replace(/\.[^/.]+$/, ''); // Eliminar extensión
    const nombreArchivo = `${nombreBase}_firmado.pdf`;

    // Determinar si es descarga o visualización inline
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';

    // Retornar PDF (inline para visualizar o attachment para descargar)
    const uint8Array = new Uint8Array(pdfBuffer);

    return new Response(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': download
          ? `attachment; filename="${nombreArchivo}"`
          : `inline; filename="${nombreArchivo}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/firma/solicitudes/:solicitudId/pdf-firmado] Error:', error);

    // Manejar error de archivo no encontrado en S3
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('no existe') || errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: 'No se encontró el PDF firmado en el almacenamiento' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Error al descargar PDF firmado' },
      { status: 500 }
    );
  }
}
