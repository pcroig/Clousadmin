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
 * POST /api/firma/solicitudes/[solicitudId]/firmar - Firmar documento
 *
 * Permite a un empleado firmar un documento que le ha sido solicitado
 * El empleado debe tener una firma pendiente en la solicitud
 *
 * Body:
 * {
 *   tipo: 'click' | 'manuscrita' | 'digital';  // MVP solo soporta 'click'
 *   usarFirmaGuardada?: boolean;
 *   firmaImagen?: string;  // Data URL de la firma manuscrita
 *   firmaImagenWidth?: number;
 *   firmaImagenHeight?: number;
 *   carpetaDestinoId?: string; // ID de carpeta centralizada (para documentos desde carpetas compartidas)
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ solicitudId: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { solicitudId } = await context.params;
    const body = await request.json() as Record<string, unknown>;

    const firmaImagen: string | undefined = typeof body.firmaImagen === 'string' ? body.firmaImagen : undefined;
    const firmaImagenWidth: number | undefined = typeof body.firmaImagenWidth === 'number' ? body.firmaImagenWidth : undefined;
    const firmaImagenHeight: number | undefined = typeof body.firmaImagenHeight === 'number' ? body.firmaImagenHeight : undefined;
    const carpetaDestinoId: string | undefined = typeof body.carpetaDestinoId === 'string' ? body.carpetaDestinoId : undefined;

    // Validar carpetaDestinoId si se proporcionó
    if (carpetaDestinoId) {
      const carpeta = await prisma.carpetas.findUnique({
        where: { id: carpetaDestinoId },
        select: {
          id: true,
          empresaId: true,
          empleadoId: true,
          asignadoA: true,
          compartida: true,
        },
      });

      if (!carpeta) {
        return NextResponse.json(
          { error: 'La carpeta destino no existe' },
          { status: 400 }
        );
      }

      if (carpeta.empresaId !== session.user.empresaId) {
        return NextResponse.json(
          { error: 'La carpeta destino no pertenece a tu empresa' },
          { status: 403 }
        );
      }

      // Validar que sea carpeta centralizada (empleadoId null, asignadoA 'hr')
      if (carpeta.empleadoId !== null || carpeta.asignadoA !== 'hr') {
        return NextResponse.json(
          { error: 'La carpeta destino debe ser una carpeta centralizada' },
          { status: 400 }
        );
      }
    }

    // Obtener empleado asociado al usuario autenticado
    const empleado = await prisma.empleados.findUnique({
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

    // Buscar la firma pendiente del empleado en esta solicitud
    const firma = await prisma.firmas.findFirst({
      where: {
        solicitudFirmaId: solicitudId,
        empleadoId: empleado.id,
        firmado: false,
      },
      select: {
        id: true,
      },
    });

    if (!firma) {
      return NextResponse.json(
        { error: 'No tienes una firma pendiente en esta solicitud o ya la has firmado' },
        { status: 404 }
      );
    }

    const firmaId = firma.id;

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

    // Firmar documento (pasar carpetaDestinoId si se proporcionó)
    const resultado = await firmarDocumento(firmaId, empleado.id, datosCapturados, carpetaDestinoId);

    // TODO: Si la solicitud está completada, notificar al creador (Fase 2)

    return NextResponse.json({
      success: true,
      firmado: true,
      solicitudCompletada: resultado.solicitudCompletada,
      certificado: resultado.certificado,
      documentoFirmado: resultado.documentoFirmado,
      solicitudId,
      mensaje: resultado.solicitudCompletada
        ? 'Documento firmado correctamente. Todas las firmas han sido completadas.'
        : 'Documento firmado correctamente.',
    });
  } catch (error: unknown) {
    console.error('[POST /api/firma/solicitudes/:solicitudId/firmar] Error:', error);

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
