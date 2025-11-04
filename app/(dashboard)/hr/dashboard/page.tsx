// ========================================
// HR Dashboard Page - 3 Column Layout (Fits in screen)
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { FichajeWidget } from '@/components/shared/fichaje-widget';
import { SolicitudesWidget } from '@/components/shared/solicitudes-widget';
import { NotificacionesWidget, Notificacion } from '@/components/shared/notificaciones-widget';
import { PlantillaWidget } from '@/components/dashboard/plantilla-widget';
import { AutoCompletadoWidget } from '@/components/shared/auto-completado-widget';

export default async function HRDashboardPage() {
  const session = await getSession();

  if (!session || session.user.rol !== 'hr_admin') {
    redirect('/login');
  }

  // Obtener solicitudes pendientes
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

  // Notificaciones (simuladas)
  const notificaciones: Notificacion[] = ausenciasPendientes.slice(0, 3).map((aus) => ({
    id: aus.id,
    tipo: 'pendiente' as const,
    mensaje: `Está pendiente la solicitud de ausencias de... Ausencias - ${aus.fechaInicio.toLocaleDateString('es-ES')}`,
    fecha: aus.createdAt,
  }));

  // Obtener empleados para plantilla
  const totalEmpleados = await prisma.empleado.count({
    where: {
      empresaId: session.user.empresaId,
      activo: true,
    },
  });

  const empleadosData = await prisma.empleado.findMany({
    where: {
      empresaId: session.user.empresaId,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      apellidos: true,
      fotoUrl: true,
    },
    take: 10,
  });

  // Ausencias hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ausenciasHoy = await prisma.ausencia.count({
    where: {
      empresaId: session.user.empresaId,
      estado: 'aprobada',
      fechaInicio: {
        lte: hoy,
      },
      fechaFin: {
        gte: hoy,
      },
      tipo: {
        in: ['enfermedad', 'enfermedad_familiar', 'otro'],
      },
    },
  });

  const vacacionesHoy = await prisma.ausencia.count({
    where: {
      empresaId: session.user.empresaId,
      estado: 'aprobada',
      fechaInicio: {
        lte: hoy,
      },
      fechaFin: {
        gte: hoy,
      },
      tipo: 'vacaciones',
    },
  });

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
          tipo: 'entrada',
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

  // Empleados trabajando = Los que ficharon Y NO están ausentes
  const trabajandoHoy = fichadosHoy.length;

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
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Buenos Días, {session.user.nombre}
        </h1>
      </div>

      {/* 3x2 Grid Layout - Solicitudes ocupa 2 filas */}
      <div className="flex-1 min-h-0 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-rows-2 gap-6">
          {/* Fichaje Widget - Fila 1, Columna 1 */}
          <div className="min-h-0">
            <FichajeWidget href="/hr/horario/fichajes" />
          </div>

          {/* Solicitudes Widget - Fila 1-2, Columna 2 (ocupa 2 filas) */}
          <div className="row-span-2 min-h-0">
            <SolicitudesWidget solicitudes={solicitudes} maxItems={8} />
          </div>

          {/* Notificaciones Widget - Fila 1, Columna 3 */}
          <div className="min-h-0">
            <NotificacionesWidget notificaciones={notificaciones} maxItems={3} href="/hr/bandeja-entrada" />
          </div>

          {/* Auto-completed Widget - Fila 2, Columna 1 */}
          <div className="min-h-0">
            <AutoCompletadoWidget
              stats={{
                fichajesCompletados: fichajesAutoCompletados,
                ausenciasCompletadas: ausenciasAutoCompletadas,
                solicitudesCompletadas: solicitudesAutoCompletadas,
              }}
            />
          </div>

          {/* Plantilla Widget - Fila 2, Columna 3 */}
          <div className="min-h-0">
            <PlantillaWidget
              trabajando={{
                count: trabajandoHoy,
                empleados: empleadosData.slice(0, 4).map((e) => ({
                  nombre: `${e.nombre} ${e.apellidos}`,
                  avatar: e.fotoUrl || undefined,
                })),
              }}
              ausencias={{
                count: ausenciasHoy,
                empleados: [],
              }}
              vacaciones={{
                count: vacacionesHoy,
                empleados: [],
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
