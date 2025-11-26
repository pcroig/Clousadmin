// ========================================
// AI Feature Runner - Helper para features específicas
// ========================================
// Centraliza la ejecución de prompts asociados a FEATURE_CONFIGS
// y asegura el uso del cliente unificado con fallback automático

import { callAI, getPrimaryProvider } from './client';
import { FEATURE_CONFIGS, FeatureName, getFeatureConfig } from './config';
import {
  AICallMetadata,
  AICallOptions,
  AIMessage,
  AIProvider,
  MessageRole,
  ModelConfig,
} from './types';

/**
 * Opciones adicionales para ejecutar una feature IA
 */
export interface FeatureCallOptions extends Omit<AICallOptions, 'metadata' | 'model'> {
  provider?: AIProvider;
  metadata?: AICallMetadata;
}

/**
 * Retorna listado de features disponibles (útil para dashboards o tests)
 */
export function listAvailableFeatures(): FeatureName[] {
  return Object.keys(FEATURE_CONFIGS) as FeatureName[];
}

/**
 * Ejecuta una feature usando el cliente unificado y la configuración declarativa
 */
export async function callFeatureAI(
  featureName: FeatureName,
  messages: AIMessage[],
  options?: FeatureCallOptions
) {
  const provider = options?.provider ?? getPrimaryProvider();
  if (!provider) {
    throw new Error(
      'No hay proveedores de IA configurados. Configura OPENAI_API_KEY, ANTHROPIC_API_KEY o GOOGLE_AI_API_KEY.'
    );
  }

  const baseConfig = getFeatureConfig(featureName, provider);
  const mergedConfig: ModelConfig = {
    ...baseConfig,
    temperature: options?.temperature ?? baseConfig.temperature,
    maxTokens: options?.maxTokens ?? baseConfig.maxTokens,
    responseFormat: options?.responseFormat ?? baseConfig.responseFormat,
    metadata: {
      ...baseConfig.metadata,
      ...(options?.metadata || {}),
    },
  };

  const systemMessage = baseConfig.systemMessage;
  const finalMessages: AIMessage[] = systemMessage
    ? [{ role: MessageRole.SYSTEM, content: systemMessage }, ...messages]
    : [...messages];

  const { provider: _ignoredProvider, metadata: _ignoredMetadata, ...callOptions } = options || {};
  const normalizedOptions: AICallOptions | undefined = Object.keys(callOptions).length
    ? {
        ...callOptions,
        metadata: mergedConfig.metadata,
      }
    : mergedConfig.metadata
      ? { metadata: mergedConfig.metadata }
      : undefined;

  return callAI(finalMessages, mergedConfig, normalizedOptions);
}

export type { FeatureName };


