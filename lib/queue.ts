// ========================================
// Sistema de Colas para Jobs en Background
// ========================================
// Soporta dos modos:
// 1. Vercel Queue (producción con VERCEL_QUEUE_URL)
// 2. HTTP directo (desarrollo/fallback)

/**
 * Payload para job de cálculo de eventos propuestos
 */
export interface CalcularEventosPropuestosPayload {
  fichajeIds: string[];
}

/**
 * Tipos de jobs disponibles
 */
export type JobType = 'calcular-eventos-propuestos';

/**
 * Payload genérico para cualquier tipo de job
 */
export type JobPayload = CalcularEventosPropuestosPayload;

/**
 * Encola un job para procesamiento en background
 *
 * @param jobType Tipo de job a ejecutar
 * @param payload Datos del job
 */
export async function enqueueJob(
  jobType: JobType,
  payload: JobPayload
): Promise<void> {
  // Protección: No ejecutar durante build time
  if (typeof window === 'undefined' && !process.env.NEXT_RUNTIME) {
    console.log(`[Queue] Ignorando enqueueJob durante build time: ${jobType}`);
    return;
  }

  // MODO 1: Vercel Queue (si está disponible)
  if (process.env.VERCEL_QUEUE_URL) {
    console.log(`[Queue] Encolando job ${jobType} en Vercel Queue`);

    try {
      const response = await fetch(process.env.VERCEL_QUEUE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WORKER_SECRET}`,
        },
        body: JSON.stringify({
          type: jobType,
          payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Vercel Queue falló: ${response.status} ${response.statusText}`);
      }

      console.log(`[Queue] Job ${jobType} encolado exitosamente en Vercel Queue`);
      return;
    } catch (error) {
      console.error(`[Queue] Error encolando en Vercel Queue, usando fallback:`, error);
      // Continuar con fallback
    }
  }

  // MODO 2: HTTP directo (desarrollo/fallback)
  console.log(`[Queue] Ejecutando job ${jobType} vía HTTP directo`);

  // En servidor: SIEMPRE usar localhost para evitar pasar por NGINX
  // En desarrollo: usar localhost también
  const baseUrl = 'http://localhost:3000';
  const url = `${baseUrl}/api/workers/${jobType}`;
  const workerSecret = process.env.WORKER_SECRET || 'dev-secret';

  console.log(`[Queue] Encolando job ${jobType} para ${(payload as CalcularEventosPropuestosPayload).fichajeIds.length} fichajes`);

  // CRÍTICO: Ejecutar worker en verdadero background usando setImmediate/setTimeout
  // Next.js espera todas las promesas del request, incluso sin await
  // Usamos setImmediate para ejecutar DESPUÉS de que la respuesta se envíe
  setImmediate(() => {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerSecret}`,
      },
      body: JSON.stringify(payload),
    })
      .then(response => {
        if (!response.ok) {
          console.error(`[Queue] Worker respondió con error ${response.status} pero job ya fue encolado`);
        } else {
          console.log(`[Queue] Worker confirmó recepción de job ${jobType}`);
        }
      })
      .catch((error: unknown) => {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`[Queue] Error encolando job ${jobType} (job puede haberse ejecutado):`, errorMsg);
      });
  });

  // Retornar inmediatamente sin esperar
  console.log(`[Queue] Job ${jobType} encolado exitosamente (procesándose en background)`);
}

/**
 * Divide un array en chunks de tamaño específico
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Encola múltiples jobs en paralelo (para batches grandes)
 *
 * @param jobs Array de jobs a encolar
 * @returns Promesa que se resuelve cuando todos los jobs están encolados
 */
export async function enqueueBatch(
  jobs: Array<{ type: JobType; payload: JobPayload }>
): Promise<void> {
  console.log(`[Queue] Encolando batch de ${jobs.length} jobs`);

  await Promise.all(
    jobs.map(job => enqueueJob(job.type, job.payload))
  );

  console.log(`[Queue] Batch de ${jobs.length} jobs encolados exitosamente`);
}
