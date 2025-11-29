/**
 * API: Documentos Generados - Rellenar PDF antes de firmar
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { crearSolicitudFirma } from '@/lib/firma-digital/db-helpers';
import { crearNotificacionFirmaPendiente } from '@/lib/notificaciones';
import { rellenarPDFFormulario } from '@/lib/plantillas/pdf-rellenable';
import { prisma } from '@/lib/prisma';
import { descargarDocumento, subirDocumento } from '@/lib/s3';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !session.user.empleadoId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json() as Record<string, unknown>;
    const campos = body.campos as Record<string, string>;

    if (!campos || typeof campos !== 'object' || Array.isArray(campos)) {
      return NextResponse.json(
        { error: 'Formato de campos inválido' },
        { status: 400 }
      );
    }

    const { id } = await context.params;

    const documentoGenerado = await prisma.documentoGenerado.findUnique({
      where: { id },
      include: {
        documento: true,
        plantilla: true,
        empleado: {
          select: {
            id: true,
            usuarioId: true,
          },
        },
      },
    });

    if (
      !documentoGenerado ||
      documentoGenerado.empleadoId !== session.user.empleadoId
    ) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    if (
      !documentoGenerado.plantilla.permiteRellenar ||
      documentoGenerado.plantilla.formato !== 'pdf_rellenable'
    ) {
      return NextResponse.json(
        { error: 'Este documento no permite rellenar campos' },
        { status: 400 }
      );
    }

    const configuracionIA = documentoGenerado.plantilla
      .configuracionIA as Record<string, unknown> | null;
    const camposFusionados = Array.isArray(configuracionIA?.camposFusionados)
      ? (configuracionIA?.camposFusionados as Array<{ nombre: string }>)
      : [];

    if (camposFusionados.length === 0) {
      return NextResponse.json(
        { error: 'Esta plantilla no tiene campos configurados' },
        { status: 400 }
      );
    }

    const camposValidos = new Set(
      camposFusionados
        .map((campo) => campo?.nombre)
        .filter((nombre): nombre is string => Boolean(nombre))
    );

    const valoresNormalizados: Record<string, string> = {};
    Object.entries(campos).forEach(([campo, valor]) => {
      if (
        camposValidos.has(campo) &&
        typeof valor === 'string' &&
        valor.trim() !== ''
      ) {
        valoresNormalizados[campo] = valor.trim();
      }
    });

    if (Object.keys(valoresNormalizados).length === 0) {
      return NextResponse.json(
        { error: 'Debes completar al menos un campo' },
        { status: 400 }
      );
    }

    // Descargar el PDF ya generado (contiene datos pre-rellenados del sistema)
    const documentoActualBuffer = await descargarDocumento(
      documentoGenerado.documento.s3Key
    );

    const pdfActualizado = await rellenarPDFFormulario(
      documentoActualBuffer,
      valoresNormalizados
    );

    await subirDocumento(
      pdfActualizado,
      documentoGenerado.documento.s3Key,
      'application/pdf'
    );

    await prisma.documento.update({
      where: { id: documentoGenerado.documentoId },
      data: {
        tamano: pdfActualizado.length,
      },
    });

    await prisma.documentoGenerado.update({
      where: { id: documentoGenerado.id },
      data: {
        camposCompletados: valoresNormalizados,
        pendienteRellenar: false,
        rellenadoEn: new Date(),
      },
    });

    let solicitudFirmaId: string | null = null;

    if (documentoGenerado.documento.requiereFirma) {
      const solicitudExistente = await prisma.solicitudFirma.findFirst({
        where: {
          documentoId: documentoGenerado.documentoId,
          estado: {
            in: ['pendiente', 'en_proceso'],
          },
        },
        select: { id: true },
      });

      if (solicitudExistente) {
        solicitudFirmaId = solicitudExistente.id;
      } else {
        const solicitud = await crearSolicitudFirma({
          documentoId: documentoGenerado.documentoId,
          empresaId: documentoGenerado.empresaId,
          titulo: `Firma: ${documentoGenerado.documento.nombre}`,
          mensaje: `Revisa y firma ${documentoGenerado.documento.nombre}`,
          firmantes: [
            {
              empleadoId: documentoGenerado.empleadoId,
            },
          ],
          creadoPor: session.user.id,
        });

        if (!solicitud) {
          throw new Error('No se pudo crear la solicitud de firma');
        }

        solicitudFirmaId = solicitud.id;

        if (documentoGenerado.empleado.usuarioId) {
          await crearNotificacionFirmaPendiente(
            prisma,
            {
              empresaId: documentoGenerado.empresaId,
              empleadoId: documentoGenerado.empleadoId,
              firmaId: solicitud.id,
              solicitudId: solicitud.id,
              documentoId: documentoGenerado.documentoId,
              documentoNombre: documentoGenerado.documento.nombre,
            },
            { actorUsuarioId: session.user.id }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      solicitudFirmaId,
      requiereFirma: documentoGenerado.documento.requiereFirma,
    });
  } catch (error) {
    console.error('[DocumentoGenerado:Rellenar] Error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el documento' },
      { status: 500 }
    );
  }
}

