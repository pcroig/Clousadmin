import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { isS3Configured, shouldUseCloudStorage } from '@/lib/s3';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
  const status: {
    database: 'ok' | 'error';
    redis: 'ok' | 'degraded' | 'error';
    storage: 'enabled' | 'disabled' | 'error';
  } = {
    database: 'ok',
    redis: 'ok',
    storage: shouldUseCloudStorage() ? 'enabled' : 'disabled',
  };

  // Database check - CRÍTICO
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('[Health] Error al comprobar base de datos:', error);
    status.database = 'error';
  }

  // Redis check - OPCIONAL (fail-open)
  // La aplicación funciona sin Redis, solo afecta caché y rate limiting
  try {
    const available = await cache.isAvailable();
    if (!available) {
      status.redis = 'degraded'; // No crítico - funciona sin él
    }
  } catch (error) {
    console.error('[Health] Error al comprobar Redis:', error);
    status.redis = 'degraded'; // No crítico - funciona sin él
  }

  // Storage check - Solo verificar si está habilitado
  if (shouldUseCloudStorage() && !isS3Configured()) {
    status.storage = 'error';
  }

  // HEALTHY = Database OK + Storage OK (si está habilitado)
  // Redis NO es crítico para la salud del sistema
  const healthy =
    status.database === 'ok' &&
    status.storage !== 'error';

  return NextResponse.json(
    {
      healthy,
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
    },
    { status: healthy ? 200 : 503 }
  );
}

