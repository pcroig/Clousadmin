// ========================================
// API: Firma Digital - Certificado de Firma
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { verificarCertificado } from '@/lib/firma-digital/certificado';
import { validarFirmaCompleta } from '@/lib/firma-digital/validacion';
import { prisma } from '@/lib/prisma';
import { downloadFromS3 } from '@/lib/s3';

/**
 * GET /api/firma/certificado/[id] - Obtener certificado de firma
 *
 * Retorna el certificado de una firma específica
 * Incluye validación de integridad del certificado
 *
 * Query params:
 * - validar: 'true' para validar integridad del documento (opcional, más lento)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const firmaId = params.id;
    const { searchParams } = new URL(request.url);
    const validar = searchParams.get('validar') === 'true';

    // Obtener firma con toda la información necesaria
    const firma = await prisma.firma.findUnique({
      where: { id: firmaId },
      include: {
        solicitudFirma: {
          include: {
            documento: {
              select: {
                id: true,
                nombre: true,
                s3Key: true,
                empresaId: true,
              },
            },
          },
        },
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
            usuarioId: true,
          },
        },
      },
    });

    if (!firma) {
      return NextResponse.json({ error: 'Firma no encontrada' }, { status: 404 });
    }

    // Validar que la firma pertenece a la empresa del usuario
    if (firma.solicitudFirma.documento.empresaId !== session.user.empresaId) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver este certificado' },
        { status: 403 }
      );
    }

    // Si no es HR admin, validar que el usuario es el firmante
    if (session.user.rol !== UsuarioRol.hr_admin) {
      if (firma.empleado.usuarioId !== session.user.id) {
        return NextResponse.json(
          { error: 'No tienes permisos para ver este certificado' },
          { status: 403 }
        );
      }
    }

    // Validar que la firma está completada
    if (!firma.firmado || !firma.firmadoEn) {
      return NextResponse.json(
        { error: 'Esta firma aún no ha sido completada' },
        { status: 400 }
      );
    }

    // Reconstruir certificado
    const certificado = {
      solicitudFirmaId: firma.solicitudFirmaId,
      firmaId: firma.id,
      empleadoId: firma.empleadoId,
      empleadoNombre: `${firma.empleado.nombre} ${firma.empleado.apellidos}`,
      empleadoEmail: firma.empleado.email,
      documentoId: firma.solicitudFirma.documentoId,
      documentoNombre: firma.solicitudFirma.nombreDocumento,
      documentoHash: firma.solicitudFirma.hashDocumento,
      firmadoEn: firma.firmadoEn.toISOString(),
      ipAddress: firma.ipAddress || 'unknown',
      userAgent: firma.datosCapturados?.userAgent || 'unknown',
      certificadoHash: firma.certificadoHash || '',
      version: '1.0-simple',
    };

    // Verificar integridad del certificado
    const certificadoValido = verificarCertificado(certificado);

    let validacionDocumento;
    if (validar) {
      // Validar integridad del documento (requiere descargar el archivo)
      try {
        const documentoBuffer = await downloadFromS3(firma.solicitudFirma.documento.s3Key);
        validacionDocumento = validarFirmaCompleta(certificado, documentoBuffer);
      } catch (error) {
        console.error('[GET /api/firma/certificado/:id] Error validando documento:', error);
        validacionDocumento = {
          valida: false,
          motivo: 'Error al descargar documento para validación',
        };
      }
    }

    return NextResponse.json({
      certificado,
      certificadoValido,
      validacionDocumento: validar ? validacionDocumento : undefined,
      firma: {
        id: firma.id,
        tipo: firma.tipo,
        firmado: firma.firmado,
        firmadoEn: firma.firmadoEn,
        orden: firma.orden,
        datosCapturados: firma.datosCapturados,
      },
      solicitudFirma: {
        id: firma.solicitudFirma.id,
        titulo: firma.solicitudFirma.titulo,
        estado: firma.solicitudFirma.estado,
        documento: {
          id: firma.solicitudFirma.documento.id,
          nombre: firma.solicitudFirma.documento.nombre,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/firma/certificado/:id] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener certificado' },
      { status: 500 }
    );
  }
}
