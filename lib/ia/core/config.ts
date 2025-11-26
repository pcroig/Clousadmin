// ========================================
// AI Core - Configuración de Modelos
// ========================================
// Configuraciones centralizadas para casos de uso específicos
// Mapeo de funcionalidades a modelos óptimos por proveedor

import { AIProvider, ModelConfig } from './types';

// ========================================
// MODELOS DISPONIBLES POR PROVEEDOR
// ========================================

/**
 * Modelos de OpenAI
 * Referencia: https://platform.openai.com/docs/agents/models
 */
export const OPENAI_MODELS = {
  // Modelos recomendados (Responses API)
  GPT_5_1: 'gpt-5.1', // Modelo principal - reasoning + visión
  GPT_5_1_MINI: 'gpt-5.1-mini', // Versión mini - bajo costo

  // Alias legacy (mantener para compatibilidad con código antiguo)
  GPT_4_1: 'gpt-4.1',
  GPT_4_1_MINI: 'gpt-4.1-mini-2025-04-14',
  GPT_5: 'gpt-5',
  GPT_5_MINI: 'gpt-5-mini',
  GPT_5_NANO: 'gpt-5-nano',
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo-preview',
  GPT_4: 'gpt-4',
  GPT_3_5_TURBO: 'gpt-3.5-turbo',
} as const;

/**
 * Modelos de Anthropic (Claude)
 * Referencia: https://docs.anthropic.com/en/docs/about-claude/models
 */
export const ANTHROPIC_MODELS = {
  // Modelos Claude 4.x (última generación)
  CLAUDE_SONNET_4_5: 'claude-sonnet-4-5', // Alias - mejor para agentes y coding
  CLAUDE_HAIKU_4_5: 'claude-haiku-4-5', // Alias - más rápido con inteligencia near-frontier
  CLAUDE_OPUS_4_1: 'claude-opus-4-1', // Alias - razonamiento especializado
  
  // IDs específicos (con snapshot date) - recomendado para producción
  CLAUDE_SONNET_4_5_20250929: 'claude-sonnet-4-5-20250929',
  CLAUDE_HAIKU_4_5_20251001: 'claude-haiku-4-5-20251001',
  CLAUDE_OPUS_4_1_20250805: 'claude-opus-4-1-20250805',
  
  // Modelos legacy
  CLAUDE_3_5_SONNET: 'claude-3-5-sonnet-20241022',
  CLAUDE_3_5_HAIKU: 'claude-3-5-haiku-20241022',
  CLAUDE_3_OPUS: 'claude-3-opus-20240229',
} as const;

/**
 * Modelos de Google AI (Gemini)
 */
export const GOOGLE_MODELS = {
  GEMINI_1_5_PRO: 'gemini-1.5-pro-latest',
  GEMINI_1_5_FLASH: 'gemini-1.5-flash-latest',
  GEMINI_1_0_PRO: 'gemini-1.0-pro-latest',
} as const;

// ========================================
// CASOS DE USO
// ========================================

/**
 * Casos de uso soportados
 */
export enum AIUseCase {
  // Extracción de datos estructurados
  EXTRACTION = 'extraction',
  
  // Clasificación y matching
  CLASSIFICATION = 'classification',
  
  // Planificación y optimización
  PLANNING = 'planning',
  
  // Análisis de documentos con visión
  VISION = 'vision',
  
  // Generación de texto
  GENERATION = 'generation',
  
  // Análisis y razonamiento complejo
  REASONING = 'reasoning',
  
  // Tareas rápidas y simples
  SIMPLE = 'simple',
}

// ========================================
// CONFIGURACIONES POR CASO DE USO
// ========================================

/**
 * Configuración base para extracción de datos
 * - Alta precisión
 * - Temperatura baja para consistencia
 * - Formato JSON
 */
const EXTRACTION_CONFIG: Partial<ModelConfig> = {
  temperature: 0.2,
  responseFormat: 'json_object',
  maxTokens: 4000,
};

/**
 * Configuración base para clasificación
 * - Precisión media-alta
 * - Temperatura baja-media
 * - Formato JSON
 */
const CLASSIFICATION_CONFIG: Partial<ModelConfig> = {
  temperature: 0.3,
  responseFormat: 'json_object',
  maxTokens: 2000,
};

/**
 * Configuración base para visión (análisis de documentos)
 * - Alta precisión
 * - Temperatura baja
 * - Formato JSON para datos estructurados
 */
const VISION_CONFIG: Partial<ModelConfig> = {
  temperature: 0.2,
  responseFormat: 'json_object',
  maxTokens: 4000,
};

/**
 * Configuración base para generación de texto
 * - Creatividad media
 * - Temperatura media
 */
const GENERATION_CONFIG: Partial<ModelConfig> = {
  temperature: 0.7,
  maxTokens: 2000,
};

/**
 * Configuración base para razonamiento complejo
 * - Máxima calidad
 * - Temperatura baja para consistencia
 */
const REASONING_CONFIG: Partial<ModelConfig> = {
  temperature: 0.3,
  maxTokens: 4000,
};

/**
 * Configuración para planificación y optimización
 * - Similar a reasoning pero con más tokens
 */
const PLANNING_CONFIG: Partial<ModelConfig> = {
  temperature: 0.25,
  responseFormat: 'json_object',
  maxTokens: 5000,
};

/**
 * Configuración base para tareas simples
 * - Rápido y económico
 * - Temperatura media
 */
const SIMPLE_CONFIG: Partial<ModelConfig> = {
  temperature: 0.5,
  maxTokens: 1000,
};

// ========================================
// SELECCIÓN DE MODELOS
// ========================================

/**
 * Obtiene el mejor modelo para un caso de uso según el proveedor
 */
export function getModelForUseCase(useCase: AIUseCase, provider: AIProvider): string {
  const modelMap: Record<AIUseCase, Record<AIProvider, string>> = {
    [AIUseCase.EXTRACTION]: {
      [AIProvider.OPENAI]: OPENAI_MODELS.GPT_5_1,
      [AIProvider.ANTHROPIC]: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5, // Mejor para agentes
      [AIProvider.GOOGLE]: GOOGLE_MODELS.GEMINI_1_5_PRO,
    },
    [AIUseCase.CLASSIFICATION]: {
      [AIProvider.OPENAI]: OPENAI_MODELS.GPT_5_1_MINI,
      [AIProvider.ANTHROPIC]: ANTHROPIC_MODELS.CLAUDE_HAIKU_4_5, // Near-frontier intelligence
      [AIProvider.GOOGLE]: GOOGLE_MODELS.GEMINI_1_5_FLASH,
    },
    [AIUseCase.PLANNING]: {
      [AIProvider.OPENAI]: OPENAI_MODELS.GPT_5_1,
      [AIProvider.ANTHROPIC]: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
      [AIProvider.GOOGLE]: GOOGLE_MODELS.GEMINI_1_5_PRO,
    },
    [AIUseCase.VISION]: {
      [AIProvider.OPENAI]: OPENAI_MODELS.GPT_5_1, // GPT-5.1 soporta visión completa
      [AIProvider.ANTHROPIC]: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5, // Claude 4.5 tiene visión
      [AIProvider.GOOGLE]: GOOGLE_MODELS.GEMINI_1_5_PRO, // Gemini tiene visión
    },
    [AIUseCase.GENERATION]: {
      [AIProvider.OPENAI]: OPENAI_MODELS.GPT_5_1,
      [AIProvider.ANTHROPIC]: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
      [AIProvider.GOOGLE]: GOOGLE_MODELS.GEMINI_1_5_PRO,
    },
    [AIUseCase.REASONING]: {
      [AIProvider.OPENAI]: OPENAI_MODELS.GPT_5_1,
      [AIProvider.ANTHROPIC]: ANTHROPIC_MODELS.CLAUDE_OPUS_4_1, // Opus para razonamiento especializado
      [AIProvider.GOOGLE]: GOOGLE_MODELS.GEMINI_1_5_PRO,
    },
    [AIUseCase.SIMPLE]: {
      [AIProvider.OPENAI]: OPENAI_MODELS.GPT_5_1_MINI,
      [AIProvider.ANTHROPIC]: ANTHROPIC_MODELS.CLAUDE_HAIKU_4_5,
      [AIProvider.GOOGLE]: GOOGLE_MODELS.GEMINI_1_5_FLASH,
    },
  };
  
  return modelMap[useCase][provider];
}

/**
 * Obtiene la configuración base para un caso de uso
 */
export function getConfigForUseCase(useCase: AIUseCase): Partial<ModelConfig> {
  const configMap: Record<AIUseCase, Partial<ModelConfig>> = {
    [AIUseCase.EXTRACTION]: EXTRACTION_CONFIG,
    [AIUseCase.CLASSIFICATION]: CLASSIFICATION_CONFIG,
    [AIUseCase.PLANNING]: PLANNING_CONFIG,
    [AIUseCase.VISION]: VISION_CONFIG,
    [AIUseCase.GENERATION]: GENERATION_CONFIG,
    [AIUseCase.REASONING]: REASONING_CONFIG,
    [AIUseCase.SIMPLE]: SIMPLE_CONFIG,
  };
  
  return configMap[useCase];
}

/**
 * Crea una configuración completa para un caso de uso y proveedor
 */
export function createConfigForUseCase(
  useCase: AIUseCase,
  provider: AIProvider,
  overrides?: Partial<ModelConfig>
): ModelConfig {
  const baseConfig = getConfigForUseCase(useCase);
  const model = getModelForUseCase(useCase, provider);
  
  const config = {
    provider,
    model,
    ...baseConfig,
    ...overrides,
  } as ModelConfig;

  const baseMetadata = (baseConfig as ModelConfig | undefined)?.metadata;
  config.metadata = {
    useCase,
    ...baseMetadata,
    ...overrides?.metadata,
  };

  return config;
}

// ========================================
// CONFIGURACIONES ESPECÍFICAS DE FEATURES
// ========================================

/**
 * Configuraciones para features específicas de la aplicación
 */
export const FEATURE_CONFIGS = {
  /**
   * Extracción de documentos (contratos, DNI)
   */
  'extraer-documentos': {
    useCase: AIUseCase.VISION,
    systemMessage: 'Eres un asistente experto en extracción de información de documentos legales y administrativos.',
    temperature: 0.1, // Muy bajo para máxima precisión
  },
  
  /**
   * Clasificación de nóminas
   */
  'clasificador-nominas': {
    useCase: AIUseCase.CLASSIFICATION,
    systemMessage: 'Eres un asistente experto en análisis de nóminas y matching de documentos con empleados.',
    temperature: 0.2,
  },
  
  /**
   * Cuadrar vacaciones
   */
  'cuadrar-vacaciones': {
    useCase: AIUseCase.PLANNING,
    systemMessage: 'Eres un asistente experto en gestión de vacaciones y planificación de recursos humanos.',
    temperature: 0.2,
  },
  
  /**
   * Procesar Excel de empleados
   */
  'procesar-excel-empleados': {
    useCase: AIUseCase.EXTRACTION,
    systemMessage: 'Eres un asistente experto en análisis de datos de recursos humanos y mapeo de información de empleados desde hojas de cálculo.',
    temperature: 0.2,
    maxTokens: 8000, // Aumentado para manejar respuestas JSON grandes con muchos empleados
  },
  
  /**
   * Análisis de sentimientos
   */
  'analisis-sentimientos': {
    useCase: AIUseCase.GENERATION,
    systemMessage: 'Eres un asistente experto en análisis de sentimientos y feedback de empleados.',
    temperature: 0.4,
  },
} as const;

/**
 * Obtiene configuración para una feature específica
 */
export function getFeatureConfig(
  featureName: keyof typeof FEATURE_CONFIGS,
  provider: AIProvider
): ModelConfig {
  const featureConfig = FEATURE_CONFIGS[featureName];
  
  const config = createConfigForUseCase(featureConfig.useCase, provider, {
    systemMessage: featureConfig.systemMessage,
    temperature: featureConfig.temperature,
  });

  config.metadata = {
    ...config.metadata,
    feature: featureName,
  };

  return config;
}

// ========================================
// HELPERS
// ========================================

/**
 * Obtiene el costo aproximado por 1M de tokens (USD)
 */
export function getApproximateCost(provider: AIProvider, model: string): {
  input: number;
  output: number;
} {
  // Precios aproximados (actualizar según precios reales)
  const pricing: Record<AIProvider, Record<string, { input: number; output: number }>> = {
    [AIProvider.OPENAI]: {
      [OPENAI_MODELS.GPT_5_1]: { input: 10, output: 30 },
      [OPENAI_MODELS.GPT_5_1_MINI]: { input: 0.3, output: 1.2 },
      [OPENAI_MODELS.GPT_4O]: { input: 5, output: 15 },
      [OPENAI_MODELS.GPT_4O_MINI]: { input: 0.15, output: 0.6 },
      [OPENAI_MODELS.GPT_4]: { input: 30, output: 60 },
    },
    [AIProvider.ANTHROPIC]: {
      [ANTHROPIC_MODELS.CLAUDE_3_5_SONNET]: { input: 3, output: 15 },
      [ANTHROPIC_MODELS.CLAUDE_3_5_HAIKU]: { input: 0.25, output: 1.25 },
      [ANTHROPIC_MODELS.CLAUDE_3_OPUS]: { input: 15, output: 75 },
    },
    [AIProvider.GOOGLE]: {
      [GOOGLE_MODELS.GEMINI_1_5_PRO]: { input: 1.25, output: 5 },
      [GOOGLE_MODELS.GEMINI_1_5_FLASH]: { input: 0.075, output: 0.3 },
    },
  };
  
  return pricing[provider]?.[model] || { input: 0, output: 0 };
}

/**
 * Calcula el costo de una llamada
 */
export function calculateCallCost(
  provider: AIProvider,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = getApproximateCost(provider, model);
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}


