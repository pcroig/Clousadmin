// ========================================
// API Response Helpers
// ========================================
// Normaliza respuestas de APIs que pueden retornar array directo o envoltorio

interface ExtractOptions {
  key?: string;
  fallbackKeys?: string[];
}

const DEFAULT_KEYS = ['data', 'items', 'results'];
const DOMAIN_KEYS = ['empleados', 'ausencias', 'fichajes', 'documentos', 'notificaciones'];
const RESERVED_KEYS = new Set(['pagination', 'metrics']);

export function extractArrayFromResponse<T = unknown>(
  payload: unknown,
  options: ExtractOptions = {}
): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const objectPayload = payload as Record<string, unknown>;
  const keysToCheck: string[] = [];

  if (options.key) {
    keysToCheck.push(options.key);
  }

  if (options.fallbackKeys) {
    keysToCheck.push(...options.fallbackKeys);
  }

  keysToCheck.push(...DEFAULT_KEYS, ...DOMAIN_KEYS);

  for (const key of keysToCheck) {
    if (!key) continue;
    const value = objectPayload[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  for (const [key, value] of Object.entries(objectPayload)) {
    if (RESERVED_KEYS.has(key)) {
      continue;
    }
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}


