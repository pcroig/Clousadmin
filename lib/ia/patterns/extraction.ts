// ========================================
// Extraction Pattern
// ========================================
// Patrón reutilizable para extraer datos estructurados
// Usa Zod para validación de schema y retry automático

import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyZodObject = z.ZodObject<any, any>;

import { callAI, getPrimaryProvider } from '../core/client';
import { AIUseCase, createConfigForUseCase } from '../core/config';
import { AIMessage, AIProvider, MessageRole } from '../core/types';

// ========================================
// TIPOS
// ========================================

/**
 * Opciones para extracción de datos
 */
export interface ExtractionOptions {
  /** Proveedor específico a usar (opcional, usa el primario por defecto) */
  provider?: AIProvider;
  
  /** Temperatura (override) */
  temperature?: number;
  
  /** Máximo de tokens (override) */
  maxTokens?: number;
  
  /** Instrucciones adicionales */
  additionalInstructions?: string;
  
  /** Contexto adicional para el modelo */
  context?: string;
  
  /** Número de reintentos si falla validación */
  retries?: number;
}

/**
 * Resultado de extracción
 */
export interface ExtractionResult<T> {
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
 * Extrae datos estructurados desde texto usando IA
 * 
 * @param input Texto de entrada
 * @param schema Schema de Zod para validar el output
 * @param fields Descripción de los campos a extraer
 * @param options Opciones adicionales
 * @returns Datos extraídos y validados
 * 
 * @example
 * ```typescript
 * const schema = z.object({
 *   nombre: z.string(),
 *   email: z.string().email(),
 *   edad: z.number().optional(),
 * });
 * 
 * const result = await extractStructuredData(
 *   'Mi nombre es Juan, email juan@example.com',
 *   schema,
 *   { nombre: 'Nombre completo', email: 'Email', edad: 'Edad (opcional)' }
 * );
 * ```
 */
export async function extractStructuredData<T extends z.ZodType>(
  input: string,
  schema: T,
  fields: Record<string, string>,
  options?: ExtractionOptions
): Promise<ExtractionResult<z.infer<T>>> {
  const provider = options?.provider || getPrimaryProvider();
  
  if (!provider) {
    return {
      success: false,
      error: 'No hay proveedores de IA disponibles',
      provider: AIProvider.OPENAI, // Fallback
    };
  }
  
  // Construir prompt para extracción
  const fieldsList = Object.entries(fields)
    .map(([key, desc]) => `- ${key}: ${desc}`)
    .join('\n');
  
  const prompt = `Extrae la siguiente información del texto proporcionado:

${fieldsList}

${options?.additionalInstructions ? `\nINSTRUCCIONES ADICIONALES:\n${options.additionalInstructions}\n` : ''}

TEXTO:
${input}

${options?.context ? `\nCONTEXTO:\n${options.context}\n` : ''}

Responde SOLO con un objeto JSON válido. Si algún campo no está disponible, no lo incluyas en el JSON.

Ejemplo de respuesta:
{
  "campo1": "valor1",
  "campo2": "valor2"
}`;
  
  const messages: AIMessage[] = [
    {
      role: MessageRole.USER,
      content: prompt,
    },
  ];
  
  // Configuración del modelo
  const config = createConfigForUseCase(AIUseCase.EXTRACTION, provider, {
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });
  
  const maxRetries = options?.retries ?? 2;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Llamar a IA
      const response = await callAI(messages, config, {
        responseFormat: 'json_object',
      });
      
      // Parsear respuesta
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Extraction Pattern] Error (intento ${attempt + 1}):`, message);
      
      if (attempt === maxRetries) {
        return {
          success: false,
          error: `Error después de ${maxRetries + 1} intentos: ${message}`,
          provider,
        };
      }
      
      // Agregar feedback para el siguiente intento
      messages.push({
        role: MessageRole.ASSISTANT,
        content: JSON.stringify(message),
      });
      messages.push({
        role: MessageRole.USER,
        content: 'La respuesta anterior no es válida. Por favor, responde SOLO con un objeto JSON válido que cumpla con el formato especificado.',
      });
    }
  }
  
  return {
    success: false,
    error: 'Error inesperado en extractStructuredData',
    provider,
  };
}

/**
 * Versión simplificada que lanza excepción en caso de error
 */
export async function extractStructuredDataOrThrow<T extends z.ZodType>(
  input: string,
  schema: T,
  fields: Record<string, string>,
  options?: ExtractionOptions
): Promise<z.infer<T>> {
  const result = await extractStructuredData(input, schema, fields, options);
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Error en extracción');
  }
  
  return result.data;
}

// ========================================
// HELPERS ESPECÍFICOS
// ========================================

/**
 * Extrae información de una lista (múltiples items)
 */
export async function extractList<T extends z.ZodType>(
  input: string,
  itemSchema: T,
  itemDescription: string,
  options?: ExtractionOptions
): Promise<ExtractionResult<Array<z.infer<T>>>> {
  const provider = options?.provider || getPrimaryProvider();
  
  if (!provider) {
    return {
      success: false,
      error: 'No hay proveedores de IA disponibles',
      provider: AIProvider.OPENAI,
    };
  }
  
  const prompt = `Extrae TODOS los ${itemDescription} del siguiente texto.

TEXTO:
${input}

${options?.context ? `\nCONTEXTO:\n${options.context}\n` : ''}

Responde SOLO con un objeto JSON válido con el siguiente formato:
{
  "items": [
    { /* datos del item 1 */ },
    { /* datos del item 2 */ },
    ...
  ]
}

Si no encuentras ningún item, retorna un array vacío: { "items": [] }`;
  
  const messages: AIMessage[] = [
    {
      role: MessageRole.USER,
      content: prompt,
    },
  ];
  
  const config = createConfigForUseCase(AIUseCase.EXTRACTION, provider, {
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });
  
  try {
    const response = await callAI(messages, config, {
      responseFormat: 'json_object',
    });
    
    const content = response.choices[0]?.message?.content || '{"items":[]}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    // Validar cada item
    const listSchema = z.object({
      items: z.array(itemSchema),
    });
    
    const validated = listSchema.parse(parsed);
    
    return {
      success: true,
      data: validated.items,
      provider: response.provider,
      usage: response.usage,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
      provider,
    };
  }
}

/**
 * Extrae datos con campos opcionales (más flexible)
 */
export async function extractPartialData<T extends AnyZodObject>(
  input: string,
  schema: T,
  fields: Record<string, string>,
  options?: ExtractionOptions
): Promise<ExtractionResult<Partial<z.infer<T>>>> {
  // Hacer todos los campos opcionales
  const partialSchema = schema.partial();
  
  return extractStructuredData(input, partialSchema, fields, options) as Promise<
    ExtractionResult<Partial<z.infer<T>>>
  >;
}










