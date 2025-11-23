// ========================================
// HR Payroll - Detalles de Nómina Individual
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { NominaDetailsClient } from './nomina-details-client';

export default async function NominaDetailsPage(context: { params: Promise<{ id: string }> }) {
    const params = await context.params;
  const session = await getSession();

  if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
    redirect('/login');
  }

  const { id } = await params;

  // Obtener la nómina con todos sus detalles
  const nomina = await prisma.nomina.findFirst({
    where: {
      id,
      empleado: {
        empresaId: session.user.empresaId,
      },
    },
    include: {
      empleado: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          email: true,
          numeroSeguridadSocial: true,
          iban: true,
            equipos: {
              select: {
                equipo: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
              },
          },
        },
      },
      contrato: {
        select: {
          puesto: true,
          tipoContrato: true,
        },
      },
      complementosAsignados: {
        include: {
          empleadoComplemento: {
            include: {
              tipoComplemento: {
                select: {
                  nombre: true,
                  descripcion: true,
                },
              },
            },
          },
        },
      },
      documento: {
        select: {
          id: true,
          url: true,
          nombre: true,
        },
      },
      eventoNomina: {
        select: {
          id: true,
          mes: true,
          anio: true,
          estado: true,
        },
      },
      alertas: {
        where: {
          resuelta: false, // Solo alertas no resueltas
        },
        select: {
          id: true,
          tipo: true,
          categoria: true,
          codigo: true,
          mensaje: true,
          detalles: true,
          accionUrl: true,
          createdAt: true,
        },
        orderBy: [
          { tipo: 'asc' }, // Críticas primero
          { createdAt: 'desc' },
        ],
      },
    },
  });

  if (!nomina) {
    redirect('/hr/payroll');
  }

  // Obtener ausencias del mes
  const ausencias = await prisma.ausencia.findMany({
    where: {
      empleadoId: nomina.empleadoId,
      fechaInicio: {
        gte: new Date(nomina.anio, nomina.mes - 1, 1),
      },
      fechaFin: {
        lte: new Date(nomina.anio, nomina.mes, 0),
      },
    },
    select: {
      id: true,
      tipo: true,
      fechaInicio: true,
      fechaFin: true,
      estado: true,
    },
  });

  return (
    <NominaDetailsClient
      nomina={JSON.parse(JSON.stringify(nomina))}
      ausencias={JSON.parse(JSON.stringify(ausencias))}
    />
  );
}
