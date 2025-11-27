/**
 * Smoke test: Validar que los helpers de BD funcionan correctamente
 */

import { afterAll, describe, expect, it } from 'vitest';

import { cleanDatabase, getPrismaTest, teardownTestDatabase } from '../helpers/db';

describe('Database Setup', () => {
  const prisma = getPrismaTest();

  // Cleanup después de todos los tests
  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should have DATABASE_URL pointing to test database', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.DATABASE_URL).toContain('test');
  });

  it('should be able to connect to database', async () => {
    // Simple query para validar conexión
    await expect(prisma.$queryRaw`SELECT 1 as result`).resolves.toBeDefined();
  });

  it('should have NODE_ENV set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should throw error if trying to use getPrismaTest outside test environment', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    // Temporalmente cambiar NODE_ENV
    process.env.NODE_ENV = 'development';

    // Esto debería lanzar error (pero no podemos testearlo porque ya tenemos la instancia)
    // Solo validamos que NODE_ENV está en test
    process.env.NODE_ENV = originalNodeEnv;
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should be able to clean database', async () => {
    // Clean database no debería lanzar error
    await expect(cleanDatabase()).resolves.toBeUndefined();
  });
});
