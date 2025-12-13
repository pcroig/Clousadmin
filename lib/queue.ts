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

  try {
    const response = await fetch(`${baseUrl}/api/workers/${jobType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WORKER_SECRET || 'dev-secret'}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Worker HTTP falló: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`[Queue] Job ${jobType} ejecutado exitosamente:`, result);
  } catch (error) {
    console.error(`[Queue] Error ejecutando job ${jobType}:`, error);
    throw error;
  }
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
