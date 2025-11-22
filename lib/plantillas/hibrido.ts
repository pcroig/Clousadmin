/**
 * Plantillas Híbridas - DOCX con variables → PDF con campos rellenables
 * 
 * Permite crear plantillas que:
 * 1. Generan un DOCX con variables reemplazadas
 * 2. Convierten el DOCX a PDF
 * 3. El PDF resultante puede tener campos rellenables adicionales
 */

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

import { convertDocxFromS3ToPdf } from './docx-to-pdf';
import { generarDocumentoDesdePlantilla } from './generar-documento';
import { escanearPDFConVision, fusionarCamposDetectados } from './pdf-rellenable';

export interface ConfiguracionHibrido {
  plantillaId: string;
  empleadoId: string;
  solicitadoPor: string;
  convertirAPDF?: boolean; // Si true, convierte DOCX generado a PDF
  detectarCamposIA?: boolean; // Si true, detecta campos con IA en el PDF resultante
  nombreDocumentoFinal?: string;
  carpetaDestino?: string;
}

export interface ResultadoHibrido {
  success: boolean;
  documentoId?: string;
  s3Key?: string;
  formato: 'docx' | 'pdf';
  camposDetectados?: Array<{ nombre: string; origen: 'nativo' | 'ia'; tipo?: string; confianza?: number }>;
  error?: string;
}

/**
 * Generar documento híbrido: DOCX con variables → PDF (opcionalmente con campos detectados)
 */
export async function generarDocumentoHibrido(
  config: ConfiguracionHibrido
): Promise<ResultadoHibrido> {
  console.log(`[Híbrido] Generando documento híbrido para plantilla ${config.plantillaId}`);

  try {
    // 1. Generar DOCX con variables reemplazadas
    const resultadoDOCX = await generarDocumentoDesdePlantilla(
      config.plantillaId,
      config.empleadoId,
      {
        nombreDocumento: config.nombreDocumentoFinal,
        carpetaDestino: config.carpetaDestino,
        notificarEmpleado: false, // No notificar aún
      },
      config.solicitadoPor
    );

    if (!resultadoDOCX.success) {
      return {
        success: false,
        formato: 'docx',
        error: resultadoDOCX.error,
      };
    }

    // Si no se requiere conversión a PDF, retornar el DOCX generado
    if (!config.convertirAPDF) {
      return {
        success: true,
        documentoId: resultadoDOCX.documentoId,
        s3Key: resultadoDOCX.s3Key,
        formato: 'docx',
      };
    }

    // 2. Convertir DOCX a PDF
    console.log(`[Híbrido] Convirtiendo DOCX a PDF...`);

    const { pdfS3Key } = await convertDocxFromS3ToPdf(resultadoDOCX.s3Key!);

    // 3. Actualizar registro del documento con el PDF
    const documento = await prisma.documento.update({
      where: { id: resultadoDOCX.documentoId },
      data: {
        s3Key: pdfS3Key,
        mimeType: 'application/pdf',
      },
    });

    // 4. Opcionalmente, detectar campos con IA en el PDF resultante
    let camposDetectados: Array<{
      nombre: string;
      origen: 'nativo' | 'ia';
      tipo?: string;
      confianza?: number;
    }> = [];

    if (config.detectarCamposIA) {
      console.log(`[Híbrido] Detectando campos con IA en PDF resultante...`);
      const camposIA = await escanearPDFConVision(pdfS3Key);
      camposDetectados = fusionarCamposDetectados([], camposIA);
      console.log(`[Híbrido] Detectados ${camposDetectados.length} campos en PDF resultante`);
    }

    return {
      success: true,
      documentoId: documento.id,
      s3Key: pdfS3Key,
      formato: 'pdf',
      camposDetectados: config.detectarCamposIA ? camposDetectados : undefined,
    };
  } catch (error) {
    console.error('[Híbrido] Error al generar documento híbrido:', error);
    return {
      success: false,
      formato: 'docx',
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Convertir DOCX a PDF
 * 
 * NOTA: Esta es una implementación simplificada. En producción, se recomienda usar:
 * - LibreOffice en servidor (libreoffice --headless --convert-to pdf)
 * - Servicio externo como Pandoc, CloudConvert, o similar
 * - Lambda function con LibreOffice preinstalado
 * 
 * Por ahora, esta función crea un PDF básico con el contenido del DOCX
 */
/**
 * Analizar DOCX con Vision para detectar campos potenciales antes de convertir a PDF
 * 
 * Útil para saber qué campos dejar sin rellenar para que sean rellenables en el PDF final
 */
export async function analizarDOCXParaCampos(
  docxS3Key: string
): Promise<Array<{ nombre: string; tipo: string; confianza: number }>> {
  console.log(`[Analizar DOCX] Analizando campos en ${docxS3Key}`);

  try {
    // Convertir temporalmente a PDF para análisis
    const { pdfS3Key } = await convertDocxFromS3ToPdf(docxS3Key);

    // Detectar campos con IA
    const campos = await escanearPDFConVision(pdfS3Key);

    console.log(`[Analizar DOCX] Detectados ${campos.length} campos potenciales`);

    return campos;
  } catch (error) {
    console.error('[Analizar DOCX] Error al analizar campos:', error);
    return [];
  }
}

/**
 * Crear plantilla híbrida: especificar qué variables se resuelven y cuáles quedan como campos
 * 
 * Ejemplo:
 * - Variables a resolver: empleado_nombre, empleado_apellidos
 * - Campos a dejar: firma, fecha_firma, observaciones
 */
export interface ConfiguracionPlantillaHibrida {
  variablesAResolver: string[]; // Variables que se reemplazan con datos reales
  camposADejar: string[]; // Campos que quedan vacíos para rellenar manualmente en PDF
}

export async function crearPlantillaHibridaConfig(
  plantillaId: string,
  config: ConfiguracionPlantillaHibrida
): Promise<void> {
  console.log(`[Plantilla Híbrida] Configurando plantilla ${plantillaId} como híbrida`);

  await prisma.plantillaDocumento.update({
    where: { id: plantillaId },
    data: {
      tipo: 'hibrida',
      configuracionIA: {
        esHibrida: true,
        variablesAResolver: config.variablesAResolver,
        camposADejar: config.camposADejar,
        configuradoEn: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });

  console.log(`[Plantilla Híbrida] Configuración guardada`);
}

