/**
 * Helpers de base de datos para firma digital
 * Funciones para crear solicitudes, firmar documentos, y consultar estados
 */

import { prisma } from '@/lib/prisma';
import { downloadFromS3, uploadToS3 } from '@/lib/s3';
import {
  generarHashDocumento,
  generarCertificadoFirmaSimple,
  validarIntegridadDocumento,
  validarComplecionFirmas,
  anadirMarcasFirmasPDF,
  esPDFValido,
} from '@/lib/firma-digital';
import type {
  CrearSolicitudFirmaInput,
  DatosCapturadosFirma,
  EstadoSolicitudFirmaDetallado,
  ResultadoFirma,
} from '@/lib/firma-digital';

// Re-export types for API convenience
export type {
  CrearSolicitudFirmaInput,
  DatosCapturadosFirma,
  EstadoSolicitudFirmaDetallado,
  ResultadoFirma,
};

/**
 * Crea una solicitud de firma para un documento
 * Genera hash del documento y crea registros de firma para cada firmante
 *
 * @param input - Datos para crear la solicitud
 * @returns Solicitud de firma creada con sus firmantes
 *
 * @example
 * ```ts
 * const solicitud = await crearSolicitudFirma({
 *   documentoId: 'doc-123',
 *   empresaId: 'emp-456',
 *   titulo: 'Firma de Contrato',
 *   firmantes: [
 *     { empleadoId: 'emp-789', orden: 1 }
 *   ],
 *   creadoPor: 'user-001'
 * });
 * ```
 */
export async function crearSolicitudFirma(input: CrearSolicitudFirmaInput) {
  const {
    documentoId,
    empresaId,
    titulo,
    mensaje,
    firmantes,
    ordenFirma = false,
    proveedor = 'interno',
    recordatorioAutomatico = true,
    diasRecordatorio = 3,
    creadoPor,
  } = input;

  // 1. Obtener documento y generar hash
  const documento = await prisma.documento.findUnique({
    where: { id: documentoId },
    select: {
      id: true,
      nombre: true,
      s3Key: true,
      empresaId: true,
    },
  });

  if (!documento) {
    throw new Error('Documento no encontrado');
  }

  if (documento.empresaId !== empresaId) {
    throw new Error('El documento no pertenece a esta empresa');
  }

  // Descargar documento y generar hash
  const documentoBuffer = await downloadFromS3(documento.s3Key);
  const hashDocumento = generarHashDocumento(documentoBuffer);

  // 2. Crear solicitud de firma
  const solicitud = await prisma.solicitudFirma.create({
    data: {
      empresaId,
      documentoId,
      titulo,
      mensaje,
      ordenFirma,
      proveedor,
      recordatorioAutomatico,
      diasRecordatorio,
      nombreDocumento: documento.nombre,
      hashDocumento,
      estado: 'pendiente',
      creadoPor,
    },
  });

  // 3. Crear registros de firma para cada firmante
  const ahora = new Date();
  const firmasData = firmantes.map((firmante, index) => ({
    solicitudFirmaId: solicitud.id,
    empleadoId: firmante.empleadoId,
    orden: ordenFirma ? (firmante.orden ?? index + 1) : 0,
    tipo: firmante.tipo ?? 'simple',
    enviadoEn: ahora,
  }));

  await prisma.firma.createMany({
    data: firmasData,
  });

  // 4. Actualizar documento para indicar que requiere firma
  await prisma.documento.update({
    where: { id: documentoId },
    data: {
      requiereFirma: true,
      hashDocumento,
    },
  });

  // 5. Retornar solicitud con firmas
  const solicitudCompleta = await prisma.solicitudFirma.findUnique({
    where: { id: solicitud.id },
    include: {
      firmas: {
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              email: true,
            },
          },
        },
        orderBy: { orden: 'asc' },
      },
      documento: {
        select: {
          id: true,
          nombre: true,
          tipoDocumento: true,
        },
      },
    },
  });

  return solicitudCompleta;
}

/**
 * Procesa la firma de un documento por un empleado
 * Genera certificado, valida integridad, y actualiza estados
 *
 * @param firmaId - ID de la firma a procesar
 * @param empleadoId - ID del empleado que firma
 * @param datosCapturados - Datos de la firma (IP, user agent, etc.)
 * @returns Firma actualizada con certificado
 *
 * @example
 * ```ts
 * const firma = await firmarDocumento(
 *   'firma-123',
 *   'empleado-456',
 *   {
 *     tipo: 'click',
 *     ip: '192.168.1.1',
 *     userAgent: 'Mozilla/5.0...',
 *     timestamp: new Date().toISOString()
 *   }
 * );
 * ```
 */
export async function firmarDocumento(
  firmaId: string,
  empleadoId: string,
  datosCapturados: DatosCapturadosFirma
) {
  // 1. Obtener firma con solicitud y documento
  const firma = await prisma.firma.findUnique({
    where: { id: firmaId },
    include: {
      solicitudFirma: {
        include: {
          documento: true,
          firmas: {
            orderBy: { orden: 'asc' },
          },
        },
      },
      empleado: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          email: true,
        },
      },
    },
  });

  if (!firma) {
    throw new Error('Firma no encontrada');
  }

  if (firma.empleadoId !== empleadoId) {
    throw new Error('Esta firma no pertenece al empleado autenticado');
  }

  if (firma.firmado) {
    throw new Error('Este documento ya ha sido firmado');
  }

  // 2. Validar que la solicitud no esté cancelada
  if (firma.solicitudFirma.estado === 'cancelada') {
    throw new Error('Esta solicitud de firma ha sido cancelada');
  }

  // 3. Si hay orden de firma, validar que sea el turno de este empleado
  if (firma.solicitudFirma.ordenFirma && firma.orden > 0) {
    const firmasAnteriores = firma.solicitudFirma.firmas.filter(
      (f: any) => f.orden < firma.orden && f.orden > 0
    );

    const todasFirmadasAnteriormente = firmasAnteriores.every((f: any) => f.firmado);

    if (!todasFirmadasAnteriormente) {
      throw new Error(
        'Debes esperar a que los firmantes anteriores completen su firma'
      );
    }
  }

  // 4. Validar integridad del documento
  const documentoBuffer = await downloadFromS3(firma.solicitudFirma.documento.s3Key);
  const validacion = validarIntegridadDocumento(
    documentoBuffer,
    firma.solicitudFirma.hashDocumento
  );

  if (!validacion.valida) {
    throw new Error(
      'El documento ha sido modificado desde que se solicitó la firma. No se puede proceder.'
    );
  }

  // 5. Generar certificado de firma
  const certificado = generarCertificadoFirmaSimple({
    solicitudFirmaId: firma.solicitudFirmaId,
    firmaId: firma.id,
    empleadoId: firma.empleadoId,
    empleadoNombre: `${firma.empleado.nombre} ${firma.empleado.apellidos}`,
    empleadoEmail: firma.empleado.email,
    documentoId: firma.solicitudFirma.documentoId,
    documentoNombre: firma.solicitudFirma.nombreDocumento,
    documentoHash: firma.solicitudFirma.hashDocumento,
    datosCapturados,
  });

  // 6. Actualizar firma
  const ahora = new Date();
  const firmaActualizada = await prisma.firma.update({
    where: { id: firmaId },
    data: {
      firmado: true,
      firmadoEn: ahora,
      datosCapturados,
      ipAddress: datosCapturados.ip,
      certificadoHash: certificado.certificadoHash,
    },
  });

  // 7. Verificar si todas las firmas están completadas
  const todasLasFirmas = await prisma.firma.findMany({
    where: { solicitudFirmaId: firma.solicitudFirmaId },
    select: { firmado: true },
  });

  const estadoComplecion = validarComplecionFirmas(todasLasFirmas);

  // 8. Actualizar estado de solicitud si todas firmaron
  if (estadoComplecion.completo) {
    await prisma.solicitudFirma.update({
      where: { id: firma.solicitudFirmaId },
      data: {
        estado: 'completada',
        completadaEn: ahora,
      },
    });

    // Actualizar documento como firmado
    await prisma.documento.update({
      where: { id: firma.solicitudFirma.documentoId },
      data: {
        firmado: true,
        firmadoEn: ahora,
      },
    });

    // 9. Generar PDF firmado con marcas visuales (solo para PDFs)
    try {
      const esPDF = await esPDFValido(documentoBuffer);

      if (esPDF) {
        // Obtener todas las firmas completadas con información de empleados
        const firmasCompletadas = await prisma.firma.findMany({
          where: {
            solicitudFirmaId: firma.solicitudFirmaId,
            firmado: true,
          },
          include: {
            empleado: {
              select: {
                nombre: true,
                apellidos: true,
              },
            },
          },
          orderBy: { firmadoEn: 'asc' }, // Orden cronológico
        });

        // Generar marcas de firma para cada firmante
        const marcas = firmasCompletadas.map((f: any) => ({
          nombreFirmante: `${f.empleado.nombre} ${f.empleado.apellidos}`,
          fechaFirma: f.firmadoEn?.toLocaleString('es-ES', {
            dateStyle: 'short',
            timeStyle: 'short',
          }) || 'N/A',
          tipoFirma: f.tipo,
          certificadoHash: f.certificadoHash,
        }));

        // Aplicar marcas al PDF
        const pdfConMarcas = await anadirMarcasFirmasPDF(documentoBuffer, marcas);

        // Subir PDF firmado a S3
        const extension = firma.solicitudFirma.documento.nombre.split('.').pop() || 'pdf';
        const pdfFirmadoS3Key = `documentos-firmados/${firma.solicitudFirma.empresaId}/${firma.solicitudFirma.id}/firmado.${extension}`;

        await uploadToS3(pdfConMarcas, pdfFirmadoS3Key, 'application/pdf');

        // Actualizar solicitud con ubicación del PDF firmado
        await prisma.solicitudFirma.update({
          where: { id: firma.solicitudFirmaId },
          data: {
            pdfFirmadoS3Key,
          },
        });
      }
    } catch (error) {
      console.error('[firmarDocumento] Error generando PDF firmado:', error);
      // No fallar el proceso de firma si falla la generación del PDF con marcas
      // El usuario aún puede descargar el documento original
    }
  } else {
    // Actualizar estado a 'en_proceso' si es la primera firma
    await prisma.solicitudFirma.update({
      where: { id: firma.solicitudFirmaId },
      data: {
        estado: 'en_proceso',
      },
    });
  }

  return {
    firma: firmaActualizada,
    certificado,
    solicitudCompletada: estadoComplecion.completo,
  };
}

/**
 * Obtiene las firmas pendientes de un empleado
 *
 * @param empleadoId - ID del empleado
 * @param empresaId - ID de la empresa
 * @returns Lista de firmas pendientes
 */
export async function obtenerFirmasPendientes(
  empleadoId: string,
  empresaId: string
) {
  const firmasPendientes = await prisma.firma.findMany({
    where: {
      empleadoId,
      firmado: false,
      solicitudFirma: {
        empresaId,
        estado: {
          in: ['pendiente', 'en_proceso'],
        },
      },
    },
    include: {
      solicitudFirma: {
        include: {
          documento: {
            select: {
              id: true,
              nombre: true,
              tipoDocumento: true,
              s3Key: true,
            },
          },
        },
      },
    },
    orderBy: {
      enviadoEn: 'desc',
    },
  });

  return firmasPendientes;
}

/**
 * Obtiene el estado detallado de una solicitud de firma
 *
 * @param solicitudId - ID de la solicitud
 * @param empresaId - ID de la empresa
 * @returns Estado detallado con progreso de firmantes
 */
export async function obtenerEstadoSolicitud(
  solicitudId: string,
  empresaId: string
): Promise<EstadoSolicitudFirmaDetallado> {
  const solicitud = await prisma.solicitudFirma.findUnique({
    where: { id: solicitudId, empresaId },
    include: {
      documento: {
        select: {
          id: true,
          nombre: true,
        },
      },
      firmas: {
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              email: true,
            },
          },
        },
        orderBy: { orden: 'asc' },
      },
    },
  });

  if (!solicitud) {
    throw new Error('Solicitud de firma no encontrada');
  }

  const estadoComplecion = validarComplecionFirmas(solicitud.firmas);

  const firmasResult: ResultadoFirma[] = solicitud.firmas.map((f: any) => ({
    firmaId: f.id,
    empleadoId: f.empleadoId,
    empleadoNombre: `${f.empleado.nombre} ${f.empleado.apellidos}`,
    firmado: f.firmado,
    firmadoEn: f.firmadoEn ?? undefined,
    certificadoHash: f.certificadoHash ?? undefined,
  }));

  return {
    solicitudId: solicitud.id,
    documentoId: solicitud.documentoId,
    documentoNombre: solicitud.nombreDocumento,
    estado: solicitud.estado as any,
    totalFirmantes: estadoComplecion.total,
    firmantesCompletados: estadoComplecion.firmadas,
    porcentajeCompletado: estadoComplecion.porcentaje,
    firmas: firmasResult,
    creadoPor: solicitud.creadoPor ?? undefined,
    createdAt: solicitud.createdAt,
    completadaEn: solicitud.completadaEn ?? undefined,
    pdfFirmadoS3Key: solicitud.pdfFirmadoS3Key ?? undefined,
  };
}

/**
 * Lista todas las solicitudes de firma de una empresa
 *
 * @param empresaId - ID de la empresa
 * @param filtros - Filtros opcionales
 * @returns Lista de solicitudes
 */
export async function listarSolicitudesFirma(
  empresaId: string,
  filtros?: {
    estado?: string;
    documentoId?: string;
    empleadoId?: string;
  }
) {
  const where: any = { empresaId };

  if (filtros?.estado) {
    where.estado = filtros.estado;
  }

  if (filtros?.documentoId) {
    where.documentoId = filtros.documentoId;
  }

  if (filtros?.empleadoId) {
    where.firmas = {
      some: {
        empleadoId: filtros.empleadoId,
      },
    };
  }

  const solicitudes = await prisma.solicitudFirma.findMany({
    where,
    include: {
      documento: {
        select: {
          id: true,
          nombre: true,
          tipoDocumento: true,
        },
      },
      firmas: {
        select: {
          id: true,
          empleadoId: true,
          firmado: true,
          firmadoEn: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return solicitudes.map((s: any) => {
    const estadoComplecion = validarComplecionFirmas(s.firmas);
    return {
      ...s,
      progreso: {
        total: estadoComplecion.total,
        firmadas: estadoComplecion.firmadas,
        porcentaje: estadoComplecion.porcentaje,
      },
    };
  });
}
