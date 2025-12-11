// ========================================
// Extractor IA de Nóminas
// ========================================
// Extrae datos financieros de PDFs de nóminas usando IA Vision

import { z } from 'zod';

import { analyzeDocument } from '@/lib/ia/patterns/vision';
import { AIProvider } from '@/lib/ia/core/types';

// ========================================
// SCHEMAS
// ========================================

const NominaExtraccionSchema = z.object({
  totalDeducciones: z.string().optional(),
  totalNeto: z.string().optional(),
});

// ========================================
// TIPOS
// ========================================

export interface NominaExtraccionResult {
  success: boolean;
  totalDeducciones: number | null;
  totalNeto: number | null;
  confianza: number; // 0-100
  provider: AIProvider;
  error?: string;
}

// ========================================
// FUNCIÓN PRINCIPAL
// ========================================

/**
 * Extrae deducciones y neto de un PDF de nómina
 *
 * @param documentUrl URL del documento (S3) o data URI base64
 * @returns Datos extraídos con confianza y provider usado
 *
 * @example
 * ```typescript
 * // Con URL S3 (producción)
 * const result = await extraerDatosNomina('https://bucket.s3.amazonaws.com/nomina.pdf');
 *
 * // Con base64 (desarrollo/testing)
 * const base64 = 'data:application/pdf;base64,JVBERi0xLjQK...';
 * const result = await extraerDatosNomina(base64);
 *
 * if (result.success) {
 *   console.log('Deducciones:', result.totalDeducciones); // 234.56
 *   console.log('Neto:', result.totalNeto); // 1890.45
 *   console.log('Confianza:', result.confianza); // 100
 * }
 * ```
 */
export async function extraerDatosNomina(
  documentUrl: string
): Promise<NominaExtraccionResult> {
  const fieldsToExtract = {
    totalDeducciones: 'Total de Deducciones (solo número, sin símbolos)',
    totalNeto: 'Total Líquido a Percibir / Total Neto (solo número, sin símbolos)',
  };

  try {
    const result = await analyzeDocument(
      documentUrl,
      NominaExtraccionSchema,
      fieldsToExtract,
      {
        additionalInstructions: `
          - Extrae SOLO los valores numéricos finales
          - NO incluyas símbolos de moneda (€, $)
          - Si hay puntos o comas, devuelve solo números
          - Busca secciones: "DEDUCCIONES", "LÍQUIDO A PERCIBIR", "NETO"
          - Formato español: 1.234,56 → devuelve "1234.56" o "1234,56"
          - Si un valor no está claro, NO lo incluyas
        `,
        temperature: 0.1, // Muy bajo para precisión numérica
        imageDetail: 'high',
        provider: AIProvider.ANTHROPIC, // Preferir Anthropic para PDFs
      }
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        totalDeducciones: null,
        totalNeto: null,
        confianza: 0,
        provider: result.provider,
        error: result.error,
      };
    }

    // Parsear strings a números
    const totalDeducciones = result.data.totalDeducciones
      ? parseSpanishNumber(result.data.totalDeducciones)
      : null;

    const totalNeto = result.data.totalNeto
      ? parseSpanishNumber(result.data.totalNeto)
      : null;

    // Confianza: 100% si ambos, 50% si solo uno, 0% si ninguno
    let confianza = 0;
    if (totalDeducciones !== null && totalNeto !== null) {
      confianza = 100;
    } else if (totalDeducciones !== null || totalNeto !== null) {
      confianza = 50;
    }

    return {
      success: confianza > 0,
      totalDeducciones,
      totalNeto,
      confianza,
      provider: result.provider,
    };
  } catch (error) {
    return {
      success: false,
      totalDeducciones: null,
      totalNeto: null,
      confianza: 0,
      provider: AIProvider.ANTHROPIC,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// ========================================
// BATCH PROCESSING
// ========================================

/**
 * Procesa múltiples nóminas en batch (5 simultáneas para no saturar)
 *
 * @param documentUrls Array de URLs de documentos
 * @returns Array de resultados en el mismo orden
 *
 * @example
 * ```typescript
 * const urls = [
 *   'https://bucket.s3.amazonaws.com/nomina1.pdf',
 *   'https://bucket.s3.amazonaws.com/nomina2.pdf',
 *   // ... hasta 50 nóminas
 * ];
 *
 * const results = await extraerDatosNominasBatch(urls);
 * // Procesa en lotes de 5, retorna en el mismo orden
 * ```
 */
export async function extraerDatosNominasBatch(
  documentUrls: string[]
): Promise<NominaExtraccionResult[]> {
  const BATCH_SIZE = 5;
  const results: NominaExtraccionResult[] = [];

  for (let i = 0; i < documentUrls.length; i += BATCH_SIZE) {
    const batch = documentUrls.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(url => extraerDatosNomina(url))
    );
    results.push(...batchResults);
  }

  return results;
}

// ========================================
// HELPERS
// ========================================

/**
 * Parsea número español (1.234,56) o internacional (1234.56) a número JS
 *
 * @param value String con el número
 * @returns Número parseado o null si inválido
 *
 * @example
 * parseSpanishNumber('1.234,56') // 1234.56
 * parseSpanishNumber('1234.56')  // 1234.56
 * parseSpanishNumber('1,234.56') // 1234.56
 * parseSpanishNumber('234,56')   // 234.56
 * parseSpanishNumber('€ 1.234,56') // 1234.56
 */
function parseSpanishNumber(value: string): number | null {
  try {
    // Eliminar símbolos de moneda y espacios
    let cleaned = value.replace(/[€$\s]/g, '');

    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    if (hasComma && hasDot) {
      // Formato: 1.234,56 o 1,234.56
      const commaIndex = cleaned.lastIndexOf(',');
      const dotIndex = cleaned.lastIndexOf('.');

      if (dotIndex > commaIndex) {
        // Formato: 1,234.56 (inglés)
        cleaned = cleaned.replace(/,/g, '');
      } else {
        // Formato: 1.234,56 (español)
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      }
    } else if (hasComma) {
      // Solo coma: puede ser 1234,56 o 1,234
      const parts = cleaned.split(',');
      if (parts[1] && parts[1].length === 2) {
        // Formato: 1234,56 (decimal español)
        cleaned = cleaned.replace(',', '.');
      } else {
        // Formato: 1,234 (separador de miles inglés)
        cleaned = cleaned.replace(',', '');
      }
    }
    // Si solo tiene punto, ya está en formato correcto

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}
