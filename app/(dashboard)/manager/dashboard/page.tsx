// ========================================
// Manager Dashboard Page - 3 Column Layout
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { FichajeWidget } from '@/components/shared/fichaje-widget';
import { SolicitudesWidget } from '@/components/shared/solicitudes-widget';
import { NotificacionesWidget, Notificacion } from '@/components/shared/notificaciones-widget';
import { AutoCompletadoWidget } from '@/components/shared/auto-completado-widget';
import { PlantillaWidget } from '@/components/dashboard/plantilla-widget';

import { EstadoAusencia, UsuarioRol } from '@/lib/constants/enums';
import { obtenerResumenPlantillaEquipo } from '@/lib/calculos/plantilla';

export default async function ManagerDashboardPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.manager) {
    redirect('/login');
  }

  // Obtener empleado del manager (solo campos necesarios)
  const manager = await prisma.empleado.findUnique({
    where: {
      usuarioId: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!manager) {
    redirect('/login');
  }

  // Obtener solicitudes pendientes del equipo del manager
  const ausenciasPendientes = await prisma.ausencia.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: EstadoAusencia.pendiente,
      empleado: {
        managerId: manager.id,
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
    take: 8,
  });

  // Convertir a formato de solicitudes
  const solicitudes = ausenciasPendientes.map((aus) => ({
    id: aus.id,
    empleado: {
      nombre: `${aus.empleado.nombre} ${aus.empleado.apellidos}`,
      avatar: aus.empleado.fotoUrl || undefined,
    },
    tipo: 'ausencia' as const,
    descripcion: `${aus.tipo}`,
    fecha: aus.createdAt,
    prioridad: 'media' as const,
  }));

  // Notificaciones reales para el manager actual
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

  // Estadísticas de fichaje
  const hoyDate = new Date();
  hoyDate.setHours(0, 0, 0, 0);

  const ayerDate = new Date(hoyDate);
  ayerDate.setDate(ayerDate.getDate() - 1);

  // Empleados del manager (activos) para filtrar métricas
  const empleadosEquipo = await prisma.empleado.findMany({
    where: {
      managerId: manager.id,
      activo: true,
    },
    select: {
      id: true,
    },
  });
  const empleadoIds = empleadosEquipo.map((empleado) => empleado.id);

  const fichajesHoy = empleadoIds.length
    ? await prisma.fichaje.count({
        where: {
          empresaId: session.user.empresaId,
          empleadoId: {
            in: empleadoIds,
          },
          fecha: hoyDate,
        },
      })
    : 0;

  const fichajesAyer = empleadoIds.length
    ? await prisma.fichaje.count({
        where: {
          empresaId: session.user.empresaId,
          empleadoId: {
            in: empleadoIds,
          },
          fecha: ayerDate,
        },
      })
    : 0;

  const resumenFichajes =
    empleadoIds.length === 0
      ? 'Todavía no tienes empleados a cargo.'
      : fichajesHoy === fichajesAyer
        ? `Tu equipo ha registrado ${fichajesHoy} fichajes hoy (sin cambios respecto a ayer).`
        : `Tu equipo ha registrado ${fichajesHoy} fichajes hoy (${fichajesHoy - fichajesAyer >= 0 ? '+' : ''}${
            fichajesHoy - fichajesAyer
          } frente a ayer).`;

  // Auto-completed stats
  const pendientes = empleadoIds.length
    ? await prisma.autoCompletado.count({
        where: {
          empresaId: session.user.empresaId,
          estado: 'pendiente',
          empleadoId: {
            in: empleadoIds,
          },
        },
      })
    : 0;

  const aprobados = empleadoIds.length
    ? await prisma.autoCompletado.count({
        where: {
          empresaId: session.user.empresaId,
          estado: 'aprobado',
          empleadoId: {
            in: empleadoIds,
          },
        },
      })
    : 0;

  // Resumen de plantilla del equipo del manager (solo su equipo)
  const plantillaResumenEquipo = await obtenerResumenPlantillaEquipo(
    session.user.empresaId,
    manager.id
  );

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 mb-3 sm:mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Buenos Días, {session.user.nombre}
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">{resumenFichajes}</p>
      </div>

      {/* Responsive Layout: Stack on mobile, 3 columns on desktop */}
      <div className="flex-1 min-h-0 pb-4 sm:pb-6 overflow-auto">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[1fr_1fr] gap-3 sm:gap-4">
          {/* Fichaje Widget - Fila 1 */}
          <div className="h-full min-h-[220px]">
            <FichajeWidget />
          </div>

          {/* Solicitudes Widget - Ocupa 2 filas */}
          <div className="row-span-1 lg:row-span-2 h-full min-h-[440px]">
            <SolicitudesWidget
              solicitudes={solicitudes}
              maxItems={8}
            dashboardHref="/manager/bandeja-entrada?tab=solicitudes"
            />
          </div>

          {/* Notificaciones Widget - Fila 1 */}
          <div className="h-full min-h-[220px]">
            <NotificacionesWidget notificaciones={notificaciones} maxItems={3} />
          </div>

          {/* Plantilla Widget - Fila 2 (debajo de fichajes) */}
          <div className="h-full min-h-[220px]">
            <PlantillaWidget
              trabajando={plantillaResumenEquipo.trabajando}
              ausentes={plantillaResumenEquipo.ausentes}
              sinFichar={plantillaResumenEquipo.sinFichar}
              rol="manager"
            />
          </div>

          {/* Auto-completed Widget - Fila 2 */}
          <div className="h-full min-h-[220px]">
            <AutoCompletadoWidget
              stats={{
                fichajesCompletados: aprobados,
                ausenciasCompletadas: pendientes,
                solicitudesCompletadas: 0,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
