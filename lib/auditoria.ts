// ========================================
// Auditoría de Accesos
// ========================================
// Registro de accesos a datos sensibles para cumplimiento GDPR/LOPD

import { prisma } from '@/lib/prisma';
import { getClientIP } from '@/lib/rate-limit';
import type { NextRequest } from 'next/server';
import type { SessionData } from '@/types/auth';

interface RegistrarAccesoParams {
  empresaId: string;
  usuarioId: string;
  empleadoAccedidoId?: string;
  accion: 'lectura' | 'modificacion' | 'exportacion' | 'eliminacion';
  recurso: string; // 'empleado', 'nomina', 'contrato', etc.
  camposAccedidos?: string[];
  ipAddress?: string;
  userAgent?: string;
  motivo?: string;
}

/**
 * Registrar acceso a datos sensibles
 * Cumplimiento GDPR/LOPD - Artículo 30 (Registro de actividades de tratamiento)
 */
export async function registrarAcceso(params: RegistrarAccesoParams): Promise<void> {
  try {
    await prisma.auditoriaAcceso.create({
      data: {
        empresaId: params.empresaId,
        usuarioId: params.usuarioId,
        empleadoAccedidoId: params.empleadoAccedidoId,
        accion: params.accion,
        recurso: params.recurso,
        camposAccedidos: params.camposAccedidos || [],
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        motivo: params.motivo,
      },
    });
  } catch (error) {
    // No fallar si falla la auditoría (degradar graciosamente)
    // Pero loggear el error para investigar
    console.error('[Auditoría] Error registrando acceso:', error);
  }
}

interface LogAccesoOptions {
  request?: NextRequest | null;
  session: SessionData;
  recurso: string;
  accion?: RegistrarAccesoParams['accion'];
  empleadoAccedidoId?: string | null;
  camposAccedidos?: string[];
  motivo?: string;
}

/**
 * Helper de conveniencia para registrar accesos desde APIs
 */
export async function logAccesoSensibles({
  request,
  session,
  recurso,
  accion = 'lectura',
  empleadoAccedidoId,
  camposAccedidos,
  motivo,
}: LogAccesoOptions): Promise<void> {
  await registrarAcceso({
    empresaId: session.user.empresaId,
    usuarioId: session.user.id,
    empleadoAccedidoId: empleadoAccedidoId ?? undefined,
    recurso,
    accion,
    camposAccedidos,
    motivo,
    ipAddress: request ? getClientIP(request.headers) : undefined,
    userAgent: request?.headers.get('user-agent') ?? undefined,
  });
}

/**
 * Obtener log de auditoría para un empleado específico
 * Útil para responder a solicitudes GDPR (Artículo 15 - Derecho de acceso)
 */
export async function obtenerLogAuditoria(
  empresaId: string,
  empleadoId: string,
  opciones?: {
    desde?: Date;
    hasta?: Date;
    accion?: string;
    limite?: number;
  }
) {
  type WhereClause = {
    empresaId: string;
    empleadoAccedidoId: string;
    createdAt?: { gte?: Date; lte?: Date };
    accion?: string;
  };
  
  const where: WhereClause = {
    empresaId,
    empleadoAccedidoId: empleadoId,
  };

  if (opciones?.desde || opciones?.hasta) {
    where.createdAt = {};
    if (opciones.desde) {
      where.createdAt.gte = opciones.desde;
    }
    if (opciones.hasta) {
      where.createdAt.lte = opciones.hasta;
    }
  }

  if (opciones?.accion) {
    where.accion = opciones.accion;
  }

  return prisma.auditoriaAcceso.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: opciones?.limite || 100,
    include: {
      usuario: {
        select: {
          nombre: true,
          apellidos: true,
          email: true,
          rol: true,
        },
      },
    },
  });
}

/**
 * Obtener estadísticas de accesos por usuario
 * Útil para monitoreo y detección de accesos inusuales
 */
export async function obtenerEstadisticasAccesos(
  empresaId: string,
  opciones?: {
    desde?: Date;
    hasta?: Date;
  }
) {
  type WhereClauseStats = {
    empresaId: string;
    createdAt?: { gte?: Date; lte?: Date };
  };
  
  const where: WhereClauseStats = { empresaId };

  if (opciones?.desde || opciones?.hasta) {
    where.createdAt = {};
    if (opciones.desde) {
      where.createdAt.gte = opciones.desde;
    }
    if (opciones.hasta) {
      where.createdAt.lte = opciones.hasta;
    }
  }

  // Contar accesos por usuario
  const accesosPorUsuario = await prisma.auditoriaAcceso.groupBy({
    by: ['usuarioId'],
    where,
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
  });

  // Contar accesos por acción
  const accesosPorAccion = await prisma.auditoriaAcceso.groupBy({
    by: ['accion'],
    where,
    _count: {
      id: true,
    },
  });

  return {
    accesosPorUsuario,
    accesosPorAccion,
  };
}

/**
 * Limpiar logs de auditoría antiguos (retención de datos)
 * GDPR Artículo 5 - Limitación del plazo de conservación
 * @param empresaId - Empresa
 * @param diasRetencion - Días a retener (ej: 365 para 1 año, 2555 para 7 años)
 */
export async function limpiarLogsAntiguos(
  empresaId: string,
  diasRetencion: number = 2555 // 7 años por defecto (LOPD)
): Promise<number> {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - diasRetencion);

  try {
    const result = await prisma.auditoriaAcceso.deleteMany({
      where: {
        empresaId,
        createdAt: {
          lt: fechaLimite,
        },
      },
    });

    return result.count;
  } catch (error) {
    console.error('[Auditoría] Error limpiando logs antiguos:', error);
    throw error;
  }
}

/**
 * Detectar accesos sospechosos
 * Útil para alertas de seguridad
 */
export async function detectarAccesosSospechosos(
  empresaId: string,
  ventanaHoras: number = 1
): Promise<Array<{ usuarioId: string; count: number }>> {
  const desde = new Date(Date.now() - ventanaHoras * 60 * 60 * 1000);

  // Buscar usuarios con muchos accesos en poco tiempo
  const accesosRecientes = await prisma.auditoriaAcceso.groupBy({
    by: ['usuarioId'],
    where: {
      empresaId,
      createdAt: {
        gte: desde,
      },
    },
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gt: 50, // Más de 50 accesos en ventanaHoras es sospechoso
        },
      },
    },
  });

  return accesosRecientes.map((a) => ({
    usuarioId: a.usuarioId,
    count: a._count.id,
  }));
}









