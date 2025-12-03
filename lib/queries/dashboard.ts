// ========================================
// Dashboard Queries - Cached & Optimized
// ========================================
// Centraliza queries del dashboard con caching apropiado

import { cachedQuery, CacheDurations } from '@/lib/cache';
import { EstadoAusencia } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncFn = (...args: any[]) => Promise<any>;

/**
 * Obtener solicitudes pendientes de ausencias
 * Cache: 30 segundos (dashboard data)
 */
export const getSolicitudesAusenciasPendientes = cachedQuery(
  (async (empresaId: string) => {
    return await prisma.ausencias.findMany({
      where: {
        empresaId,
        estado: EstadoAusencia.pendiente,
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            fotoUrl: true,
            email: true,
            puesto: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });
  }) as AsyncFn,
  ['solicitudes-ausencias-pendientes'],
  {
    revalidate: CacheDurations.DASHBOARD,
    tags: ['ausencias', 'solicitudes'],
  }
);

/**
 * Obtener solicitudes de cambio pendientes
 * Cache: 30 segundos (dashboard data)
 */
export const getSolicitudesCambioPendientes = cachedQuery(
  (async (empresaId: string) => {
    return await prisma.solicitudes_cambio.findMany({
      where: {
        empresaId,
        estado: 'pendiente',
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            fotoUrl: true,
            email: true,
            puesto: true,
            equipos: {
              select: {
                equipoId: true,
                equipo: {
                  select: {
                    nombre: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });
  }) as AsyncFn,
  ['solicitudes-cambio-pendientes'],
  {
    revalidate: CacheDurations.DASHBOARD,
    tags: ['solicitudes-cambio'],
  }
);

/**
 * Obtener notificaciones recientes de un usuario
 * Cache: 30 segundos (notificaciones pueden esperar un poco)
 */
export const getNotificacionesUsuario = cachedQuery(
  (async (empresaId: string, usuarioId: string) => {
    return await prisma.notificaciones.findMany({
      where: {
        empresaId,
        usuarioId,
      },
      select: {
        id: true,
        empresaId: true,
        usuarioId: true,
        tipo: true,
        mensaje: true,
        metadata: true,
        leida: true,
        createdAt: true,
        eventoNominaId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
  }) as AsyncFn,
  ['notificaciones-usuario'],
  {
    revalidate: CacheDurations.DASHBOARD,
    tags: ['notificaciones'],
  }
);

/**
 * Obtener stats de auto-completados
 * Cache: 5 minutos (data histórica, no cambia frecuentemente)
 */
export const getAutoCompletadosStats = cachedQuery(
  (async (empresaId: string) => {
    const [fichajes, ausencias, solicitudes] = await Promise.all([
      prisma.auto_completados.count({
        where: {
          empresaId,
          tipo: 'fichaje_completado',
          estado: 'aprobado',
        },
      }),
      prisma.auto_completados.count({
        where: {
          empresaId,
          tipo: 'ausencia_auto_aprobada',
          estado: 'aprobado',
        },
      }),
      prisma.auto_completados.count({
        where: {
          empresaId,
          tipo: 'solicitud_auto_aprobada',
          estado: 'aprobado',
        },
      }),
    ]);

    return {
      fichajesCompletados: fichajes,
      ausenciasCompletadas: ausencias,
      solicitudesCompletadas: solicitudes,
    };
  }) as AsyncFn,
  ['auto-completados-stats'],
  {
    revalidate: CacheDurations.LISTINGS,
    tags: ['auto-completados'],
  }
);

/**
 * Obtener fichajes recientes de un empleado
 * Cache: 30 segundos (dashboard data)
 */
export const getFichajesRecientes = cachedQuery(
  (async (empleadoId: string) => {
    const fichajesRaw = await prisma.fichajes.findMany({
      where: {
        empleadoId,
      },
      include: {
        eventos: {
          orderBy: {
            hora: 'asc',
          },
        },
      },
      orderBy: {
        fecha: 'desc',
      },
      take: 10,
    });

    // Serializar Decimals a números para cliente
    return fichajesRaw.map((f) => ({
      ...f,
      horasTrabajadas: f.horasTrabajadas != null ? Number(f.horasTrabajadas) : null,
      horasEnPausa: f.horasEnPausa != null ? Number(f.horasEnPausa) : null,
    }));
  }) as AsyncFn,
  ['fichajes-recientes'],
  {
    revalidate: CacheDurations.DASHBOARD,
    tags: ['fichajes'],
  }
);

/**
 * Obtener ausencias recientes de un empleado
 * Cache: 30 segundos (dashboard data)
 */
export const getAusenciasRecientes = cachedQuery(
  (async (empleadoId: string) => {
    const ausenciasRaw = await prisma.ausencias.findMany({
      where: {
        empleadoId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return ausenciasRaw.map((a) => ({
      ...a,
      diasSolicitados: a.diasSolicitados != null ? Number(a.diasSolicitados) : 0,
    }));
  }) as AsyncFn,
  ['ausencias-recientes'],
  {
    revalidate: CacheDurations.DASHBOARD,
    tags: ['ausencias'],
  }
);

