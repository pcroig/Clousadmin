/**
 * Utilidades para generar certificados de firma simple (MVP)
 * Fase 1: Certificado interno con hash y metadata
 */

import { generarHashObjeto } from './hash';

import type { CertificadoFirmaSimple, DatosCapturadosFirma } from './tipos';

/**
 * Genera un certificado de firma simple (MVP)
 * Incluye: datos del firmante, documento, timestamp, IP, hash
 *
 * @param params - Parámetros del certificado
 * @returns Certificado de firma simple
 *
 * @example
 * ```ts
 * const certificado = generarCertificadoFirmaSimple({
 *   solicitudFirmaId: '...',
 *   firmaId: '...',
 *   empleadoId: '...',
 *   empleadoNombre: 'Juan Pérez',
 *   empleadoEmail: 'juan@empresa.com',
 *   documentoId: '...',
 *   documentoNombre: 'Contrato.pdf',
 *   documentoHash: 'a3b2c1...',
 *   datosCapturados: { tipo: 'click', ip: '...',  userAgent: '...', timestamp: '...' }
 * });
 * ```
 */
export function generarCertificadoFirmaSimple(params: {
  solicitudFirmaId: string;
  firmaId: string;
  empleadoId: string;
  empleadoNombre: string;
  empleadoEmail: string;
  documentoId: string;
  documentoNombre: string;
  documentoHash: string;
  datosCapturados: DatosCapturadosFirma;
}): CertificadoFirmaSimple {
  const {
    solicitudFirmaId,
    firmaId,
    empleadoId,
    empleadoNombre,
    empleadoEmail,
    documentoId,
    documentoNombre,
    documentoHash,
    datosCapturados,
  } = params;

  // Crear el certificado base
  const certificadoBase = {
    solicitudFirmaId,
    firmaId,
    empleadoId,
    empleadoNombre,
    empleadoEmail,
    documentoId,
    documentoNombre,
    documentoHash,
    firmadoEn: datosCapturados.timestamp,
    ipAddress: datosCapturados.ip,
    userAgent: datosCapturados.userAgent,
    version: '1.0-simple',
  };

  // Generar hash del certificado (para verificación posterior)
  const certificadoHash = generarHashObjeto(certificadoBase);

  return {
    ...certificadoBase,
    certificadoHash,
  };
}

/**
 * Verifica la integridad de un certificado de firma
 * Comprueba que el hash del certificado no ha sido modificado
 *
 * @param certificado - Certificado a verificar
 * @returns true si es válido, false si ha sido modificado
 *
 * @example
 * ```ts
 * const esValido = verificarCertificado(certificado);
 * if (!esValido) {
 *   throw new Error('Certificado modificado');
 * }
 * ```
 */
export function verificarCertificado(certificado: CertificadoFirmaSimple): boolean {
  const { certificadoHash, ...certificadoSinHash } = certificado;

  // Re-generar el hash sin incluir el certificadoHash
  const hashRecalculado = generarHashObjeto(certificadoSinHash);

  return certificadoHash === hashRecalculado;
}

/**
 * Genera un texto legible del certificado (para visualización)
 *
 * @param certificado - Certificado de firma
 * @returns Texto formateado del certificado
 *
 * @example
 * ```ts
 * const texto = generarTextoCertificado(certificado);
 * console.log(texto);
 * // Output:
 * // CERTIFICADO DE FIRMA DIGITAL
 * // Firmante: Juan Pérez (juan@empresa.com)
 * // ...
 * ```
 */
export function generarTextoCertificado(certificado: CertificadoFirmaSimple): string {
  return `
╔═══════════════════════════════════════════════════════════════════╗
║              CERTIFICADO DE FIRMA DIGITAL (SIMPLE)                ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║ Firmante:                                                         ║
║   Nombre: ${certificado.empleadoNombre.padEnd(54)}║
║   Email: ${certificado.empleadoEmail.padEnd(55)}║
║   ID: ${certificado.empleadoId.padEnd(58)}║
║                                                                   ║
║ Documento:                                                        ║
║   Nombre: ${certificado.documentoNombre.padEnd(54)}║
║   Hash: ${certificado.documentoHash.substring(0, 54)}║
║                                                                   ║
║ Firma:                                                            ║
║   Fecha/Hora: ${certificado.firmadoEn.padEnd(50)}║
║   IP: ${certificado.ipAddress.padEnd(58)}║
║   User Agent: ${certificado.userAgent.substring(0, 50).padEnd(50)}║
║                                                                   ║
║ Certificado:                                                      ║
║   Hash: ${certificado.certificadoHash.substring(0, 54)}║
║   Versión: ${certificado.version.padEnd(55)}║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`.trim();
}

/**
 * Genera metadata de auditoría para firma
 * Útil para logs y tracking GDPR
 *
 * @param certificado - Certificado de firma
 * @returns Metadata estructurada para auditoría
 *
 * @example
 * ```ts
 * const metadata = generarMetadataAuditoria(certificado);
 * await prisma.auditoriaAcceso.create({
 *   data: {
 *     empresaId,
 *     usuarioId: certificado.empleadoId,
 *     accion: 'firma_documento',
 *     recurso: 'documento',
 *     camposAccedidos: metadata,
 *     // ...
 *   }
 * });
 * ```
 */
export function generarMetadataAuditoria(certificado: CertificadoFirmaSimple) {
  return {
    accion: 'firma_documento',
    firmante: {
      id: certificado.empleadoId,
      nombre: certificado.empleadoNombre,
      email: certificado.empleadoEmail,
    },
    documento: {
      id: certificado.documentoId,
      nombre: certificado.documentoNombre,
      hash: certificado.documentoHash,
    },
    firma: {
      id: certificado.firmaId,
      solicitudId: certificado.solicitudFirmaId,
      timestamp: certificado.firmadoEn,
      ip: certificado.ipAddress,
      certificadoHash: certificado.certificadoHash,
    },
  };
}
