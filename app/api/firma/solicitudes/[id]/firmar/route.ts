// ========================================
// API: Firma Digital - Firmar Documento
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  firmarDocumento,
  type DatosCapturadosFirma,
} from '@/lib/firma-digital/db-helpers';

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const firmaId = params.id;
    const body = await request.json();

    // Validar tipo de firma (MVP solo click)
    const tipoFirma = body.tipo || 'click';
    if (tipoFirma !== 'click') {
      return NextResponse.json(
        { error: 'En la versión MVP solo se soporta firma por click' },
        { status: 400 }
      );
    }

    // Obtener empleado asociado al usuario autenticado
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

    // Capturar datos de la firma
    const datosCapturados: DatosCapturadosFirma = {
      tipo: tipoFirma,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
    };

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
