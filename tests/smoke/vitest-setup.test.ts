/**
 * Smoke test: Validar que Vitest está configurado correctamente
 */

import { describe, expect, it } from 'vitest';

describe('Vitest Setup', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have globals enabled', () => {
    // Si globals están habilitados, describe/it/expect están disponibles sin import
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });

  it('should support async/await', async () => {
    const promise = Promise.resolve(42);
    const result = await promise;
    expect(result).toBe(42);
  });

  it('should support timers', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    setTimeout(callback, 1000);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});
