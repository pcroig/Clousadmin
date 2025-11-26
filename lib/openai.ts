// ========================================
// OpenAI Client - Re-export for Backward Compatibility
// ========================================
// ⚠️ DEPRECATED: Este archivo mantiene compatibilidad con imports antiguos
// 
// ✅ NUEVA UBICACIÓN RECOMENDADA (Todo centralizado):
//   import { getOpenAIClient, OPENAI_MODELS, callFeatureAI } from '@/lib/ia';
//
// ESTRUCTURA ACTUAL (resumen):
//   lib/ia/
//     ├── index.ts            # Punto de entrada centralizado
//     ├── core/
//     │   ├── client.ts       # Cliente multi-proveedor
//     │   ├── config.ts       # AIUseCase + FEATURE_CONFIGS
//     │   └── features.ts     # Helper declarativo (callFeatureAI)
//     ├── patterns/           # Patrones reutilizables
//     └── [feature].ts        # Funciones específicas (cuadrar-vacaciones, etc.)

/**
 * @deprecated Use `@/lib/ia` instead (punto de entrada centralizado)
 * 
 * Para compatibilidad, re-exporta desde el módulo centralizado
 */
export {
  getOpenAIClient,
  isOpenAIAvailable,
  OPENAI_MODELS,
  callFeatureAI,
} from './ia';

export type { FeatureCallOptions } from './ia';

