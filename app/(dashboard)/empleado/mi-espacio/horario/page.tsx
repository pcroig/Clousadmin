// ========================================
// Mi Espacio - Horario (Fichajes y Ausencias)
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { HorarioMiEspacioClient } from './horario-mi-espacio-client';
import { obtenerResumenBalance } from '@/lib/calculos/balance-horas';
import { prisma } from '@/lib/prisma';

export default async function HorarioMiEspacioPage() {
  const session = await getSession();

  if (!session || !session.user.empleadoId) {
    redirect('/login');
  }

  // Obtener balance de horas
  let balanceResumen = {
    diario: 0,
    semanal: 0,
    mensual: 0,
    acumulado: 0,
  };

  try {
    balanceResumen = await obtenerResumenBalance(session.user.empleadoId);
  } catch (error) {
    console.error('Error obteniendo balance:', error);
  }

  // Obtener fichajes recientes con sus eventos
  const fichajesRaw = await prisma.fichaje.findMany({
    where: {
      empleadoId: session.user.empleadoId,
    },
    include: {
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
    orderBy: {
      fecha: 'desc',
    },
    take: 10,
  });

  // Serializar Decimals a números para cliente
  const fichajes = fichajesRaw.map((f) => ({
    ...f,
    horasTrabajadas: f.horasTrabajadas != null ? Number(f.horasTrabajadas) : null,
    horasEnPausa: f.horasEnPausa != null ? Number(f.horasEnPausa) : null,
  }));

  // Obtener ausencias recientes
  const ausenciasRaw = await prisma.ausencia.findMany({
    where: {
      empleadoId: session.user.empleadoId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  const ausencias = ausenciasRaw.map((a) => ({
    ...a,
    diasSolicitados: (a as any).diasSolicitados != null ? Number((a as any).diasSolicitados) : 0,
  }));

  return (
    <HorarioMiEspacioClient
      balanceInicial={balanceResumen}
      fichajesIniciales={fichajes}
      ausenciasIniciales={ausencias}
    />
  );
}

