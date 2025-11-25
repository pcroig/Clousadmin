import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // ========================================
    // ENVIRONMENT
    // ========================================
    // happy-dom: Más rápido que jsdom, suficiente para React
    environment: 'happy-dom',

    // ========================================
    // GLOBALS
    // ========================================
    // Permite usar expect, describe, it sin importar
    globals: true,

    // ========================================
    // SETUP FILES
    // ========================================
    // Ejecutado antes de cada archivo de test
    setupFiles: ['./tests/setup.ts'],

    // ========================================
    // COVERAGE
    // ========================================
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],

      // Coverage targets
      thresholds: {
        global: {
          lines: 60,
          functions: 60,
          branches: 60,
          statements: 60,
        },
      },

      // Incluir solo código de producción
      include: [
        'lib/**/*.ts',
        'app/api/**/*.ts',
        'components/**/*.{ts,tsx}',
      ],

      // Excluir archivos no relevantes
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/__tests__/**',
        '**/types/**',
        '**/*.d.ts',
        'app/layout.tsx', // Layout no se testea
        'app/**/loading.tsx', // Loading states no se testean
        'app/**/error.tsx', // Error boundaries se testean aparte
        'middleware.ts', // Middleware se testea en integración
        '.next/**',
        'prisma/**',
        'scripts/**',
      ],
    },

    // ========================================
    // TIMEOUTS
    // ========================================
    // Tests unitarios deben ser rápidos
    testTimeout: 10000, // 10s max
    hookTimeout: 10000,

    // ========================================
    // POOLING
    // ========================================
    // Threads para paralelización
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false, // Permitir paralelización
      },
    },

    // ========================================
    // INCLUDE / EXCLUDE
    // ========================================
    include: [
      '**/*.{test,spec}.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
    ],
    exclude: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'tests/e2e/**',  // E2E tests are for Playwright
    ],

    // ========================================
    // WATCH
    // ========================================
    // Ignorar en modo watch
    watchExclude: [
      'node_modules/**',
      '.next/**',
      'coverage/**',
    ],
  },

  // ========================================
  // RESOLVE
  // ========================================
  resolve: {
    alias: {
      // Alias @ para imports limpios
      '@': path.resolve(__dirname, './'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/components': path.resolve(__dirname, './components'),
      '@/app': path.resolve(__dirname, './app'),
      '@/prisma': path.resolve(__dirname, './prisma'),
      '@/tests': path.resolve(__dirname, './tests'),
    },
  },
});
