// ========================================
// Generation Pattern
// ========================================
// Patrón reutilizable para generación de texto
// Soporta diferentes estilos, formatos y casos de uso

import { callAI, getPrimaryProvider } from '../core/client';
import { AIMessage, MessageRole, AIProvider } from '../core/types';
import { createConfigForUseCase, AIUseCase } from '../core/config';

// ========================================
// TIPOS
// ========================================

/**
 * Opciones para generación de texto
 */
export interface GenerationOptions {
  /** Proveedor específico a usar */
  provider?: AIProvider;
  
  /** Temperatura (creatividad) */
  temperature?: number;
  
  /** Máximo de tokens */
  maxTokens?: number;
  
  /** Instrucciones del sistema */
  systemMessage?: string;
  
  /** Contexto adicional */
  context?: string;
  
  /** Formato de salida */
  format?: 'text' | 'markdown' | 'html' | 'json';
  
  /** Tono (formal, casual, profesional, etc.) */
  tone?: string;
  
  /** Ejemplos para few-shot learning */
  examples?: Array<{ input: string; output: string }>;
}

/**
 * Resultado de generación
 */
export interface GenerationResult {
  success: boolean;
  text?: string;
  error?: string;
  provider: AIProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ========================================
// FUNCIÓN PRINCIPAL
// ========================================

/**
 * Genera texto usando IA
 * 
 * @param prompt Prompt o instrucción
 * @param options Opciones adicionales
 * @returns Texto generado
 * 
 * @example
 * ```typescript
 * const result = await generateText(
 *   'Escribe un resumen de las ausencias del mes',
 *   {
 *     context: 'Empleado: Juan García. Ausencias: 3 días de vacaciones.',
 *     tone: 'profesional',
 *   }
 * );
 * ```
 */
export async function generateText(
  prompt: string,
  options?: GenerationOptions
): Promise<GenerationResult> {
  const provider = options?.provider || getPrimaryProvider();
  
  if (!provider) {
    return {
      success: false,
      error: 'No hay proveedores de IA disponibles',
      provider: AIProvider.OPENAI,
    };
  }
  
  // Construir mensajes
  const messages: AIMessage[] = [];
  
  // System message (si se proporciona)
  if (options?.systemMessage) {
    messages.push({
      role: MessageRole.SYSTEM,
      content: options.systemMessage,
    });
  }
  
  // Ejemplos (few-shot learning)
  if (options?.examples && options.examples.length > 0) {
    for (const example of options.examples) {
      messages.push({
        role: MessageRole.USER,
        content: example.input,
      });
      messages.push({
        role: MessageRole.ASSISTANT,
        content: example.output,
      });
    }
  }
  
  // Construir prompt principal
  let fullPrompt = prompt;
  
  if (options?.context) {
    fullPrompt = `CONTEXTO:\n${options.context}\n\n${prompt}`;
  }
  
  if (options?.tone) {
    fullPrompt += `\n\nTONO: ${options.tone}`;
  }
  
  if (options?.format && options.format !== 'text') {
    fullPrompt += `\n\nFORMATO: Responde en ${options.format}`;
  }
  
  messages.push({
    role: MessageRole.USER,
    content: fullPrompt,
  });
  
  // Configuración del modelo
  const config = createConfigForUseCase(AIUseCase.GENERATION, provider, {
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });
  
  try {
    const response = await callAI(messages, config, {
      responseFormat: options?.format === 'json' ? 'json_object' : 'text',
    });
    
    const text = response.choices[0]?.message?.content || '';
    
    return {
      success: true,
      text,
      provider: response.provider,
      usage: response.usage,
    };
  } catch (error: any) {
    console.error('[Generation Pattern] Error:', error.message);
    return {
      success: false,
      error: error.message,
      provider,
    };
  }
}

/**
 * Versión simplificada que lanza excepción en caso de error
 */
export async function generateTextOrThrow(
  prompt: string,
  options?: GenerationOptions
): Promise<string> {
  const result = await generateText(prompt, options);
  
  if (!result.success || !result.text) {
    throw new Error(result.error || 'Error en generación');
  }
  
  return result.text;
}

// ========================================
// FUNCIONES ESPECÍFICAS
// ========================================

/**
 * Genera un resumen de un texto
 */
export async function summarizeText(
  text: string,
  maxLength?: number,
  options?: Omit<GenerationOptions, 'context'>
): Promise<GenerationResult> {
  const lengthInstruction = maxLength
    ? ` en máximo ${maxLength} palabras`
    : '';
  
  return generateText(
    `Resume el siguiente texto${lengthInstruction}:`,
    {
      ...options,
      context: text,
      systemMessage: 'Eres un asistente experto en crear resúmenes claros y concisos.',
    }
  );
}

/**
 * Reescribe un texto en un tono diferente
 */
export async function rewriteText(
  text: string,
  targetTone: string,
  options?: Omit<GenerationOptions, 'context' | 'tone'>
): Promise<GenerationResult> {
  return generateText(
    `Reescribe el siguiente texto con un tono ${targetTone}:`,
    {
      ...options,
      context: text,
      tone: targetTone,
      systemMessage: 'Eres un asistente experto en redacción y adaptación de tono.',
    }
  );
}

/**
 * Traduce un texto
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  options?: Omit<GenerationOptions, 'context'>
): Promise<GenerationResult> {
  return generateText(
    `Traduce el siguiente texto a ${targetLanguage}:`,
    {
      ...options,
      context: text,
      temperature: 0.3, // Baja para mayor fidelidad
      systemMessage: `Eres un traductor experto. Traduce con precisión manteniendo el significado original.`,
    }
  );
}

/**
 * Expande un texto con más detalles
 */
export async function expandText(
  text: string,
  targetLength?: number,
  options?: Omit<GenerationOptions, 'context'>
): Promise<GenerationResult> {
  const lengthInstruction = targetLength
    ? ` hasta aproximadamente ${targetLength} palabras`
    : '';
  
  return generateText(
    `Expande el siguiente texto con más detalles${lengthInstruction}:`,
    {
      ...options,
      context: text,
      systemMessage: 'Eres un asistente experto en expandir y detallar textos manteniendo coherencia.',
    }
  );
}

/**
 * Genera recomendaciones o sugerencias
 */
export async function generateRecommendations(
  situation: string,
  numberOfRecommendations: number = 3,
  options?: Omit<GenerationOptions, 'context'>
): Promise<GenerationResult> {
  return generateText(
    `Genera ${numberOfRecommendations} recomendaciones para la siguiente situación:`,
    {
      ...options,
      context: situation,
      systemMessage: 'Eres un asesor experto. Proporciona recomendaciones prácticas y accionables.',
    }
  );
}

/**
 * Genera un análisis o evaluación
 */
export async function analyzeAndEvaluate(
  subject: string,
  criteria: string[],
  options?: Omit<GenerationOptions, 'context'>
): Promise<GenerationResult> {
  const criteriaList = criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
  
  return generateText(
    `Analiza y evalúa lo siguiente según estos criterios:\n\n${criteriaList}`,
    {
      ...options,
      context: subject,
      systemMessage: 'Eres un analista experto. Proporciona evaluaciones objetivas y bien fundamentadas.',
    }
  );
}

/**
 * Completa un texto parcial
 */
export async function completeText(
  partialText: string,
  options?: Omit<GenerationOptions, 'context'>
): Promise<GenerationResult> {
  return generateText(
    'Completa el siguiente texto de forma coherente y natural:',
    {
      ...options,
      context: partialText,
      systemMessage: 'Eres un asistente de escritura. Completa textos manteniendo el estilo y coherencia.',
    }
  );
}

/**
 * Genera un email formal
 */
export async function generateEmail(
  recipient: string,
  subject: string,
  keyPoints: string[],
  options?: GenerationOptions
): Promise<GenerationResult> {
  const pointsList = keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n');
  
  return generateText(
    `Escribe un email formal a ${recipient} sobre: ${subject}
    
Puntos clave a incluir:
${pointsList}`,
    {
      ...options,
      tone: 'profesional y cortés',
      systemMessage: 'Eres un asistente experto en redacción de emails profesionales.',
    }
  );
}

/**
 * Genera respuestas a preguntas frecuentes
 */
export async function generateFAQAnswer(
  question: string,
  context: string,
  options?: Omit<GenerationOptions, 'context'>
): Promise<GenerationResult> {
  return generateText(
    `Responde a la siguiente pregunta de forma clara y completa:

PREGUNTA: ${question}`,
    {
      ...options,
      context,
      tone: 'claro y útil',
      systemMessage: 'Eres un asistente de atención al cliente. Proporciona respuestas claras y útiles.',
    }
  );
}






