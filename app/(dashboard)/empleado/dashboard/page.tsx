// ========================================
// Empleado Dashboard Page - Clean Architecture
// ========================================

import { AusenciaItem } from '@/components/shared/ausencias-widget';
import type { NotificacionUI } from '@/types/Notificacion';
import { getSession } from '@/lib/auth';
import { EstadoAusencia, UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { obtenerCampanaPendiente, obtenerPropuestaPendiente } from '@/lib/services/campanas-vacaciones';

import { EmpleadoDashboardClient } from './dashboard-client';

import type { Ausencia } from '@prisma/client';


const ESTADOS_AUSENCIAS_ABIERTAS: EstadoAusencia[] = [
  EstadoAusencia.pendiente,
  EstadoAusencia.confirmada,
];

const ESTADO_AUSENCIA_COMPLETADA = EstadoAusencia.completada;

interface DashboardData {
  empleado: {
    id: string;
    empresaId: string;
  };
  notificaciones: NotificacionUI[];
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
  campanaPropuesta: {
    id: string;
    titulo: string;
    fechaInicioObjetivo: Date;
    fechaFinObjetivo: Date;
    propuesta: {
      fechaInicio: string;
      fechaFin: string;
      dias: number;
      tipo: 'ideal' | 'alternativo' | 'ajustado';
      motivo: string;
    };
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

  // Notificaciones del empleado
  const notificacionesDb = await prisma.notificacion.findMany({
    where: {
      empresaId: session.user.empresaId,
      usuarioId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 15,
  });

  // Buscar campaña activa con preferencia pendiente del empleado
  const campanaPendiente = await obtenerCampanaPendiente(empleado.id, session.user.empresaId);
  const campanaPropuesta = await obtenerPropuestaPendiente(empleado.id, session.user.empresaId);

  const notificaciones: NotificacionUI[] = notificacionesDb.map((notif) => ({
    id: notif.id,
    tipo: notif.tipo as NotificacionUI['tipo'],
    titulo: notif.titulo,
    mensaje: notif.mensaje,
    fecha: notif.createdAt,
    leida: notif.leida,
    metadata: (notif.metadata as NotificacionUI['metadata']) ?? undefined,
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
        in: ESTADOS_AUSENCIAS_ABIERTAS,
      },
    },
    orderBy: {
      fechaInicio: 'asc',
    },
    take: 5,
  });

  const ausenciasProximas: AusenciaItem[] = proximasAusencias.map((aus: Ausencia) => ({
    id: aus.id,
    fecha: aus.fechaInicio,
    fechaFin: aus.fechaFin,
    tipo: aus.tipo,
    dias: Number(aus.diasSolicitados),
    estado: aus.estado as 'pendiente' | 'confirmada' | 'rechazada',
  }));

  // Ausencias pasadas
  const ausenciasPasadas = await prisma.ausencia.findMany({
    where: {
      empleadoId: empleado.id,
      fechaFin: {
        lt: hoy,
      },
      estado: ESTADO_AUSENCIA_COMPLETADA,
    },
    orderBy: {
      fechaFin: 'desc',
    },
    take: 3,
  });

  const ausenciasPasadasItems: AusenciaItem[] = ausenciasPasadas.map((aus: Ausencia) => ({
    id: aus.id,
    fecha: aus.fechaInicio,
    fechaFin: aus.fechaFin,
    tipo: aus.tipo,
    dias: Number(aus.diasSolicitados),
    estado: EstadoAusencia.completada,
  }));

  return {
    empleado,
    notificaciones,
    saldoFinal,
    ausenciasProximas,
    ausenciasPasadasItems,
    campanaPendiente,
    campanaPropuesta,
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
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
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
      campanaPropuesta={dashboardData.campanaPropuesta}
    />
  );
}