/**
 * Sistema de colas con BullMQ para generación asíncrona de documentos
 * Permite generar documentos en background con tracking de progreso
 */

import { Prisma } from '@prisma/client';
import { Job, Queue, QueueEvents, Worker } from 'bullmq';

import { crearNotificacionDocumentoGeneracionLote } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/redis';

import { generarDocumentoDesdePlantilla } from './generar-documento';
import { JobConfig, JobProgress, ResultadoGeneracion } from './tipos';

/**
 * Interfaz para el callback de progreso
 */
interface ProgresoCallback {
  (progreso: number): Promise<void> | void;
}

/**
 * Procesa los empleados de un job de generación de documentos
 * Esta función contiene la lógica común utilizada tanto por el worker como por el modo sin cola
 */
async function procesarEmpleadosJob(
  jobId: string,
  config: JobConfig,
  onProgreso?: ProgresoCallback
): Promise<{ exitosos: number; fallidos: number; resultados: ResultadoGeneracion[] }> {
  const resultados: ResultadoGeneracion[] = [];
  const total = config.empleadoIds.length;
  let exitosos = 0;
  let fallidos = 0;

  // Verificar formato de plantilla
  const plantilla = await prisma.plantillaDocumento.findUnique({
    where: { id: config.plantillaId },
    select: { formato: true },
  });

  if (!plantilla) {
    throw new Error('Plantilla no encontrada');
  }

  // Procesar cada empleado
  for (let i = 0; i < config.empleadoIds.length; i++) {
    const empleadoId = config.empleadoIds[i];

    try {
      if (plantilla.formato === 'pdf_rellenable') {
        throw new Error('La generación desde PDFs rellenables está desactivada. Solo se soportan plantillas DOCX con variables.');
      }

      const resultado = await generarDocumentoDesdePlantilla(
        config.plantillaId,
        empleadoId,
        config.configuracion,
        config.solicitadoPor
      );

      resultados.push(resultado);
      if (resultado.success) {
        exitosos++;
      } else {
        fallidos++;
      }
    } catch (error) {
      console.error(`[Queue] Error procesando empleado ${empleadoId}:`, error);
      resultados.push({
        success: false,
        empleadoId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      fallidos++;
    }

    // Actualizar progreso en BD
    const procesados = i + 1;
    const progreso = Math.round((procesados / total) * 100);

    await prisma.jobGeneracionDocumentos.update({
      where: { id: jobId },
      data: {
        progreso,
        procesados,
        exitosos,
        fallidos,
        resultados: resultados as Prisma.InputJsonValue,
      },
    });

    // Callback de progreso opcional (para workers)
    if (onProgreso) {
      await onProgreso(progreso);
    }
  }

  return { exitosos, fallidos, resultados };
}

// Configuración de conexión Redis para BullMQ
// Parsear REDIS_URL si está disponible, sino usar configuración por defecto
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let connection: {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
  enableOfflineQueue: boolean;
  retryStrategy: (times: number) => number | null;
} | undefined;

try {
  const url = new URL(REDIS_URL);
  connection = {
    host: url.hostname,
    port: parseInt(url.port || '6379'),
    password: url.password || undefined,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => {
      if (times > 5) {
        return null;
      }
      return Math.min(times * 50, 2000);
    },
  };
} catch {
  // Fallback a configuración por defecto si REDIS_URL no es válida
  connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => {
      if (times > 5) {
        return null;
      }
      return Math.min(times * 50, 2000);
    },
  };
}

// Verificar si Redis está disponible antes de inicializar
let redisAvailable = false;
let availabilityChecked = false;

async function checkRedisAvailability(): Promise<boolean> {
  if (availabilityChecked) return redisAvailable;
  
  try {
    redisAvailable = await cache.isAvailable();
    availabilityChecked = true;
    
    if (!redisAvailable) {
      console.warn('[Queue] Redis no disponible - colas deshabilitadas');
    }
  } catch {
    redisAvailable = false;
    availabilityChecked = true;
  }
  
  return redisAvailable;
}

async function procesarJobSinCola(jobId: string, config: JobConfig) {
  console.warn('[Queue] Redis no disponible. Procesando job sin cola.');

  const total = config.empleadoIds.length;
  const inicio = Date.now();

  await prisma.jobGeneracionDocumentos.update({
    where: { id: jobId },
    data: {
      estado: 'procesando',
      iniciadoEn: new Date(),
    },
  });

  try {
    const { exitosos, fallidos, resultados } = await procesarEmpleadosJob(jobId, config);

    await prisma.jobGeneracionDocumentos.update({
      where: { id: jobId },
      data: {
        estado: 'completado',
        progreso: 100,
        procesados: total,
        exitosos,
        fallidos,
        completadoEn: new Date(),
        tiempoTotal: Date.now() - inicio,
        resultados: resultados as Prisma.InputJsonValue,
      },
    });

    await crearNotificacionDocumentoGeneracionLote(prisma, {
      empresaId: config.empresaId,
      usuarioId: config.solicitadoPor,
      total,
      exitosos,
      fallidos,
      jobId,
    });
  } catch (error) {
    await prisma.jobGeneracionDocumentos.update({
      where: { id: jobId },
      data: {
        estado: 'fallido',
        error: error instanceof Error ? error.message : 'Error al generar documentos',
        completadoEn: new Date(),
      },
    });

    await crearNotificacionDocumentoGeneracionLote(prisma, {
      empresaId: config.empresaId,
      usuarioId: config.solicitadoPor,
      total,
      exitosos: 0,
      fallidos: total,
      jobId,
      mensajePersonalizado:
        error instanceof Error
          ? `Ocurrió un error al generar los documentos: ${error.message}`
          : 'Ocurrió un error al generar los documentos.',
    });

    throw error;
  }
}

/**
 * Cola de generación de documentos
 * Solo funciona si Redis está disponible
 */
export const documentosQueue = new Queue('documentos-generacion', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Máximo 3 reintentos
    backoff: {
      type: 'exponential',
      delay: 2000, // Inicial: 2s, luego 4s, 8s
    },
    removeOnComplete: {
      age: 86400, // Mantener jobs completados 24h
      count: 1000, // Máximo 1000 jobs completados
    },
    removeOnFail: {
      age: 604800, // Mantener jobs fallidos 7 días
    },
  },
});

// Manejar errores de conexión silenciosamente
let queueErrorLogged = false;
documentosQueue.on('error', (error) => {
  // Solo mostrar error una vez si es de conexión
  if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
    if (!queueErrorLogged) {
      // Ya se muestra en redis.ts, no duplicar
      queueErrorLogged = true;
    }
  } else {
    console.error('[Queue] Error en cola:', error.message);
  }
});

/**
 * Eventos de la cola (para tracking en tiempo real)
 */
export const documentosQueueEvents = new QueueEvents('documentos-generacion', {
  connection,
});

// Manejar errores de eventos silenciosamente
let eventsErrorLogged = false;
documentosQueueEvents.on('error', (error) => {
  // Solo mostrar error una vez si es de conexión
  if (error?.message?.includes('ECONNREFUSED') || error?.message?.includes('connect')) {
    if (!eventsErrorLogged) {
      // Ya se muestra en redis.ts, no duplicar
      eventsErrorLogged = true;
    }
  }
});

/**
 * Agregar job de generación de documentos
 */
export async function agregarJobGeneracion(config: JobConfig): Promise<string> {
  console.log(`[Queue] Agregando job para ${config.empleadoIds.length} empleados`);

  // Validar que no exceda el límite
  if (config.empleadoIds.length > 500) {
    throw new Error('Máximo 500 empleados por job');
  }

  // Crear registro en BD
  const jobRecord = await prisma.jobGeneracionDocumentos.create({
    data: {
      empresaId: config.empresaId,
      plantillaId: config.plantillaId,
      solicitadoPor: config.solicitadoPor,
      empleadoIds: config.empleadoIds,
      configuracion: config.configuracion as Prisma.InputJsonValue,
      estado: 'en_cola',
      totalEmpleados: config.empleadoIds.length,
    },
  });

  const redisDisponible = await checkRedisAvailability();

  const agregarEnCola = async () => {
    const job = await documentosQueue.add(
      'generar-documentos',
      {
        jobId: jobRecord.id,
        ...config,
      },
      {
        jobId: jobRecord.id,
      }
    );
    console.log(`[Queue] Job agregado: ${job.id}`);
  };

  if (!redisDisponible) {
    await procesarJobSinCola(jobRecord.id, config);
    return jobRecord.id;
  }

  try {
    await agregarEnCola();
    return jobRecord.id;
  } catch (error: unknown) {
    const errorObj = error as { code?: string; message?: string } | null;
    const isConexion =
      errorObj?.code === 'ECONNREFUSED' ||
      errorObj?.message?.includes('ECONNREFUSED') ||
      errorObj?.message?.includes('connect');

    if (isConexion) {
      console.warn('[Queue] Redis no disponible durante el encolado. Ejecutando en modo inmediato.');
      await procesarJobSinCola(jobRecord.id, config);
      return jobRecord.id;
    }

    // Si es otro error, actualizar el registro y relanzar
    await prisma.jobGeneracionDocumentos.update({
      where: { id: jobRecord.id },
      data: {
        estado: 'fallido',
        error: error?.message || 'Error al agregar job',
        completadoEn: new Date(),
      },
    });
    throw error;
  }
}

/**
 * Obtener estado de un job
 */
export async function obtenerEstadoJob(jobId: string): Promise<JobProgress | null> {
  try {
    // Buscar en BD
    const jobRecord = await prisma.jobGeneracionDocumentos.findUnique({
      where: { id: jobId },
    });

    if (!jobRecord) return null;

    return {
      jobId: jobRecord.id,
      estado: jobRecord.estado as 'en_cola' | 'procesando' | 'completado' | 'fallido',
      progreso: jobRecord.progreso,
      totalEmpleados: jobRecord.totalEmpleados,
      procesados: jobRecord.procesados,
      exitosos: jobRecord.exitosos,
      fallidos: jobRecord.fallidos,
      resultados: jobRecord.resultados as ResultadoGeneracion[] | undefined,
      error: jobRecord.error || undefined,
      tiempoTotal: jobRecord.tiempoTotal || undefined,
    };
  } catch (error) {
    console.error(`[Queue] Error al obtener estado de job ${jobId}:`, error);
    return null;
  }
}

/**
 * Cancelar job en progreso
 */
export async function cancelarJob(jobId: string): Promise<boolean> {
  try {
    const job = await documentosQueue.getJob(jobId);
    if (!job) return false;

    await job.remove();

    // Actualizar en BD
    await prisma.jobGeneracionDocumentos.update({
      where: { id: jobId },
      data: {
        estado: 'fallido',
        error: 'Cancelado por el usuario',
        completadoEn: new Date(),
      },
    });

    console.log(`[Queue] Job cancelado: ${jobId}`);
    return true;
  } catch (error) {
    console.error(`[Queue] Error al cancelar job ${jobId}:`, error);
    return false;
  }
}

/**
 * Worker que procesa los jobs de generación
 * Se inicializa automáticamente pero maneja errores silenciosamente
 */
export const documentosWorker = new Worker(
  'documentos-generacion',
  async (job: Job) => {
    const config: JobConfig & { jobId: string } = job.data;
    const jobId = config.jobId;
    const total = config.empleadoIds.length;

    console.log(`[Worker] Procesando job ${jobId} - ${total} empleados`);

    // Actualizar estado a "procesando"
    await prisma.jobGeneracionDocumentos.update({
      where: { id: jobId },
      data: {
        estado: 'procesando',
        iniciadoEn: new Date(),
      },
    });

    // Procesar empleados usando la función común
    const { exitosos, fallidos, resultados } = await procesarEmpleadosJob(
      jobId,
      config,
      async (progreso) => {
        await job.updateProgress(progreso);
        console.log(`[Worker] Progreso: ${progreso}%`);
      }
    );

    // Completar job
    const tiempoTotal = Date.now() - (job.processedOn || Date.now());

    await prisma.jobGeneracionDocumentos.update({
      where: { id: jobId },
      data: {
        estado: 'completado',
        progreso: 100,
        procesados: total,
        exitosos,
        fallidos,
        completadoEn: new Date(),
        tiempoTotal,
        resultados: resultados as Prisma.InputJsonValue,
      },
    });

    // Notificar al solicitante
    await prisma.notificacion.create({
      data: {
        empresaId: config.empresaId,
        usuarioId: config.solicitadoPor,
        tipo: exitosos === total ? 'success' : fallidos > 0 ? 'warning' : 'info',
        titulo: 'Generación de documentos completada',
        mensaje: `Se generaron ${exitosos} documentos exitosamente${fallidos > 0 ? `, ${fallidos} fallidos` : ''}.`,
        metadata: {
          jobId,
          totalEmpleados: total,
          exitosos,
          fallidos,
        },
      },
    });

    console.log(`[Worker] Job completado: ${exitosos} exitosos, ${fallidos} fallidos (${tiempoTotal}ms)`);

    return {
      exitosos,
      fallidos,
      total,
      tiempoTotal,
    };
  },
  {
    connection,
    concurrency: 2, // Procesar máximo 2 jobs simultáneamente
    limiter: {
      max: 10, // Máximo 10 jobs por...
      duration: 60000, // ... 60 segundos (rate limiting)
    },
  }
);

// Manejar errores de conexión silenciosamente
let workerErrorLogged = false;
documentosWorker.on('error', (error) => {
  // Solo mostrar error una vez si es de conexión
  if (error?.message?.includes('ECONNREFUSED') || error?.message?.includes('connect') || error?.code === 'ECONNREFUSED') {
    if (!workerErrorLogged) {
      // Ya se muestra en redis.ts, no duplicar
      workerErrorLogged = true;
    }
  } else if (error) {
    console.error('[Worker] Error:', error.message || error);
  }
});

/**
 * Event listeners del worker
 */
documentosWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Job completado: ${job.id}`);
});

documentosWorker.on('failed', async (job, error) => {
  console.error(`[Worker] ❌ Job fallido: ${job?.id}`, error);

  if (job) {
    const config: JobConfig & { jobId: string } = job.data;

    // Actualizar en BD
    await prisma.jobGeneracionDocumentos.update({
      where: { id: config.jobId },
      data: {
        estado: 'fallido',
        error: error.message,
        completadoEn: new Date(),
        intentos: { increment: 1 },
        ultimoIntento: new Date(),
      },
    });

    // Notificar al solicitante
    await prisma.notificacion.create({
      data: {
        empresaId: config.empresaId,
        usuarioId: config.solicitadoPor,
        tipo: 'error',
        titulo: 'Error en generación de documentos',
        mensaje: `Ocurrió un error al generar los documentos: ${error.message}`,
        metadata: {
          jobId: config.jobId,
          error: error.message,
        },
      },
    });
  }
});

documentosWorker.on('progress', (job, progress) => {
  console.log(`[Worker] Job ${job.id} - Progreso: ${progress}%`);
});

/**
 * Limpiar jobs antiguos (ejecutar periódicamente)
 */
export async function limpiarJobsAntiguos(): Promise<void> {
  try {
    // Limpiar jobs completados hace más de 7 días
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);

    const eliminados = await prisma.jobGeneracionDocumentos.deleteMany({
      where: {
        estado: 'completado',
        completadoEn: {
          lt: hace7Dias,
        },
      },
    });

    console.log(`[Queue] Limpiados ${eliminados.count} jobs antiguos`);
  } catch (error) {
    console.error('[Queue] Error al limpiar jobs antiguos:', error);
  }
}

/**
 * Obtener estadísticas de la cola
 */
export async function obtenerEstadisticasCola() {
  const [waiting, active, completed, failed] = await Promise.all([
    documentosQueue.getWaitingCount(),
    documentosQueue.getActiveCount(),
    documentosQueue.getCompletedCount(),
    documentosQueue.getFailedCount(),
  ]);

  return {
    enCola: waiting,
    procesando: active,
    completados: completed,
    fallidos: failed,
  };
}

/**
 * Cerrar workers y colas (para shutdown graceful)
 */
export async function cerrarQueue(): Promise<void> {
  console.log('[Queue] Cerrando workers y colas...');

  const promises: Promise<void>[] = [
    documentosQueue.close(),
    documentosQueueEvents.close(),
  ];

  if (documentosWorker) {
    promises.push(documentosWorker.close());
  }

  await Promise.all(promises.map(p => p.catch(() => {
    // Silenciar errores al cerrar si Redis no está disponible
  })));

  console.log('[Queue] Workers y colas cerrados');
}
