/**
 * Document Preview Service
 *
 * Provides on-demand preview generation for documents.
 * - PDFs are served directly.
 * - DOCX files are converted to PDF using LibreOffice (cached).
 * - Images are served inline.
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

import { puedeAccederACarpeta } from '@/lib/documentos';
import { convertDocxBufferToPdf } from '@/lib/plantillas/docx-to-pdf';
import { prisma } from '@/lib/prisma';
import { downloadFromS3, isS3Configured, uploadToS3 } from '@/lib/s3';

// MIME types that can be previewed directly in browser
const PREVIEWABLE_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

// MIME types that need conversion to PDF
const CONVERTIBLE_TO_PDF_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
]);

export interface PreviewResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  wasConverted: boolean;
}

export interface PreviewOptions {
  /** Force regeneration of cached preview */
  forceRegenerate?: boolean;
}

/**
 * Check if a MIME type can be previewed directly in the browser
 */
export function canPreviewDirectly(mimeType: string): boolean {
  return PREVIEWABLE_MIME_TYPES.has(mimeType.toLowerCase());
}

/**
 * Check if a MIME type can be converted to PDF for preview
 */
export function canConvertToPdf(mimeType: string): boolean {
  return CONVERTIBLE_TO_PDF_MIME_TYPES.has(mimeType.toLowerCase());
}

/**
 * Check if a document supports preview at all
 */
export function supportsPreview(mimeType: string): boolean {
  return canPreviewDirectly(mimeType) || canConvertToPdf(mimeType);
}

/**
 * Generate preview S3 key for a document
 */
function getPreviewS3Key(documentoId: string): string {
  return `previews/${documentoId}.pdf`;
}

/**
 * Load document buffer from storage (S3 or local)
 */
async function loadDocumentBuffer(
  s3Key: string,
  s3Bucket: string | null
): Promise<Buffer> {
  const isCloudDocument = s3Bucket && s3Bucket !== 'local' && s3Key;

  if (isCloudDocument && isS3Configured()) {
    return downloadFromS3(s3Key);
  }

  // Local filesystem fallback
  const filePath = join(process.cwd(), 'uploads', s3Key);
  if (!existsSync(filePath)) {
    throw new Error('Archivo no encontrado en el servidor');
  }
  return readFile(filePath);
}

/**
 * Check if a cached preview exists in S3
 */
async function getCachedPreview(documentoId: string): Promise<Buffer | null> {
  if (!isS3Configured()) {
    // For local development, check local preview file
    const localPath = join(process.cwd(), 'uploads', 'previews', `${documentoId}.pdf`);
    if (existsSync(localPath)) {
      return readFile(localPath);
    }
    return null;
  }

  try {
    const previewKey = getPreviewS3Key(documentoId);
    return await downloadFromS3(previewKey);
  } catch {
    // Preview not cached yet
    return null;
  }
}

/**
 * Cache a preview buffer to S3
 */
async function cachePreview(documentoId: string, buffer: Buffer): Promise<void> {
  const previewKey = getPreviewS3Key(documentoId);
  await uploadToS3(buffer, previewKey, 'application/pdf');
}

export interface GetPreviewParams {
  documentoId: string;
  userId: string;
  userRole: string;
  empresaId: string;
  options?: PreviewOptions;
}

/**
 * Get a previewable version of a document.
 * - Returns the original buffer for PDFs and images.
 * - Converts DOCX to PDF (with caching).
 * - Validates permissions before access.
 */
export async function getDocumentPreview(
  params: GetPreviewParams
): Promise<PreviewResult> {
  const { documentoId, userId, userRole, empresaId, options = {} } = params;

  // Fetch document from database
  const documento = await prisma.documentos.findUnique({
    where: { id: documentoId },
    include: {
      documento_carpetas: {
        include: {
          carpeta: true,
        },
        take: 1,
      },
    },
  });

  if (!documento) {
    throw new Error('Documento no encontrado');
  }

  if (documento.empresaId !== empresaId) {
    throw new Error('Documento no encontrado');
  }

  // Validate permissions - check if user has access to any of the document's folders
  if (documento.documento_carpetas.length > 0) {
    let hasAccess = false;

    for (const dc of documento.documento_carpetas) {
      const canAccess = await puedeAccederACarpeta(
        dc.carpetaId,
        userId,
        userRole
      );

      if (canAccess) {
        hasAccess = true;
        break;
      }
    }

    if (!hasAccess) {
      throw new Error('No tienes permisos para acceder a este documento');
    }
  } else {
    // Document without folder: only HR can access
    if (userRole !== 'hr_admin') {
      throw new Error('No tienes permisos para acceder a este documento');
    }
  }

  if (!documento.s3Key) {
    throw new Error('Documento sin ruta de almacenamiento');
  }

  const mimeType = documento.mimeType.toLowerCase();

  // Check if document supports preview
  if (!supportsPreview(mimeType)) {
    throw new Error(
      `El tipo de archivo ${mimeType} no soporta vista previa. Descarga el documento para verlo.`
    );
  }

  // For directly previewable types (PDF, images), return as-is
  if (canPreviewDirectly(mimeType)) {
    const buffer = await loadDocumentBuffer(documento.s3Key, documento.s3Bucket);
    return {
      buffer,
      mimeType: documento.mimeType,
      fileName: documento.nombre,
      wasConverted: false,
    };
  }

  // For DOCX, convert to PDF
  if (canConvertToPdf(mimeType)) {
    // Check cache first
    if (!options.forceRegenerate) {
      const cachedPreview = await getCachedPreview(documentoId);
      if (cachedPreview) {
        return {
          buffer: cachedPreview,
          mimeType: 'application/pdf',
          fileName: documento.nombre.replace(/\.docx$/i, '.pdf'),
          wasConverted: true,
        };
      }
    }

    // Convert DOCX to PDF
    const docxBuffer = await loadDocumentBuffer(documento.s3Key, documento.s3Bucket);
    
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await convertDocxBufferToPdf(docxBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de conversión';
      
      // Check if LibreOffice is not available
      if (message.includes('LibreOffice no está disponible')) {
        throw new Error(
          'La conversión de documentos Word no está disponible en este momento. ' +
          'Descarga el archivo para verlo.'
        );
      }
      
      throw new Error(`Error al convertir documento: ${message}`);
    }

    // Cache the converted PDF (async, don't wait)
    cachePreview(documentoId, pdfBuffer).catch((err) => {
      console.error('[Preview] Error caching preview:', err);
    });

    return {
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      fileName: documento.nombre.replace(/\.docx$/i, '.pdf'),
      wasConverted: true,
    };
  }

  // Should not reach here
  throw new Error('Tipo de documento no soportado para vista previa');
}

/**
 * Invalidate cached preview for a document.
 * Call this when the source document is updated.
 */
export async function invalidatePreviewCache(documentoId: string): Promise<void> {
  if (!isS3Configured()) {
    // For local development, try to delete local preview
    const { unlink } = await import('fs/promises');
    const localPath = join(process.cwd(), 'uploads', 'previews', `${documentoId}.pdf`);
    try {
      await unlink(localPath);
    } catch {
      // File doesn't exist, ignore
    }
    return;
  }

  try {
    const { deleteFromS3 } = await import('@/lib/s3');
    const previewKey = getPreviewS3Key(documentoId);
    await deleteFromS3(previewKey);
  } catch {
    // Preview doesn't exist, ignore
  }
}

