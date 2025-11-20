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
 * Modelos disponibles (DEPRECATED)
 * 
 * ⚠️ IMPORTANTE: Este archivo es legacy y se mantiene solo para compatibilidad.
 * Para nuevas implementaciones, usar:
 *   - import { OPENAI_MODELS, ANTHROPIC_MODELS } from '@/lib/ia/core/config'
 *   - import { callAI } from '@/lib/ia'
 *
 * Referencia: https://platform.openai.com/docs/agents/models
 */
export const MODELS = {
  // Modelos recomendados
  GPT_5_1: 'gpt-5.1', // Alto razonamiento + visión
  GPT_5_1_MINI: 'gpt-5.1-mini', // Versión ligera
  
  // Legacy (compatibilidad)
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4O: 'gpt-4o',
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
 * Configuraciones predefinidas por funcionalidad (DEPRECATED)
 * 
 * ⚠️ IMPORTANTE: Para nuevas implementaciones, usar getFeatureConfig() de @/lib/ia/core/config
 * Este objeto se mantiene solo para compatibilidad con código legacy.
 */
export const FUNCTION_CONFIGS: Record<string, ModelConfig> = {
  'cuadrar-vacaciones': {
    model: MODELS.GPT_5_1,
    temperature: 0.3,
    responseFormat: 'json_object',
    systemMessage: 'Eres un asistente experto en optimización de recursos humanos, especializado en planificación de vacaciones.',
  },
  'procesar-excel-empleados': {
    model: MODELS.GPT_5_1,
    temperature: 0.2,
    responseFormat: 'json_object',
    maxTokens: 4000,
    systemMessage: 'Eres un asistente experto en análisis de datos de recursos humanos y mapeo de información de empleados desde hojas de cálculo.',
  },
  'clasificador-nominas': {
    model: MODELS.GPT_5_1_MINI,
    temperature: 0.2,
    responseFormat: 'json_object',
    systemMessage: 'Eres un asistente experto en análisis de nóminas y matching de documentos con empleados.',
  },
  'extraer-documentos': {
    model: MODELS.GPT_5_1,
    temperature: 0.2,
    responseFormat: 'json_object',
    systemMessage: 'Eres un asistente experto en extracción de información de documentos legales y administrativos.',
  },
  'analisis-sentimientos': {
    model: MODELS.GPT_5_1_MINI,
    temperature: 0.4,
    responseFormat: 'json_object',
    systemMessage: 'Eres un asistente experto en análisis de sentimientos y feedback de empleados.',
  },
  'plantillas-resolver-variable': {
    model: MODELS.GPT_5_1_MINI,
    temperature: 0,
    responseFormat: 'json_object',
    maxTokens: 1200,
    systemMessage: 'Eres un experto en mapeo de datos estructurados. Respondes SOLO en JSON válido.',
  },
  'plantillas-mapear-campos-pdf': {
    model: MODELS.GPT_5_1_MINI,
    temperature: 0.1,
    responseFormat: 'json_object',
    maxTokens: 1500,
    systemMessage: 'Eres un asistente experto en mapeo de campos de formularios PDF a variables internas del sistema. Siempre devuelve JSON válido.',
  },
  'plantillas-escanear-pdf': {
    model: MODELS.GPT_5_1,
    temperature: 0.1,
    responseFormat: 'json_object',
    maxTokens: 2000,
    systemMessage: 'Eres un asistente experto en análisis de documentos PDF. Detectas campos rellenables y devuelves resultados estructurados en JSON.',
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
 * Crea una llamada al cliente unificado de IA con la configuración de una funcionalidad
 * Usa fallback automático entre proveedores disponibles (OpenAI, Anthropic, Google)
 *
 * @param functionName Nombre de la funcionalidad
 * @param messages Mensajes para enviar al modelo (formato OpenAI - se convierte automáticamente)
 * @returns Promise con la respuesta del modelo
 * 
 * @example
 * ```typescript
 * const response = await callAIWithConfig('clasificador-nominas', [
 *   { role: 'user', content: 'Clasifica esta nómina...' }
 * ]);
 * console.log(response.choices[0].message.content);
 * ```
 */
export async function callAIWithConfig(
  functionName: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
) {
  const config = getModelConfig(functionName);
  if (!config) {
    throw new Error(`No existe configuración de modelo para la funcionalidad: ${functionName}`);
  }

  // Import del cliente unificado
  const { callAI } = await import('./core/client');
  const { AIProvider, MessageRole: MsgRole } = await import('./core/types');
  
  // Convertir mensajes de formato OpenAI a formato unificado
  const aiMessages: any[] = [];
  
  // Agregar system message si existe
  if (config.systemMessage) {
    aiMessages.push({
      role: MsgRole.SYSTEM,
      content: config.systemMessage,
    });
  }
  
  // Convertir resto de mensajes
  for (const msg of messages) {
    aiMessages.push({
      role: msg.role === 'system' ? MsgRole.SYSTEM : 
            msg.role === 'assistant' ? MsgRole.ASSISTANT : 
            MsgRole.USER,
      content: msg.content,
    });
  }
  
  // Configuración unificada
  const modelConfig = {
    provider: AIProvider.OPENAI, // Prioridad a OpenAI, con fallback automático
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    responseFormat: config.responseFormat,
    metadata: {
      feature: functionName,
      useCase: 'feature-config',
    },
  };
  
  // Llamar al cliente unificado (con fallback automático)
  // modelConfig ya tiene la estructura correcta de ModelConfig del core
  return callAI(aiMessages, modelConfig, {
    responseFormat: config.responseFormat,
    maxTokens: config.maxTokens,
    metadata: {
      feature: functionName,
      useCase: 'feature-config',
    },
  });
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

