/**
 * Mock de OpenAI para tests
 * Evita llamadas reales a la API y costos
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { vi } from 'vitest';

export const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        id: 'chatcmpl-test123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Respuesta mockeada de OpenAI para testing',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      }),
    },
  },
};

/**
 * Mock específico para extracción de documentos
 */
export function mockOpenAIDocumentExtraction(extractedData: any) {
  return mockOpenAI.chat.completions.create.mockResolvedValueOnce({
    id: 'chatcmpl-test123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify(extractedData),
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  });
}

/**
 * Configura el mock de OpenAI en el test
 */
export function setupOpenAIMock() {
  vi.mock('openai', () => {
    return {
      default: vi.fn(() => mockOpenAI),
      OpenAI: vi.fn(() => mockOpenAI),
    };
  });
}
