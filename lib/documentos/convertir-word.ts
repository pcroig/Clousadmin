/**
 * Utilidades para convertir documentos Word (.docx) a PDF
 * Necesario para el sistema de firma digital que solo soporta PDFs
 */

import libre from 'libreoffice-convert';
import { promisify } from 'util';

const libreConvert = promisify(libre.convert);

/**
 * Convierte un documento Word (.docx) a PDF
 *
 * IMPORTANTE: Requiere LibreOffice instalado en el servidor
 * - macOS: brew install --cask libreoffice
 * - Ubuntu: apt-get install libreoffice
 * - Docker: ADD libreoffice en Dockerfile
 *
 * @param wordBuffer - Buffer del documento Word (.docx)
 * @returns Buffer del PDF generado
 *
 * @example
 * ```typescript
 * const wordBuffer = await downloadFromS3('contratos/contrato.docx');
 * const pdfBuffer = await convertirWordAPDF(wordBuffer);
 * await uploadToS3(pdfBuffer, 'temp/contrato.pdf', 'application/pdf');
 * ```
 */
export async function convertirWordAPDF(wordBuffer: Buffer): Promise<Buffer> {
  try {
    // Convertir usando LibreOffice
    // El formato '.pdf' indica la conversión de salida
    const pdfBuffer = await libreConvert(wordBuffer, '.pdf', undefined);

    return pdfBuffer;
  } catch (error) {
    console.error('[convertirWordAPDF] Error al convertir Word a PDF:', error);
    throw new Error('No se pudo convertir el documento Word a PDF. Verifica que LibreOffice esté instalado.');
  }
}

/**
 * Verifica si un tipo MIME corresponde a un documento Word
 *
 * @param mimeType - Tipo MIME del documento
 * @returns true si es un documento Word (.doc o .docx)
 */
export function esDocumentoWord(mimeType: string): boolean {
  return (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // .docx
    mimeType === 'application/msword' // .doc (legacy)
  );
}

/**
 * Obtiene la extensión correcta para un documento basado en su tipo MIME
 *
 * @param mimeType - Tipo MIME del documento
 * @returns Extensión sin el punto (ej: 'pdf', 'docx')
 */
export function obtenerExtensionPorMime(mimeType: string): string {
  const extensiones: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
  };

  return extensiones[mimeType] || 'bin';
}
