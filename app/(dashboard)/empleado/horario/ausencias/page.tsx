// ========================================
// Empleado Ausencias Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AusenciasEmpleadoClient } from './ausencias-empleado-client';
import { prisma } from '@/lib/prisma';

export default async function AusenciasEmpleadoPage() {
  const session = await getSession();

  if (!session || !session.user.empleadoId) {
    redirect('/login');
  }

  // Obtener saldo de ausencias del empleado
  const añoActual = new Date().getFullYear();
  const saldo = await prisma.empleadoSaldoAusencias.findFirst({
    where: {
      empleadoId: session.user.empleadoId,
      año: añoActual,
    },
  });

  const saldoData = saldo
    ? {
        diasTotales: saldo.diasTotales,
        diasUsados: Number(saldo.diasUsados),
        diasPendientes: Number(saldo.diasPendientes),
        diasDisponibles: saldo.diasTotales - Number(saldo.diasUsados) - Number(saldo.diasPendientes),
      }
    : {
        diasTotales: 0,
        diasUsados: 0,
        diasPendientes: 0,
        diasDisponibles: 0,
      };

  // Obtener campañas activas
  const campanasActivas = await prisma.campanaVacaciones.findMany({
    where: {
      empresaId: session.user.empresaId,
      estado: 'activa',
    },
    include: {
      preferencias: {
        where: {
          empleadoId: session.user.empleadoId,
        },
        select: {
          id: true,
          completada: true,
          aceptada: true,
          diasIdeales: true,
          diasPrioritarios: true,
          diasAlternativos: true,
          propuestaIA: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const campanasData = campanasActivas.map((campana) => ({
    id: campana.id,
    titulo: campana.titulo,
    fechaInicioObjetivo: campana.fechaInicioObjetivo.toISOString(),
    fechaFinObjetivo: campana.fechaFinObjetivo.toISOString(),
    miPreferencia: campana.preferencias[0] || null,
  }));

  return <AusenciasEmpleadoClient saldo={saldoData} campanas={campanasData} />;
}

