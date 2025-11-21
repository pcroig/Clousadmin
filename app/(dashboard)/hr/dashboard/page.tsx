// ========================================
// HR Dashboard Page - 3 Column Layout (Fits in screen)
// ========================================

import { redirect } from 'next/navigation';

import { PlantillaWidget } from '@/components/dashboard/plantilla-widget';
import { AutoCompletadoWidget } from '@/components/shared/auto-completado-widget';
import { FichajeWidget } from '@/components/shared/fichaje-widget';
import { NotificacionesWidget } from '@/components/shared/notificaciones-widget';
import { SolicitudesWidget } from '@/components/shared/solicitudes-widget';
import { getSession } from '@/lib/auth';
import { obtenerResumenPlantilla } from '@/lib/calculos/plantilla';
import { EstadoAusencia, TipoFichajeEvento, UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import type { NotificacionUI } from '@/types/Notificacion';
import type { TipoNotificacion } from '@/lib/notificaciones';

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
        fotoUrl: aus.empleado.fotoUrl || undefined,
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
        fotoUrl: sol.empleado.fotoUrl || undefined,
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

  const notificaciones: NotificacionUI[] = notificacionesDb.map((notif) => ({
    id: notif.id,
    tipo: notif.tipo as TipoNotificacion,
    titulo: notif.titulo,
    mensaje: notif.mensaje,
    fecha: notif.createdAt,
    leida: notif.leida,
    metadata: (notif.metadata as NotificacionUI['metadata']) ?? undefined,
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

  // Auto-completed stats - Widget muestra lo aprobado automáticamente por el sistema
  // NOTA: Las ausencias que NO requieren aprobación (enfermedad, etc.) NO se registran aquí
  // porque no hubo "aprobación automática", simplemente no necesitaban aprobación
  const fichajesAutoCompletados = await prisma.autoCompletado.count({
    where: {
      empresaId: session.user.empresaId,
      tipo: 'fichaje_completado',
      estado: 'aprobado',
    },
  });

  const ausenciasAutoCompletadas = await prisma.autoCompletado.count({
    where: {
      empresaId: session.user.empresaId,
      tipo: 'ausencia_auto_aprobada',
      estado: 'aprobado',
    },
  });

  const solicitudesAutoCompletadas = await prisma.autoCompletado.count({
    where: {
      empresaId: session.user.empresaId,
      tipo: 'solicitud_auto_aprobada',
      estado: 'aprobado',
    },
  });

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 mb-3 sm:mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Buenos Días, {session.user.nombre}
        </h1>
      </div>

      {/* Responsive Grid Layout */}
      <div className="flex-1 min-h-0 pb-4 sm:pb-6 overflow-auto">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[1fr_1fr] gap-3 sm:gap-4">
          {/* Fichaje Widget - Fila 1 */}
          <div className="h-full min-h-[220px]">
            <FichajeWidget href="/hr/horario/fichajes" />
          </div>

          {/* Solicitudes Widget - Ocupa 2 filas en desktop */}
          <div className="row-span-1 lg:row-span-2 h-full min-h-[440px]">
            <SolicitudesWidget solicitudes={solicitudes} maxItems={8} />
          </div>

          {/* Notificaciones Widget - Fila 1 */}
          <div className="h-full min-h-[220px]">
            <NotificacionesWidget notificaciones={notificaciones} maxItems={3} href="/hr/bandeja-entrada" />
          </div>

          {/* Plantilla Widget - Fila 2 (debajo de fichajes) */}
          <div className="h-full min-h-[220px]">
            <PlantillaWidget
              trabajando={plantillaResumen.trabajando}
              ausentes={plantillaResumen.ausentes}
              sinFichar={plantillaResumen.sinFichar}
            />
          </div>

          {/* Auto-completed Widget - Fila 2 */}
          <div className="h-full min-h-[220px]">
            <AutoCompletadoWidget
              stats={{
                fichajesCompletados: fichajesAutoCompletados,
                ausenciasCompletadas: ausenciasAutoCompletadas,
                solicitudesCompletadas: solicitudesAutoCompletadas,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
