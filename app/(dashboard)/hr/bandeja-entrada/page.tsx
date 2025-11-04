// ========================================
// HR - Bandeja de Entrada Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BandejaEntradaTabs } from '@/components/hr/bandeja-entrada-tabs';

export default async function HRBandejaEntradaPage() {
  const session = await getSession();

  if (!session || session.user.rol !== 'hr_admin') {
    redirect('/login');
  }

  // Obtener solicitudes pendientes de ausencia
  const ausenciasPendientes = await prisma.ausencia.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: 'pendiente',
    },
    include: {
      empleado: {
        select: {
          nombre: true,
          apellidos: true,
          fotoUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Obtener solicitudes resueltas de ausencia (aprobadas/rechazadas)
  const ausenciasResueltas = await prisma.ausencia.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: {
        in: ['aprobada', 'rechazada'],
      },
    },
    include: {
      empleado: {
        select: {
          nombre: true,
          apellidos: true,
          fotoUrl: true,
        },
      },
    },
    orderBy: {
      aprobadaEn: 'desc',
    },
    take: 20, // Limitar a las últimas 20
  });

  // Obtener solicitudes de cambio pendientes
  const solicitudesCambioPendientes = await prisma.solicitudCambio.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: 'pendiente',
    },
    include: {
      empleado: {
        select: {
          nombre: true,
          apellidos: true,
          fotoUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Obtener solicitudes de cambio resueltas
  const solicitudesCambioResueltas = await prisma.solicitudCambio.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: {
        in: ['aprobada', 'rechazada'],
      },
    },
    include: {
      empleado: {
        select: {
          nombre: true,
          apellidos: true,
          fotoUrl: true,
        },
      },
    },
    orderBy: {
      fechaRespuesta: 'desc',
    },
    take: 20,
  });

  // Combinar solicitudes pendientes
  const solicitudesPendientes = [
    ...ausenciasPendientes.map((aus) => ({
      id: aus.id,
      empleado: {
        nombre: aus.empleado.nombre,
        apellidos: aus.empleado.apellidos,
        avatar: aus.empleado.fotoUrl || undefined,
      },
      tipo: 'ausencia' as const,
      detalles: `Solicitud de ${aus.tipo}`,
      fechaLimite: new Date(aus.fechaFin),
      fechaCreacion: aus.createdAt,
      estado: 'pendiente' as const,
      metadata: {
        tipoAusencia: aus.tipo,
        fechaInicio: aus.fechaInicio,
        fechaFin: aus.fechaFin,
      },
    })),
    ...solicitudesCambioPendientes.map((sol) => ({
      id: sol.id,
      empleado: {
        nombre: sol.empleado.nombre,
        apellidos: sol.empleado.apellidos,
        avatar: sol.empleado.fotoUrl || undefined,
      },
      tipo: 'cambio_datos' as const,
      detalles: `Solicitud de cambio de ${sol.tipo}`,
      fechaLimite: new Date(sol.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      fechaCreacion: sol.createdAt,
      estado: 'pendiente' as const,
    })),
  ].sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime());

  // Combinar solicitudes resueltas
  const solicitudesResueltas = [
    ...ausenciasResueltas.map((aus) => ({
      id: aus.id,
      empleado: {
        nombre: aus.empleado.nombre,
        apellidos: aus.empleado.apellidos,
        avatar: aus.empleado.fotoUrl || undefined,
      },
      tipo: 'ausencia' as const,
      detalles: `Solicitud de ${aus.tipo}`,
      fechaLimite: new Date(aus.fechaFin),
      fechaCreacion: aus.createdAt,
      estado: aus.estado as 'aprobada' | 'rechazada',
      fechaResolucion: aus.aprobadaEn || undefined,
      metadata: {
        tipoAusencia: aus.tipo,
        fechaInicio: aus.fechaInicio,
        fechaFin: aus.fechaFin,
      },
    })),
    ...solicitudesCambioResueltas.map((sol) => ({
      id: sol.id,
      empleado: {
        nombre: sol.empleado.nombre,
        apellidos: sol.empleado.apellidos,
        avatar: sol.empleado.fotoUrl || undefined,
      },
      tipo: 'cambio_datos' as const,
      detalles: `Solicitud de cambio de ${sol.tipo}`,
      fechaLimite: new Date(sol.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      fechaCreacion: sol.createdAt,
      estado: sol.estado as 'aprobada' | 'rechazada',
      fechaResolucion: sol.fechaRespuesta || undefined,
    })),
  ].sort((a, b) => (b.fechaResolucion?.getTime() || 0) - (a.fechaResolucion?.getTime() || 0));

  // Obtener elementos resueltos (auto-completados)
  const itemsResueltos = await prisma.autoCompletado.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: {
        in: ['aprobado', 'auto_aprobado'],
      },
    },
    include: {
      empleado: {
        select: {
          nombre: true,
          apellidos: true,
        },
      },
    },
    orderBy: {
      aprobadoEn: 'desc',
    },
    take: 20,
  });

  // Estadísticas de items resueltos
  const fichajesActualizados = await prisma.autoCompletado.count({
    where: {
      empresaId: session.user.empresaId,
      tipo: 'fichaje_cerrado',
      estado: {
        in: ['aprobado', 'auto_aprobado'],
      },
    },
  });

  const ausenciasRevisadas = await prisma.ausencia.count({
    where: {
      empresaId: session.user.empresaId,
      estado: {
        in: ['aprobada', 'rechazada'],
      },
      aprobadaEn: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Último mes
      },
    },
  });

  const nominasRevisadas = await prisma.autoCompletado.count({
    where: {
      empresaId: session.user.empresaId,
      tipo: 'nomina_extraida',
      estado: {
        in: ['aprobado', 'auto_aprobado'],
      },
    },
  });

  const solvedStats = {
    fichajesActualizados,
    ausenciasRevisadas,
    nominasRevisadas,
  };

  const solvedItems = itemsResueltos.map((item) => ({
    id: item.id,
    tipo: item.tipo.includes('fichaje')
      ? ('fichaje' as const)
      : item.tipo.includes('nomina')
      ? ('nomina' as const)
      : item.tipo.includes('contrato')
      ? ('contrato' as const)
      : ('ausencia' as const),
    descripcion: item.tipo, // TODO: Extraer descripción de datosOriginales/sugerencias
    empleado: `${item.empleado.nombre} ${item.empleado.apellidos}`,
    fecha: item.aprobadoEn || item.createdAt,
    accion:
      item.estado === 'auto_aprobado' ? 'Auto-aprobado' : 'Aprobado manualmente',
  }));

  // Obtener notificaciones reales del HR Admin
  const notificacionesRaw = await prisma.notificacion.findMany({
    where: {
      usuarioId: session.user.id,
      empresaId: session.user.empresaId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50, // Limitar a las últimas 50
  });

  const notificaciones = notificacionesRaw.map((n) => ({
    id: n.id,
    tipo: n.tipo as 'success' | 'error' | 'warning' | 'info',
    titulo: n.titulo,
    mensaje: n.mensaje,
    fecha: n.createdAt,
    leida: n.leida,
  }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bandeja de entrada</h1>
        <p className="text-gray-600 mt-2">
          Gestiona solicitudes, revisa elementos completados y recibe notificaciones
        </p>
      </div>

      <BandejaEntradaTabs
        solicitudesPendientes={solicitudesPendientes}
        solicitudesResueltas={solicitudesResueltas}
        solvedStats={solvedStats}
        solvedItems={solvedItems}
        notificaciones={notificaciones}
      />
    </div>
  );
}
