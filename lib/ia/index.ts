// ========================================
// IA - Punto de Entrada Centralizado
// ========================================
// Este archivo exporta todo lo relacionado con IA
// Nueva arquitectura unificada con soporte multi-proveedor

// ========================================
// CORE - Cliente y Tipos
// ========================================

export {
  // Cliente unificado con fallback automático
  callAI,
  callAISafe,
  callAIWithRetry,
  callAIForJSON,
  
  // Detección de proveedores
  getAvailableProviders,
  isAnyProviderAvailable,
  getPrimaryProvider,
  getActiveProviderName,
  
  // Legacy compatibility
  isAIAvailable,
  getAIClient,
} from './core/client';

export {
  // Tipos
  AIProvider,
  MessageRole,
  ContentType,
  type AIMessage,
  type AIResponse,
  type ModelConfig,
  type AICallOptions,
  type AIResult,
  type AISuccess,
  type AIError,
  type TokenUsage,
  
  // Type guards
  isAISuccess,
  isAIError,
  isTextContent,
  hasImageContent,
} from './core/types';

export {
  // Configuración de modelos
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  GOOGLE_MODELS,
  AIUseCase,
  getModelForUseCase,
  getConfigForUseCase,
  createConfigForUseCase,
  getFeatureConfig,
  FEATURE_CONFIGS,
  
  // Helpers de costos
  getApproximateCost,
  calculateCallCost,
} from './core/config';

// ========================================
// PATTERNS - Patrones Reutilizables
// ========================================

export {
  // Extraction Pattern
  extractStructuredData,
  extractStructuredDataOrThrow,
  extractList,
  extractPartialData,
  type ExtractionOptions,
  type ExtractionResult,
} from './patterns/extraction';

export {
  // Classification Pattern
  classify,
  classifySimple,
  classifyMulti,
  matchBasic,
  type Candidate,
  type ClassificationMatch,
  type ClassificationResult,
  type ClassificationOptions,
} from './patterns/classification';

export {
  // Vision Pattern
  analyzeDocument,
  analyzeDocumentOrThrow,
  extractTextFromDocument,
  describeDocument,
  validateDocument,
  compareDocuments,
  type DocumentAnalysisOptions,
  type DocumentAnalysisResult,
} from './patterns/vision';

export {
  // Generation Pattern
  generateText,
  generateTextOrThrow,
  summarizeText,
  rewriteText,
  translateText,
  expandText,
  generateRecommendations,
  analyzeAndEvaluate,
  completeText,
  generateEmail,
  generateFAQAnswer,
  type GenerationOptions,
  type GenerationResult,
} from './patterns/generation';

// ========================================
// FEATURES - Funcionalidades Específicas
// ========================================

export {
  // Clasificador de Nóminas
  clasificarNomina,
  type EmpleadoCandidato,
  type MatchingResult,
} from './clasificador-nominas';

// ========================================
// LEGACY EXPORTS - Compatibilidad
// ========================================

/**
 * ⚠️ DEPRECATED: Exports legacy para compatibilidad con código antiguo
 * 
 * Para nuevo código, usar:
 * - callAI() para llamadas unificadas con fallback automático
 * - getAvailableProviders() para verificar qué proveedores están disponibles
 * 
 * Si necesitas acceso directo a un proveedor específico:
 * - import { getOpenAIClient } from '@/lib/ia/core/providers/openai'
 * - import { getAnthropicClient } from '@/lib/ia/core/providers/anthropic'
 * - import { getGoogleAIClient } from '@/lib/ia/core/providers/google'
 */

// Clients específicos por proveedor (uso avanzado)
export {
  getOpenAIClient,
  isOpenAIAvailable,
  resetOpenAIClient,
} from './core/providers/openai';

export {
  getAnthropicClient,
  isAnthropicAvailable,
  resetAnthropicClient,
} from './core/providers/anthropic';

export {
  getGoogleAIClient,
  isGoogleAIAvailable,
  resetGoogleAIClient,
} from './core/providers/google';
