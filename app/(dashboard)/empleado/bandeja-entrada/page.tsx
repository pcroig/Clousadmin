// ========================================
// Empleado - Bandeja de Entrada Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BandejaEntradaEmpleadoClient } from './bandeja-entrada-client';

export default async function EmpleadoBandejaEntradaPage() {
  const session = await getSession();

  if (!session || session.user.rol === 'hr_admin') {
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
  const ausencias = await prisma.ausencia.findMany({
    where: {
      empleadoId: session.user.empleadoId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  // Crear notificaciones basadas en las ausencias
  const notificaciones = ausencias.map((ausencia) => {
    let tipo: 'aprobada' | 'rechazada' | 'pendiente' | 'info' = 'info';
    let titulo = '';
    let mensaje = '';

    switch (ausencia.estado) {
      case 'aprobada':
        tipo = 'aprobada';
        titulo = `Solicitud de ${ausencia.tipo} aprobada`;
        mensaje = `Tu solicitud de ${ausencia.tipo} del ${ausencia.fechaInicio.toLocaleDateString('es-ES')} al ${ausencia.fechaFin.toLocaleDateString('es-ES')} ha sido aprobada`;
        break;
      case 'rechazada':
        tipo = 'rechazada';
        titulo = `Solicitud de ${ausencia.tipo} rechazada`;
        mensaje = `Tu solicitud de ${ausencia.tipo} del ${ausencia.fechaInicio.toLocaleDateString('es-ES')} al ${ausencia.fechaFin.toLocaleDateString('es-ES')} ha sido rechazada`;
        break;
      case 'pendiente':
        tipo = 'pendiente';
        titulo = `Solicitud de ${ausencia.tipo} pendiente`;
        mensaje = `Tu solicitud de ${ausencia.tipo} del ${ausencia.fechaInicio.toLocaleDateString('es-ES')} al ${ausencia.fechaFin.toLocaleDateString('es-ES')} está pendiente de revisión`;
        break;
    }

    return {
      id: ausencia.id,
      tipo,
      titulo,
      mensaje,
      fecha: ausencia.createdAt,
      leida: false,
      metadata: {
        ausenciaId: ausencia.id,
        tipoAusencia: ausencia.tipo,
        fechaInicio: ausencia.fechaInicio,
        fechaFin: ausencia.fechaFin,
        estado: ausencia.estado,
      },
    };
  });

  return <BandejaEntradaEmpleadoClient notificaciones={notificaciones} />;
}
