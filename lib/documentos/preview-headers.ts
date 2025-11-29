/**
 * Preview Headers Helper
 * 
 * Centraliza la configuración de headers HTTP para endpoints de preview de documentos.
 * Asegura compatibilidad con visores PDF nativos del navegador y seguridad consistente.
 */

export interface PreviewHeadersOptions {
  /** MIME type del contenido (application/pdf, image/jpeg, etc.) */
  mimeType: string;
  /** Nombre del archivo para el header Content-Disposition */
  fileName: string;
  /** Si el documento fue convertido (DOCX → PDF), afecta cache */
  wasConverted: boolean;
  /** Tamaño del buffer en bytes */
  contentLength: number;
}

/**
 * Genera headers HTTP optimizados para preview de documentos en iframe
 * 
 * @param options - Opciones de configuración
 * @returns Record de headers listo para NextResponse
 * 
 * @example
 * ```typescript
 * return new NextResponse(pdfBuffer, {
 *   headers: getPreviewHeaders({
 *     mimeType: 'application/pdf',
 *     fileName: 'documento.pdf',
 *     wasConverted: false,
 *     contentLength: pdfBuffer.length
 *   })
 * });
 * ```
 */
export function getPreviewHeaders(options: PreviewHeadersOptions): Record<string, string> {
  const { mimeType, fileName, wasConverted, contentLength } = options;
  
  // Content-Security-Policy específica por tipo de contenido
  const csp = getCspForMimeType(mimeType);
  
  // Cache control: más tiempo para conversiones (más costosas), menos para nativos
  const cacheControl = wasConverted
    ? 'private, max-age=3600, stale-while-revalidate=86400' // 1h cache, 24h stale
    : 'private, max-age=1800, must-revalidate'; // 30min cache, validación estricta
  
  const headers: Record<string, string> = {
    // Content headers
    'Content-Type': mimeType,
    'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
    'Content-Length': contentLength.toString(),
    
    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN', // Permitir embed en mismo origen
    
    // Cache control
    'Cache-Control': cacheControl,
  };

  if (csp) {
    headers['Content-Security-Policy'] = csp;
  }

  return headers;
}

/**
 * Genera Content-Security-Policy optimizada según el tipo MIME
 * 
 * Para PDFs: Permite scripts, workers y fonts necesarios para el visor nativo
 * Para imágenes: Política restrictiva sin scripts
 * 
 * @param mimeType - Tipo MIME del contenido
 * @returns String de CSP
 */
function getCspForMimeType(mimeType: string): string | null {
  const lowerMimeType = mimeType.toLowerCase();
  
  // PDFs requieren ejecutar el visor nativo del navegador (chrome-extension://).
  // Para evitar bloqueos de Chrome/Firefox, no enviamos CSP en este caso.
  if (lowerMimeType === 'application/pdf') {
    return null;
  }
  
  // Imágenes: política muy restrictiva
  if (lowerMimeType.startsWith('image/')) {
    return [
      "default-src 'none'",
      "img-src 'self' data:",
      "style-src 'unsafe-inline'",
      "frame-ancestors 'self'",
    ].join('; ');
  }
  
  // Fallback conservador para otros tipos
  return [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    "frame-ancestors 'self'",
  ].join('; ');
}

/**
 * Valida que los headers de preview estén correctamente configurados
 * Útil para debugging en desarrollo
 * 
 * @param headers - Headers a validar
 * @returns true si son válidos, string con error si no
 */
export function validatePreviewHeaders(headers: Record<string, string>): true | string {
  const required = ['Content-Type', 'Content-Disposition'];
  
  for (const header of required) {
    if (!headers[header]) {
      return `Header requerido faltante: ${header}`;
    }
  }
  
  // Validar que CSP incluya frame-ancestors para prevenir clickjacking
  if (
    headers['Content-Security-Policy'] &&
    !headers['Content-Security-Policy'].includes('frame-ancestors')
  ) {
    return 'CSP debe incluir frame-ancestors para seguridad';
  }
  
  return true;
}


