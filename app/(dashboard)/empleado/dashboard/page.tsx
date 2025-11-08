// ========================================
// Empleado Dashboard Page - Clean Architecture
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Notificacion } from '@/components/shared/notificaciones-widget';
import { AusenciaItem } from '@/components/shared/ausencias-widget';
import { EmpleadoDashboardClient } from './dashboard-client';

import { EstadoAusencia, UsuarioRol } from '@/lib/constants/enums';

interface DashboardData {
  empleado: any;
  notificaciones: Notificacion[];
  saldoFinal: {
    diasTotales: number;
    diasUsados: number;
    diasPendientes: number;
  };
  ausenciasProximas: AusenciaItem[];
  ausenciasPasadasItems: AusenciaItem[];
  campanaPendiente: {
    id: string;
    titulo: string;
    fechaInicioObjetivo: Date;
    fechaFinObjetivo: Date;
  } | null;
}

async function obtenerDatosDashboard(session: { user: { id: string; empresaId: string } }): Promise<DashboardData> {
  // Verificar que prisma esté disponible
  if (!prisma) {
    throw new Error('Prisma client no está disponible');
  }

  // Obtener empleado (solo campos necesarios)
  const empleado = await prisma.empleado.findUnique({
    where: {
      usuarioId: session.user.id,
    },
    select: {
      id: true,
      empresaId: true,
    },
  });

  if (!empleado) {
    throw new Error('Empleado no encontrado');
  }

  // Notificaciones del empleado (ausencias + campañas de vacaciones)
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

  // Buscar campaña activa con preferencia pendiente del empleado
  const preferenciaPendiente = await prisma.preferenciaVacaciones.findFirst({
    where: {
      empleadoId: empleado.id,
      empresaId: session.user.empresaId,
      completada: false,
    },
    include: {
      campana: {
        select: {
          id: true,
          titulo: true,
          fechaInicioObjetivo: true,
          fechaFinObjetivo: true,
          estado: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Si hay preferencia pendiente y la campaña está abierta
  let campanaPendiente: DashboardData['campanaPendiente'] = null;
  if (preferenciaPendiente && preferenciaPendiente.campana.estado === 'abierta') {
    campanaPendiente = {
      id: preferenciaPendiente.campana.id,
      titulo: preferenciaPendiente.campana.titulo,
      fechaInicioObjetivo: preferenciaPendiente.campana.fechaInicioObjetivo,
      fechaFinObjetivo: preferenciaPendiente.campana.fechaFinObjetivo,
    };
  }

  const notificaciones: Notificacion[] = ausenciasNotificaciones.map((aus: any) => ({
    id: aus.id,
    tipo: aus.estado === EstadoAusencia.en_curso || aus.estado === EstadoAusencia.completada || aus.estado === EstadoAusencia.auto_aprobada ? 'aprobada' : aus.estado === EstadoAusencia.rechazada ? 'rechazada' : 'pendiente',
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
        año: añoActual,
      },
    });
  } catch (error) {
    console.error('[EmpleadoDashboard] Error obteniendo saldo de ausencias:', {
      empleadoId: empleado.id,
      año: añoActual,
      error,
    });
    saldo = null;
  }

  // Si no existe saldo, crear uno por defecto
  // Convertir Decimal a números para serialización (Client Components)
  const saldoFinal = saldo ? {
    diasTotales: saldo.diasTotales,
    diasUsados: Number(saldo.diasUsados),
    diasPendientes: Number(saldo.diasPendientes),
  } : {
    diasTotales: 22, // Días por defecto en España
    diasUsados: 0,
    diasPendientes: 0,
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
      estado: EstadoAusencia.en_curso,
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
    estado: EstadoAusencia.en_curso,
  }));

  return {
    empleado,
    notificaciones,
    saldoFinal,
    ausenciasProximas,
    ausenciasPasadasItems,
    campanaPendiente,
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
  if (session.user.rol !== UsuarioRol.empleado && session.user.rol !== UsuarioRol.manager) {
    return null;
  }

  // Obtener datos del dashboard
  let dashboardData: DashboardData;
  try {
    dashboardData = await obtenerDatosDashboard(session);
  } catch (error) {
    console.error('[EmpleadoDashboardPage] Error obteniendo datos del dashboard:', {
      userId: session.user.id,
      empleadoId: session.user.empleadoId,
      error,
    });
    return (
      <div className="p-4 text-center">
        <p className="text-red-600">Error al cargar el dashboard. Por favor, recarga la página.</p>
      </div>
    );
  }

  // Renderizar dashboard
  return (
    <EmpleadoDashboardClient
      userName={session.user.nombre}
      notificaciones={dashboardData.notificaciones}
      saldoFinal={dashboardData.saldoFinal}
      ausenciasProximas={dashboardData.ausenciasProximas}
      ausenciasPasadas={dashboardData.ausenciasPasadasItems}
      campanaPendiente={dashboardData.campanaPendiente}
    />
  );
}