// ========================================
// AI Client - Cliente Base con Fallback
// ========================================
// Cliente centralizado para todas las funcionalidades de IA
// - Prioridad 1: OpenAI (GPT-4.1)
// - Prioridad 2: Replicate (Llama 3.1 70B) como fallback
// Usa inicialización lazy para evitar errores durante build
//
// Uso:
//   import { getAIClient } from '@/lib/ia/client';
//   const client = getAIClient();
//   const completion = await client.chat.completions.create({ ... });

import OpenAI from 'openai';
import { fallbackClient, isReplicateAvailable, type FallbackMessage } from './fallback-client';

let _openaiClient: OpenAI | null = null;
let _useFallback: boolean = false;

/**
 * Obtiene el cliente de IA, con fallback automático
 *
 * Prioridad:
 * 1. OpenAI (GPT-4.1) si está configurado
 * 2. Replicate (Llama 3.1 70B) como fallback
 * 3. Error si ninguno está disponible
 *
 * @returns Cliente de IA configurado (compatible con interfaz OpenAI)
 * @throws Error si ningún proveedor está configurado
 *
 * @example
 * ```typescript
 * const client = getAIClient();
 * const completion = await client.chat.completions.create({
 *   model: 'gpt-4.1',
 *   messages: [{ role: 'user', content: 'Hello' }],
 * });
 * ```
 */
export function getAIClient(): OpenAI | typeof fallbackClient {
  // Si ya tenemos un cliente de OpenAI, usarlo
  if (_openaiClient) {
    return _openaiClient;
  }

  // Si ya determinamos usar fallback, usarlo directamente
  if (_useFallback) {
    console.info('[AI Client] Usando modelo de fallback (Replicate + Llama 3.1 70B)');
    return fallbackClient as any;
  }

  // Intentar inicializar OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey && openaiKey.trim() !== '' && openaiKey.startsWith('sk-')) {
    // OpenAI está configurado
    _openaiClient = new OpenAI({
      apiKey: openaiKey.trim(),
    });
    console.info('[AI Client] Usando OpenAI (GPT-4.1)');
    return _openaiClient;
  }

  // OpenAI no está configurado, intentar fallback
  if (isReplicateAvailable()) {
    _useFallback = true;
    console.warn('[AI Client] OpenAI no configurado, usando fallback (Replicate + Llama 3.1 70B)');
    return fallbackClient as any;
  }

  // Ningún proveedor configurado
  throw new Error(
    'No hay proveedores de IA configurados. ' +
    'Configura OPENAI_API_KEY o REPLICATE_API_TOKEN en las variables de entorno.'
  );
}

/**
 * @deprecated Usar getAIClient() en su lugar
 */
export function getOpenAIClient(): OpenAI {
  console.warn('[AI Client] getOpenAIClient() está deprecated, usa getAIClient()');
  return getAIClient() as OpenAI;
}

/**
 * Verifica si algún proveedor de IA está disponible
 * Útil para checks condicionales en UI o validaciones
 *
 * @returns true si OpenAI o Replicate están configurados
 */
export function isAIAvailable(): boolean {
  return isOpenAIAvailable() || isReplicateAvailable();
}

/**
 * Verifica si OpenAI está disponible sin inicializar el cliente
 *
 * @returns true si hay una API key válida configurada
 */
export function isOpenAIAvailable(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!(apiKey && apiKey.trim() !== '' && apiKey.startsWith('sk-'));
}

/**
 * Obtiene el nombre del proveedor activo
 *
 * @returns 'openai', 'replicate' o 'none'
 */
export function getActiveProvider(): 'openai' | 'replicate' | 'none' {
  if (isOpenAIAvailable()) return 'openai';
  if (isReplicateAvailable()) return 'replicate';
  return 'none';
}

/**
 * Resetea el cliente (útil para tests)
 * @internal
 */
export function resetAIClient(): void {
  _openaiClient = null;
  _useFallback = false;
}

/**
 * @deprecated Usar resetAIClient() en su lugar
 */
export function resetOpenAIClient(): void {
  resetAIClient();
}





