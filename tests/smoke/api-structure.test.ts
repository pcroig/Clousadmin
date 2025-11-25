/**
 * Smoke Tests de estructura de APIs
 * Verifica que los endpoints principales existan y tengan la estructura correcta
 *
 * Ejecutar con: npm test
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APP_DIR = resolve(process.cwd(), 'app/api');

describe('API Structure Smoke Tests', () => {
  describe('Critical endpoints exist', () => {
    const criticalEndpoints = [
      // Autenticación
      'auth/[...nextauth]/route.ts',
      'auth/google/route.ts',
      'auth/google/callback/route.ts',
      'auth/recovery/request/route.ts',
      'auth/recovery/reset/route.ts',
      'auth/verify-password/route.ts',

      // Empleados
      'empleados/route.ts',
      'empleados/[id]/route.ts',
      'empleados/[id]/export/route.ts',
      'empleados/[id]/anonymize/route.ts',

      // Ausencias
      'ausencias/route.ts',
      'ausencias/[id]/route.ts',

      // Documentos
      'documentos/route.ts',
      'documentos/[id]/route.ts',

      // Nóminas
      'nominas/mis-nominas/route.ts',
      'nominas/[id]/route.ts',

      // Fichajes
      'fichajes/route.ts',
      'fichajes/[id]/route.ts',
    ];

    it.each(criticalEndpoints)('should have endpoint: %s', (endpoint) => {
      const path = resolve(APP_DIR, endpoint);
      expect(existsSync(path)).toBe(true);
    });
  });

  describe('Endpoints export HTTP methods', () => {
    const endpointsToCheck = [
      { path: 'empleados/route.ts', methods: ['GET', 'POST'] },
      { path: 'empleados/[id]/route.ts', methods: ['GET', 'PATCH'] },
      { path: 'ausencias/route.ts', methods: ['GET', 'POST'] },
      { path: 'documentos/route.ts', methods: ['GET', 'POST'] },
    ];

    endpointsToCheck.forEach(({ path, methods }) => {
      describe(path, () => {
        const filePath = resolve(APP_DIR, path);
        const content = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';

        methods.forEach(method => {
          it(`should export ${method} method`, () => {
            const hasExport = content.includes(`export async function ${method}`) ||
                             content.includes(`export function ${method}`);
            expect(hasExport).toBe(true);
          });
        });
      });
    });
  });

  describe('Protected endpoints use authentication', () => {
    const protectedEndpoints = [
      'empleados/route.ts',
      'empleados/[id]/route.ts',
      'ausencias/route.ts',
      'documentos/route.ts',
      'nominas/mis-nominas/route.ts',
    ];

    it.each(protectedEndpoints)('should use auth in %s', (endpoint) => {
      const path = resolve(APP_DIR, endpoint);

      if (!existsSync(path)) {
        expect.fail(`Endpoint does not exist: ${endpoint}`);
        return;
      }

      const content = readFileSync(path, 'utf-8');

      // Verificar que usa getSession para autenticación
      const usesAuth = content.includes('getSession') ||
                       content.includes('requireAuth') ||
                       content.includes('requireAuthAsHR') ||
                       content.includes('requireAuthAsHROrManager');

      expect(usesAuth).toBe(true);
    });
  });

  describe('Sensitive endpoints use Zod validation', () => {
    const endpointsWithValidation = [
      'auth/recovery/reset/route.ts',
      'nominas/eventos/route.ts',
      'fichajes/revision/route.ts',
    ];

    it.each(endpointsWithValidation)('should use Zod in %s', (endpoint) => {
      const path = resolve(APP_DIR, endpoint);

      if (!existsSync(path)) {
        // Skip if endpoint doesn't exist (optional endpoints)
        return;
      }

      const content = readFileSync(path, 'utf-8');

      const usesZod = content.includes('from \'zod\'') ||
                      content.includes('from "zod"');

      expect(usesZod).toBe(true);
    });
  });

  describe('Employee endpoints use encryption', () => {
    const empleadoEndpoints = [
      'empleados/route.ts',
      'empleados/[id]/route.ts',
    ];

    it.each(empleadoEndpoints)('should use encryption in %s', (endpoint) => {
      const path = resolve(APP_DIR, endpoint);
      const content = readFileSync(path, 'utf-8');

      const usesEncryption = content.includes('encryptEmpleadoData') ||
                             content.includes('decryptEmpleadoData');

      expect(usesEncryption).toBe(true);
    });
  });

  describe('Endpoints handle errors', () => {
    const endpointsToCheck = [
      'empleados/route.ts',
      'empleados/[id]/route.ts',
      'ausencias/route.ts',
    ];

    it.each(endpointsToCheck)('should handle errors in %s', (endpoint) => {
      const path = resolve(APP_DIR, endpoint);
      const content = readFileSync(path, 'utf-8');

      const hasErrorHandling = content.includes('try {') ||
                               content.includes('catch') ||
                               content.includes('handleApiError');

      expect(hasErrorHandling).toBe(true);
    });
  });
});
