// ========================================
// Manager - Bandeja de Entrada Page
// ========================================

import { redirect } from 'next/navigation';

import { type BandejaEntradaTab, BandejaEntradaTabs } from '@/components/hr/bandeja-entrada-tabs';
import { getSession } from '@/lib/auth';
import { EstadoAusencia, EstadoSolicitud, UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

import type { TipoNotificacion } from '@/lib/notificaciones';
import type { NotificacionUI } from '@/types/Notificacion';

export default async function ManagerBandejaEntradaPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.manager) {
    redirect('/login');
  }

  // Verificar que el manager tenga empleadoId
  if (!session.user.empleadoId) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bandeja de entrada</h1>
          <p className="text-red-600 mt-2">
            No tienes un perfil de empleado asociado. Contacta con tu administrador.
          </p>
        </div>
      </div>
    );
  }

  // Obtener IDs de empleados a cargo del manager
  const empleadosACargo = await prisma.empleado.findMany({
    where: {
      managerId: session.user.empleadoId,
      empresaId: session.user.empresaId,
      activo: true,
    },
    select: {
      id: true,
    },
  });

  const empleadoIds = empleadosACargo.map((e) => e.id);

  // Obtener solicitudes pendientes de ausencia (solo de su equipo)
  const ausenciasPendientes = await prisma.ausencia.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: EstadoAusencia.pendiente,
      empleadoId: {
        in: empleadoIds,
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
      createdAt: 'desc',
    },
  });

  // Obtener solicitudes resueltas de ausencia (aprobadas/rechazadas) de su equipo
  const ausenciasResueltas = await prisma.ausencia.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: {
        in: [EstadoAusencia.confirmada, EstadoAusencia.completada, EstadoAusencia.rechazada],
      },
      empleadoId: {
        in: empleadoIds,
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
    take: 20,
  });

  // Obtener solicitudes de cambio pendientes (solo de su equipo)
  const solicitudesCambioPendientes = await prisma.solicitudCambio.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: {
        in: [EstadoSolicitud.pendiente, EstadoSolicitud.requiere_revision],
      },
      empleadoId: {
        in: empleadoIds,
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
      createdAt: 'desc',
    },
  });

  // Obtener solicitudes de cambio resueltas (solo de su equipo)
  const solicitudesCambioResueltas = await prisma.solicitudCambio.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: {
        in: [EstadoSolicitud.aprobada_manual, EstadoSolicitud.auto_aprobada, EstadoSolicitud.rechazada],
      },
      empleadoId: {
        in: empleadoIds,
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
  type SolicitudPendiente = Parameters<
    typeof BandejaEntradaTabs
  >[0]['solicitudesPendientes'][number];
  type SolicitudResuelta = Parameters<
    typeof BandejaEntradaTabs
  >[0]['solicitudesResueltas'][number];

  const solicitudesPendientes: SolicitudPendiente[] = [
    ...ausenciasPendientes.map<SolicitudPendiente>((aus) => ({
      id: aus.id,
      empleado: {
        nombre: aus.empleado.nombre,
        apellidos: aus.empleado.apellidos,
        fotoUrl: aus.empleado.fotoUrl || undefined,
      },
      tipo: 'ausencia',
      detalles: `Solicitud de ${aus.tipo}`,
      fechaCreacion: aus.createdAt,
      estado: EstadoAusencia.pendiente,
      metadata: {
        tipoAusencia: aus.tipo,
        fechaInicio: aus.fechaInicio,
        fechaFin: aus.fechaFin,
      },
    })),
    ...solicitudesCambioPendientes.map<SolicitudPendiente>((sol) => ({
      id: sol.id,
      empleado: {
        nombre: sol.empleado.nombre,
        apellidos: sol.empleado.apellidos,
        fotoUrl: sol.empleado.fotoUrl || undefined,
      },
      tipo: 'cambio_datos',
      detalles: `Solicitud de cambio de ${sol.tipo}`,
      fechaCreacion: sol.createdAt,
      estado: EstadoAusencia.pendiente,
      metadata: {
        tipoCambioDatos: sol.tipo,
        camposCambiados: sol.camposCambiados as Record<string, unknown>,
      },
    })),
  ].sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime());

  // Combinar solicitudes resueltas
  const solicitudesResueltas: SolicitudResuelta[] = [
    ...ausenciasResueltas.map<SolicitudResuelta>((aus) => ({
      id: aus.id,
      empleado: {
        nombre: aus.empleado.nombre,
        apellidos: aus.empleado.apellidos,
        fotoUrl: aus.empleado.fotoUrl || undefined,
      },
      tipo: 'ausencia',
      detalles: `Solicitud de ${aus.tipo}`,
      fechaCreacion: aus.createdAt,
      estado: aus.estado,
      fechaResolucion: aus.aprobadaEn || undefined,
      metadata: {
        tipoAusencia: aus.tipo,
        fechaInicio: aus.fechaInicio,
        fechaFin: aus.fechaFin,
      },
    })),
    ...solicitudesCambioResueltas.map<SolicitudResuelta>((sol) => ({
      id: sol.id,
      empleado: {
        nombre: sol.empleado.nombre,
        apellidos: sol.empleado.apellidos,
        fotoUrl: sol.empleado.fotoUrl || undefined,
      },
      tipo: 'cambio_datos',
      detalles: `Solicitud de cambio de ${sol.tipo}`,
      fechaCreacion: sol.createdAt,
      estado:
        sol.estado === EstadoSolicitud.aprobada_manual || sol.estado === EstadoSolicitud.auto_aprobada
          ? EstadoAusencia.confirmada
          : sol.estado === EstadoSolicitud.rechazada
            ? EstadoAusencia.rechazada
            : EstadoAusencia.pendiente,
      fechaResolucion: sol.fechaRespuesta || undefined,
      metadata: {
        tipoCambioDatos: sol.tipo,
        camposCambiados: sol.camposCambiados as Record<string, unknown>,
      },
    })),
  ].sort((a, b) => (b.fechaResolucion?.getTime() || 0) - (a.fechaResolucion?.getTime() || 0));

  // Obtener elementos resueltos (auto-completados) - solo de su equipo
  const itemsResueltos = await prisma.autoCompletado.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: {
        in: ['aprobado', 'auto_aprobado'],
      },
      empleadoId: {
        in: empleadoIds,
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

  // Estadísticas de items resueltos (solo de su equipo)
  const fichajesActualizados = await prisma.autoCompletado.count({
    where: {
      empresaId: session.user.empresaId,
      tipo: 'fichaje_cerrado',
      estado: {
        in: ['aprobado', 'auto_aprobado'],
      },
      empleadoId: {
        in: empleadoIds,
      },
    },
  });

  const treintaDiasAtras = new Date();
  treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

  const ausenciasRevisadas = await prisma.ausencia.count({
    where: {
      empresaId: session.user.empresaId,
      estado: {
        in: [EstadoAusencia.confirmada, EstadoAusencia.completada, EstadoAusencia.rechazada],
      },
      empleadoId: {
        in: empleadoIds,
      },
      aprobadaEn: {
        gte: treintaDiasAtras,
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
      empleadoId: {
        in: empleadoIds,
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
          : item.tipo.includes('solicitud')
            ? ('solicitud' as const)
            : ('ausencia' as const),
    descripcion: item.tipo,
    empleado: `${item.empleado.nombre} ${item.empleado.apellidos}`,
    fecha: item.aprobadoEn || item.createdAt,
    accion:
      item.estado === 'auto_aprobado' ? 'Auto-aprobado' : 'Aprobado manualmente',
  }));

  // Obtener notificaciones del manager
  const notificacionesRaw = await prisma.notificacion.findMany({
    where: {
      usuarioId: session.user.id,
      empresaId: session.user.empresaId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });

  const notificaciones: NotificacionUI[] = notificacionesRaw.map((n) => ({
    id: n.id,
    tipo: n.tipo as TipoNotificacion,
    titulo: n.titulo,
    mensaje: n.mensaje,
    fecha: n.createdAt,
    leida: n.leida,
    metadata: (n.metadata as NotificacionUI['metadata']) || undefined,
  }));

  const tabParam = searchParams?.tab;
  const initialTab: BandejaEntradaTab | undefined =
    tabParam && ['solicitudes', 'auto-completed', 'notificaciones'].includes(tabParam as BandejaEntradaTab)
      ? (tabParam as BandejaEntradaTab)
      : undefined;

  return (
    <div className="p-8">
      <BandejaEntradaTabs
        header={{
          title: 'Bandeja de entrada',
          description:
            'Gestiona solicitudes de tu equipo, revisa elementos completados y recibe notificaciones',
        }}
        solicitudesPendientes={solicitudesPendientes}
        solicitudesResueltas={solicitudesResueltas}
        solvedStats={solvedStats}
        solvedItems={solvedItems}
        notificaciones={notificaciones}
        initialTab={initialTab}
      />
    </div>
  );
}
