/**
 * Setup global para todos los tests de Vitest
 * Se ejecuta una vez antes de todos los tests
 */

import { config } from 'dotenv';
import path from 'path';
import '@testing-library/jest-dom/vitest';

// ========================================
// ENVIRONMENT VARIABLES
// ========================================

// Cargar .env.test
config({ path: path.resolve(__dirname, '../.env.test') });

// Forzar NODE_ENV a test
process.env.NODE_ENV = 'test';

// Deshabilitar Redis en tests (usar in-memory)
process.env.FORCE_REDIS = 'false';

// Deshabilitar Sentry en tests
process.env.SENTRY_DSN = '';

// ========================================
// GLOBAL MOCKS
// ========================================

// Mock de console.error para capturar errores esperados en tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    // Ignorar errores específicos de React Testing Library
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// ========================================
// CLEANUP
// ========================================

// Cleanup después de cada test
afterEach(() => {
  // Clear all timers
  vi.clearAllTimers();

  // Clear all mocks
  vi.clearAllMocks();
});
