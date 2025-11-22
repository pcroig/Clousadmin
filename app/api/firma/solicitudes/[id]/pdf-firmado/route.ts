// ========================================
// API: Firma Digital - Descargar PDF Firmado
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { downloadFromS3 } from '@/lib/s3';

/**
 * GET /api/firma/solicitudes/[id]/pdf-firmado - Descargar PDF con marcas de firma
 *
 * Descarga el PDF firmado con todas las marcas visuales de firma aplicadas
 * Solo disponible cuando la solicitud está completada
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const solicitudId = params.id;

    // Obtener solicitud con verificación de empresa
    const solicitud = await prisma.solicitudFirma.findUnique({
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
        documento: {
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
      const empleado = await prisma.empleado.findUnique({
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

    // Verificar que la solicitud está completada
    if (solicitud.estado !== 'completada') {
      return NextResponse.json(
        {
          error: 'El PDF firmado solo está disponible cuando la solicitud está completada',
          estadoActual: solicitud.estado,
        },
        { status: 400 }
      );
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
    const nombreBase = solicitud.documento.nombre.replace(/\.[^/.]+$/, ''); // Eliminar extensión
    const nombreArchivo = `${nombreBase}_firmado.pdf`;

    // Retornar PDF como archivo descargable
    // Convertir Buffer a Uint8Array para Response
    const uint8Array = new Uint8Array(pdfBuffer);

    return new Response(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/firma/solicitudes/:id/pdf-firmado] Error:', error);

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
