// ========================================
// Empleado - Bandeja de Entrada Page
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { EstadoAusencia, EstadoSolicitud, UsuarioRol } from '@/lib/constants/enums';
import { prisma, Prisma } from '@/lib/prisma';
import { formatAusenciaTipo } from '@/lib/utils/formatters';

import { BandejaEntradaEmpleadoClient } from './bandeja-entrada-client';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';


export default async function EmpleadoBandejaEntradaPage() {
  const session = await getSession();

  if (!session || session.user.rol === UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Si no tiene empleado asignado, mostrar página vacía con mensaje
  if (!session.user.empleadoId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">No tienes un empleado asignado. Contacta con HR.</p>
        </div>
      </div>
    );
  }

  // Obtener ausencias del empleado
  const ausencias = await prisma.ausencias.findMany({
    where: {
      empleadoId: session.user.empleadoId,
      empresaId: session.user.empresaId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 30,
  });

  // Obtener solicitudes de cambio del empleado
  const solicitudesCambio = await prisma.solicitudes_cambio.findMany({
    where: {
      empleadoId: session.user.empleadoId,
      empresaId: session.user.empresaId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 30,
  });

  // Combinar y formatear solicitudes
  const solicitudes = [
    ...ausencias.map((aus) => ({
      id: aus.id,
      tipo: 'ausencia' as const,
      titulo: `Ausencia: ${formatAusenciaTipo(aus.tipo)}`,
      detalles: `${aus.fechaInicio.toLocaleDateString('es-ES')} - ${aus.fechaFin.toLocaleDateString('es-ES')}`,
      estado: aus.estado,
      fechaCreacion: aus.createdAt,
      fechaResolucion: aus.aprobadaEn,
    })),
    ...solicitudesCambio.map((sol) => ({
      id: sol.id,
      tipo: 'cambio_datos' as const,
      titulo: `Cambio de ${formatAusenciaTipo(sol.tipo)}`,
      detalles: sol.motivo || `Solicitud de cambio de ${formatAusenciaTipo(sol.tipo)}`,
      estado:
        sol.estado === EstadoSolicitud.aprobada_manual || sol.estado === EstadoSolicitud.auto_aprobada
          ? EstadoAusencia.confirmada
          : sol.estado === EstadoSolicitud.rechazada
            ? EstadoAusencia.rechazada
            : EstadoAusencia.pendiente,
      fechaCreacion: sol.createdAt,
      fechaResolucion: sol.fechaRespuesta,
    })),
  ].sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime());

  // Obtener notificaciones reales del empleado
  const notificaciones = await prisma.notificaciones.findMany({
    where: {
      usuarioId: session.user.id,
      empresaId: session.user.empresaId,
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
    take: 50, // Últimas 50 notificaciones
  });

  // Mapear a formato esperado por el componente cliente
  const notificacionesFormateadas = notificaciones.map((notif) => {
    // Determinar tipo para UI basado en el tipo de notificación
    let tipoUI: 'aprobada' | 'rechazada' | 'pendiente' | 'info' = 'info';
    let icono: 'firma' | undefined;

    if (notif.tipo === 'firma_pendiente') {
      tipoUI = 'pendiente';
      icono = 'firma';
    } else if (notif.tipo === 'firma_completada') {
      tipoUI = 'aprobada';
      icono = 'firma';
    } else if (notif.tipo.includes('aprobada')) {
      tipoUI = 'aprobada';
    } else if (notif.tipo.includes('rechazada')) {
      tipoUI = 'rechazada';
    } else if (notif.tipo.includes('pendiente') || notif.tipo === 'solicitud_creada') {
      tipoUI = 'pendiente';
    }

    const metadata =
      ((notif.metadata as Prisma.JsonValue) as Record<string, unknown> | undefined) ?? {};
    if (icono) {
      metadata.icono = icono;
    }
    if (!metadata.url && typeof metadata.accionUrl === 'string') {
      metadata.url = metadata.accionUrl;
    }
    if (!metadata.accionTexto && typeof metadata.accionText === 'string') {
      metadata.accionTexto = metadata.accionText;
    }

    return {
      id: notif.id,
      tipo: tipoUI,
      mensaje: notif.mensaje,
      fecha: notif.createdAt,
      leida: notif.leida,
      icono,
      metadata,
    };
  });

  return (
    <BandejaEntradaEmpleadoClient
      solicitudes={solicitudes}
      notificaciones={notificacionesFormateadas}
    />
  );
}
