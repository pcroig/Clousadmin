// ========================================
// Clasificador de Nóminas con IA
// ========================================
// Matching inteligente de archivos PDF de nóminas con empleados usando Classification Pattern

import { isAnyProviderAvailable } from './core/client';
import { Candidate, ClassificationResult, classify, matchBasic } from './patterns/classification';

/**
 * Empleado candidato para matching
 */
export interface EmpleadoCandidato {
  id: string;
  nombre: string;
  apellidos: string;
}

/**
 * Resultado del matching de una nómina
 */
export interface MatchingResult {
  empleado: {
    id: string;
    nombre: string;
  } | null;
  confidence: number; // 0-100
  autoAssigned: boolean;
  candidates: Array<{
    id: string;
    nombre: string;
    confidence: number;
  }>;
  razon?: string;
}

/**
 * Convierte EmpleadoCandidato a Candidate genérico
 */
function toCandidates(empleados: EmpleadoCandidato[]): Candidate<EmpleadoCandidato>[] {
  return empleados.map((emp) => ({
    id: emp.id,
    label: `${emp.nombre} ${emp.apellidos}`,
    metadata: emp,
  }));
}

/**
 * Convierte ClassificationResult a MatchingResult
 */
function toMatchingResult(result: ClassificationResult<EmpleadoCandidato>): MatchingResult {
  return {
    empleado: result.match ? {
      id: result.match.id,
      nombre: result.match.label,
    } : null,
    confidence: result.match?.confidence || 0,
    autoAssigned: result.autoAssigned,
    candidates: result.candidates.map((c) => ({
      id: c.id,
      nombre: c.label,
      confidence: c.confidence,
    })),
    razon: result.reasoning,
  };
}

/**
 * Matching inteligente de nómina usando IA
 * Analiza el nombre del archivo y lo compara con la lista de empleados
 */
export async function clasificarNomina(
  filename: string,
  empleados: EmpleadoCandidato[]
): Promise<MatchingResult> {
  // Si no hay IA disponible, fallback a matching básico
  if (!isAnyProviderAvailable()) {
    console.warn('[Clasificador Nóminas] No hay proveedores de IA disponibles, usando fallback');
    return matchingBasico(filename, empleados);
  }

  try {
    // Convertir empleados a formato genérico
    const candidates = toCandidates(empleados);
    
    // Usar Classification Pattern
    const result = await classify(
      filename,
      candidates,
      'archivo de nómina con empleado',
      {
        confidenceThreshold: 75, // Umbral de confianza del 75%
        topK: 5, // Retornar top 5 candidatos
        temperature: 0.1, // Baja temperatura para consistencia
        additionalInstructions: `
          - Extrae el nombre del empleado del nombre del archivo (puede estar en diferentes formatos: "Apellidos Nombre", "Nombre Apellidos", con o sin guiones, con números o fechas, etc.)
          - Considera variaciones de nombres (con/sin acentos, mayúsculas/minúsculas, orden invertido)
          - Si el match es muy claro (≥85% confianza), retorna ese empleado
        `,
      }
    );

    if (!result.success) {
      console.error('[Clasificador Nóminas] Error en Classification Pattern:', result.error);
      return matchingBasico(filename, empleados);
    }

    // Log informativo del matching
    if (result.match) {
      console.info(
        `[Clasificador Nóminas] ${filename} → ${result.match.label} (${result.match.confidence}% confianza) usando ${result.provider}`
      );
    }

    // Convertir resultado
    return toMatchingResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Clasificador Nóminas] Error en IA, usando fallback:', {
      filename,
      totalEmpleados: empleados.length,
      error: message,
    });
    return matchingBasico(filename, empleados);
  }
}

/**
 * Matching básico (fallback cuando no hay IA)
 * Usa comparación simple de strings
 */
function matchingBasico(
  filename: string,
  empleados: EmpleadoCandidato[]
): MatchingResult {
  // Convertir empleados a formato genérico
  const candidates = toCandidates(empleados);
  
  // Usar función de matching básico del pattern con parámetros correctos
  const result = matchBasic(
    filename,      // input string
    candidates,    // lista de candidatos
    75            // confidence threshold
  );
  
  // Convertir resultado
  return toMatchingResult(result);
}


