// ========================================
// Common Types - Tipos Compartidos
// ========================================
// Tipos reutilizables para toda la aplicación

/**
 * Respuesta genérica de API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Metadatos genéricos (cualquier objeto clave-valor)
 */
export type Metadata = Record<string, unknown>;

/**
 * Payload genérico de eventos
 */
export type EventPayload = Record<string, unknown>;

/**
 * Opciones de configuración genéricas
 */
export type ConfigOptions = Record<string, unknown>;

/**
 * Función de transformación genérica
 */
export type Transformer<TInput = unknown, TOutput = unknown> = (input: TInput) => TOutput;

/**
 * Función de validación genérica
 */
export type Validator<T = unknown> = (value: T) => boolean;

/**
 * Handler genérico de eventos
 */
export type EventHandler<TPayload = unknown> = (payload: TPayload) => void | Promise<void>;

/**
 * Resultado de operación con éxito/error
 */
export interface OperationResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: Error | string;
}

/**
 * Campos JSON dinámicos (para Prisma Json fields)
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

/**
 * Datos encriptados
 */
export interface EncryptedData {
  encrypted: string;
  iv?: string;
  tag?: string;
}

/**
 * Configuración de paginación
 */
export interface PaginationConfig {
  page: number;
  limit: number;
  total?: number;
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Filtros genéricos de búsqueda
 */
export type SearchFilters = Record<string, string | number | boolean | null | undefined>;

/**
 * Opciones de ordenamiento
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}




