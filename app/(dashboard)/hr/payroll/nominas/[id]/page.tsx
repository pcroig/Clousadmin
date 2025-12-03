// ========================================
// HR Payroll - Detalles de Nómina Individual
// ========================================

import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';


import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { NominaDetailsClient, type NominaDetailsClientProps } from './nomina-details-client';

const decimalToNumber = (value: Prisma.Decimal | number | null | undefined): number => {
  if (value == null) return 0;
  return typeof value === 'number' ? value : value.toNumber();
};

export default async function NominaDetailsPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();

  if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
    redirect('/login');
  }

  const { id } = params;

  // Obtener la nómina con todos sus detalles
  const nomina = await prisma.nominas.findFirst({
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
          nss: true,
          iban: true,
          puestoId: true,
          puesto: true,
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
          puestoRelacion: {
            select: {
              nombre: true,
            },
          },
        },
      },
      contrato: {
        select: {
          tipoContrato: true,
        },
      },
      complementosAsignados: {
        include: {
          empleado_complementos: {
            include: {
              tipos_complemento: {
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
          s3Key: true,
          s3Bucket: true,
          nombre: true,
          mimeType: true,
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
  const ausencias = await prisma.ausencias.findMany({
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

  const nominaPayload: NominaDetailsClientProps['nomina'] = {
    id: nomina.id,
    empleadoId: nomina.empleadoId,
    mes: nomina.mes,
    anio: nomina.anio,
    estado: nomina.estado,
    salarioBase: decimalToNumber(nomina.salarioBase),
    totalComplementos: decimalToNumber(nomina.totalComplementos),
    totalDeducciones: decimalToNumber(nomina.totalDeducciones),
    totalBruto: decimalToNumber(nomina.totalBruto),
    totalNeto: decimalToNumber(nomina.totalNeto),
    diasTrabajados: nomina.diasTrabajados,
    diasAusencias: nomina.diasAusencias ?? 0,
    empleado: {
      id: nomina.empleado.id,
      nombre: nomina.empleado.nombre,
      apellidos: nomina.empleado.apellidos,
      email: nomina.empleado.email,
      nss: nomina.empleado.nss,
      iban: nomina.empleado.iban,
      puesto: nomina.empleado.puesto,
      puestoRelacion: nomina.empleado.puestoRelacion
        ? { nombre: nomina.empleado.puestoRelacion.nombre }
        : null,
      equipos: nomina.empleado.equipos.map((relacion) => ({
        equipo: relacion.equipo
          ? {
              id: relacion.equipo.id,
              nombre: relacion.equipo.nombre,
            }
          : null,
      })),
    },
    complementosAsignados: nomina.complementosAsignados.map((complemento) => ({
      id: complemento.id,
      importe: decimalToNumber(complemento.importe),
      empleadoComplemento: {
        tipoComplemento: {
          nombre: complemento.empleado_complementos.tipos_complemento.nombre,
          descripcion: complemento.empleado_complementos.tipos_complemento.descripcion,
        },
      },
    })),
    documento: nomina.documento
      ? {
          id: nomina.documento.id,
          nombre: nomina.documento.nombre,
        }
      : null,
    eventoNomina: nomina.eventoNomina
      ? {
          id: nomina.eventoNomina.id,
          mes: nomina.eventoNomina.mes,
          anio: nomina.eventoNomina.anio,
          estado: nomina.eventoNomina.estado,
        }
      : null,
    alertas: nomina.alertas.map((alerta) => ({
      id: alerta.id,
      tipo: alerta.tipo,
      categoria: alerta.categoria,
      codigo: alerta.codigo,
      mensaje: alerta.mensaje,
      detalles:
        alerta.detalles && typeof alerta.detalles === 'object' && !Array.isArray(alerta.detalles)
          ? (alerta.detalles as Record<string, unknown>)
          : {},
      accionUrl: alerta.accionUrl,
      createdAt: alerta.createdAt.toISOString(),
    })),
  };

  const ausenciasPayload: NominaDetailsClientProps['ausencias'] = ausencias.map((ausencia) => ({
    id: ausencia.id,
    tipo: ausencia.tipo,
    fechaInicio: ausencia.fechaInicio.toISOString(),
    fechaFin: ausencia.fechaFin.toISOString(),
    estado: ausencia.estado,
  }));

  return <NominaDetailsClient nomina={nominaPayload} ausencias={ausenciasPayload} />;
}
