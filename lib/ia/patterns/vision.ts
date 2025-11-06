// ========================================
// Vision Pattern
// ========================================
// Patrón reutilizable para análisis de documentos e imágenes
// Soporta OCR, extracción estructurada, y análisis semántico

import { z } from 'zod';
import { callAI, getPrimaryProvider } from '../core/client';
import { AIMessage, MessageRole, AIProvider, ContentType } from '../core/types';
import { createConfigForUseCase, AIUseCase } from '../core/config';

// ========================================
// TIPOS
// ========================================

/**
 * Opciones para análisis de documento
 */
export interface DocumentAnalysisOptions {
  /** Proveedor específico a usar */
  provider?: AIProvider;
  
  /** Calidad de la imagen (low, auto, high) */
  imageDetail?: 'low' | 'auto' | 'high';
  
  /** Temperatura */
  temperature?: number;
  
  /** Máximo de tokens */
  maxTokens?: number;
  
  /** Instrucciones adicionales */
  additionalInstructions?: string;
  
  /** Contexto adicional */
  context?: string;
  
  /** Número de reintentos */
  retries?: number;
  
  /** Nombre del archivo (útil para PDFs en base64) */
  filename?: string;
}

/**
 * Resultado de análisis de documento
 */
export interface DocumentAnalysisResult<T = any> {
  success: boolean;
  data?: T;
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
 * Analiza un documento (imagen o PDF) y extrae datos estructurados
 * 
 * @param documentUrl URL pública del documento (imagen o PDF) o data URI base64
 *                    - URL: 'https://bucket.s3.amazonaws.com/dni.jpg'
 *                    - Base64: 'data:application/pdf;base64,JVBERi0xLjQK...' (para desarrollo local)
 * @param schema Schema Zod para validar los datos extraídos
 * @param fields Descripción de los campos a extraer
 * @param options Opciones adicionales
 * @returns Datos extraídos del documento
 * 
 * @example
 * ```typescript
 * const schema = z.object({
 *   nombre: z.string(),
 *   nif: z.string(),
 *   fechaNacimiento: z.string().optional(),
 * });
 * 
 * // Con URL pública (producción)
 * const result = await analyzeDocument(
 *   'https://bucket.s3.amazonaws.com/dni.jpg',
 *   schema,
 *   {
 *     nombre: 'Nombre completo',
 *     nif: 'NIF/DNI/NIE',
 *     fechaNacimiento: 'Fecha de nacimiento',
 *   }
 * );
 * 
 * // Con base64 (desarrollo local)
 * const base64 = 'data:application/pdf;base64,JVBERi0xLjQK...';
 * const result = await analyzeDocument(base64, schema, fields);
 * ```
 */
export async function analyzeDocument<T extends z.ZodType>(
  documentUrl: string,
  schema: T,
  fields: Record<string, string>,
  options?: DocumentAnalysisOptions
): Promise<DocumentAnalysisResult<z.infer<T>>> {
  const provider = options?.provider || getPrimaryProvider();
  
  if (!provider) {
    return {
      success: false,
      error: 'No hay proveedores de IA disponibles',
      provider: AIProvider.OPENAI,
    };
  }
  
  // Construir lista de campos
  const fieldsList = Object.entries(fields)
    .map(([key, desc]) => `- ${key}: ${desc}`)
    .join('\n');
  
  const prompt = `Analiza este documento y extrae los siguientes datos:

${fieldsList}

${options?.additionalInstructions ? `\nINSTRUCCIONES ADICIONALES:\n${options.additionalInstructions}\n` : ''}

${options?.context ? `CONTEXTO:\n${options.context}\n` : ''}

Responde SOLO con un objeto JSON válido. Si algún campo no está visible o disponible, no lo incluyas en el JSON.

Ejemplo de respuesta:
{
  "campo1": "valor1",
  "campo2": "valor2"
}`;
  
  // Determinar si es un file_id de OpenAI (formato: "file-xxx")
  const isFileId = documentUrl.startsWith('file-');
  // Determinar si es un PDF en base64
  const isPDFBase64 = documentUrl.startsWith('data:application/pdf;base64,');
  
  // Construir el objeto image_url con filename si es PDF
  const imageUrlContent = {
    url: documentUrl,
    detail: options?.imageDetail || 'high',
    ...(isPDFBase64 && { filename: options?.filename || 'document.pdf' }), // Agregar filename para PDFs
  };
  
  const messages: AIMessage[] = [
    {
      role: MessageRole.USER,
      content: [
        {
          type: ContentType.TEXT,
          text: prompt,
        },
        {
          type: ContentType.IMAGE_URL,
          image_url: imageUrlContent as any, // Type assertion para incluir filename opcional
        },
      ],
    },
  ];
  
  const config = createConfigForUseCase(AIUseCase.VISION, provider, {
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });
  
  const maxRetries = options?.retries ?? 2;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await callAI(messages, config, {
        responseFormat: 'json_object',
      });
      
      const content = response.choices[0]?.message?.content || '{}';
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      // Validar con schema
      const validated = schema.parse(parsed);
      
      return {
        success: true,
        data: validated,
        provider: response.provider,
        usage: response.usage,
      };
    } catch (error: any) {
      console.error(`[Vision Pattern] Error (intento ${attempt + 1}):`, error.message);
      
      if (attempt === maxRetries) {
        return {
          success: false,
          error: `Error después de ${maxRetries + 1} intentos: ${error.message}`,
          provider,
        };
      }
      
      // Agregar feedback para el siguiente intento
      messages.push({
        role: MessageRole.ASSISTANT,
        content: JSON.stringify(error.message),
      });
      messages.push({
        role: MessageRole.USER,
        content: 'La respuesta anterior no es válida. Por favor, responde SOLO con un objeto JSON válido que cumpla con el formato especificado.',
      });
    }
  }
  
  return {
    success: false,
    error: 'Error inesperado en analyzeDocument',
    provider,
  };
}

/**
 * Versión simplificada que lanza excepción en caso de error
 */
export async function analyzeDocumentOrThrow<T extends z.ZodType>(
  documentUrl: string,
  schema: T,
  fields: Record<string, string>,
  options?: DocumentAnalysisOptions
): Promise<z.infer<T>> {
  const result = await analyzeDocument(documentUrl, schema, fields, options);
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Error en análisis de documento');
  }
  
  return result.data;
}

// ========================================
// FUNCIONES ESPECÍFICAS
// ========================================

/**
 * Extrae texto plano de un documento (OCR)
 */
export async function extractTextFromDocument(
  documentUrl: string,
  options?: DocumentAnalysisOptions
): Promise<DocumentAnalysisResult<string>> {
  const provider = options?.provider || getPrimaryProvider();
  
  if (!provider) {
    return {
      success: false,
      error: 'No hay proveedores de IA disponibles',
      provider: AIProvider.OPENAI,
    };
  }
  
  const messages: AIMessage[] = [
    {
      role: MessageRole.USER,
      content: [
        {
          type: ContentType.TEXT,
          text: 'Extrae TODO el texto visible en este documento. Mantén el formato y la estructura lo mejor posible.',
        },
        {
          type: ContentType.IMAGE_URL,
          image_url: {
            url: documentUrl,
            detail: options?.imageDetail || 'high',
          },
        },
      ],
    },
  ];
  
  const config = createConfigForUseCase(AIUseCase.VISION, provider, {
    temperature: 0.1, // Muy bajo para máxima fidelidad
    maxTokens: options?.maxTokens,
  });
  
  try {
    const response = await callAI(messages, config);
    const text = response.choices[0]?.message?.content || '';
    
    return {
      success: true,
      data: text,
      provider: response.provider,
      usage: response.usage,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      provider,
    };
  }
}

/**
 * Analiza un documento y retorna descripción general
 */
export async function describeDocument(
  documentUrl: string,
  options?: DocumentAnalysisOptions
): Promise<DocumentAnalysisResult<string>> {
  const provider = options?.provider || getPrimaryProvider();
  
  if (!provider) {
    return {
      success: false,
      error: 'No hay proveedores de IA disponibles',
      provider: AIProvider.OPENAI,
    };
  }
  
  const prompt = options?.additionalInstructions || 
    'Describe este documento. ¿Qué tipo de documento es? ¿Qué información contiene?';
  
  const messages: AIMessage[] = [
    {
      role: MessageRole.USER,
      content: [
        {
          type: ContentType.TEXT,
          text: prompt,
        },
        {
          type: ContentType.IMAGE_URL,
          image_url: {
            url: documentUrl,
            detail: options?.imageDetail || 'auto',
          },
        },
      ],
    },
  ];
  
  const config = createConfigForUseCase(AIUseCase.VISION, provider, {
    temperature: options?.temperature ?? 0.3,
    maxTokens: options?.maxTokens ?? 500,
  });
  
  try {
    const response = await callAI(messages, config);
    const description = response.choices[0]?.message?.content || '';
    
    return {
      success: true,
      data: description,
      provider: response.provider,
      usage: response.usage,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      provider,
    };
  }
}

/**
 * Verifica si un documento cumple con ciertos criterios
 */
export async function validateDocument(
  documentUrl: string,
  criteria: string[],
  options?: DocumentAnalysisOptions
): Promise<DocumentAnalysisResult<{ valid: boolean; issues: string[] }>> {
  const provider = options?.provider || getPrimaryProvider();
  
  if (!provider) {
    return {
      success: false,
      error: 'No hay proveedores de IA disponibles',
      provider: AIProvider.OPENAI,
    };
  }
  
  const criteriaList = criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
  
  const messages: AIMessage[] = [
    {
      role: MessageRole.USER,
      content: [
        {
          type: ContentType.TEXT,
          text: `Verifica si este documento cumple con los siguientes criterios:

${criteriaList}

Responde con JSON:
{
  "valid": true o false,
  "issues": ["lista", "de", "problemas"] // vacío si valid=true
}`,
        },
        {
          type: ContentType.IMAGE_URL,
          image_url: {
            url: documentUrl,
            detail: options?.imageDetail || 'high',
          },
        },
      ],
    },
  ];
  
  const config = createConfigForUseCase(AIUseCase.VISION, provider, {
    temperature: 0.2,
  });
  
  try {
    const response = await callAI(messages, config, {
      responseFormat: 'json_object',
    });
    
    const content = response.choices[0]?.message?.content || '{"valid":false,"issues":[]}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    const schema = z.object({
      valid: z.boolean(),
      issues: z.array(z.string()),
    });
    
    const validated = schema.parse(parsed);
    
    return {
      success: true,
      data: validated,
      provider: response.provider,
      usage: response.usage,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      provider,
    };
  }
}

/**
 * Compara dos documentos
 */
export async function compareDocuments(
  documentUrl1: string,
  documentUrl2: string,
  options?: DocumentAnalysisOptions
): Promise<DocumentAnalysisResult<{ similarities: string[]; differences: string[] }>> {
  const provider = options?.provider || getPrimaryProvider();
  
  if (!provider) {
    return {
      success: false,
      error: 'No hay proveedores de IA disponibles',
      provider: AIProvider.OPENAI,
    };
  }
  
  const messages: AIMessage[] = [
    {
      role: MessageRole.USER,
      content: [
        {
          type: ContentType.TEXT,
          text: `Compara estos dos documentos. ¿Qué similitudes y diferencias hay?

Responde con JSON:
{
  "similarities": ["lista", "de", "similitudes"],
  "differences": ["lista", "de", "diferencias"]
}`,
        },
        {
          type: ContentType.IMAGE_URL,
          image_url: {
            url: documentUrl1,
            detail: options?.imageDetail || 'auto',
          },
        },
        {
          type: ContentType.IMAGE_URL,
          image_url: {
            url: documentUrl2,
            detail: options?.imageDetail || 'auto',
          },
        },
      ],
    },
  ];
  
  const config = createConfigForUseCase(AIUseCase.VISION, provider, {
    temperature: 0.3,
  });
  
  try {
    const response = await callAI(messages, config, {
      responseFormat: 'json_object',
    });
    
    const content = response.choices[0]?.message?.content || '{"similarities":[],"differences":[]}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    return {
      success: true,
      data: parsed,
      provider: response.provider,
      usage: response.usage,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      provider,
    };
  }
}

