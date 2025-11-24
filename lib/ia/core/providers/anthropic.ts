// ========================================
// Anthropic Provider
// ========================================
// Wrapper del SDK de Anthropic (Claude) con interfaz unificada

import Anthropic from '@anthropic-ai/sdk';

import {
  AICallOptions,
  AIMessage,
  AIProvider,
  AIResponse,
  MessageRole,
  ModelConfig,
} from '../types';

/**
 * Cliente de Anthropic (singleton)
 */
let _anthropicClient: Anthropic | null = null;

/**
 * Verifica si Anthropic está disponible
 */
export function isAnthropicAvailable(): boolean {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return !!(apiKey && apiKey.trim() !== '');
}

/**
 * Obtiene el cliente de Anthropic
 */
export function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('ANTHROPIC_API_KEY no configurada');
    }
    
    _anthropicClient = new Anthropic({
      apiKey: apiKey.trim(),
    });
  }
  
  return _anthropicClient;
}

/**
 * Resetea el cliente (útil para tests)
 */
export function resetAnthropicClient(): void {
  _anthropicClient = null;
}

/**
 * Convierte mensajes unificados a formato Anthropic
 */
function normalizeContent(content: AIMessage['content']): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (item.type === 'text') {
          return item.text;
        }
        return `[imagen:${item.image_url.url}]`;
      })
      .join('\n');
  }

  if (content.type === 'text') {
    return content.text;
  }

  return `[imagen:${content.image_url.url}]`;
}

function convertMessagesToAnthropic(messages: AIMessage[]): {
  system?: string;
  messages: Anthropic.MessageParam[];
} {
  // Anthropic maneja el mensaje de sistema por separado
  const systemMessage = messages.find((m) => m.role === MessageRole.SYSTEM);
  const conversationMessages = messages.filter((m) => m.role !== MessageRole.SYSTEM);
  
  const anthropicMessages: Anthropic.MessageParam[] = conversationMessages.map((msg) => {
    const content = normalizeContent(msg.content);
    return {
      role: msg.role === MessageRole.ASSISTANT ? 'assistant' : 'user',
      content,
    } as Anthropic.MessageParam;
  });
  
  return {
    system: systemMessage ? (typeof systemMessage.content === 'string' ? systemMessage.content : '') : undefined,
    messages: anthropicMessages,
  };
}

/**
 * Convierte respuesta de Anthropic a formato unificado
 */
function convertAnthropicResponse(response: Anthropic.Message, model: string): AIResponse {
  // Extraer contenido de texto
  const textContent = response.content
    .map((block) => {
      if (block.type === 'text') {
        return block.text;
      }
      return '';
    })
    .join('');
  
  // Mapear stop_reason de Anthropic a formato unificado
  const mapFinishReason = (reason: string | null): 'stop' | 'length' | 'content_filter' | 'tool_calls' | null => {
    switch (reason) {
      case 'end_turn': return 'stop';
      case 'max_tokens': return 'length';
      case 'stop_sequence': return 'stop';
      case 'tool_use': return 'tool_calls';
      default: return null;
    }
  };
  
  return {
    id: response.id,
    provider: AIProvider.ANTHROPIC,
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: MessageRole.ASSISTANT,
          content: textContent,
        },
        finishReason: mapFinishReason(response.stop_reason),
      },
    ],
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
    created: Date.now() / 1000,
    metadata: {
      stopSequence: response.stop_sequence,
    },
  };
}

/**
 * Realiza una llamada a Anthropic con la configuración especificada
 */
export async function callAnthropic(
  messages: AIMessage[],
  config: ModelConfig,
  options?: AICallOptions
): Promise<AIResponse> {
  const client = getAnthropicClient();
  const { system, messages: anthropicMessages } = convertMessagesToAnthropic(messages);
  
  // Construir parámetros de la llamada
  const params: Anthropic.MessageCreateParams = {
    model: config.model,
    messages: anthropicMessages,
    max_tokens: options?.maxTokens ?? config.maxTokens ?? 4096,
    temperature: options?.temperature ?? config.temperature ?? 0.7,
    top_p: config.topP,
  };
  
  if (system) {
    params.system = system;
  }
  
  try {
    console.info(`[Anthropic Provider] Llamando a modelo ${config.model}`);
    const response = await client.messages.create(params);
    
    console.info(`[Anthropic Provider] Respuesta recibida (${response.usage.input_tokens + response.usage.output_tokens} tokens)`);
    return convertAnthropicResponse(response, config.model);
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error('Unknown Anthropic error');
    console.error('[Anthropic Provider] Error:', normalizedError.message);
    throw new Error(`Anthropic error: ${normalizedError.message}`);
  }
}

/**
 * Mapea nombres de modelos genéricos a modelos de Anthropic
 */
export function mapToAnthropicModel(genericModel: string): string {
  // Mapeo de modelos genéricos a Claude
  const modelMap: Record<string, string> = {
    // Modelos OpenAI recientes
    'gpt-5.1': 'claude-opus-4-1',
    'gpt-5.1-mini': 'claude-sonnet-4-5',
    'gpt-4.1': 'claude-sonnet-4-5',
    'gpt-4.1-mini-2025-04-14': 'claude-haiku-4-5',
    'gpt-4.1-mini': 'claude-haiku-4-5', // Legacy - mantener para compatibilidad
    'gpt-5': 'claude-opus-4-1', // Razonamiento -> Opus
    'gpt-5-mini': 'claude-sonnet-4-5',
    'gpt-5-nano': 'claude-haiku-4-5',
    
    // Modelos OpenAI legacy
    'gpt-4': 'claude-sonnet-4-5',
    'gpt-4o': 'claude-sonnet-4-5',
    'gpt-4o-mini': 'claude-haiku-4-5',
    'gpt-3.5-turbo': 'claude-haiku-4-5',
  };
  
  return modelMap[genericModel] || 'claude-sonnet-4-5';
}


