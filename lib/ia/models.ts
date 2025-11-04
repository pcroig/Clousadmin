// ========================================
// OpenAI Modelos - Configuraciones de Modelos
// ========================================
// Definiciones centralizadas de modelos OpenAI disponibles
// Cada funcionalidad de IA puede usar el modelo apropiado según sus necesidades
//
// Uso:
//   import { MODELS } from '@/lib/ia/models';
//   const model = MODELS.GPT_4O_MINI;
//
//   import { getModelConfig } from '@/lib/ia/models';
//   const config = getModelConfig('cuadrar-vacaciones');

/**
 * Modelos disponibles
 *
 * POLÍTICA ACTUAL:
 * - Todos los modelos usan GPT-4.1 como modelo principal
 * - Fallback a modelo open source si OpenAI no está disponible
 *
 * Referencia: https://platform.openai.com/docs/models
 */
export const MODELS = {
  // Modelo principal - GPT-4.1
  GPT_4_1: 'gpt-4.1',

  // Fallback - Modelo open source (Llama 3.1 70B via Replicate)
  LLAMA_3_1_70B: 'meta/meta-llama-3.1-70b-instruct',

  // Modelos legacy (deprecated - no usar en nuevas implementaciones)
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4O: 'gpt-4o',
  GPT_5: 'gpt-5',
} as const;

/**
 * Tipo de modelo válido
 */
export type ModelName = typeof MODELS[keyof typeof MODELS];

/**
 * Configuración específica de un modelo para una funcionalidad
 */
export interface ModelConfig {
  /** Nombre del modelo de OpenAI */
  model: ModelName;
  /** Temperatura (0-2). Más bajo = más determinístico */
  temperature: number;
  /** Formato de respuesta esperado */
  responseFormat?: 'json_object' | 'text';
  /** Máximo de tokens en la respuesta */
  maxTokens?: number;
  /** Mensaje del sistema (role: system) */
  systemMessage?: string;
}

/**
 * Configuraciones predefinidas por funcionalidad
 *
 * POLÍTICA ACTUAL: Todos usan GPT-4.1 como modelo principal
 * - Temperatura ajustada según necesidad de creatividad/consistencia
 * - Formato de respuesta según el caso de uso
 * - Fallback automático a Llama 3.1 70B si OpenAI no disponible
 */
export const FUNCTION_CONFIGS: Record<string, ModelConfig> = {
  /**
   * Cuadrar Vacaciones
   * - Usa: GPT-4.1 (mejor razonamiento para optimización compleja)
   * - Temperatura baja: resultados determinísticos y reproducibles
   */
  'cuadrar-vacaciones': {
    model: MODELS.GPT_4_1,
    temperature: 0.3,
    responseFormat: 'json_object',
    systemMessage: 'Eres un asistente experto en optimización de recursos humanos, especializado en planificación de vacaciones.',
  },

  /**
   * Clasificador de Fichajes
   * - Usa: GPT-4.1 (mejor análisis de patrones complejos)
   * - Temperatura media: permite cierta variabilidad en clasificaciones
   */
  'clasificador-fichajes': {
    model: MODELS.GPT_4_1,
    temperature: 0.5,
    responseFormat: 'json_object',
    systemMessage: 'Eres un asistente experto en análisis de fichajes laborales y detección de anomalías en registros de tiempo.',
  },

  /**
   * Procesar Excel de Empleados
   * - Usa: GPT-4.1 (mejor comprensión de estructuras complejas)
   * - Temperatura baja: mapeos consistentes y precisos
   */
  'procesar-excel-empleados': {
    model: MODELS.GPT_4_1,
    temperature: 0.2,
    responseFormat: 'json_object',
    maxTokens: 4000,
    systemMessage: 'Eres un asistente experto en análisis de datos de recursos humanos y mapeo de información de empleados desde hojas de cálculo.',
  },

  /**
   * Clasificador de Nóminas
   * - Usa: GPT-4.1 (mejor matching inteligente)
   * - Temperatura baja: clasificaciones precisas
   */
  'clasificador-nominas': {
    model: MODELS.GPT_4_1,
    temperature: 0.2,
    responseFormat: 'json_object',
    systemMessage: 'Eres un asistente experto en análisis de nóminas y matching de documentos con empleados.',
  },

  /**
   * Extracción de Documentos
   * - Usa: GPT-4.1 (mejor comprensión de contexto visual)
   * - Temperatura baja: extracciones precisas y consistentes
   */
  'extraer-documentos': {
    model: MODELS.GPT_4_1,
    temperature: 0.2,
    responseFormat: 'json_object',
    systemMessage: 'Eres un asistente experto en extracción de información de documentos legales y administrativos.',
  },

  /**
   * Análisis de Sentimientos
   * - Usa: GPT-4.1 (mejor comprensión del lenguaje y contexto)
   * - Temperatura media: permite matices en análisis
   */
  'analisis-sentimientos': {
    model: MODELS.GPT_4_1,
    temperature: 0.4,
    responseFormat: 'json_object',
    systemMessage: 'Eres un asistente experto en análisis de sentimientos y feedback de empleados.',
  },
} as const;

/**
 * Obtiene la configuración de modelo para una funcionalidad específica
 * 
 * @param functionName Nombre de la funcionalidad (clave en FUNCTION_CONFIGS)
 * @returns Configuración del modelo o undefined si no existe
 * 
 * @example
 * ```typescript
 * const config = getModelConfig('cuadrar-vacaciones');
 * // { model: 'gpt-4o-mini', temperature: 0.3, ... }
 * ```
 */
export function getModelConfig(functionName: string): ModelConfig | undefined {
  return FUNCTION_CONFIGS[functionName];
}

/**
 * Obtiene la configuración de modelo para una funcionalidad o una configuración por defecto
 * 
 * @param functionName Nombre de la funcionalidad
 * @param defaultConfig Configuración por defecto si no existe
 * @returns Configuración del modelo
 */
export function getModelConfigOrDefault(
  functionName: string,
  defaultConfig: ModelConfig
): ModelConfig {
  return FUNCTION_CONFIGS[functionName] || defaultConfig;
}

/**
 * Crea una llamada estándar al cliente de IA con la configuración de una funcionalidad
 * Usa fallback automático si OpenAI no está disponible
 *
 * @param functionName Nombre de la funcionalidad
 * @param messages Mensajes para enviar al modelo
 * @returns Promise con la respuesta del modelo
 */
export async function callAIWithConfig(
  functionName: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
) {
  const config = getModelConfig(functionName);
  if (!config) {
    throw new Error(`No existe configuración de modelo para la funcionalidad: ${functionName}`);
  }

  // Import dinámico desde punto de entrada centralizado para evitar circular deps
  const { getAIClient } = await import('./index');
  const client = getAIClient();

  const completionConfig: OpenAI.Chat.ChatCompletionCreateParams = {
    model: config.model,
    messages: config.systemMessage
      ? [
          { role: 'system', content: config.systemMessage },
          ...messages,
        ]
      : messages,
    temperature: config.temperature,
  };

  if (config.responseFormat) {
    completionConfig.response_format = { type: config.responseFormat };
  }

  if (config.maxTokens) {
    completionConfig.max_tokens = config.maxTokens;
  }

  return client.chat.completions.create(completionConfig as any);
}

/**
 * @deprecated Usar callAIWithConfig() en su lugar
 */
export async function callOpenAIWithConfig(
  functionName: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
) {
  return callAIWithConfig(functionName, messages);
}

// Import type para TypeScript
import type OpenAI from 'openai';

