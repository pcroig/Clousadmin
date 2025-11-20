// ========================================
// Google AI Provider
// ========================================
// Wrapper del SDK de Google AI (Gemini) con interfaz unificada

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import {
  AIProvider,
  AIMessage,
  AIResponse,
  MessageRole,
  ModelConfig,
  AICallOptions,
} from '../types';

/**
 * Cliente de Google AI (singleton)
 */
let _googleClient: GoogleGenerativeAI | null = null;

/**
 * Verifica si Google AI está disponible
 */
export function isGoogleAIAvailable(): boolean {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  return !!(apiKey && apiKey.trim() !== '');
}

/**
 * Obtiene el cliente de Google AI
 */
export function getGoogleAIClient(): GoogleGenerativeAI {
  if (!_googleClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('GOOGLE_AI_API_KEY no configurada');
    }
    
    _googleClient = new GoogleGenerativeAI(apiKey.trim());
  }
  
  return _googleClient;
}

/**
 * Resetea el cliente (útil para tests)
 */
export function resetGoogleAIClient(): void {
  _googleClient = null;
}

/**
 * Convierte mensajes unificados a formato Google AI
 */
function convertMessagesToGoogle(messages: AIMessage[]): {
  systemInstruction?: string;
  contents: any[];
} {
  // Google AI maneja system instruction por separado
  const systemMessage = messages.find((m) => m.role === MessageRole.SYSTEM);
  const conversationMessages = messages.filter((m) => m.role !== MessageRole.SYSTEM);
  
  const contents = conversationMessages.map((msg) => {
    // Convertir rol
    const role = msg.role === MessageRole.ASSISTANT ? 'model' : 'user';
    
    // Convertir contenido
    let parts: any[];
    
    if (typeof msg.content === 'string') {
      parts = [{ text: msg.content }];
    } else if (Array.isArray(msg.content)) {
      parts = msg.content.map((c) => {
        if (c.type === 'text') {
          return { text: c.text };
        } else {
          // Para imágenes, Google AI requiere datos inline o fileData
          // Por simplicidad, usamos URL directamente (requiere fetch previo en producción)
          return {
            inlineData: {
              mimeType: 'image/jpeg',
              data: c.image_url.url, // Nota: esto necesitaría ser base64 en realidad
            },
          };
        }
      });
    } else if (msg.content.type === 'text') {
      parts = [{ text: msg.content.text }];
    } else {
      parts = [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: msg.content.image_url.url,
          },
        },
      ];
    }
    
    return {
      role,
      parts,
    };
  });
  
  return {
    systemInstruction: systemMessage ? (typeof systemMessage.content === 'string' ? systemMessage.content : '') : undefined,
    contents,
  };
}

/**
 * Convierte respuesta de Google AI a formato unificado
 */
function convertGoogleResponse(response: any, model: string): AIResponse {
  const candidate = response.response.candidates?.[0];
  const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';
  
  return {
    id: `google-${Date.now()}`,
    provider: AIProvider.GOOGLE,
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: MessageRole.ASSISTANT,
          content: text,
        },
        finishReason: candidate?.finishReason?.toLowerCase() || 'stop',
      },
    ],
    usage: response.response.usageMetadata ? {
      promptTokens: response.response.usageMetadata.promptTokenCount || 0,
      completionTokens: response.response.usageMetadata.candidatesTokenCount || 0,
      totalTokens: response.response.usageMetadata.totalTokenCount || 0,
    } : undefined,
    created: Date.now() / 1000,
    metadata: {
      safetyRatings: candidate?.safetyRatings,
    },
  };
}

/**
 * Realiza una llamada a Google AI con la configuración especificada
 */
export async function callGoogleAI(
  messages: AIMessage[],
  config: ModelConfig,
  options?: AICallOptions
): Promise<AIResponse> {
  const client = getGoogleAIClient();
  const { systemInstruction, contents } = convertMessagesToGoogle(messages);
  
  // Obtener modelo
  const model = client.getGenerativeModel({
    model: config.model,
    systemInstruction,
    generationConfig: {
      temperature: options?.temperature ?? config.temperature ?? 0.7,
      topP: config.topP,
      maxOutputTokens: options?.maxTokens ?? config.maxTokens,
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });
  
  try {
    console.info(`[Google AI Provider] Llamando a modelo ${config.model}`);
    
    // Nota: Para JSON mode, necesitamos añadir instrucción explícita
    if (options?.responseFormat === 'json_object' || config.responseFormat === 'json_object') {
      if (contents.length > 0) {
        const lastContent = contents[contents.length - 1];
        if (lastContent.parts && lastContent.parts.length > 0) {
          lastContent.parts[0].text += '\n\nResponde SOLO con un objeto JSON válido, sin markdown ni explicaciones adicionales.';
        }
      }
    }
    
    const result = await model.generateContent({
      contents,
    });
    
    console.info(`[Google AI Provider] Respuesta recibida`);
    return convertGoogleResponse(result, config.model);
  } catch (error: any) {
    console.error('[Google AI Provider] Error:', error.message);
    throw new Error(`Google AI error: ${error.message}`);
  }
}

/**
 * Mapea nombres de modelos genéricos a modelos de Google AI
 */
export function mapToGoogleModel(genericModel: string): string {
  // Mapeo de modelos genéricos a Gemini
  const modelMap: Record<string, string> = {
    // Modelos OpenAI recientes
    'gpt-5.1': 'gemini-1.5-pro-latest',
    'gpt-5.1-mini': 'gemini-1.5-flash-latest',
    'gpt-4.1': 'gemini-1.5-pro-latest',
    'gpt-4.1-mini-2025-04-14': 'gemini-1.5-flash-latest',
    'gpt-4.1-mini': 'gemini-1.5-flash-latest', // Legacy - mantener para compatibilidad
    'gpt-5': 'gemini-1.5-pro-latest',
    'gpt-5-mini': 'gemini-1.5-flash-latest',
    'gpt-5-nano': 'gemini-1.5-flash-latest',
    
    // Modelos OpenAI legacy
    'gpt-4': 'gemini-1.5-pro-latest',
    'gpt-4o': 'gemini-1.5-pro-latest',
    'gpt-4o-mini': 'gemini-1.5-flash-latest',
    'gpt-3.5-turbo': 'gemini-1.5-flash-latest',
  };
  
  return modelMap[genericModel] || 'gemini-1.5-pro-latest';
}


