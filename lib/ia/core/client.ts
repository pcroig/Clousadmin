// ========================================
// AI Unified Client - Cliente con Fallback Automático
// ========================================
// Cliente centralizado que maneja múltiples proveedores de IA
// con fallback transparente y selección automática

import {
  AIProvider,
  AIMessage,
  AIResponse,
  ModelConfig,
  AICallOptions,
  AIResult,
  AISuccess,
  AIError,
} from './types';
import {
  isOpenAIAvailable,
  callOpenAI,
  getAppropriateModel as getOpenAIModel,
} from './providers/openai';
import {
  isAnthropicAvailable,
  callAnthropic,
  mapToAnthropicModel,
} from './providers/anthropic';
import {
  isGoogleAIAvailable,
  callGoogleAI,
  mapToGoogleModel,
} from './providers/google';

// ========================================
// CONFIGURACIÓN DE PRIORIDADES
// ========================================

/**
 * Prioridad de proveedores (del más preferido al menos)
 * 1. OpenAI - Mejor calidad, más caro
 * 2. Anthropic - Buena calidad, alternativa
 * 3. Google AI - Económico, fallback
 */
const PROVIDER_PRIORITY: AIProvider[] = [
  AIProvider.OPENAI,
  AIProvider.ANTHROPIC,
  AIProvider.GOOGLE,
];

// ========================================
// DETECCIÓN DE PROVEEDORES DISPONIBLES
// ========================================

/**
 * Verifica qué proveedores están disponibles
 */
export function getAvailableProviders(): AIProvider[] {
  const available: AIProvider[] = [];
  
  if (isOpenAIAvailable()) {
    available.push(AIProvider.OPENAI);
  }
  
  if (isAnthropicAvailable()) {
    available.push(AIProvider.ANTHROPIC);
  }
  
  if (isGoogleAIAvailable()) {
    available.push(AIProvider.GOOGLE);
  }
  
  return available;
}

/**
 * Verifica si hay al menos un proveedor disponible
 */
export function isAnyProviderAvailable(): boolean {
  return getAvailableProviders().length > 0;
}

/**
 * Obtiene el proveedor principal disponible (según prioridad)
 */
export function getPrimaryProvider(): AIProvider | null {
  const available = getAvailableProviders();
  
  // Log de debug
  console.info(`[AI Client] Proveedores disponibles: ${available.length > 0 ? available.join(', ') : 'ninguno'}`);
  
  // Retornar el primero disponible según prioridad
  for (const provider of PROVIDER_PRIORITY) {
    if (available.includes(provider)) {
      console.info(`[AI Client] Usando proveedor: ${provider}`);
      return provider;
    }
  }
  
  console.warn('[AI Client] No hay proveedores disponibles. Verifica OPENAI_API_KEY, ANTHROPIC_API_KEY o GOOGLE_AI_API_KEY');
  return null;
}

/**
 * Obtiene el nombre del proveedor activo
 */
export function getActiveProviderName(): string {
  const provider = getPrimaryProvider();
  if (!provider) return 'none';
  
  const names: Record<AIProvider, string> = {
    [AIProvider.OPENAI]: 'OpenAI',
    [AIProvider.ANTHROPIC]: 'Anthropic (Claude)',
    [AIProvider.GOOGLE]: 'Google AI (Gemini)',
  };
  
  return names[provider];
}

// ========================================
// LLAMADAS CON FALLBACK
// ========================================

/**
 * Adapta la configuración del modelo al proveedor específico
 */
function adaptConfigToProvider(config: ModelConfig, provider: AIProvider): ModelConfig {
  let adaptedModel = config.model;
  
  // Si el proveedor no es el mismo que el de la config, mapear el modelo
  if (config.provider !== provider) {
    if (provider === AIProvider.ANTHROPIC) {
      adaptedModel = mapToAnthropicModel(config.model);
    } else if (provider === AIProvider.GOOGLE) {
      adaptedModel = mapToGoogleModel(config.model);
    }
  }
  
  return {
    ...config,
    provider,
    model: adaptedModel,
  };
}

/**
 * Llama a un proveedor específico
 */
async function callProvider(
  provider: AIProvider,
  messages: AIMessage[],
  config: ModelConfig,
  options?: AICallOptions
): Promise<AIResponse> {
  const adaptedConfig = adaptConfigToProvider(config, provider);
  
  switch (provider) {
    case AIProvider.OPENAI:
      // Para OpenAI, verificar si necesita modelo con visión
      const openaiModel = getOpenAIModel(messages, adaptedConfig.model);
      return callOpenAI(messages, { ...adaptedConfig, model: openaiModel }, options);
      
    case AIProvider.ANTHROPIC:
      return callAnthropic(messages, adaptedConfig, options);
      
    case AIProvider.GOOGLE:
      return callGoogleAI(messages, adaptedConfig, options);
      
    default:
      throw new Error(`Proveedor no soportado: ${provider}`);
  }
}

/**
 * Realiza una llamada a IA con fallback automático entre proveedores
 * 
 * @param messages Mensajes a enviar
 * @param config Configuración del modelo
 * @param options Opciones adicionales
 * @returns Respuesta de IA
 * @throws Error si ningún proveedor está disponible o todos fallan
 */
export async function callAI(
  messages: AIMessage[],
  config: ModelConfig,
  options?: AICallOptions
): Promise<AIResponse> {
  const available = getAvailableProviders();
  
  if (available.length === 0) {
    throw new Error(
      'No hay proveedores de IA configurados. ' +
      'Configura al menos uno: OPENAI_API_KEY, ANTHROPIC_API_KEY, o GOOGLE_AI_API_KEY'
    );
  }
  
  // Intentar con cada proveedor disponible (según prioridad)
  const errors: Array<{ provider: AIProvider; error: string }> = [];
  
  for (const provider of PROVIDER_PRIORITY) {
    if (!available.includes(provider)) {
      continue; // Proveedor no disponible, skip
    }
    
    try {
      console.info(`[AI Client] Intentando con proveedor: ${provider}`);
      const response = await callProvider(provider, messages, config, options);
      
      // Éxito - log si hubo fallback
      if (errors.length > 0) {
        console.warn(
          `[AI Client] Fallback exitoso a ${provider} después de ${errors.length} intento(s) fallido(s)`
        );
      }
      
      return response;
    } catch (error: any) {
      console.error(`[AI Client] Error con ${provider}:`, error.message);
      errors.push({
        provider,
        error: error.message,
      });
      
      // Si este era el último proveedor disponible, lanzar error
      const remainingProviders = PROVIDER_PRIORITY.filter(
        (p) => available.includes(p) && !errors.some((e) => e.provider === p)
      );
      
      if (remainingProviders.length === 0) {
        // Todos los proveedores fallaron
        const errorSummary = errors
          .map((e) => `${e.provider}: ${e.error}`)
          .join('; ');
        throw new Error(
          `Todos los proveedores de IA fallaron. Errores: ${errorSummary}`
        );
      }
      
      // Continuar con el siguiente proveedor
      console.info(`[AI Client] Intentando siguiente proveedor...`);
    }
  }
  
  // Esto no debería alcanzarse, pero por seguridad
  throw new Error('Error inesperado en callAI');
}

/**
 * Wrapper de callAI que retorna AIResult (no lanza excepciones)
 */
export async function callAISafe(
  messages: AIMessage[],
  config: ModelConfig,
  options?: AICallOptions
): Promise<AIResult> {
  try {
    const response = await callAI(messages, config, options);
    
    return {
      success: true,
      data: response,
      provider: response.provider,
      usage: response.usage,
      metadata: response.metadata,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
}

// ========================================
// HELPERS DE REINTENTOS
// ========================================

/**
 * Llama a IA con reintentos automáticos
 */
export async function callAIWithRetry(
  messages: AIMessage[],
  config: ModelConfig,
  options?: AICallOptions
): Promise<AIResponse> {
  const maxRetries = options?.retries ?? 2;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callAI(messages, config, options);
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff
        console.warn(`[AI Client] Reintento ${attempt + 1}/${maxRetries} en ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Máximo de reintentos alcanzado');
}

// ========================================
// VALIDACIÓN DE JSON
// ========================================

/**
 * Parsea respuesta JSON con validación y retry automático si falla
 */
export async function callAIForJSON<T = any>(
  messages: AIMessage[],
  config: ModelConfig,
  options?: AICallOptions
): Promise<T> {
  // Asegurar que pedimos JSON
  const jsonOptions: AICallOptions = {
    ...options,
    responseFormat: 'json_object',
  };
  
  const maxAttempts = 2;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await callAI(messages, config, jsonOptions);
    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      // Limpiar respuesta (por si tiene markdown)
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned) as T;
    } catch (error) {
      console.error(`[AI Client] Error parseando JSON (intento ${attempt + 1}):`, error);
      
      if (attempt === maxAttempts - 1) {
        throw new Error(`No se pudo parsear respuesta JSON después de ${maxAttempts} intentos`);
      }
      
      // Agregar mensaje adicional pidiendo JSON válido
      messages.push({
        role: 'assistant' as any,
        content: content,
      });
      messages.push({
        role: 'user' as any,
        content: 'La respuesta anterior no es JSON válido. Por favor, responde SOLO con un objeto JSON válido, sin markdown ni texto adicional.',
      });
    }
  }
  
  throw new Error('Error inesperado en callAIForJSON');
}

// ========================================
// RE-EXPORTS PARA COMPATIBILIDAD
// ========================================

/**
 * @deprecated Usar isAnyProviderAvailable() en su lugar
 */
export function isAIAvailable(): boolean {
  return isAnyProviderAvailable();
}

/**
 * Alias para callAI (para compatibilidad con código existente)
 */
export const getAIClient = {
  chat: {
    completions: {
      create: async (params: {
        model: string;
        messages: any[];
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: string };
      }) => {
        // Convertir a formato unificado
        const aiMessages: AIMessage[] = params.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        
        const config: ModelConfig = {
          provider: AIProvider.OPENAI, // Provider por defecto
          model: params.model,
          temperature: params.temperature,
          maxTokens: params.max_tokens,
          responseFormat: params.response_format?.type === 'json_object' ? 'json_object' : 'text',
        };
        
        return callAI(aiMessages, config);
      },
    },
  },
};

