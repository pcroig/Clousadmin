// ========================================
// AI Core - Tipos Comunes
// ========================================
// Tipos unificados para todos los proveedores de IA
// Permite intercambiar proveedores sin cambiar código de negocio

import { z } from 'zod';

// ========================================
// ENUMS Y CONSTANTES
// ========================================

/**
 * Proveedores de IA soportados
 */
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
}

/**
 * Roles de mensaje estándar
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

/**
 * Tipos de contenido de mensaje
 */
export enum ContentType {
  TEXT = 'text',
  IMAGE_URL = 'image_url',
}

// ========================================
// INTERFACES DE MENSAJES
// ========================================

/**
 * Contenido de texto de un mensaje
 */
export interface TextContent {
  type: ContentType.TEXT;
  text: string;
}

/**
 * Contenido de imagen de un mensaje
 */
export interface ImageContent {
  type: ContentType.IMAGE_URL;
  image_url: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

/**
 * Tipo union de contenido
 */
export type MessageContent = string | TextContent | ImageContent | (TextContent | ImageContent)[];

/**
 * Mensaje unificado para todos los proveedores
 */
export interface AIMessage {
  role: MessageRole;
  content: MessageContent;
}

// ========================================
// CONFIGURACIÓN DE MODELOS
// ========================================

/**
 * Configuración de un modelo de IA
 */
export interface ModelConfig {
  /** Proveedor de IA */
  provider: AIProvider;
  
  /** Nombre del modelo (específico del proveedor) */
  model: string;
  
  /** Temperatura (0-2). Más bajo = más determinístico */
  temperature?: number;
  
  /** Máximo de tokens en la respuesta */
  maxTokens?: number;
  
  /** Top P sampling */
  topP?: number;
  
  /** Penalización de frecuencia */
  frequencyPenalty?: number;
  
  /** Penalización de presencia */
  presencePenalty?: number;
  
  /** Formato de respuesta esperado */
  responseFormat?: 'text' | 'json_object';
  
  /** Mensaje del sistema por defecto */
  systemMessage?: string;
}

// ========================================
// RESPUESTAS DE IA
// ========================================

/**
 * Información de uso de tokens
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Choice individual de una respuesta
 */
export interface AIChoice {
  index: number;
  message: {
    role: MessageRole;
    content: string;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
}

/**
 * Respuesta unificada de IA
 */
export interface AIResponse {
  id: string;
  provider: AIProvider;
  model: string;
  choices: AIChoice[];
  usage?: TokenUsage;
  created: number;
  metadata?: Record<string, any>;
}

// ========================================
// OPCIONES DE LLAMADA
// ========================================

/**
 * Opciones para llamadas a IA
 */
export interface AICallOptions {
  /** Configuración del modelo a usar */
  model?: ModelConfig;
  
  /** Temperatura (override de config) */
  temperature?: number;
  
  /** Máximo de tokens (override de config) */
  maxTokens?: number;
  
  /** Formato de respuesta (override de config) */
  responseFormat?: 'text' | 'json_object';
  
  /** Número de reintentos en caso de error */
  retries?: number;
  
  /** Timeout en milisegundos */
  timeout?: number;
  
  /** Streaming (no soportado en esta versión) */
  stream?: boolean;
}

// ========================================
// RESULTADO DE OPERACIONES
// ========================================

/**
 * Resultado exitoso de una operación de IA
 */
export interface AISuccess<T = any> {
  success: true;
  data: T;
  provider: AIProvider;
  usage?: TokenUsage;
  metadata?: Record<string, any>;
}

/**
 * Error de una operación de IA
 */
export interface AIError {
  success: false;
  error: string;
  provider?: AIProvider;
  code?: string;
  metadata?: Record<string, any>;
}

/**
 * Resultado de operación de IA (success o error)
 */
export type AIResult<T = any> = AISuccess<T> | AIError;

// ========================================
// SCHEMAS ZOD
// ========================================

/**
 * Schema Zod para validación de mensajes
 */
export const aiMessageSchema = z.object({
  role: z.nativeEnum(MessageRole),
  content: z.union([
    z.string(),
    z.object({
      type: z.literal('text'),
      text: z.string(),
    }),
    z.object({
      type: z.literal('image_url'),
      image_url: z.object({
        url: z.string().url(),
        detail: z.enum(['auto', 'low', 'high']).optional(),
      }),
    }),
    z.array(
      z.union([
        z.object({
          type: z.literal('text'),
          text: z.string(),
        }),
        z.object({
          type: z.literal('image_url'),
          image_url: z.object({
            url: z.string().url(),
            detail: z.enum(['auto', 'low', 'high']).optional(),
          }),
        }),
      ])
    ),
  ]),
});

/**
 * Schema Zod para configuración de modelo
 */
export const modelConfigSchema = z.object({
  provider: z.nativeEnum(AIProvider),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  responseFormat: z.enum(['text', 'json_object']).optional(),
  systemMessage: z.string().optional(),
});

// ========================================
// TYPE GUARDS
// ========================================

/**
 * Type guard para AISuccess
 */
export function isAISuccess<T>(result: AIResult<T>): result is AISuccess<T> {
  return result.success === true;
}

/**
 * Type guard para AIError
 */
export function isAIError(result: AIResult): result is AIError {
  return result.success === false;
}

/**
 * Type guard para verificar si un contenido es texto
 */
export function isTextContent(content: MessageContent): content is string | TextContent {
  if (typeof content === 'string') return true;
  if (Array.isArray(content)) return false;
  return content.type === ContentType.TEXT;
}

/**
 * Type guard para verificar si un contenido tiene imagen
 */
export function hasImageContent(content: MessageContent): boolean {
  if (typeof content === 'string') return false;
  if (Array.isArray(content)) {
    return content.some((c) => c.type === ContentType.IMAGE_URL);
  }
  return content.type === ContentType.IMAGE_URL;
}



