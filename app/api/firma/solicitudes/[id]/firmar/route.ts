// ========================================
// API: Firma Digital - Firmar Documento
// ========================================

import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import {
  type DatosCapturadosFirma,
  firmarDocumento,
} from '@/lib/firma-digital/db-helpers';
import { prisma } from '@/lib/prisma';
import { uploadToS3 } from '@/lib/s3';

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
    const body = await request.json() as Record<string, unknown>;

    const firmaImagen: string | undefined = typeof body.firmaImagen === 'string' ? body.firmaImagen : undefined;
    const firmaImagenWidth: number | undefined = typeof body.firmaImagenWidth === 'number' ? body.firmaImagenWidth : undefined;
    const firmaImagenHeight: number | undefined = typeof body.firmaImagenHeight === 'number' ? body.firmaImagenHeight : undefined;

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
  } catch (error: unknown) {
    console.error('[POST /api/firma/solicitudes/:id/firmar] Error:', error);

    // Manejar errores de validación de negocio
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes('no encontrada') ||
      errorMessage.includes('no pertenece') ||
      errorMessage.includes('ya ha sido firmado') ||
      errorMessage.includes('cancelada') ||
      errorMessage.includes('esperar a que') ||
      errorMessage.includes('modificado')
    ) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage.includes('no encontrada') ? 404 : 400 }
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
