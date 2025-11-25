import { NextResponse } from 'next/server';

/**
 * Endpoint de prueba para verificar que Sentry funciona correctamente
 * Úsalo visitando: /api/test-sentry?action=error
 * 
 * Acciones disponibles:
 * - error: Lanza un error que Sentry capturará
 * - success: Retorna un mensaje de éxito (para verificar que el endpoint funciona)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'success';

  if (action === 'error') {
    // Lanzar error de prueba para Sentry
    throw new Error('Test Sentry integration - esto es una prueba intencional');
  }

  return NextResponse.json({
    success: true,
    message: 'Endpoint de prueba de Sentry funcionando correctamente',
    usage: 'Usa ?action=error para probar que Sentry captura errores',
    sentry: {
      configured: !!process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || 'not set',
    },
  });
}


