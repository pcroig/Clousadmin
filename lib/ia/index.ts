// ========================================
// IA - Punto de Entrada Centralizado
// ========================================
// Este archivo exporta todo lo relacionado con IA/OpenAI
// Instalación, configuración y funcionalidades centralizadas
//
// Uso básico:
//   import { getOpenAIClient, MODELS } from '@/lib/ia';
//
// Uso por funcionalidad:
//   import { cuadrarVacacionesIA } from '@/lib/ia/cuadrar-vacaciones';

// ========================================
// BASE COMÚN - Instalación y Configuración
// ========================================

/**
 * Cliente de IA con fallback automático
 * - Prioridad 1: OpenAI (GPT-4.1)
 * - Prioridad 2: Replicate (Llama 3.1 70B)
 *
 * @example
 * ```typescript
 * import { getAIClient, isAIAvailable } from '@/lib/ia';
 *
 * if (isAIAvailable()) {
 *   const client = getAIClient();
 *   const completion = await client.chat.completions.create({ ... });
 * }
 * ```
 */
export {
  getAIClient,
  isAIAvailable,
  getActiveProvider,
  resetAIClient,
  // Funciones legacy (mantener compatibilidad)
  getOpenAIClient,
  isOpenAIAvailable,
  resetOpenAIClient,
} from './client';

/**
 * Configuraciones de modelos y helpers
 * 
 * @example
 * ```typescript
 * import { MODELS, getModelConfig } from '@/lib/ia';
 * const config = getModelConfig('cuadrar-vacaciones');
 * ```
 */
export {
  MODELS,
  getModelConfig,
  getModelConfigOrDefault,
  callAIWithConfig,
  // Funciones legacy (mantener compatibilidad)
  callOpenAIWithConfig,
  type ModelName,
  type ModelConfig,
} from './models';

// ========================================
// FUNCIONALIDADES ESPECÍFICAS
// ========================================
// Cada funcionalidad se importa desde su archivo específico:
//   import { cuadrarVacacionesIA } from '@/lib/ia/cuadrar-vacaciones';
//   import { clasificarNomina } from '@/lib/ia/clasificador-nominas';

/**
 * Clasificador de Nóminas
 */
export {
  clasificarNomina,
  type EmpleadoCandidato,
  type MatchingResult,
} from './clasificador-nominas';

/**
 * Tipos comunes para funcionalidades de IA
 */
export type {
  // Exportar tipos comunes si los hay
} from './models';


