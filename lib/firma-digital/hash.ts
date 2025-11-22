/**
 * Utilidades de hash para firma digital
 * Genera hashes SHA-256 para verificación de integridad de documentos
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Genera hash SHA-256 de un buffer (documento)
 * Usado para verificar integridad del documento antes y después de firma
 *
 * @param buffer - Buffer del documento (PDF, DOCX, etc.)
 * @returns Hash SHA-256 en formato hexadecimal
 *
 * @example
 * ```ts
 * const documentoBuffer = await downloadFromS3(s3Key);
 * const hash = generarHashDocumento(documentoBuffer);
 * console.log(hash); // "a3b2c1d4..."
 * ```
 */
export function generarHashDocumento(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Genera hash SHA-256 de un string (certificado, JSON, etc.)
 *
 * @param contenido - String a hashear
 * @returns Hash SHA-256 en formato hexadecimal
 *
 * @example
 * ```ts
 * const certificado = JSON.stringify(datoCertificado);
 * const hash = generarHashString(certificado);
 * ```
 */
export function generarHashString(contenido: string): string {
  return createHash('sha256').update(contenido, 'utf-8').digest('hex');
}

/**
 * Genera hash SHA-256 de un objeto JSON
 * Útil para hashear certificados de firma
 *
 * @param objeto - Objeto a hashear
 * @returns Hash SHA-256 en formato hexadecimal
 *
 * @example
 * ```ts
 * const certificado = { empleadoId: '...', timestamp: '...' };
 * const hash = generarHashObjeto(certificado);
 * ```
 */
export function generarHashObjeto(objeto: Record<string, unknown>): string {
  // Crear objeto ordenado determinísticamente para garantizar hash consistente
  const sortedKeys = Object.keys(objeto).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = objeto[key];
  }
  const jsonString = JSON.stringify(sortedObj);
  return generarHashString(jsonString);
}

/**
 * Verifica si dos hashes coinciden (comparación constante en tiempo)
 * Previene timing attacks
 *
 * @param hash1 - Primer hash
 * @param hash2 - Segundo hash
 * @returns true si coinciden, false si no
 *
 * @example
 * ```ts
 * const hashOriginal = documento.hashDocumento;
 * const hashActual = generarHashDocumento(documentoBuffer);
 * const valido = verificarHash(hashOriginal, hashActual);
 * ```
 */
export function verificarHash(hash1: string, hash2: string): boolean {
  if (hash1.length !== hash2.length) {
    return false;
  }

  // Comparación de tiempo constante para prevenir timing attacks
  const buffer1 = Buffer.from(hash1, 'hex');
  const buffer2 = Buffer.from(hash2, 'hex');

  return buffer1.equals(buffer2);
}

/**
 * Genera un identificador único basado en timestamp y random
 * Útil para IDs de certificados
 *
 * @returns String único
 *
 * @example
 * ```ts
 * const certificadoId = generarIdUnico();
 * console.log(certificadoId); // "1699876543210-a3b2c1d4"
 * ```
 */
export function generarIdUnico(): string {
  const timestamp = Date.now();
  // Usar randomBytes para generación criptográficamente segura
  const random = randomBytes(8).toString('hex');
  return `${timestamp}-${random}`;
}
