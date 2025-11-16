/**
 * Utilidades de validación para firma digital
 * Verifica integridad de documentos y firmas
 */

import { generarHashDocumento, verificarHash } from './hash';
import { verificarCertificado } from './certificado';
import type { ResultadoValidacionFirma, CertificadoFirmaSimple } from './tipos';

/**
 * Valida que un documento no ha sido modificado después de firmado
 * Compara el hash actual con el hash registrado en la solicitud de firma
 *
 * @param documentoBuffer - Buffer del documento actual
 * @param hashOriginal - Hash registrado al crear la solicitud
 * @returns Resultado de validación
 *
 * @example
 * ```ts
 * const buffer = await downloadFromS3(documento.s3Key);
 * const resultado = validarIntegridadDocumento(buffer, solicitudFirma.hashDocumento);
 *
 * if (!resultado.valida) {
 *   console.error('Documento modificado:', resultado.motivo);
 * }
 * ```
 */
export function validarIntegridadDocumento(
  documentoBuffer: Buffer,
  hashOriginal: string
): ResultadoValidacionFirma {
  const hashActual = generarHashDocumento(documentoBuffer);

  const valida = verificarHash(hashOriginal, hashActual);

  if (!valida) {
    return {
      valida: false,
      motivo: 'El documento ha sido modificado después de la solicitud de firma',
      documentoHashActual: hashActual,
      documentoHashOriginal: hashOriginal,
    };
  }

  return {
    valida: true,
    documentoHashActual: hashActual,
    documentoHashOriginal: hashOriginal,
  };
}

/**
 * Valida un certificado de firma completo
 * Verifica: integridad del certificado, hash del documento, y metadata
 *
 * @param certificado - Certificado de firma a validar
 * @param documentoBuffer - Buffer del documento actual (opcional, para validar hash)
 * @returns Resultado de validación
 *
 * @example
 * ```ts
 * const resultado = validarFirmaCompleta(certificado, documentoBuffer);
 *
 * if (!resultado.valida) {
 *   console.error('Firma inválida:', resultado.motivo);
 * }
 * ```
 */
export function validarFirmaCompleta(
  certificado: CertificadoFirmaSimple,
  documentoBuffer?: Buffer
): ResultadoValidacionFirma {
  // 1. Verificar integridad del certificado
  const certificadoValido = verificarCertificado(certificado);
  if (!certificadoValido) {
    return {
      valida: false,
      motivo: 'El certificado de firma ha sido modificado',
      certificadoValido: false,
    };
  }

  // 2. Si se proporciona el documento, verificar hash
  if (documentoBuffer) {
    const hashActual = generarHashDocumento(documentoBuffer);
    const hashCoincide = verificarHash(certificado.documentoHash, hashActual);

    if (!hashCoincide) {
      return {
        valida: false,
        motivo: 'El documento ha sido modificado después de la firma',
        documentoHashActual: hashActual,
        documentoHashOriginal: certificado.documentoHash,
        certificadoValido: true,
      };
    }
  }

  // 3. Todo válido
  return {
    valida: true,
    certificadoValido: true,
    documentoHashActual: documentoBuffer ? generarHashDocumento(documentoBuffer) : undefined,
    documentoHashOriginal: certificado.documentoHash,
  };
}

/**
 * Verifica que una firma no ha expirado (si tiene fecha de expiración)
 * En MVP no usamos expiración, pero puede ser útil en Fase 2
 *
 * @param fechaFirma - Fecha/hora de la firma (ISO string)
 * @param diasValidez - Días de validez de la firma (opcional)
 * @returns true si es válida, false si expiró
 *
 * @example
 * ```ts
 * const valida = validarExpiracionFirma(certificado.firmadoEn, 365);
 * if (!valida) {
 *   console.warn('Firma expirada');
 * }
 * ```
 */
export function validarExpiracionFirma(
  fechaFirma: string,
  diasValidez?: number
): boolean {
  if (!diasValidez) {
    return true; // Sin expiración
  }

  const fechaFirmaDate = new Date(fechaFirma);
  const fechaExpiracion = new Date(fechaFirmaDate);
  fechaExpiracion.setDate(fechaExpiracion.getDate() + diasValidez);

  return new Date() <= fechaExpiracion;
}

/**
 * Valida el orden de firma si es secuencial
 * Verifica que cada firmante firmó después del anterior
 *
 * @param firmas - Array de firmas ordenadas por 'orden'
 * @returns true si el orden es válido, false si no
 *
 * @example
 * ```ts
 * const firmasOrdenadas = firmas.sort((a, b) => a.orden - b.orden);
 * const ordenValido = validarOrdenFirmas(firmasOrdenadas);
 * ```
 */
export function validarOrdenFirmas(
  firmas: Array<{ orden: number; firmado: boolean; firmadoEn: Date | null }>
): boolean {
  const firmadasOrdenadas = firmas
    .filter((f) => f.firmado && f.firmadoEn)
    .sort((a, b) => a.orden - b.orden);

  for (let i = 1; i < firmadasOrdenadas.length; i++) {
    const anterior = firmadasOrdenadas[i - 1];
    const actual = firmadasOrdenadas[i];

    // Verificar que firmó después del anterior
    if (actual.firmadoEn! < anterior.firmadoEn!) {
      return false;
    }
  }

  return true;
}

/**
 * Valida que todos los firmantes requeridos han firmado
 *
 * @param firmas - Array de firmas de la solicitud
 * @returns Objeto con estado de validación
 *
 * @example
 * ```ts
 * const estado = validarComplecionFirmas(solicitud.firmas);
 * console.log(`Firmadas: ${estado.firmadas}/${estado.total}`);
 * ```
 */
export function validarComplecionFirmas(
  firmas: Array<{ firmado: boolean }>
): {
  completo: boolean;
  firmadas: number;
  total: number;
  porcentaje: number;
} {
  const total = firmas.length;
  const firmadas = firmas.filter((f) => f.firmado).length;
  const porcentaje = total > 0 ? Math.round((firmadas / total) * 100) : 0;

  return {
    completo: firmadas === total && total > 0,
    firmadas,
    total,
    porcentaje,
  };
}
