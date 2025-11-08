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
import { AusenciasWidget, AusenciaItem } from '@/components/shared/ausencias-widget';

import { EstadoAusencia, UsuarioRol } from '@/lib/constants/enums';

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
      estado: EstadoAusencia.pendiente_aprobacion,
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

  // Notificaciones
  const notificaciones: Notificacion[] = ausenciasPendientes.slice(0, 3).map((aus) => ({
    id: aus.id,
    tipo: 'pendiente' as const,
    mensaje: `${aus.empleado.nombre} solicita ${aus.tipo}`,
    fecha: aus.createdAt,
  }));

  // Estadísticas de fichaje
  const hoyDate = new Date();
  hoyDate.setHours(0, 0, 0, 0);

  const ayerDate = new Date(hoyDate);
  ayerDate.setDate(ayerDate.getDate() - 1);

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

  // Empleados del manager
  const empleadosEquipo = await prisma.empleado.count({
    where: {
      managerId: manager.id,
      activo: true,
    },
  });

  // Auto-completed stats
  const pendientes = await prisma.autoCompletado.count({
    where: {
      empresaId: session.user.empresaId,
      estado: 'pendiente',
    },
  });

  const aprobados = await prisma.autoCompletado.count({
    where: {
      empresaId: session.user.empresaId,
      estado: 'aprobado',
    },
  });

  const rechazados = await prisma.autoCompletado.count({
    where: {
      empresaId: session.user.empresaId,
      estado: 'rechazado',
    },
  });

  // Ausencias del equipo
  const añoActual = new Date().getFullYear();

  // Total de días de ausencias del equipo
  const saldosEquipo = await prisma.empleadoSaldoAusencias.findMany({
    where: {
      año: añoActual,
      empleado: {
        managerId: manager.id,
      },
    },
  });

  const diasTotalesEquipo = saldosEquipo.reduce((acc, s) => acc + s.diasTotales, 0);
  const diasUsadosEquipo = saldosEquipo.reduce((acc, s) => acc + Number(s.diasUsados), 0);

  // Próximas ausencias del equipo
  const hoy = new Date();
  const proximasAusencias = await prisma.ausencia.findMany({
    where: {
      empresaId: session.user.empresaId,
      empleado: {
        managerId: manager.id,
      },
      fechaInicio: {
        gte: hoy,
      },
      estado: EstadoAusencia.en_curso,
    },
    select: {
      id: true,
      fechaInicio: true,
      fechaFin: true,
      tipo: true,
      diasLaborables: true,
      estado: true,
      empleado: {
        select: {
          nombre: true,
        },
      },
    },
    orderBy: {
      fechaInicio: 'asc',
    },
    take: 5,
  });

  const ausenciasEquipo: AusenciaItem[] = proximasAusencias.map((aus) => ({
    id: aus.id,
    fecha: aus.fechaInicio,
    fechaFin: aus.fechaFin,
    tipo: `${aus.empleado.nombre} - ${aus.tipo}`,
    dias: aus.diasLaborables || 0,
    estado: aus.estado as 'pendiente' | 'aprobada' | 'rechazada',
  }));

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">
          Buenos Días, {session.user.nombre}
        </h1>
      </div>

      {/* 3 Column Layout */}
      <div className="flex-1 min-h-0 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 */}
          <div className="space-y-6">
            <FichajeWidget />
            <AutoCompletadoWidget
              stats={{
                fichajesCompletados: aprobados,
                ausenciasCompletadas: pendientes,
                solicitudesCompletadas: 0,
              }}
            />
          </div>

          {/* Column 2 */}
          <div className="space-y-6">
            <SolicitudesWidget solicitudes={solicitudes} maxItems={8} />
          </div>

          {/* Column 3 */}
          <div className="space-y-6">
            <NotificacionesWidget notificaciones={notificaciones} maxItems={3} />
            <AusenciasWidget
              diasAcumulados={diasTotalesEquipo}
              diasDisponibles={diasTotalesEquipo - diasUsadosEquipo}
              diasUtilizados={diasUsadosEquipo}
              proximasAusencias={ausenciasEquipo}
              ausenciasPasadas={[]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
