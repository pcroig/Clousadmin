/**
 * Next.js Instrumentation Hook
 * Se ejecuta automáticamente al iniciar el servidor (tanto dev como prod)
 * Usado para inicializar workers, servicios en background, etc.
 */

export async function register() {
  // Solo ejecutar en el servidor (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.DISABLE_EMBEDDED_WORKER === 'true') {
      console.log('[Instrumentation] Worker embebido desactivado (DISABLE_EMBEDDED_WORKER=true)');
      return;
    }

    console.log('[Instrumentation] Inicializando servicios en background...');

    // Importar dinámicamente para evitar problemas con edge runtime
    const { documentosWorker } = await import('@/lib/plantillas/queue');

    console.log('[Instrumentation] Worker de documentos iniciado');

    // Event handlers para el worker
    documentosWorker.on('completed', (job) => {
      console.log(`[Worker] Job ${job.id} completado`);
    });

    documentosWorker.on('failed', (job, err) => {
      console.error(`[Worker] Job ${job?.id} falló:`, err.message);
    });

    documentosWorker.on('error', (err) => {
      console.error('[Worker] Error en worker:', err);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('[Instrumentation] Cerrando worker de documentos...');
      await documentosWorker.close();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}
