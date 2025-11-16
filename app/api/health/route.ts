import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/redis';
import { isS3Configured, shouldUseCloudStorage } from '@/lib/s3';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
  const status: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
    storage: 'enabled' | 'disabled' | 'error';
  } = {
    database: 'ok',
    redis: 'ok',
    storage: shouldUseCloudStorage() ? 'enabled' : 'disabled',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('[Health] Error al comprobar base de datos:', error);
    status.database = 'error';
  }

  try {
    if (!(await cache.isAvailable())) {
      status.redis = 'error';
    }
  } catch (error) {
    console.error('[Health] Error al comprobar Redis:', error);
    status.redis = 'error';
  }

  if (shouldUseCloudStorage() && !isS3Configured()) {
    status.storage = 'error';
  }

  const healthy =
    status.database === 'ok' &&
    status.redis === 'ok' &&
    status.storage !== 'error';

  return NextResponse.json(
    {
      healthy,
      status,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}

