// ========================================
// Empleado Dashboard Page - Clean Architecture
// ========================================

import { AusenciaItem } from '@/components/shared/ausencias-widget';
import { getCurrentUserAvatar, getSession } from '@/lib/auth';
import { calcularSaldoDisponible } from '@/lib/calculos/ausencias';
import { obtenerResumenPlantilla, obtenerResumenPlantillaEquipo, type PlantillaResumen } from '@/lib/calculos/plantilla';
import { EstadoAusencia, PeriodoMedioDiaValue, UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { CAMPANAS_VACACIONES_ENABLED } from '@/lib/constants/feature-flags';
import { obtenerCampanaPendiente, obtenerPropuestaPendiente } from '@/lib/services/campanas-vacaciones';

import { EmpleadoDashboardClient } from './dashboard-client';

import type { NotificacionUI } from '@/types/Notificacion';
import type { ausencias } from '@prisma/client';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';


const ESTADOS_AUSENCIAS_ABIERTAS: EstadoAusencia[] = [
  EstadoAusencia.pendiente,
  EstadoAusencia.confirmada,
];

const ESTADO_AUSENCIA_COMPLETADA = EstadoAusencia.completada;

interface DashboardData {
  empleado: {
    id: string;
    nombre: string;
    apellidos: string;
    puesto: string | null;
    empresaId: string;
    managerId: string | null;
  };
  notificaciones: NotificacionUI[];
  saldoFinal: {
    diasTotales: number;
    diasUsados: number;
    diasPendientes: number;
    diasDesdeHorasCompensadas: number;
    horasCompensadas: number;
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
  equipoResumen: PlantillaResumen | null;
  empresaResumen: PlantillaResumen;
}

async function obtenerDatosDashboard(session: { user: { id: string; empresaId: string } }): Promise<DashboardData> {
  // Verificar que prisma esté disponible
  if (!prisma) {
    throw new Error('Prisma client no está disponible');
  }

  // Obtener empleado (solo campos necesarios)
  const empleado = await prisma.empleados.findUnique({
    where: {
      usuarioId: session.user.id,
    },
    select: {
      id: true,
      nombre: true,
      apellidos: true,
      puesto: true,
      empresaId: true,
      managerId: true,
    },
  });

  if (!empleado) {
    throw new Error('Empleado no encontrado');
  }

  // Resumen del equipo del empleado (si tiene manager asignado)
  let equipoResumen: PlantillaResumen | null = null;
  if (empleado.managerId) {
    try {
      equipoResumen = await obtenerResumenPlantillaEquipo(
        session.user.empresaId,
        empleado.managerId
      );
    } catch (error) {
      console.error('[EmpleadoDashboard] Error obteniendo resumen de equipo:', {
        empleadoId: empleado.id,
        managerId: empleado.managerId,
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error,
      });
    }
  }

  // Resumen general de la empresa (mismo widget que HR)
  const empresaResumen = await obtenerResumenPlantilla(session.user.empresaId);

  // Notificaciones del empleado
  const notificacionesDb = await prisma.notificaciones.findMany({
    where: {
      empresaId: session.user.empresaId,
      usuarioId: session.user.id,
    },
    select: {
      id: true,
      empresaId: true,
      usuarioId: true,
      tipo: true,
      mensaje: true,
      metadata: true,
      leida: true,
      createdAt: true,
      eventoNominaId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 15,
  });

  // Buscar campaña activa con preferencia pendiente del empleado
  const campanaPendiente = CAMPANAS_VACACIONES_ENABLED
    ? await obtenerCampanaPendiente(empleado.id, session.user.empresaId)
    : null;
  const campanaPropuesta = CAMPANAS_VACACIONES_ENABLED
    ? await obtenerPropuestaPendiente(empleado.id, session.user.empresaId)
    : null;

  const notificaciones: NotificacionUI[] = notificacionesDb.map((notif) => ({
    id: notif.id,
    tipo: notif.tipo as NotificacionUI['tipo'],
    mensaje: notif.mensaje,
    fecha: notif.createdAt,
    leida: notif.leida,
    metadata: (notif.metadata as NotificacionUI['metadata']) ?? undefined,
  }));

  // Ausencias del empleado - con manejo de errores
  const añoActual = new Date().getFullYear();
  let saldoFinal;
  try {
    const saldo = await calcularSaldoDisponible(empleado.id, añoActual);
    saldoFinal = {
      diasTotales: saldo.diasTotales,
      diasUsados: saldo.diasUsados,
      diasPendientes: saldo.diasPendientes,
      diasDesdeHorasCompensadas: saldo.diasDesdeHorasCompensadas ?? 0,
      horasCompensadas: saldo.horasCompensadas ?? 0,
    };
  } catch (error) {
    console.error('[EmpleadoDashboard] Error obteniendo saldo de ausencias:', {
      empleadoId: empleado.id,
      año: añoActual,
      error,
    });
    saldoFinal = {
      diasTotales: 22,
      diasUsados: 0,
      diasPendientes: 0,
      diasDesdeHorasCompensadas: 0,
      horasCompensadas: 0,
    };
  }

  // Próximas ausencias
  const hoy = new Date();
  const proximasAusencias = await prisma.ausencias.findMany({
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

  const ausenciasProximas: AusenciaItem[] = proximasAusencias.map((aus: ausencias) => ({
    id: aus.id,
    fecha: aus.fechaInicio,
    fechaFin: aus.fechaFin,
    tipo: aus.tipo,
    dias: Number(aus.diasSolicitados),
    estado: aus.estado as EstadoAusencia,
    justificanteUrl: aus.justificanteUrl,
    medioDia: aus.medioDia ?? false,
    periodo: (aus.periodo as PeriodoMedioDiaValue | null) ?? null,
    motivo: aus.motivo,
    documentoId: aus.documentoId,
    createdAt: aus.createdAt?.toISOString() ?? new Date().toISOString(),
    empleadoId: aus.empleadoId,
  }));

  // Ausencias pasadas
  const ausenciasPasadas = await prisma.ausencias.findMany({
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

  const ausenciasPasadasItems: AusenciaItem[] = ausenciasPasadas.map((aus: ausencias) => ({
    id: aus.id,
    fecha: aus.fechaInicio,
    fechaFin: aus.fechaFin,
    tipo: aus.tipo,
    dias: Number(aus.diasSolicitados),
    estado: EstadoAusencia.completada,
    justificanteUrl: aus.justificanteUrl,
    medioDia: aus.medioDia ?? false,
    periodo: (aus.periodo as PeriodoMedioDiaValue | null) ?? null,
    motivo: aus.motivo,
    documentoId: aus.documentoId,
    createdAt: aus.createdAt?.toISOString() ?? new Date().toISOString(),
    empleadoId: aus.empleadoId,
  }));

  return {
    empleado,
    notificaciones,
    saldoFinal,
    ausenciasProximas,
    ausenciasPasadasItems,
    campanaPendiente,
    campanaPropuesta,
    equipoResumen,
    empresaResumen,
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

  // Obtener avatar y notificaciones count
  const avatarUrl = await getCurrentUserAvatar(session);
  const notificacionesCount = await prisma.notificaciones.count({
    where: {
      usuarioId: session.user.id,
      leida: false,
    },
  });

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
      userEmail={session.user.email}
      userAvatar={avatarUrl}
      empleado={{
        nombre: dashboardData.empleado.nombre,
        apellidos: dashboardData.empleado.apellidos,
        puesto: dashboardData.empleado.puesto,
        id: dashboardData.empleado.id,
      }}
      notificaciones={dashboardData.notificaciones}
      notificacionesCount={notificacionesCount}
      saldoFinal={dashboardData.saldoFinal}
      ausenciasProximas={dashboardData.ausenciasProximas}
      ausenciasPasadas={dashboardData.ausenciasPasadasItems}
      campanaPendiente={dashboardData.campanaPendiente}
      campanaPropuesta={dashboardData.campanaPropuesta}
      campanasEnabled={CAMPANAS_VACACIONES_ENABLED}
      equipoResumen={dashboardData.equipoResumen}
      empresaResumen={dashboardData.empresaResumen}
    />
  );
}