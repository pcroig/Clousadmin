// ========================================
// HR Dashboard Page - Adaptive Mobile/Desktop
// ========================================
//
// Mobile: Fichaje compacto (1 fila) + Plantilla
// Desktop: Grid 3x2 completo

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EstadoAusencia, TipoFichajeEvento, UsuarioRol } from '@/lib/constants/enums';
import { HRAdminDashboard } from '@/components/adaptive/HRAdminDashboard';
import type { Notificacion } from '@/components/shared/notificaciones-widget';
import { obtenerResumenPlantilla } from '@/lib/calculos/plantilla';

export default async function HRDashboardPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Obtener solicitudes pendientes
  const ausenciasPendientes = await prisma.ausencia.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: EstadoAusencia.pendiente,
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
    take: 5,
  });

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
    take: 5,
  });

  // Combinar solicitudes
  const solicitudes = [
    ...ausenciasPendientes.map((aus) => ({
      id: aus.id,
      empleado: {
        nombre: `${aus.empleado.nombre} ${aus.empleado.apellidos}`,
        avatar: aus.empleado.fotoUrl || undefined,
      },
      tipo: 'ausencia' as const,
      descripcion: `${aus.empleado.nombre} ${aus.empleado.apellidos} solicita ${aus.tipo}`,
      fecha: aus.createdAt,
      prioridad: 'media' as const,
    })),
    ...solicitudesCambioPendientes.map((sol) => ({
      id: sol.id,
      empleado: {
        nombre: `${sol.empleado.nombre} ${sol.empleado.apellidos}`,
        avatar: sol.empleado.fotoUrl || undefined,
      },
      tipo: 'cambio_datos' as const,
      descripcion: `Solicitud de cambio de ${sol.tipo}`,
      fecha: sol.createdAt,
      prioridad: 'baja' as const,
    })),
  ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  // Notificaciones reales del usuario HR actual
  const notificacionesDb = await prisma.notificacion.findMany({
    where: {
      empresaId: session.user.empresaId,
      usuarioId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  const notificaciones: Notificacion[] = notificacionesDb.map((notif) => ({
    id: notif.id,
    tipo: notif.tipo as Notificacion['tipo'],
    titulo: notif.titulo,
    mensaje: notif.mensaje,
    fecha: notif.createdAt,
    leida: notif.leida,
    metadata: (notif.metadata as Record<string, unknown>) ?? undefined,
  }));

  // Resumen actual de la plantilla
  const plantillaResumen = await obtenerResumenPlantilla(session.user.empresaId);

  // Estadísticas de fichaje
  const hoyDate = new Date();
  hoyDate.setHours(0, 0, 0, 0);

  const ayerDate = new Date(hoyDate);
  ayerDate.setDate(ayerDate.getDate() - 1);

  // Empleados que han fichado entrada hoy (contar empleados únicos)
  // NUEVO MODELO: Buscar fichajes que tengan un evento de tipo 'entrada'
  const fichadosHoy = await prisma.fichaje.findMany({
    where: {
      empresaId: session.user.empresaId,
      fecha: hoyDate,
      eventos: {
        some: {
          tipo: TipoFichajeEvento.entrada,
        },
      },
    },
    select: {
      empleadoId: true,
    },
    distinct: ['empleadoId'],
  });

  const fichajesHoy = await prisma.fichaje.count({
    where: {
      empresaId: session.user.empresaId,
      fecha: hoyDate,
    },
  });

  const fichajesAyer = await prisma.fichaje.count({
    where: {
      empresaId: session.user.empresaId,
      fecha: ayerDate,
    },
  });

  // Auto-completed stats - Widget muestra lo auto-completado automáticamente (sin intervención HR)
  // Fichajes auto-completados (tipo: fichaje_completado, estado: aprobado)
  const fichajesAutoCompletados = await prisma.autoCompletado.count({
    where: {
      empresaId: session.user.empresaId,
      tipo: 'fichaje_completado',
      estado: 'aprobado',
    },
  });

  // Ausencias auto-completadas (aún por implementar - placeholder)
  const ausenciasAutoCompletadas = await prisma.autoCompletado.count({
    where: {
      empresaId: session.user.empresaId,
      tipo: 'ausencia_completada', // TODO: Implementar cuando se cree esta funcionalidad
      estado: 'aprobado',
    },
  });

  // Solicitudes auto-completadas (aún por implementar - placeholder)
  const solicitudesAutoCompletadas = await prisma.autoCompletado.count({
    where: {
      empresaId: session.user.empresaId,
      tipo: 'solicitud_completada', // TODO: Implementar cuando se cree esta funcionalidad
      estado: 'aprobado',
    },
  });

  return (
    <HRAdminDashboard
      userName={session.user.nombre}
      solicitudes={solicitudes}
      notificaciones={notificaciones}
      plantillaResumen={plantillaResumen}
      autoCompletadoStats={{
        fichajesCompletados: fichajesAutoCompletados,
        ausenciasCompletadas: ausenciasAutoCompletadas,
        solicitudesCompletadas: solicitudesAutoCompletadas,
      }}
    />
  );
}
