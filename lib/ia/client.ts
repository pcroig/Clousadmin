// ========================================
// AI Client - DEPRECATED
// ========================================
// ⚠️ DEPRECATED: Este archivo mantiene compatibilidad con código antiguo
// 
// ✅ NUEVA UBICACIÓN: lib/ia/core/client.ts
// ✅ NUEVO IMPORT: import { callAI, isAnyProviderAvailable } from '@/lib/ia';
//
// Este archivo solo re-exporta las funciones del nuevo sistema para
// mantener compatibilidad con código existente.

/**
 * @deprecated Usar callAI del nuevo sistema
 * Re-exporta desde core/client para compatibilidad
 */
export { getAIClient } from './core/client';

/**
 * @deprecated Usar isAnyProviderAvailable del nuevo sistema
 */
export { isAnyProviderAvailable as isAIAvailable } from './core/client';

/**
 * @deprecated Usar getOpenAIClient de core/providers/openai
 */
export { getOpenAIClient, isOpenAIAvailable, resetOpenAIClient } from './core/providers/openai';

/**
 * @deprecated Usar getActiveProviderName del nuevo sistema
 */
export { getActiveProviderName as getActiveProvider } from './core/client';





