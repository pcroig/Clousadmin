/**
 * Generación de documentos DOCX desde plantillas usando docxtemplater
 */

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

import {
  crearNotificacionDocumentoGeneradoEmpleado,
  crearNotificacionDocumentoPendienteRellenar,
  crearNotificacionFirmaPendiente,
} from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { descargarDocumento, subirDocumento } from '@/lib/s3';

import { convertDocxFromS3ToPdf } from './docx-to-pdf';
import { resolverVariables } from './ia-resolver';
import { extraerVariablesDeTexto, sanitizarNombreArchivo } from './sanitizar';
import { ConfiguracionGeneracion, DatosEmpleado, ResultadoGeneracion } from './tipos';




const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Extraer variables de una plantilla DOCX
 */
export async function extraerVariablesDePlantilla(s3Key: string): Promise<string[]> {
  try {
    // Descargar plantilla desde S3
    const buffer = await descargarDocumento(s3Key);

    // Cargar ZIP
    const zip = new PizZip(buffer);

    // Leer document.xml (contiene el texto principal)
    const documentXml = zip.file('word/document.xml')?.asText();
    if (!documentXml) {
      throw new Error('No se pudo leer document.xml de la plantilla');
    }

    // Extraer variables {{variable_nombre}}
    const variables = extraerVariablesDeTexto(documentXml);

    // También revisar headers y footers (JSZip no siempre expone forEach en folder)
    const headersFooters: string[] = [];
    Object.keys(zip.files).forEach((path) => {
      if (!path.startsWith('word/')) return;

      const relativePath = path.replace('word/', '');
      if (relativePath.startsWith('header') || relativePath.startsWith('footer')) {
        const file = zip.file(path);
        if (file) {
          const content = file.asText();
          headersFooters.push(...extraerVariablesDeTexto(content));
        }
      }
    });

    // Combinar todas las variables únicas
    const todasVariables = [...new Set([...variables, ...headersFooters])];

    return todasVariables.sort();
  } catch (error) {
    console.error('[Plantilla] Error al extraer variables:', error);
    throw new Error(`Error al extraer variables: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Generar nombre de documento desde plantilla
 * Ejemplo: "Contrato_{{empleado_apellidos}}_{{fecha}}" → "Contrato_Garcia_Lopez_2024-11-13"
 */
async function generarNombreDocumento(
  plantilla: string,
  empleadoData: DatosEmpleado
): Promise<string> {
  // Extraer variables del nombre
  const variables = extraerVariablesDeTexto(plantilla);

  if (variables.length === 0) {
    // No hay variables, usar nombre tal cual
    return sanitizarNombreArchivo(plantilla);
  }

  // Resolver variables
  const valores = await resolverVariables(variables, empleadoData);

  // Reemplazar variables en el nombre
  let nombre = plantilla;
  for (const variable of variables) {
    nombre = nombre.replace(`{{${variable}}}`, valores[variable] || '');
  }

  // Sanitizar el nombre final
  return sanitizarNombreArchivo(nombre);
}

/**
 * Generar documento desde plantilla DOCX
 */
export async function generarDocumentoDesdePlantilla(
  plantillaId: string,
  empleadoId: string,
  configuracion: ConfiguracionGeneracion,
  solicitadoPor: string
): Promise<ResultadoGeneracion> {
  const inicio = Date.now();

  try {
    // 1. Obtener plantilla
    const plantilla = await prisma.plantillaDocumento.findUnique({
      where: { id: plantillaId },
      select: {
        id: true,
        nombre: true,
        s3Key: true,
        s3Bucket: true,
        formato: true,
        carpetaDestinoDefault: true,
        requiereFirma: true,
        permiteRellenar: true,
        empresaId: true,
        variablesUsadas: true,
      },
    });

    if (!plantilla) {
      throw new Error('Plantilla no encontrada');
    }

    if (plantilla.formato !== 'docx') {
      throw new Error('Solo se soportan plantillas DOCX en esta función');
    }

    // 2. Obtener datos completos del empleado
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            cif: true,
            email: true,
            telefono: true,
            direccion: true,
            web: true,
          },
        },
        jornada: {
          select: {
            nombre: true,
            horasSemanales: true,
          },
        },
        manager: {
          select: {
            nombre: true,
            apellidos: true,
            email: true,
          },
        },
        puestoRelacion: {
          select: {
            nombre: true,
            descripcion: true,
          },
        },
        contratos: {
          orderBy: { fechaInicio: 'desc' },
          take: 1,
          select: {
            id: true,
            tipoContrato: true,
            fechaInicio: true,
            fechaFin: true,
            salarioBrutoAnual: true,
          },
        },
        ausencias: {
          orderBy: { fechaInicio: 'desc' },
          take: 1,
          select: {
            id: true,
            tipo: true,
            fechaInicio: true,
            fechaFin: true,
            diasSolicitados: true,
            estado: true,
          },
        },
      },
    });

    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    // 3. Descargar plantilla desde S3
    console.log(`[Generar] Descargando plantilla: ${plantilla.s3Key}`);
    const plantillaBuffer = await descargarDocumento(plantilla.s3Key);

    // 4. Extraer variables de la plantilla
    const variablesEnPlantilla = await extraerVariablesDePlantilla(plantilla.s3Key);
    console.log(`[Generar] Variables encontradas: ${variablesEnPlantilla.length}`);

    // 5. Resolver todas las variables usando el sistema de IA
    // Obtener salario del contrato más reciente
    const contratoActual = empleado.contratos?.[0];
    const salarioBrutoAnual = contratoActual?.salarioBrutoAnual
      ? Number(contratoActual.salarioBrutoAnual)
      : undefined;
    const salarioBrutoMensual = salarioBrutoAnual
      ? Math.round((salarioBrutoAnual / 12) * 100) / 100
      : undefined;

    const empleadoData: DatosEmpleado = {
      ...empleado,
      salarioBrutoAnual,
      salarioBrutoMensual,
      empresa: empleado.empresa,
    };

    console.log(`[Generar] Resolviendo ${variablesEnPlantilla.length} variables con IA...`);
    const valoresVariables = await resolverVariables(variablesEnPlantilla, empleadoData);

    // 6. Generar documento con docxtemplater
    console.log('[Generar] Generando documento con docxtemplater...');
    const zip = new PizZip(plantillaBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}',
      },
    });

    // Renderizar con valores
    doc.render(valoresVariables);

    // Obtener buffer del documento generado
    const documentoBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // 7. Generar nombre del documento
    const nombrePlantilla = configuracion.nombreDocumento || `${plantilla.nombre}_{{empleado_apellidos}}`;
    const nombreDocumento = await generarNombreDocumento(nombrePlantilla, empleadoData);
    const nombreDocumentoFinal = nombreDocumento.endsWith('.docx')
      ? nombreDocumento
      : `${nombreDocumento}.docx`;
    const nombreDocumentoPdf = nombreDocumentoFinal.replace(/\.docx$/i, '.pdf');

    console.log(`[Generar] Nombre del documento: ${nombreDocumentoFinal}`);

    // 8. Subir a S3
    const carpetaDestino =
      configuracion.carpetaDestino || plantilla.carpetaDestinoDefault || 'Otros';
    const s3Key = `documentos/${empleado.empresaId}/${empleadoId}/${carpetaDestino}/${nombreDocumentoFinal}`;

    await subirDocumento(documentoBuffer, s3Key, DOCX_MIME_TYPE);

    console.log(`[Generar] Documento subido a S3: ${s3Key}`);

    // 9. Convertir DOCX a PDF oficial
    const { pdfS3Key, pdfSize } = await convertDocxFromS3ToPdf(s3Key);
    console.log(`[Generar] PDF generado a partir de DOCX: ${pdfS3Key}`);

    // 9. Buscar o crear carpeta destino
    let carpeta = await prisma.carpeta.findFirst({
      where: {
        empleadoId: empleadoId,
        nombre: carpetaDestino,
        empresaId: empleado.empresaId,
      },
    });

    if (!carpeta) {
      // Crear carpeta si no existe
      carpeta = await prisma.carpeta.create({
        data: {
          empresaId: empleado.empresaId,
          empleadoId: empleadoId,
          nombre: carpetaDestino,
          esSistema: false,
        },
      });
      console.log(`[Generar] Carpeta creada: ${carpetaDestino}`);
    }

    // 10. Crear registro de Documento (siempre PDF)
    const documento = await prisma.documento.create({
      data: {
        empresaId: empleado.empresaId,
        empleadoId: empleadoId,
        carpetaId: carpeta.id,
        nombre: nombreDocumentoPdf,
        tipoDocumento: 'generado',
        mimeType: 'application/pdf',
        tamano: pdfSize,
        s3Key: pdfS3Key,
        s3Bucket: process.env.STORAGE_BUCKET || 'clousadmin-documents',
        requiereFirma: configuracion.requiereFirma || plantilla.requiereFirma,
        datosExtraidos: {
          origenDocx: {
            nombre: nombreDocumentoFinal,
            s3Key,
            mimeType: DOCX_MIME_TYPE,
          },
        },
      },
    });

    // 11. Crear registro de DocumentoGenerado
    const requiereFirmaFinal = configuracion.requiereFirma || plantilla.requiereFirma;
    const permiteRellenar = Boolean(plantilla.permiteRellenar);

    const documentoGenerado = await prisma.documentoGenerado.create({
      data: {
        empresaId: empleado.empresaId,
        empleadoId: empleadoId,
        plantillaId: plantilla.id,
        documentoId: documento.id,
        generadoPor: solicitadoPor,
        variablesUtilizadas: variablesEnPlantilla, // Solo keys, no valores
        usadaIA: true,
        confianzaIA: 0.95,
        tiempoGeneracion: Date.now() - inicio,
        requiereFirma: requiereFirmaFinal,
        pendienteRellenar: permiteRellenar,
      },
    });

    // 12. Notificar al empleado (si configurado)
    if (configuracion.notificarEmpleado && !permiteRellenar) {
      await crearNotificacionDocumentoGeneradoEmpleado(prisma, {
        empresaId: empleado.empresaId,
        empleadoId,
        documentoId: documento.id,
        documentoNombre: nombreDocumentoPdf,
        plantillaId: plantilla.id,
        documentoGeneradoId: documentoGenerado.id,
      });
    }

    // Notificación especial si el documento requiere ser rellenado por el empleado
    if (permiteRellenar && empleado.usuarioId) {
      await crearNotificacionDocumentoPendienteRellenar(prisma, {
        empresaId: empleado.empresaId,
        empleadoId,
        documentoGeneradoId: documentoGenerado.id,
        documentoId: documento.id,
        documentoNombre: nombreDocumentoPdf,
      });
    }

    // 13. Si requiere firma, crear solicitud automáticamente
    if (!permiteRellenar && requiereFirmaFinal) {
      const solicitudFirma = await prisma.solicitudFirma.create({
        data: {
          empresaId: empleado.empresaId,
          documentoId: documento.id,
          solicitadoPor: solicitadoPor,
          tipo: 'automatica',
          mensaje: configuracion.mensajeFirma || `Por favor firma el documento: ${nombreDocumentoPdf}`,
          fechaLimite: configuracion.fechaLimiteFirma,
        },
      });

      // Crear firma individual
      await prisma.firma.create({
        data: {
          solicitudFirmaId: solicitudFirma.id,
          empleadoId: empleadoId,
          estado: 'pendiente',
        },
      });

      // Notificar sobre firma pendiente
      await crearNotificacionFirmaPendiente(prisma, {
        empresaId: empleado.empresaId,
        empleadoId,
        firmaId: solicitudFirma.id,
        solicitudId: solicitudFirma.id,
        documentoId: documento.id,
        documentoNombre: nombreDocumentoPdf,
      });
    }

    const tiempoTotal = Date.now() - inicio;
    console.log(`[Generar] Documento generado exitosamente en ${tiempoTotal}ms`);

    return {
      success: true,
      empleadoId: empleadoId,
      empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
      documentoId: documento.id,
      documentoNombre: nombreDocumentoPdf,
      tiempoMs: tiempoTotal,
    };
  } catch (error) {
    console.error(`[Generar] Error al generar documento:`, error);

    return {
      success: false,
      empleadoId: empleadoId,
      error: error instanceof Error ? error.message : 'Error desconocido',
      tiempoMs: Date.now() - inicio,
    };
  }
}

/**
 * Generar documentos para múltiples empleados (sync - para jobs pequeños)
 */
export async function generarDocumentosMultiples(
  plantillaId: string,
  empleadoIds: string[],
  configuracion: ConfiguracionGeneracion,
  solicitadoPor: string,
  onProgress?: (progreso: number, procesados: number, total: number) => void
): Promise<ResultadoGeneracion[]> {
  const resultados: ResultadoGeneracion[] = [];
  const total = empleadoIds.length;

  console.log(`[Generar] Generando ${total} documentos...`);

  for (let i = 0; i < empleadoIds.length; i++) {
    const empleadoId = empleadoIds[i];
    const resultado = await generarDocumentoDesdePlantilla(
      plantillaId,
      empleadoId,
      configuracion,
      solicitadoPor
    );

    resultados.push(resultado);

    // Callback de progreso
    if (onProgress) {
      const progreso = Math.round(((i + 1) / total) * 100);
      onProgress(progreso, i + 1, total);
    }
  }

  const exitosos = resultados.filter((r) => r.success).length;
  const fallidos = resultados.filter((r) => !r.success).length;

  console.log(`[Generar] Completado: ${exitosos} exitosos, ${fallidos} fallidos`);

  return resultados;
}
