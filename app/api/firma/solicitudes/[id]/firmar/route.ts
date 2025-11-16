// ========================================
// API: Firma Digital - Firmar Documento
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToS3 } from '@/lib/s3';
import {
  firmarDocumento,
  type DatosCapturadosFirma,
} from '@/lib/firma-digital/db-helpers';
import { randomUUID } from 'crypto';

/**
 * POST /api/firma/solicitudes/[id]/firmar - Firmar documento
 *
 * Permite a un empleado firmar un documento que le ha sido solicitado
 *
 * Body:
 * {
 *   tipo: 'click' | 'manuscrita' | 'digital';  // MVP solo soporta 'click'
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: firmaId } = await context.params;
    const body = await request.json();

    const firmaImagen: string | undefined = body.firmaImagen;
    const firmaImagenWidth: number | undefined = body.firmaImagenWidth;
    const firmaImagenHeight: number | undefined = body.firmaImagenHeight;

    // Obtener empleado asociado al usuario autenticado
    const empleado = await prisma.empleado.findUnique({
      where: { usuarioId: session.user.id },
      select: {
        id: true,
        firmaGuardada: true,
        firmaS3Key: true,
      },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'No se encontró empleado asociado al usuario' },
        { status: 404 }
      );
    }

    // Capturar datos de la firma
    let metodoCaptura: DatosCapturadosFirma['tipo'] = 'click';
    const datosCapturados: DatosCapturadosFirma = {
      tipo: metodoCaptura,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
    };

    // Adjuntar firma manuscrita si se envió desde el canvas
    if (firmaImagen) {
      const { buffer, mimeType } = dataUrlToBuffer(firmaImagen);
      metodoCaptura = 'manuscrita';
      datosCapturados.tipo = metodoCaptura;

      const firmaImagenS3Key = `firmas-manuscritas/${session.user.empresaId}/${session.user.id}/${firmaId}-${randomUUID()}.png`;
      await uploadToS3(buffer, firmaImagenS3Key, mimeType);

      datosCapturados.firmaImagenS3Key = firmaImagenS3Key;
      datosCapturados.firmaImagenWidth = firmaImagenWidth;
      datosCapturados.firmaImagenHeight = firmaImagenHeight;
      datosCapturados.firmaImagenContentType = mimeType;
    }

    // Si el empleado tiene firma guardada, incluir en datos capturados
    // (a menos que explícitamente se indique no usarla o se haya enviado una firma manuscrita)
    let usarFirmaGuardada = body.usarFirmaGuardada !== false; // Por defecto true
    if (firmaImagen) {
      usarFirmaGuardada = false;
    }
    if (empleado.firmaGuardada && empleado.firmaS3Key && usarFirmaGuardada) {
      datosCapturados.firmaGuardadaUsada = true;
      datosCapturados.firmaGuardadaS3Key = empleado.firmaS3Key;
    }

    // Firmar documento
    const resultado = await firmarDocumento(firmaId, empleado.id, datosCapturados);

    // TODO: Si la solicitud está completada, notificar al creador (Fase 2)

    return NextResponse.json({
      success: true,
      firmado: true,
      solicitudCompletada: resultado.solicitudCompletada,
      certificado: resultado.certificado,
      mensaje: resultado.solicitudCompletada
        ? 'Documento firmado correctamente. Todas las firmas han sido completadas.'
        : 'Documento firmado correctamente.',
    });
  } catch (error: any) {
    console.error('[POST /api/firma/solicitudes/:id/firmar] Error:', error);

    // Manejar errores de validación de negocio
    if (
      error.message.includes('no encontrada') ||
      error.message.includes('no pertenece') ||
      error.message.includes('ya ha sido firmado') ||
      error.message.includes('cancelada') ||
      error.message.includes('esperar a que') ||
      error.message.includes('modificado')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('no encontrada') ? 404 : 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al firmar documento' },
      { status: 500 }
    );
  }
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const matches = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!matches) {
    return {
      buffer: Buffer.from(dataUrl, 'base64'),
      mimeType: 'image/png',
    };
  }
  const [, mimeType, base64Data] = matches;
  return {
    buffer: Buffer.from(base64Data, 'base64'),
    mimeType,
  };
}
