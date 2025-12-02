/**
 * Helpers de base de datos para firma digital
 * Funciones para crear solicitudes, firmar documentos, y consultar estados
 */

import { Prisma } from '@prisma/client';

import {
  anadirMarcasFirmasPDF,
  esPDFValido,
  generarCertificadoFirmaSimple,
  generarHashDocumento,
  validarComplecionFirmas,
  validarIntegridadDocumento,
} from '@/lib/firma-digital';
import { crearNotificacionFirmaCompletada, crearNotificacionFirmaPendiente } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { asJsonValue, JSON_NULL } from '@/lib/prisma/json';
import { downloadFromS3, uploadToS3 } from '@/lib/s3';

import type {
  CrearSolicitudFirmaInput,
  DatosCapturadosFirma,
  EstadoSolicitudFirma,
  EstadoSolicitudFirmaDetallado,
  PosicionFirma,
  ResultadoFirma,
  TipoFirma,
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
 * NOTA: El título se genera automáticamente del nombre del documento si no se proporciona.
 *
 * @example
 * ```ts
 * const solicitud = await crearSolicitudFirma({
 *   documentoId: 'doc-123',
 *   empresaId: 'emp-456',
 *   // titulo es opcional - se usa el nombre del documento
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
    posicionFirma,
  } = input;

  // 1. Obtener documento y generar hash
  const documento = await prisma.documentos.findUnique({
    where: { id: documentoId },
    select: {
      id: true,
      nombre: true,
      s3Key: true,
      empresaId: true,
      mimeType: true,
    },
  });

  if (!documento) {
    throw new Error('Documento no encontrado');
  }

  if (documento.empresaId !== empresaId) {
    throw new Error('El documento no pertenece a esta empresa');
  }

  if (documento.mimeType !== 'application/pdf') {
    throw new Error('Solo se pueden solicitar firmas sobre documentos PDF.');
  }

  // Descargar documento y generar hash
  const documentoBuffer = await downloadFromS3(documento.s3Key);
  const hashDocumento = generarHashDocumento(documentoBuffer);

  // 2. Crear solicitud de firma
  const solicitud = await prisma.solicitudes_firma.create({
    data: {
      empresaId,
      documentoId,
      titulo: titulo ?? documento.nombre, // Usar nombre del documento si no se proporciona título
      mensaje,
      ordenFirma,
      proveedor,
      recordatorioAutomatico,
      diasRecordatorio,
      nombreDocumento: documento.nombre,
      hashDocumento,
      posicionFirma: posicionFirma ? asJsonValue(posicionFirma) : JSON_NULL,
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

  await prisma.firmas.createMany({
    data: firmasData,
  });

  const firmasCreadas = await prisma.firmas.findMany({
    where: { solicitudFirmaId: solicitud.id },
    select: {
      id: true,
      empleadoId: true,
    },
  });

  await Promise.all(
    firmasCreadas.map((firmaPendiente) =>
      crearNotificacionFirmaPendiente(prisma, {
        empresaId,
        empleadoId: firmaPendiente.empleadoId,
        firmaId: firmaPendiente.id,
        solicitudId: solicitud.id,
        documentoId: documento.id,
        documentoNombre: documento.nombre,
      })
    )
  );

  // 4. Actualizar documento para indicar que requiere firma
  await prisma.documentos.update({
    where: { id: documentoId },
    data: {
      requiereFirma: true,
      hashDocumento,
    },
  });

  // 5. Retornar solicitud con firmas
  const solicitudCompleta = await prisma.solicitudes_firma.findUnique({
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
      documentos: {
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
  const firma = await prisma.firmas.findUnique({
    where: { id: firmaId },
    include: {
      solicitudes_firma: {
        include: {
          documentos: true,
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
  if (firma.solicitudes_firma.estado === 'cancelada') {
    throw new Error('Esta solicitud de firma ha sido cancelada');
  }

  // 3. Si hay orden de firma, validar que sea el turno de este empleado
  if (firma.solicitudes_firma.ordenFirma && firma.orden > 0) {
    const firmasAnteriores = firma.solicitudes_firma.firmas.filter(
      (f) => f.orden < firma.orden && f.orden > 0
    );

    const todasFirmadasAnteriormente = firmasAnteriores.every((f) => f.firmado);

    if (!todasFirmadasAnteriormente) {
      throw new Error(
        'Debes esperar a que los firmantes anteriores completen su firma'
      );
    }
  }

  if (firma.solicitudes_firma.documentos.mimeType !== 'application/pdf') {
    throw new Error('Solo se pueden firmar documentos PDF generados desde plantillas.');
  }

  // 4. Validar integridad del documento
  const documentoBuffer = await downloadFromS3(firma.solicitudes_firma.documentos.s3Key);
  const validacion = validarIntegridadDocumento(
    documentoBuffer,
    firma.solicitudes_firma.hashDocumento
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
    documentoId: firma.solicitudes_firma.documentoId,
    documentoNombre: firma.solicitudes_firma.nombreDocumento,
    documentoHash: firma.solicitudes_firma.hashDocumento,
    datosCapturados,
  });

  // 6. Actualizar firma
  const ahora = new Date();
  const firmaActualizada = await prisma.firmas.update({
    where: { id: firmaId },
    data: {
      firmado: true,
      firmadoEn: ahora,
      datosCapturados: asJsonValue(datosCapturados),
      ipAddress: datosCapturados.ip,
      certificadoHash: certificado.certificadoHash,
      metodoCaptura: datosCapturados.tipo,
      metodoFirma: datosCapturados.tipo,
    },
  });

  // 7. Verificar si todas las firmas están completadas
  const todasLasFirmas = await prisma.firmas.findMany({
    where: { solicitudFirmaId: firma.solicitudFirmaId },
    select: { firmado: true },
  });

  const estadoComplecion = validarComplecionFirmas(todasLasFirmas);

  // 8. Actualizar estado de solicitud si todas firmaron
  if (estadoComplecion.completo) {
    await prisma.solicitudes_firma.update({
      where: { id: firma.solicitudFirmaId },
      data: {
        estado: 'completada',
        completadaEn: ahora,
      },
    });

    // Actualizar documento como firmado
    await prisma.documentos.update({
      where: { id: firma.solicitudes_firma.documentoId },
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
        const firmasCompletadas = await prisma.firmas.findMany({
          where: {
            solicitudFirmaId: firma.solicitudFirmaId,
            firmado: true,
          },
          select: {
            firmadoEn: true,
            tipo: true,
            certificadoHash: true,
            datosCapturados: true,
            empleado: {
              select: {
                nombre: true,
                apellidos: true,
              },
            },
          },
          orderBy: { firmadoEn: 'asc' },
        });

        // Generar marcas de firma para cada firmante (incluyendo imagen manuscrita si existe)
        // NO usamos posicionBase - dejamos que anadirMarcasFirmasPDF calcule automáticamente
        // las posiciones para apilar las firmas correctamente
        
        const marcas = await Promise.all(
          firmasCompletadas.map(async (f) => {
            const capturados = (f.datosCapturados as DatosCapturadosFirma | null) ?? null;
            let firmaImagenBuffer: Buffer | undefined;
            const firmaImagenWidth = capturados?.firmaImagenWidth;
            const firmaImagenHeight = capturados?.firmaImagenHeight;
            const firmaImagenContentType = capturados?.firmaImagenContentType;

            const firmaImagenKey = capturados?.firmaImagenS3Key || capturados?.firmaGuardadaS3Key;
            if (firmaImagenKey) {
              try {
                firmaImagenBuffer = await downloadFromS3(firmaImagenKey);
              } catch (error) {
                console.error('[firmarDocumento] No se pudo descargar imagen de firma:', error);
              }
            }

            return {
              nombreFirmante: `${f.empleado.nombre} ${f.empleado.apellidos}`,
              fechaFirma:
                f.firmadoEn?.toLocaleString('es-ES', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }) || 'N/A',
              tipoFirma: f.tipo as TipoFirma,
              certificadoHash: f.certificadoHash ?? undefined,
              // No especificamos posición - anadirMarcasFirmasPDF las calculará automáticamente
              posicion: undefined,
              firmaImagen: firmaImagenBuffer
                ? {
                    buffer: firmaImagenBuffer,
                    width: firmaImagenWidth ?? 180,
                    height: firmaImagenHeight ?? 60,
                    contentType: firmaImagenContentType,
                  }
                : undefined,
            };
          })
        );

        // Aplicar marcas al PDF
        const pdfConMarcas = await anadirMarcasFirmasPDF(documentoBuffer, marcas);

        // Subir PDF firmado a S3
        const extension = firma.solicitudes_firma.documentos.nombre.split('.').pop() || 'pdf';
        const pdfFirmadoS3Key = `documentos-firmados/${firma.solicitudes_firma.empresaId}/${firma.solicitudes_firma.id}/firmado.${extension}`;

        await uploadToS3(pdfConMarcas, pdfFirmadoS3Key, 'application/pdf');

        // Actualizar solicitud con ubicación del PDF firmado
        const solicitudActualizada = await prisma.solicitudes_firma.update({
          where: { id: firma.solicitudFirmaId },
          data: {
            pdfFirmadoS3Key,
          },
        });

        // Crear nuevo documento con el PDF firmado
        const documentoOriginal = firma.solicitudes_firma.documentos;
        const nombreDocumentoFirmado = documentoOriginal.nombre.replace(/\.pdf$/i, '_firmado.pdf');

        // Crear documento firmado global (mantiene el empleadoId del original si existe)
        const nuevoDocumentoFirmado = await prisma.documentos.create({
          data: {
            empresaId: documentoOriginal.empresaId,
            empleadoId: documentoOriginal.empleadoId,
            carpetaId: documentoOriginal.carpetaId,
            nombre: nombreDocumentoFirmado,
            tipoDocumento: documentoOriginal.tipoDocumento,
            mimeType: 'application/pdf',
            tamano: pdfConMarcas.length,
            s3Key: pdfFirmadoS3Key,
            s3Bucket: documentoOriginal.s3Bucket,
            firmado: true,
            firmadoEn: ahora,
            generadoDesdePlantilla: documentoOriginal.generadoDesdePlantilla,
            hashDocumento: generarHashDocumento(pdfConMarcas),
          },
        });

        // Si el documento original NO tenía empleado asignado (era global),
        // crear copias individuales del documento firmado para cada firmante
        if (!documentoOriginal.empleadoId && firmasCompletadas.length > 0) {
          // Obtener empleados de las firmas
          const firmasConEmpleado = await prisma.firmas.findMany({
            where: {
              solicitudFirmaId: firma.solicitudFirmaId,
              firmado: true,
            },
            select: {
              empleadoId: true,
              empleado: {
                select: {
                  id: true,
                  nombre: true,
                  apellidos: true,
                },
              },
            },
          });

          // Crear una copia individual para cada empleado que firmó
          for (const firmaConEmpleado of firmasConEmpleado) {
            // Buscar carpeta individual del empleado del mismo tipo
            const carpetaIndividual = await prisma.carpetas.findFirst({
              where: {
                empresaId: documentoOriginal.empresaId,
                empleadoId: firmaConEmpleado.empleadoId,
                nombre: documentoOriginal.tipoDocumento,
                esSistema: true,
              },
            });

            // Si no existe carpeta individual, usar la misma carpeta del documento original
            const carpetaIdDestino = carpetaIndividual?.id || documentoOriginal.carpetaId;

            // Crear documento individual asignado al empleado
            await prisma.documentos.create({
              data: {
                empresaId: documentoOriginal.empresaId,
                empleadoId: firmaConEmpleado.empleadoId,
                carpetaId: carpetaIdDestino,
                nombre: nombreDocumentoFirmado,
                tipoDocumento: documentoOriginal.tipoDocumento,
                mimeType: 'application/pdf',
                tamano: pdfConMarcas.length,
                s3Key: pdfFirmadoS3Key, // Mismo S3Key - documento compartido
                s3Bucket: documentoOriginal.s3Bucket,
                firmado: true,
                firmadoEn: ahora,
                generadoDesdePlantilla: documentoOriginal.generadoDesdePlantilla,
                hashDocumento: generarHashDocumento(pdfConMarcas),
              },
            });
          }
        }

        // Si el documento original fue generado desde plantilla, actualizar la referencia
        const docGenerado = await prisma.documentosGenerado.findUnique({
          where: { documentoId: documentoOriginal.id },
        });

        if (docGenerado) {
          await prisma.documentosGenerado.update({
            where: { documentoId: documentoOriginal.id },
            data: {
              firmado: true,
              firmadoEn: ahora,
            },
          });
        }

        await crearNotificacionFirmaCompletada(prisma, {
          empresaId: solicitudActualizada.empresaId,
          solicitudId: solicitudActualizada.id,
          documentoId: nuevoDocumentoFirmado.id,
          documentoNombre: nombreDocumentoFirmado,
          usuarioDestinoId: solicitudActualizada.creadoPor,
          pdfFirmadoS3Key,
        });
      }
    } catch (error) {
      console.error('[firmarDocumento] Error generando PDF firmado:', error);
      // No fallar el proceso de firma si falla la generación del PDF con marcas
      // El usuario aún puede descargar el documento original
    }
  } else {
    // Actualizar estado a 'en_proceso' si es la primera firma
    await prisma.solicitudes_firma.update({
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
  const firmasPendientes = await prisma.firmas.findMany({
    where: {
      empleadoId,
      firmado: false,
      solicitudes_firma: {
        empresaId,
        estado: {
          in: ['pendiente', 'en_proceso'],
        },
      },
    },
    include: {
      solicitudes_firma: {
        include: {
          documentos: {
            select: {
              id: true,
              nombre: true,
              tipoDocumento: true,
              s3Key: true,
              carpetaId: true,
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
  const solicitud = await prisma.solicitudes_firma.findUnique({
    where: { id: solicitudId, empresaId },
    include: {
      documentos: {
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

  const firmasResult: ResultadoFirma[] = solicitud.firmas.map((f) => ({
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
    estado: solicitud.estado as EstadoSolicitudFirma,
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
  const where: Prisma.solicitudes_firmaWhereInput = { empresaId };

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

  const solicitudes = await prisma.solicitudes_firma.findMany({
    where,
    include: {
      documentos: {
        select: {
          id: true,
          nombre: true,
          tipoDocumento: true,
          carpetaId: true,
        },
      },
      firmas: {
        select: {
          id: true,
          orden: true,
          firmado: true,
          firmadoEn: true,
          empleado: {
            select: {
              nombre: true,
              apellidos: true,
              email: true,
            },
          },
        },
        orderBy: {
          orden: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return solicitudes.map((s) => {
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
