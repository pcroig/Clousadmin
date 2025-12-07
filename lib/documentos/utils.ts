/**
 * Utilidades para manejo de documentos
 */

/**
 * Determina si un documento puede ser firmado
 * Soporta: PDF (directo) y Word (se convierte a PDF automáticamente)
 */
export function esDocumentoFirmable(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;

  // PDF directo
  if (mimeType === 'application/pdf') return true;

  // Word (.docx)
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return true;

  // Word (.doc)
  if (mimeType === 'application/msword') return true;

  // Word (genérico)
  if (mimeType.includes('word')) return true;

  return false;
}

/**
 * Obtiene mensaje descriptivo para tipo de documento firmable
 */
export function getMensajeTipoDocumento(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  if (esDocumentoWord(mimeType)) return 'Word (se convertirá a PDF)';
  return 'Documento';
}

/**
 * Verifica si un documento es Word
 */
export function esDocumentoWord(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;

  return (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    mimeType.includes('word')
  );
}
