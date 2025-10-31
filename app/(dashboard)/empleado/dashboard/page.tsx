// ========================================
// Empleado Dashboard Page - Clean Architecture
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { FichajeWidget } from '@/components/shared/fichaje-widget';
import { NotificacionesWidget, Notificacion } from '@/components/shared/notificaciones-widget';
import { AusenciasWidget, AusenciaItem } from '@/components/shared/ausencias-widget';

interface DashboardData {
  empleado: any;
  notificaciones: Notificacion[];
  saldoFinal: any;
  ausenciasProximas: AusenciaItem[];
  ausenciasPasadasItems: AusenciaItem[];
}

async function obtenerDatosDashboard(session: any): Promise<DashboardData> {
  // Verificar que prisma esté disponible
  if (!prisma) {
    throw new Error('Prisma client no está disponible');
  }

  // Obtener empleado
  const empleado = await prisma.empleado.findUnique({
    where: {
      usuarioId: session.user.id,
    },
  });

  if (!empleado) {
    throw new Error('Empleado no encontrado');
  }

  // Notificaciones del empleado
  const ausenciasNotificaciones = await prisma.ausencia.findMany({
    where: {
      empleadoId: empleado.id,
      estado: {
        in: ['aprobada', 'rechazada', 'pendiente'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 8,
  });

  const notificaciones: Notificacion[] = ausenciasNotificaciones.map((aus: any) => ({
    id: aus.id,
    tipo: aus.estado === 'aprobada' ? 'aprobada' : aus.estado === 'rechazada' ? 'rechazada' : 'pendiente',
    mensaje: `Tu solicitud de ${aus.tipo} está ${aus.estado}`,
    fecha: aus.createdAt,
  }));

  // Ausencias del empleado - con manejo de errores
  const añoActual = new Date().getFullYear();
  let saldo;
  
  try {
    saldo = await prisma.empleadoSaldoAusencias.findFirst({
      where: {
        empleadoId: empleado.id,
        equipoId: null, // Saldo general
        año: añoActual,
      },
    });
  } catch (error) {
    console.error('Error obteniendo saldo:', error);
    saldo = null;
  }

  // Si no existe saldo, crear uno por defecto
  const saldoFinal = saldo || {
    id: 'temp',
    empleadoId: empleado.id,
    empresaId: empleado.empresaId,
    año: añoActual,
    diasTotales: 22, // Días por defecto en España
    diasUsados: 0,
    diasPendientes: 0,
    origen: 'manual_hr',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Próximas ausencias
  const hoy = new Date();
  const proximasAusencias = await prisma.ausencia.findMany({
    where: {
      empleadoId: empleado.id,
      fechaInicio: {
        gte: hoy,
      },
      estado: {
        in: ['pendiente', 'aprobada'],
      },
    },
    orderBy: {
      fechaInicio: 'asc',
    },
    take: 5,
  });

  const ausenciasProximas: AusenciaItem[] = proximasAusencias.map((aus: any) => ({
    id: aus.id,
    fecha: aus.fechaInicio,
    fechaFin: aus.fechaFin,
    tipo: aus.tipo,
    dias: Number(aus.diasSolicitados),
    estado: aus.estado as 'pendiente' | 'aprobada' | 'rechazada',
  }));

  // Ausencias pasadas
  const ausenciasPasadas = await prisma.ausencia.findMany({
    where: {
      empleadoId: empleado.id,
      fechaFin: {
        lt: hoy,
      },
      estado: 'aprobada',
    },
    orderBy: {
      fechaFin: 'desc',
    },
    take: 3,
  });

  const ausenciasPasadasItems: AusenciaItem[] = ausenciasPasadas.map((aus: any) => ({
    id: aus.id,
    fecha: aus.fechaInicio,
    fechaFin: aus.fechaFin,
    tipo: aus.tipo,
    dias: Number(aus.diasSolicitados),
    estado: 'aprobada',
  }));

  return {
    empleado,
    notificaciones,
    saldoFinal,
    ausenciasProximas,
    ausenciasPasadasItems,
  };
}

export default async function EmpleadoDashboardPage() {
  // El middleware ya verifica autenticación
  const session = await getSession();
  
  // Verificación defensiva: si no hay sesión, el middleware ya habrá redirigido
  if (!session) {
    return null;
  }

  // Verificar que el rol es correcto (el middleware ya protege rutas de HR)
  // Solo verificamos el rol específico de esta página
  if (session.user.rol !== 'empleado' && session.user.rol !== 'manager') {
    return null;
  }

  // Obtener datos del dashboard
  let dashboardData: DashboardData;
  try {
    dashboardData = await obtenerDatosDashboard(session);
  } catch (error) {
    console.error('Error en EmpleadoDashboardPage:', error);
    return (
      <div className="p-4 text-center">
        <p className="text-red-600">Error al cargar el dashboard. Por favor, recarga la página.</p>
      </div>
    );
  }

  // Renderizar dashboard
  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">
          Buenos Días, {session.user.nombre}
        </h1>
      </div>

      {/* 3x2 Grid Layout - Notificaciones y Ausencias ocupan 2 filas */}
      <div className="flex-1 min-h-0 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-rows-2 gap-5">
          {/* Fichaje Widget - Fila 1, Columna 1 */}
          <div className="min-h-0">
            <FichajeWidget href="/empleado/horario/fichajes" />
          </div>

          {/* Notificaciones Widget - Fila 1-2, Columna 2 (ocupa 2 filas) */}
          <div className="row-span-2 min-h-0">
            <NotificacionesWidget 
              notificaciones={dashboardData.notificaciones} 
              maxItems={8} 
              altura="doble" 
            />
          </div>

          {/* Ausencias Widget - Fila 1-2, Columna 3 (ocupa 2 filas) */}
          <div className="row-span-2 min-h-0">
            <AusenciasWidget
              diasAcumulados={dashboardData.saldoFinal.diasTotales}
              diasDisponibles={dashboardData.saldoFinal.diasTotales - Number(dashboardData.saldoFinal.diasUsados)}
              diasUtilizados={Number(dashboardData.saldoFinal.diasUsados)}
              proximasAusencias={dashboardData.ausenciasProximas}
              ausenciasPasadas={dashboardData.ausenciasPasadasItems}
            />
          </div>

          {/* Widget vacío - Fila 2, Columna 1 */}
          <div className="min-h-0">
            {/* Por ahora vacío */}
          </div>
        </div>
      </div>
    </div>
  );
}