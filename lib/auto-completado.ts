// ========================================
// Auto-completado helpers
// ========================================
// Centraliza la creación de registros en la tabla auto_completados para que
// los widgets de “Auto-completed” tengan trazabilidad consistente.

import type { Prisma, PrismaClient } from '@prisma/client';

type AutoCompletadoClient = PrismaClient | Prisma.TransactionClient;

interface RegistrarAutoCompletadoParams {
  empresaId: string;
  empleadoId: string;
  tipo: string;
  datosOriginales: Record<string, unknown>;
  sugerencias?: Record<string, unknown>;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
  aprobadoPor?: string;
  aprobadoEn?: Date;
}

/**
 * Registra un auto-completado en la base de datos.
 * Por defecto, el estado es 'aprobado' porque los auto-completados
 * representan acciones que ya fueron ejecutadas automáticamente.
 */
export async function registrarAutoCompletado(
  prisma: AutoCompletadoClient,
  {
    empresaId,
    empleadoId,
    tipo,
    datosOriginales,
    sugerencias = {},
    estado = 'aprobado', // Por defecto 'aprobado' porque ya se ejecutó
    aprobadoPor,
    aprobadoEn,
  }: RegistrarAutoCompletadoParams
) {
  await prisma.autoCompletado.create({
    data: {
      empresaId,
      empleadoId,
      tipo,
      datosOriginales: datosOriginales as Prisma.InputJsonValue,
      sugerencias: sugerencias as Prisma.InputJsonValue,
      estado,
      aprobadoPor,
      aprobadoEn: aprobadoEn ?? new Date(),
    },
  });
}

export async function registrarAutoCompletadoAusencia(
  prisma: AutoCompletadoClient,
  params: {
    empresaId: string;
    ausenciaId: string;
    empleadoId: string;
    tipoAusencia: string;
    fechaInicio: Date;
    fechaFin: Date;
    aprobadoPor: string;
    origen: string;
  }
) {
  const { empresaId, ausenciaId, empleadoId, tipoAusencia, fechaInicio, fechaFin, aprobadoPor, origen } =
    params;

  await registrarAutoCompletado(prisma, {
    empresaId,
    empleadoId,
    tipo: 'ausencia_auto_aprobada',
    datosOriginales: {
      ausenciaId,
      tipo: tipoAusencia,
      fechaInicio,
      fechaFin,
      origen,
    },
    sugerencias: {
      accion: 'aprobar',
    },
    aprobadoPor,
  });
}

export async function registrarAutoCompletadoSolicitud(
  prisma: AutoCompletadoClient,
  params: {
    empresaId: string;
    solicitudId: string;
    empleadoId: string;
    tipoSolicitud: string;
    camposCambiados: Prisma.JsonValue;
    aprobadoPor: string;
    origen: string;
  }
) {
  const { empresaId, solicitudId, empleadoId, tipoSolicitud, camposCambiados, aprobadoPor, origen } =
    params;

  await registrarAutoCompletado(prisma, {
    empresaId,
    empleadoId,
    tipo: 'solicitud_auto_aprobada',
    datosOriginales: {
      solicitudId,
      tipo: tipoSolicitud,
      camposCambiados,
      origen,
    },
    sugerencias: {
      accion: 'aprobar',
    },
    aprobadoPor,
  });
}


