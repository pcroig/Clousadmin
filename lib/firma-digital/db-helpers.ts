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
  metadataAPosicionPDF,
  type PosicionFirma,
  type PosicionFirmaConMetadata,
  validarComplecionFirmas,
  validarIntegridadDocumento,
} from '@/lib/firma-digital';
import { convertirWordAPDF, esDocumentoWord } from '@/lib/documentos/convertir-word';
import { crearNotificacionFirmaCompletada, crearNotificacionFirmaPendiente } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { asJsonValue, JSON_NULL } from '@/lib/prisma/json';
import { downloadFromS3, uploadToS3 } from '@/lib/s3';

import type {
  CrearSolicitudFirmaInput,
  DatosCapturadosFirma,
  EstadoSolicitudFirma,
  EstadoSolicitudFirmaDetallado,
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
    posicionesFirma, // NUEVO: Array de posiciones
    posicionFirma,   // LEGACY: Retrocompatibilidad
    mantenerOriginal = true, // NUEVO: Por defecto mantiene el original
    incluirFirmaEmpresa = true, // NUEVO: Por defecto incluye firma de empresa
    posicionesFirmaEmpresa, // NUEVO: Array de posiciones específicas para firma de empresa
    firmaEmpresaSolicitudS3Key, // NUEVO: S3 key de firma empresa para esta solicitud
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

  // Verificar si es PDF o Word (convertible)
  const esPDF = documento.mimeType === 'application/pdf';
  const esWord = esDocumentoWord(documento.mimeType);

  if (!esPDF && !esWord) {
    throw new Error('Solo se pueden solicitar firmas sobre documentos PDF o Word (.docx)');
  }

  // Descargar documento original
  let documentoBuffer = await downloadFromS3(documento.s3Key);

  // Si es Word, convertir a PDF automáticamente
  let documentoParaFirma = documentoBuffer;
  let s3KeyParaFirma = documento.s3Key;

  if (esWord) {
    console.log('[crearSolicitudFirma] Convirtiendo Word a PDF:', documento.nombre);
    try {
      documentoParaFirma = await convertirWordAPDF(documentoBuffer);

      // Guardar PDF convertido temporalmente en S3
      const nombrePDF = documento.nombre.replace(/\.(docx?|DOCX?)$/i, '.pdf');
      s3KeyParaFirma = `temp-firmas/${empresaId}/${Date.now()}-${nombrePDF}`;
      await uploadToS3(documentoParaFirma, s3KeyParaFirma, 'application/pdf');

      console.log('[crearSolicitudFirma] PDF generado:', s3KeyParaFirma);
    } catch (error) {
      console.error('[crearSolicitudFirma] Error al convertir Word:', error);
      throw new Error('No se pudo convertir el documento Word a PDF. LibreOffice no está disponible.');
    }
  }

  // Generar hash del documento (PDF original o convertido)
  const hashDocumento = generarHashDocumento(documentoParaFirma);

  // 2. Crear solicitud de firma
  // Determinar qué guardar en posicionFirma (campo JSON)
  let posicionFirmaJson: any = JSON_NULL;
  if (posicionesFirma && posicionesFirma.length > 0) {
    // NUEVO: Guardar array de posiciones
    posicionFirmaJson = asJsonValue({ multiple: true, posiciones: posicionesFirma });
  } else if (posicionFirma) {
    // LEGACY: Guardar single position (retrocompatibilidad)
    posicionFirmaJson = asJsonValue(posicionFirma);
  }

  // Guardar posiciones de firma de empresa si se proporcionaron
  let posicionesFirmaEmpresaJson: any = JSON_NULL;
  if (posicionesFirmaEmpresa && posicionesFirmaEmpresa.length > 0) {
    posicionesFirmaEmpresaJson = asJsonValue(posicionesFirmaEmpresa);
  }

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
      posicionFirma: posicionFirmaJson,
      estado: 'pendiente',
      creadoPor,
      mantenerOriginal, // NUEVO: Guardar preferencia de mantener original
      incluirFirmaEmpresa, // NUEVO: Guardar preferencia de incluir firma empresa
      posicionesFirmaEmpresa: posicionesFirmaEmpresaJson, // NUEVO: Guardar posiciones específicas de firma empresa
      firmaEmpresaS3Key: firmaEmpresaSolicitudS3Key, // NUEVO: Guardar S3 key de firma empresa para esta solicitud
      pdfTemporalS3Key: esWord ? s3KeyParaFirma : null, // NUEVO: Guardar referencia al PDF temporal convertido
    },
  });

  // 2.5. NUEVO: Aplicar firma de empresa al PDF ANTES de crear las firmas de empleados
  let documentoConFirmaEmpresa = documentoParaFirma;
  let s3KeyConFirmaEmpresa = s3KeyParaFirma;

  if (incluirFirmaEmpresa && firmaEmpresaSolicitudS3Key && posicionesFirmaEmpresa && posicionesFirmaEmpresa.length > 0) {
    try {
      console.log('[crearSolicitudFirma] Añadiendo firma de empresa al documento base...');

      const firmaEmpresaBuffer = await downloadFromS3(firmaEmpresaSolicitudS3Key);

      // Obtener nombre de la empresa
      const empresa = await prisma.empresas.findUnique({
        where: { id: empresaId },
        select: { nombre: true },
      });

      if (empresa) {
        // Crear marcas de firma para cada posición de firma empresa
        const ahora = new Date();
        const marcasFirmaEmpresa = posicionesFirmaEmpresa.map((posicion) => ({
          nombreFirmante: empresa.nombre,
          fechaFirma: ahora.toLocaleString('es-ES', {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
          tipoFirma: 'simple' as TipoFirma,
          certificadoHash: undefined,
          posicion,
          firmaImagen: {
            buffer: firmaEmpresaBuffer,
            width: 180,
            height: 60,
            contentType: 'image/png' as const,
          },
        }));

        // Aplicar firma de empresa al documento
        documentoConFirmaEmpresa = await anadirMarcasFirmasPDF(documentoParaFirma, marcasFirmaEmpresa);

        // Guardar PDF con firma empresa en S3
        s3KeyConFirmaEmpresa = `temp-firmas/${empresaId}/${Date.now()}-con-firma-empresa.pdf`;
        await uploadToS3(documentoConFirmaEmpresa, s3KeyConFirmaEmpresa, 'application/pdf');

        console.log(`[crearSolicitudFirma] PDF con firma de empresa guardado: ${s3KeyConFirmaEmpresa}`);

        // CRÍTICO: Recalcular hash del documento CON firma empresa
        const hashDocumentoConFirmaEmpresa = generarHashDocumento(documentoConFirmaEmpresa);

        // Actualizar la solicitud con el S3 key del PDF con firma empresa Y el nuevo hash
        await prisma.solicitudes_firma.update({
          where: { id: solicitud.id },
          data: {
            pdfTemporalS3Key: s3KeyConFirmaEmpresa, // Este PDF tiene la firma empresa
            hashDocumento: hashDocumentoConFirmaEmpresa, // Hash del PDF CON firma empresa
          },
        });

        console.log('[crearSolicitudFirma] Hash actualizado para documento con firma empresa');
      }
    } catch (error) {
      console.error('[crearSolicitudFirma] Error aplicando firma de empresa:', error);
      // Continuar sin firma de empresa en caso de error
    }
  }

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

  // 4. NO actualizar el documento original - debe permanecer limpio
  // El proceso de firma se monitoriza a través de solicitudes_firma y firmas
  // Solo los documentos firmados generados al completar tendrán firmado: true

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

  // Validar que el documento sea PDF o Word (Word se convierte automáticamente a PDF)
  const mimeType = firma.solicitudes_firma.documentos.mimeType;
  const esPDF = mimeType === 'application/pdf';
  const esWord = esDocumentoWord(mimeType);

  if (!esPDF && !esWord) {
    throw new Error('Solo se pueden firmar documentos PDF y Word.');
  }

  // 4. Validar integridad del documento
  // Si existe pdfTemporalS3Key (documento Word convertido), usar ese PDF
  // De lo contrario, usar el documento original
  const s3KeyParaValidar = firma.solicitudes_firma.pdfTemporalS3Key ?? firma.solicitudes_firma.documentos.s3Key;
  let documentoBuffer = await downloadFromS3(s3KeyParaValidar);

  // Si no había PDF temporal pero el documento es Word, convertirlo ahora
  // (esto solo pasaría con solicitudes antiguas creadas antes de este cambio)
  if (!firma.solicitudes_firma.pdfTemporalS3Key && esWord) {
    console.log('[firmarDocumento] Convirtiendo Word a PDF (legacy)');
    try {
      documentoBuffer = await convertirWordAPDF(documentoBuffer);
    } catch (error) {
      console.error('[firmarDocumento] Error al convertir Word para validación:', error);
      throw new Error('No se pudo convertir el documento Word a PDF para validación.');
    }
  }

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

  // Variable para guardar el primer documento firmado (para notificaciones y respuesta)
  let primerDocumentoFirmado: { id: string; nombre: string } | null = null;

  // 8. Actualizar estado de solicitud si todas firmaron
  if (estadoComplecion.completo) {
    await prisma.solicitudes_firma.update({
      where: { id: firma.solicitudFirmaId },
      data: {
        estado: 'completada',
        completadaEn: ahora,
      },
    });

    // NO actualizar el documento original - debe permanecer limpio
    // El documento original no se marca como firmado
    // Solo los nuevos documentos generados (copias firmadas) tendrán firmado: true

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

        // Obtener posiciones guardadas de la solicitud (puede ser array o single)
        let posicionesBase: PosicionFirma[] = [];
        if (firma.solicitudes_firma.posicionFirma) {
          try {
            const posicionData = firma.solicitudes_firma.posicionFirma as Record<string, unknown>;

            // Detectar si es el nuevo formato múltiple
            if (posicionData.multiple === true && Array.isArray(posicionData.posiciones)) {
              // NUEVO: Array de posiciones
              posicionesBase = posicionData.posiciones as PosicionFirma[];
            } else {
              // LEGACY: Single position (v1 o v2)
              const posicionSingle = await metadataAPosicionPDF(
                posicionData as unknown as PosicionFirmaConMetadata | PosicionFirma,
                documentoBuffer
              );
              if (posicionSingle) {
                posicionesBase = [posicionSingle];
              }
            }

            // Log solo en desarrollo
            if (process.env.NODE_ENV === 'development') {
              console.log('[firmarDocumento] Posiciones convertidas:', posicionesBase.length);
            }
          } catch (error) {
            console.error('[firmarDocumento] Error convirtiendo posiciones:', error);
            // Si falla la conversión, seguir sin posiciones (se usará la por defecto)
          }
        }

        // Generar marcas de firma para cada firmante (incluyendo imagen manuscrita si existe)
        // NUEVO: Si hay múltiples posiciones, cada firmante usa su posición correspondiente
        // Si hay menos posiciones que firmantes, se repite la última posición

        const marcas = await Promise.all(
          firmasCompletadas.map(async (f, index) => {
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

            // Determinar posición para este firmante
            // Si hay posiciones definidas, usar la del índice o la última si no hay suficientes
            let posicionParaEsteFirmante: PosicionFirma | undefined;
            if (posicionesBase.length > 0) {
              posicionParaEsteFirmante = posicionesBase[Math.min(index, posicionesBase.length - 1)];
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
              // Usar la posición específica para este firmante
              posicion: posicionParaEsteFirmante,
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

        // NOTA: La firma de empresa ya está aplicada en el documento base (pdfTemporalS3Key)
        // No es necesario añadirla aquí, ya que se aplicó al crear la solicitud

        // Aplicar marcas al PDF
        const pdfConMarcas = await anadirMarcasFirmasPDF(documentoBuffer, marcas);

        // Subir PDF firmado a S3
        // IMPORTANTE: Siempre usar .pdf porque pdfConMarcas es un PDF (incluso si el original era Word)
        const pdfFirmadoS3Key = `documentos-firmados/${firma.solicitudes_firma.empresaId}/${firma.solicitudes_firma.id}/firmado.pdf`;

        await uploadToS3(pdfConMarcas, pdfFirmadoS3Key, 'application/pdf');

        // Actualizar solicitud con ubicación del PDF firmado
        const solicitudActualizada = await prisma.solicitudes_firma.update({
          where: { id: firma.solicitudFirmaId },
          data: {
            pdfFirmadoS3Key,
          },
        });

        // Crear documentos firmados individuales para cada empleado que firmó
        const documentoOriginal = firma.solicitudes_firma.documentos;
        // Eliminar CUALQUIER extensión del nombre original (.pdf, .docx, .doc, etc.)
        const nombreBase = documentoOriginal.nombre.replace(/\.[^.]+$/, '');

        // Verificar si se debe mantener el original o reemplazarlo
        const mantenerOriginal = firma.solicitudes_firma.mantenerOriginal ?? true;

        if (!mantenerOriginal) {
          // MODO: Reemplazar documento original con versión firmada
          await prisma.documentos.update({
            where: { id: documentoOriginal.id },
            data: {
              s3Key: pdfFirmadoS3Key,
              mimeType: 'application/pdf',
              tamano: pdfConMarcas.length,
              firmado: true,
              firmadoEn: ahora,
              hashDocumento: generarHashDocumento(pdfConMarcas),
            },
          });

          primerDocumentoFirmado = {
            id: documentoOriginal.id,
            nombre: documentoOriginal.nombre,
          };
        } else {
          // MODO: Mantener original y crear copias individuales para cada empleado
          // Obtener todos los empleados que firmaron
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

          // Crear copias individuales para cada empleado que firmó
          for (const firmaConEmpleado of firmasConEmpleado) {
          // Generar nombre personalizado: "Nombre original - Nombre Empleado (firma).pdf"
          const nombreEmpleado = `${firmaConEmpleado.empleado.nombre} ${firmaConEmpleado.empleado.apellidos}`;
          const nombreDocumentoFirmado = `${nombreBase} - ${nombreEmpleado} (firma).pdf`;

          // Buscar carpeta individual del empleado del mismo tipo
          const carpetaIndividual = await prisma.carpetas.findFirst({
            where: {
              empresaId: documentoOriginal.empresaId,
              empleadoId: firmaConEmpleado.empleadoId,
              nombre: documentoOriginal.tipoDocumento,
              esSistema: true,
            },
          });

          // Determinar carpeta destino: individual si existe, sino obtener del documento original
          const carpetaIdDestino = carpetaIndividual?.id || (
            await (async () => {
              const docOriginalCarpeta = await prisma.documento_carpetas.findFirst({
                where: { documentoId: documentoOriginal.id },
                select: { carpetaId: true },
              });
              return docOriginalCarpeta?.carpetaId;
            })()
          );

          // Crear documento individual asignado al empleado
          const documentoCreado = await prisma.documentos.create({
            data: {
              empresaId: documentoOriginal.empresaId,
              empleadoId: firmaConEmpleado.empleadoId,
              nombre: nombreDocumentoFirmado,
              tipoDocumento: documentoOriginal.tipoDocumento,
              mimeType: 'application/pdf',
              tamano: pdfConMarcas.length,
              s3Key: pdfFirmadoS3Key, // Mismo S3Key - documento compartido en S3
              s3Bucket: documentoOriginal.s3Bucket,
              firmado: true,
              firmadoEn: ahora,
              generadoDesdePlantilla: documentoOriginal.generadoDesdePlantilla,
              hashDocumento: generarHashDocumento(pdfConMarcas),
            },
          });

          // Asociar a carpeta usando tabla intermedia
          if (carpetaIdDestino) {
            await prisma.documento_carpetas.create({
              data: {
                documentoId: documentoCreado.id,
                carpetaId: carpetaIdDestino,
              },
            });
          }

          // Guardar el primer documento para notificaciones
          if (!primerDocumentoFirmado) {
            primerDocumentoFirmado = {
              id: documentoCreado.id,
              nombre: documentoCreado.nombre,
            };
          }
        }

          // Si no se creó ningún documento (no había firmantes), crear uno genérico
          if (!primerDocumentoFirmado) {
            primerDocumentoFirmado = await (async () => {
          const nombreGenerico = `${nombreBase} (firmado).pdf`;

          // Obtener carpeta del documento original
          const carpetaOriginal = await prisma.documento_carpetas.findFirst({
            where: { documentoId: documentoOriginal.id },
            select: { carpetaId: true },
          });

          const doc = await prisma.documentos.create({
            data: {
              empresaId: documentoOriginal.empresaId,
              empleadoId: documentoOriginal.empleadoId,
              nombre: nombreGenerico,
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

          // Asociar a carpeta usando tabla intermedia
          if (carpetaOriginal?.carpetaId) {
            await prisma.documento_carpetas.create({
              data: {
                documentoId: doc.id,
                carpetaId: carpetaOriginal.carpetaId,
              },
            });
          }

          return { id: doc.id, nombre: doc.nombre };
            })();
          }
        }

        // Variable para notificaciones (usar el documento creado o el original reemplazado)
        const nuevoDocumentoFirmado = primerDocumentoFirmado!;

        // Si el documento original fue generado desde plantilla, actualizar la referencia
        // SOLO si se reemplazó el original (mantenerOriginal = false)
        // Si se mantiene el original, NO marcarlo como firmado
        if (!mantenerOriginal) {
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
        }

        await crearNotificacionFirmaCompletada(prisma, {
          empresaId: solicitudActualizada.empresaId,
          solicitudId: solicitudActualizada.id,
          documentoId: nuevoDocumentoFirmado.id,
          documentoNombre: nuevoDocumentoFirmado.nombre,
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
    // Devolver información del documento firmado cuando todas las firmas están completas
    documentoFirmado: estadoComplecion.completo && primerDocumentoFirmado ? {
      id: primerDocumentoFirmado.id,
      nombre: primerDocumentoFirmado.nombre,
    } : undefined,
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
              documento_carpetas: {
                include: {
                  carpeta: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },
                },
                take: 1,
              },
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
          documento_carpetas: {
            include: {
              carpeta: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
            take: 1,
          },
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
