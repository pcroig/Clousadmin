/**
 * Tests de integración para rate limiting
 * Requiere Redis para funcionar
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { rateLimitApi, resetRateLimit } from '@/lib/rate-limit';

describe.skip('Rate Limiting Integration', () => {
  let identifier: string;

  beforeEach(() => {
    identifier = `test-${Date.now()}-${Math.random()}`;
  });

  describe('rateLimitApi', () => {
    it('should allow requests within limit', async () => {
      for (let i = 0; i < 100; i++) {
        const result = await rateLimitApi(identifier);
        expect(result.success).toBe(true);
      }
    });

    it('should block requests exceeding limit', async () => {
      // Fill up to limit
      for (let i = 0; i < 100; i++) {
        await rateLimitApi(identifier);
      }

      // This should be blocked
      const bloqueado = await rateLimitApi(identifier);

      expect(bloqueado.success).toBe(false);
      expect(bloqueado.retryAfter).toBeDefined();
      expect(typeof bloqueado.retryAfter).toBe('number');
    });

    it('should allow requests after reset', async () => {
      // Fill up to limit
      for (let i = 0; i < 100; i++) {
        await rateLimitApi(identifier);
      }

      // Should be blocked
      const bloqueado = await rateLimitApi(identifier);
      expect(bloqueado.success).toBe(false);

      // Reset
      await resetRateLimit(identifier);

      // Should work again
      const trasReset = await rateLimitApi(identifier);
      expect(trasReset.success).toBe(true);
    });

    it('should use separate counters for different identifiers', async () => {
      const id1 = `${identifier}-1`;
      const id2 = `${identifier}-2`;

      // Fill first identifier
      for (let i = 0; i < 100; i++) {
        await rateLimitApi(id1);
      }

      // First should be at limit
      const result1 = await rateLimitApi(id1);
      expect(result1.success).toBe(false);

      // Second should still work
      const result2 = await rateLimitApi(id2);
      expect(result2.success).toBe(true);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset counter for specific identifier', async () => {
      // Use some requests
      for (let i = 0; i < 50; i++) {
        await rateLimitApi(identifier);
      }

      // Reset
      await resetRateLimit(identifier);

      // Should be able to use full limit again
      for (let i = 0; i < 100; i++) {
        const result = await rateLimitApi(identifier);
        expect(result.success).toBe(true);
      }
    });
  });
});
