// ========================================
// Empleado - Bandeja de Entrada Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma, Prisma } from '@/lib/prisma';
import { BandejaEntradaEmpleadoClient } from './bandeja-entrada-client';

import { UsuarioRol } from '@/lib/constants/enums';

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

  // Obtener notificaciones reales del empleado
  const notificaciones = await prisma.notificacion.findMany({
    where: {
      usuarioId: session.user.id,
      empresaId: session.user.empresaId,
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
      titulo: notif.titulo,
      mensaje: notif.mensaje,
      fecha: notif.createdAt,
      leida: notif.leida,
      icono,
      metadata,
    };
  });

  return <BandejaEntradaEmpleadoClient notificaciones={notificacionesFormateadas} />;
}
