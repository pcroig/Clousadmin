// ========================================
// Fallback Client - Modelo Open Source
// ========================================
// Cliente de fallback cuando OpenAI no está disponible
// Usa Replicate con Llama 3.1 70B Instruct
//
// Configuración requerida:
// REPLICATE_API_TOKEN en .env

/**
 * Tipos de respuesta compatibles con OpenAI
 */
export interface FallbackMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface FallbackCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Verifica si Replicate está disponible
 */
export function isReplicateAvailable(): boolean {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  return !!(apiToken && apiToken.trim() !== '');
}

/**
 * Llama a Replicate con Llama 3.1 70B
 *
 * Interfaz compatible con OpenAI para facilitar el fallback
 */
export async function callReplicateLlama(
  messages: FallbackMessage[],
  temperature: number = 0.7,
  maxTokens: number = 2000
): Promise<FallbackCompletionResponse> {
  const apiToken = process.env.REPLICATE_API_TOKEN;

  if (!apiToken || apiToken.trim() === '') {
    throw new Error('REPLICATE_API_TOKEN no configurado. No se puede usar el modelo de fallback.');
  }

  // Convertir mensajes al formato de Llama
  // Llama espera un prompt único, así que concatenamos los mensajes
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const userMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');

  let prompt = '';
  if (systemMessage) {
    prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemMessage}<|eot_id|>\n\n`;
  }

  for (const msg of userMessages) {
    prompt += `<|start_header_id|>${msg.role}<|end_header_id|>\n\n${msg.content}<|eot_id|>\n\n`;
  }

  prompt += '<|start_header_id|>assistant<|end_header_id|>\n\n';

  try {
    // Llamar a Replicate API
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '4c2d7c7e1f4c45f4b5f6e8e2d0e4f7d6c9b8a5f2e1d0c9b8a7f6e5d4c3b2a1',
        input: {
          prompt,
          temperature,
          max_tokens: maxTokens,
          top_p: 0.9,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
    }

    const prediction = await response.json();

    // Esperar a que la predicción termine
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 500));

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      });

      result = await statusResponse.json();
    }

    if (result.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${result.error}`);
    }

    // Convertir respuesta al formato de OpenAI
    const output = Array.isArray(result.output) ? result.output.join('') : result.output;

    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: output,
          },
        },
      ],
      usage: {
        prompt_tokens: result.metrics?.predict_time,
        completion_tokens: 0,
        total_tokens: result.metrics?.predict_time,
      },
    };
  } catch (error) {
    console.error('[Fallback Client] Error llamando a Replicate:', error);
    throw new Error(`Error en modelo de fallback (Replicate): ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Wrapper simple compatible con OpenAI
 */
export const fallbackClient = {
  chat: {
    completions: {
      create: async (params: {
        model?: string;
        messages: FallbackMessage[];
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: string };
      }) => {
        return callReplicateLlama(
          params.messages,
          params.temperature || 0.7,
          params.max_tokens || 2000
        );
      },
    },
  },
};
