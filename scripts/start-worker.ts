import { documentosWorker } from '@/lib/plantillas/queue';

async function bootstrap() {
  console.log('[Worker] Iniciando worker de documentos (proceso dedicado)...');

  documentosWorker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completado`);
  });

  documentosWorker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} falló:`, err);
  });

  documentosWorker.on('error', (err) => {
    console.error('[Worker] Error en worker:', err);
  });

  const shutdown = async () => {
    console.log('[Worker] Recibido shutdown. Cerrando worker...');
    await documentosWorker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((error) => {
  console.error('[Worker] Error inicializando worker:', error);
  process.exit(1);
});

