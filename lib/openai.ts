// ========================================
// OpenAI Client - Re-export for Backward Compatibility
// ========================================
// ⚠️ DEPRECATED: Este archivo mantiene compatibilidad con imports antiguos
// 
// ✅ NUEVA UBICACIÓN RECOMENDADA (Todo centralizado):
//   import { getOpenAIClient, MODELS } from '@/lib/ia';
//
// ESTRUCTURA ACTUAL:
//   lib/ia/
//     ├── index.ts           # Punto de entrada centralizado (instalación/configuración común)
//     ├── client.ts          # Cliente base OpenAI (común)
//     ├── models.ts          # Configuraciones de modelos (común)
//     ├── cuadrar-vacaciones.ts    # Funcionalidad específica
//     ├── clasificador-fichajes.ts # Funcionalidad específica
//     └── [nueva-funcionalidad].ts  # Otras funcionalidades

/**
 * @deprecated Use `@/lib/ia` instead (punto de entrada centralizado)
 * 
 * Para compatibilidad, re-exporta desde el módulo centralizado
 */
export {
  getOpenAIClient,
  isOpenAIAvailable,
  MODELS,
  getModelConfig,
  getModelConfigOrDefault,
  callOpenAIWithConfig,
} from './ia';

export type { LegacyModelConfig as ModelConfig, ModelName } from './ia';

