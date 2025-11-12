// ========================================
// OpenAI Provider
// ========================================
// Wrapper del SDK de OpenAI con interfaz unificada

import OpenAI from 'openai';
import { File } from 'node:buffer';
import {
  AIProvider,
  AIMessage,
  AIResponse,
  MessageRole,
  ModelConfig,
  AICallOptions,
  hasImageContent,
  AICallMetadata,
} from '../types';

type FilesCreateParams = Parameters<OpenAI['files']['create']>;
type OpenAIFileInput = FilesCreateParams[0]['file'];

const PDF_MIME_TYPE = 'application/pdf';

const isErrorWithMessage = (error: unknown): error is { message: string } =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof (error as { message: unknown }).message === 'string';

const getErrorMessage = (error: unknown): string => {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    return (error as { status: number }).status;
  }
  return undefined;
};

async function buildFileUploadInput(
  fileBuffer: Buffer,
  filename: string
): Promise<{ input: OpenAIFileInput; strategy: 'file' | 'stream' }> {
  try {
    const file = new File([fileBuffer], filename, { type: PDF_MIME_TYPE });
    return {
      input: file as unknown as OpenAIFileInput,
      strategy: 'file',
    };
  } catch {
    const { Readable } = await import('stream');
    const stream = Readable.from(fileBuffer);
    Object.assign(stream, { path: filename });
    return {
      input: stream as unknown as OpenAIFileInput,
      strategy: 'stream',
    };
  }
}

/**
 * Cliente de OpenAI (singleton)
 */
let _openaiClient: OpenAI | null = null;

/**
 * Verifica si OpenAI está disponible
 */
export function isOpenAIAvailable(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Validación más flexible: acepta cualquier key que empiece con 'sk-'
  const trimmedKey = apiKey?.trim() || '';
  const isAvailable = trimmedKey !== '' && trimmedKey.startsWith('sk-');
  
  // Log de debug (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    if (!apiKey) {
      console.warn('[OpenAI Provider] OPENAI_API_KEY no está definida en process.env');
    } else if (trimmedKey === '') {
      console.warn('[OpenAI Provider] OPENAI_API_KEY está vacía (solo espacios)');
    } else if (!trimmedKey.startsWith('sk-')) {
      console.warn(`[OpenAI Provider] OPENAI_API_KEY no tiene formato válido (debe empezar con "sk-"). Primeros caracteres: "${trimmedKey.substring(0, 10)}..."`);
    } else {
      console.info(`[OpenAI Provider] OpenAI detectado y disponible (key: ${trimmedKey.substring(0, 10)}...)`);
    }
  }
  
  return isAvailable;
}

/**
 * Obtiene el cliente de OpenAI
 */
export function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error('OPENAI_API_KEY no configurada correctamente');
    }
    
    _openaiClient = new OpenAI({
      apiKey: apiKey.trim(),
    });
  }
  
  return _openaiClient;
}

/**
 * Resetea el cliente (útil para tests)
 */
export function resetOpenAIClient(): void {
  _openaiClient = null;
}

/**
 * Sube un archivo PDF a OpenAI Files API para análisis
 * OpenAI requiere que los PDFs se suban como archivos, no como base64
 */
export async function uploadPDFToOpenAI(
  fileBuffer: Buffer,
  filename: string
): Promise<string> {
  const client = getOpenAIClient();
  
  try {
    const { input, strategy } = await buildFileUploadInput(fileBuffer, filename);
    const uploadedFile = await client.files.create({
      file: input,
      purpose: 'user_data',
    });

    const strategyLabel = strategy === 'stream' ? ' (usando stream)' : '';
    console.info(`[OpenAI Provider] PDF subido con ID${strategyLabel}: ${uploadedFile.id}`);
    return uploadedFile.id;
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('[OpenAI Provider] Error subiendo PDF:', message);
    throw new Error(`Error subiendo PDF a OpenAI: ${message}`);
  }
}

/**
 * Elimina un archivo de OpenAI Files API
 */
export async function deleteOpenAIFile(fileId: string): Promise<void> {
  const client = getOpenAIClient();
  
  try {
    await client.files.del(fileId);
    console.info(`[OpenAI Provider] Archivo eliminado: ${fileId}`);
  } catch (error) {
    console.warn(
      `[OpenAI Provider] Error eliminando archivo ${fileId}:`,
      getErrorMessage(error)
    );
    // No lanzar error, es una operación de limpieza
  }
}

/**
 * Convierte mensajes unificados a formato OpenAI
 * Soporta: texto, imágenes (URLs y base64), y archivos (file_id)
 */
function convertMessagesToOpenAI(messages: AIMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((msg) => {
    // Si el contenido es string simple
    if (typeof msg.content === 'string') {
      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      };
    }
    
    // Si es array de contenidos (texto + imagen/file)
    if (Array.isArray(msg.content)) {
      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content.map((c) => {
          if (c.type === 'text') {
            return { type: 'text', text: c.text };
          } else if (c.type === 'image_url') {
            // Verificar si es un file_id (formato: "file-xxx")
            if (c.image_url.url.startsWith('file-')) {
              // Formato correcto según documentación OpenAI: { type: 'file', file: { file_id: ... } }
              return {
                type: 'file' as const,
                file: {
                  file_id: c.image_url.url,
                },
              };
            }
            // Verificar si es base64 de PDF (data:application/pdf;base64,...)
            if (c.image_url.url.startsWith('data:application/pdf;base64,')) {
              const filename = c.image_url.filename ?? 'document.pdf';
              return {
                type: 'file' as const,
                file: {
                  filename,
                  file_data: c.image_url.url, // Ya incluye el prefijo data:application/pdf;base64,
                },
              };
            }
            // Es una URL o base64 de imagen
            return {
              type: 'image_url',
              image_url: c.image_url,
            };
          } else {
            return {
              type: 'image_url',
              image_url: c.image_url,
            };
          }
        }),
      };
    }
    
    // Si es un solo contenido estructurado
    if (msg.content.type === 'text') {
      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content.text,
      };
    } else {
      // Verificar si es un file_id
      if (msg.content.image_url.url.startsWith('file-')) {
        return {
          role: msg.role as 'system' | 'user' | 'assistant',
          content: [
            {
              type: 'file' as const,
              file: {
                file_id: msg.content.image_url.url,
              },
            },
          ],
        };
      }
      // Verificar si es base64 de PDF
      if (msg.content.image_url.url.startsWith('data:application/pdf;base64,')) {
        const filename = msg.content.image_url.filename ?? 'document.pdf';
        return {
          role: msg.role as 'system' | 'user' | 'assistant',
          content: [
            {
              type: 'file' as const,
              file: {
                filename,
                file_data: msg.content.image_url.url,
              },
            },
          ],
        };
      }
      // Es una imagen (URL o base64 de imagen)
      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: [
          {
            type: 'image_url',
            image_url: msg.content.image_url,
          },
        ],
      };
    }
  });
}

/**
 * Convierte respuesta de OpenAI a formato unificado
 */
function convertOpenAIResponse(response: OpenAI.Chat.ChatCompletion): AIResponse {
  return {
    id: response.id,
    provider: AIProvider.OPENAI,
    model: response.model,
    choices: response.choices.map((choice) => ({
      index: choice.index,
      message: {
        role: MessageRole.ASSISTANT,
        content: choice.message.content || '',
      },
      finishReason: (choice.finish_reason || 'stop') as 'stop' | 'length' | 'content_filter' | 'tool_calls',
    })),
    usage: response.usage ? {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    } : undefined,
    created: response.created,
    metadata: {
      systemFingerprint: response.system_fingerprint,
    },
  };
}

/**
 * Realiza una llamada a OpenAI con la configuración especificada
 */
export async function callOpenAI(
  messages: AIMessage[],
  config: ModelConfig,
  options?: AICallOptions
): Promise<AIResponse> {
  const client = getOpenAIClient();
  const metadata = serializeMetadata(config.metadata, options?.metadata);
  
  // Construir parámetros de la llamada
  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    model: config.model,
    messages: convertMessagesToOpenAI(messages),
    temperature: options?.temperature ?? config.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? config.maxTokens,
    top_p: config.topP,
    frequency_penalty: config.frequencyPenalty,
    presence_penalty: config.presencePenalty,
  };

  if (metadata.openAIMetadata && Object.keys(metadata.openAIMetadata).length > 0) {
    params.metadata = metadata.openAIMetadata;
  }
  if (metadata.user) {
    params.user = metadata.user;
  }
  
  // Formato de respuesta
  const responseFormat = options?.responseFormat ?? config.responseFormat;
  if (responseFormat === 'json_object') {
    params.response_format = { type: 'json_object' };
  }
  
  try {
    console.info(`[OpenAI Provider] Llamando a modelo ${config.model}`);
    const response = await client.chat.completions.create(params);
    
    console.info(`[OpenAI Provider] Respuesta recibida (${response.usage?.total_tokens || 0} tokens)`);
    return convertOpenAIResponse(response);
  } catch (error) {
    const status = getErrorStatus(error);
    const message = getErrorMessage(error);
    console.error('[OpenAI Provider] Error:', message);
    
    if (status === 401) {
      if (message.includes('insufficient permissions') || message.includes('Missing scopes')) {
        throw new Error(
          'OpenAI API key no tiene permisos suficientes. ' +
          'La key necesita el scope "model.request". ' +
          'Crea una nueva API key en https://platform.openai.com/api-keys con permisos completos.'
        );
      }
      throw new Error('OpenAI API key inválida o expirada. Verifica tu key en https://platform.openai.com/api-keys');
    }
    
    if (status === 429) {
      throw new Error('OpenAI: Límite de rate limit alcanzado. Espera unos minutos e intenta de nuevo.');
    }
    
    if (status === 500 || status === 503) {
      throw new Error('OpenAI: Error del servidor. Intenta de nuevo en unos momentos.');
    }
    
    throw new Error(`OpenAI error: ${message}`);
  }
}

/**
 * Determina si un conjunto de mensajes requiere capacidades de visión
 */
export function requiresVision(messages: AIMessage[]): boolean {
  return messages.some((msg) => hasImageContent(msg.content));
}

/**
 * Obtiene el modelo apropiado para el tipo de contenido
 */
export function getAppropriateModel(messages: AIMessage[], defaultModel: string): string {
  // Si hay imágenes, necesitamos un modelo con visión
  if (requiresVision(messages)) {
    // Mapear a modelos con visión
    if (defaultModel.includes('gpt-4')) {
      return 'gpt-4o'; // GPT-4o tiene capacidades de visión
    }
    return 'gpt-4o'; // Fallback a GPT-4o para visión
  }
  
  return defaultModel;
}

function serializeMetadata(
  configMetadata?: AICallMetadata,
  optionsMetadata?: AICallMetadata
): {
  openAIMetadata: Record<string, string>;
  user?: string;
} {
  const combined: Record<string, string> = {};
  const merge = (source?: AICallMetadata) => {
    if (!source) return;
    Object.entries(source).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const serialized = String(value);
      if (key === 'usuarioId') {
        combined['origin_user'] = serialized.slice(0, 60);
      } else {
        combined[key] = serialized.slice(0, 60);
      }
    });
  };

  merge(configMetadata);
  merge(optionsMetadata);

  const user =
    (optionsMetadata?.usuarioId || configMetadata?.usuarioId)?.toString().slice(0, 60);

  if (combined.useCase) {
    combined.use_case = combined.useCase;
    delete combined.useCase;
  }

  return {
    openAIMetadata: combined,
    user,
  };
}

