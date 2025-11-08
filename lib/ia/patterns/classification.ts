// ========================================
// Classification Pattern
// ========================================
// Patrón reutilizable para clasificación y matching inteligente
// Soporta matching con confianza, top-K candidatos, y auto-asignación

import { z } from 'zod';
import { callAI, getPrimaryProvider } from '../core/client';
import { AIMessage, MessageRole, AIProvider } from '../core/types';
import { createConfigForUseCase, AIUseCase } from '../core/config';

// ========================================
// TIPOS
// ========================================

/**
 * Candidato para clasificación
 */
export interface Candidate<T = any> {
  id: string;
  label: string;
  metadata?: T;
}

/**
 * Resultado de clasificación individual
 */
export interface ClassificationMatch<T = any> {
  id: string;
  label: string;
  confidence: number; // 0-100
  metadata?: T;
}

/**
 * Resultado de clasificación completo
 */
export interface ClassificationResult<T = any> {
  success: boolean;
  match?: ClassificationMatch<T>;
  candidates: ClassificationMatch<T>[];
  autoAssigned: boolean;
  reasoning?: string;
  error?: string;
  provider: AIProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Opciones para clasificación
 */
export interface ClassificationOptions {
  /** Proveedor específico a usar */
  provider?: AIProvider;
  
  /** Umbral de confianza para auto-asignación (0-100) */
  confidenceThreshold?: number;
  
  /** Número de candidatos a retornar */
  topK?: number;
  
  /** Instrucciones adicionales */
  additionalInstructions?: string;
  
  /** Contexto adicional */
  context?: string;
  
  /** Temperatura */
  temperature?: number;
}

// ========================================
// FUNCIÓN PRINCIPAL
// ========================================

/**
 * Clasifica un input contra una lista de candidatos
 * 
 * @param input Texto a clasificar
 * @param candidates Lista de candidatos
 * @param description Descripción de la tarea de clasificación
 * @param options Opciones adicionales
 * @returns Resultado de clasificación con match y candidatos
 * 
 * @example
 * ```typescript
 * const result = await classify(
 *   'nomina_juan_garcia_2024.pdf',
 *   [
 *     { id: '1', label: 'Juan García López' },
 *     { id: '2', label: 'Juan García Martínez' },
 *   ],
 *   'archivo de nómina con empleado'
 * );
 * ```
 */
export async function classify<T = any>(
  input: string,
  candidates: Candidate<T>[],
  description: string,
  options?: ClassificationOptions
): Promise<ClassificationResult<T>> {
  const provider = options?.provider || getPrimaryProvider();
  
  if (!provider) {
    return {
      success: false,
      error: 'No hay proveedores de IA disponibles',
      candidates: [],
      autoAssigned: false,
      provider: AIProvider.OPENAI,
    };
  }
  
  // Construir lista de candidatos
  const candidatesList = candidates
    .map((c, idx) => `${idx + 1}. ${c.label} (ID: ${c.id})`)
    .join('\n');
  
  const topK = options?.topK ?? 5;
  const threshold = options?.confidenceThreshold ?? 75;
  
  const prompt = `Eres un asistente experto en clasificación y matching. Analiza el siguiente ${description} y encuentra el mejor match con la lista de candidatos.

INPUT: "${input}"

CANDIDATOS:
${candidatesList}

${options?.context ? `CONTEXTO:\n${options.context}\n\n` : ''}

INSTRUCCIONES:
1. Analiza el input y compara con cada candidato
2. ${options?.additionalInstructions || 'Encuentra el mejor match considerando similitudes de nombres, palabras clave, etc.'}
3. Asigna un score de confianza (0-100) a cada candidato
4. Si el mejor match tiene ≥${threshold}% de confianza, retorna ese candidato
5. Si no hay match claro, retorna null y lista los top ${topK} candidatos más probables

RESPUESTA (JSON estricto, sin markdown):
{
  "matchId": "ID del candidato o null",
  "confidence": 0-100,
  "reasoning": "Breve explicación del match o por qué no hay match claro",
  "topCandidates": [
    {"id": "ID1", "label": "Label 1", "confidence": 0-100},
    {"id": "ID2", "label": "Label 2", "confidence": 0-100},
    {"id": "ID3", "label": "Label 3", "confidence": 0-100}
  ]
}`;
  
  const messages: AIMessage[] = [
    {
      role: MessageRole.SYSTEM,
      content: 'Eres un asistente experto en clasificación y matching. Siempre responde con JSON válido y estricto.',
    },
    {
      role: MessageRole.USER,
      content: prompt,
    },
  ];
  
  const config = createConfigForUseCase(AIUseCase.CLASSIFICATION, provider, {
    temperature: options?.temperature,
  });
  
  try {
    const response = await callAI(messages, config, {
      responseFormat: 'json_object',
    });
    
    const content = response.choices[0]?.message?.content || '{}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    // Validar con schema
    const schema = z.object({
      matchId: z.string().nullable(),
      confidence: z.number().min(0).max(100),
      reasoning: z.string().optional(),
      topCandidates: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          confidence: z.number().min(0).max(100),
        })
      ).optional(),
    });
    
    const validated = schema.parse(parsed);
    
    // Encontrar el candidato matcheado
    let match: ClassificationMatch<T> | undefined;
    if (validated.matchId && validated.confidence >= threshold) {
      const candidate = candidates.find((c) => c.id === validated.matchId);
      if (candidate) {
        match = {
          id: candidate.id,
          label: candidate.label,
          confidence: validated.confidence,
          metadata: candidate.metadata,
        };
      }
    }
    
    // Mapear top candidates
    const topCandidatesData = (validated.topCandidates || [])
      .slice(0, topK)
      .map((tc) => {
        const candidate = candidates.find((c) => c.id === tc.id);
        return {
          id: tc.id,
          label: candidate?.label || tc.label,
          confidence: tc.confidence,
          metadata: candidate?.metadata,
        };
      });
    
    return {
      success: true,
      match,
      candidates: topCandidatesData,
      autoAssigned: match !== undefined,
      reasoning: validated.reasoning,
      provider: response.provider,
      usage: response.usage,
    };
  } catch (error: any) {
    console.error('[Classification Pattern] Error:', error.message);
    return {
      success: false,
      error: error.message,
      candidates: [],
      autoAssigned: false,
      provider,
    };
  }
}

/**
 * Versión simplificada que retorna solo el mejor match (o null)
 */
export async function classifySimple<T = any>(
  input: string,
  candidates: Candidate<T>[],
  description: string,
  options?: ClassificationOptions
): Promise<ClassificationMatch<T> | null> {
  const result = await classify(input, candidates, description, options);
  return result.match || null;
}

/**
 * Clasificación multi-clase (input puede pertenecer a múltiples categorías)
 */
export async function classifyMulti<T = any>(
  input: string,
  candidates: Candidate<T>[],
  description: string,
  options?: ClassificationOptions
): Promise<ClassificationResult<T>> {
  const provider = options?.provider || getPrimaryProvider();
  
  if (!provider) {
    return {
      success: false,
      error: 'No hay proveedores de IA disponibles',
      candidates: [],
      autoAssigned: false,
      provider: AIProvider.OPENAI,
    };
  }
  
  const candidatesList = candidates
    .map((c, idx) => `${idx + 1}. ${c.label} (ID: ${c.id})`)
    .join('\n');
  
  const threshold = options?.confidenceThreshold ?? 60; // Threshold más bajo para multi-clase
  
  const prompt = `Clasifica el siguiente ${description} en UNA O MÁS categorías de la lista.

INPUT: "${input}"

CATEGORÍAS:
${candidatesList}

${options?.context ? `CONTEXTO:\n${options.context}\n\n` : ''}

INSTRUCCIONES:
1. Analiza el input
2. Identifica TODAS las categorías que aplican (puede ser más de una)
3. Asigna un score de confianza (0-100) a cada categoría que aplique
4. Solo incluye categorías con ≥${threshold}% de confianza

RESPUESTA (JSON):
{
  "matches": [
    {"id": "ID1", "label": "Label 1", "confidence": 0-100},
    {"id": "ID2", "label": "Label 2", "confidence": 0-100}
  ],
  "reasoning": "Explicación"
}`;
  
  const messages: AIMessage[] = [
    {
      role: MessageRole.USER,
      content: prompt,
    },
  ];
  
  const config = createConfigForUseCase(AIUseCase.CLASSIFICATION, provider, {
    temperature: options?.temperature,
  });
  
  try {
    const response = await callAI(messages, config, {
      responseFormat: 'json_object',
    });
    
    const content = response.choices[0]?.message?.content || '{"matches":[]}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    const matches = (parsed.matches || [])
      .filter((m: any) => m.confidence >= threshold)
      .map((m: any) => {
        const candidate = candidates.find((c) => c.id === m.id);
        return {
          id: m.id,
          label: candidate?.label || m.label,
          confidence: m.confidence,
          metadata: candidate?.metadata,
        };
      });
    
    return {
      success: true,
      match: matches[0],
      candidates: matches,
      autoAssigned: matches.length > 0,
      reasoning: parsed.reasoning,
      provider: response.provider,
      usage: response.usage,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      candidates: [],
      autoAssigned: false,
      provider,
    };
  }
}

// ========================================
// HELPERS
// ========================================

/**
 * Matching básico sin IA (fallback)
 * Usa similitud de strings simple
 */
export function matchBasic<T = any>(
  input: string,
  candidates: Candidate<T>[],
  confidenceThreshold: number = 75
): ClassificationResult<T> {
  // Limpiar input
  const cleanInput = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
  
  // Calcular scores
  const scores = candidates.map((candidate) => {
    const cleanLabel = candidate.label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();
    
    const inputWords = cleanInput.split(/\s+/);
    const labelWords = cleanLabel.split(/\s+/);
    
    // Contar palabras que coinciden
    const matches = inputWords.filter((word) =>
      labelWords.some((lw) => lw.includes(word) || word.includes(lw))
    ).length;
    
    const score = Math.round(
      (matches / Math.max(inputWords.length, labelWords.length)) * 100
    );
    
    return {
      id: candidate.id,
      label: candidate.label,
      confidence: score,
      metadata: candidate.metadata,
    };
  });
  
  // Ordenar por score
  scores.sort((a, b) => b.confidence - a.confidence);
  
  const best = scores[0];
  const match = best && best.confidence >= confidenceThreshold ? best : undefined;
  
  return {
    success: true,
    match,
    candidates: scores.slice(0, 5),
    autoAssigned: match !== undefined,
    reasoning: 'Matching básico (sin IA)',
    provider: AIProvider.OPENAI, // Placeholder
  };
}





