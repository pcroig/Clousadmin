// ========================================
// Empleado Detail Page - Employee Profile
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EmpleadoDetailClient } from './empleado-detail-client';
import { notFound } from 'next/navigation';
import { decryptEmpleadoData } from '@/lib/empleado-crypto';
import { asegurarCarpetasSistemaParaEmpleado } from '@/lib/documentos';
import { serializeEmpleado, decimalToNumber } from '@/lib/utils';

import { UsuarioRol } from '@/lib/constants/enums';

interface EmpleadoDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EmpleadoDetailPage({ params }: EmpleadoDetailPageProps) {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Await params in Next.js 15+
  const { id } = await params;

  // Obtener empleado con todas las relaciones
  const empleado = await prisma.empleado.findUnique({
    where: {
      id,
      empresaId: session.user.empresaId, // Seguridad: solo de la misma empresa
    },
    include: {
      usuario: true,
      manager: true,
      jornada: true,
      puestoRelacion: true,
      equipos: {
        include: {
          equipo: true,
        },
      },
      fichajes: {
        orderBy: {
          fecha: 'desc',
        },
        take: 30, // Último mes aproximadamente
        include: {
          eventos: {
            select: {
              id: true,
              tipo: true,
              hora: true,
              ubicacion: true,
              editado: true,
            },
            orderBy: {
              hora: 'asc',
            },
          },
        },
      },
      ausencias: {
        select: {
          id: true,
          tipo: true,
          fechaInicio: true,
          fechaFin: true,
          diasLaborables: true,
          estado: true,
          motivo: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      },
      contratos: {
        select: {
          id: true,
          fechaInicio: true,
          fechaFin: true,
          tipoContrato: true,
          salarioBrutoAnual: true,
        },
        orderBy: {
          fechaInicio: 'desc',
        },
        take: 10, // Limitar contratos
      },
      carpetas: {
        include: {
          documentos: {
            select: {
              id: true,
              nombre: true,
              tipoDocumento: true,
              tamano: true,
              s3Key: true,
              createdAt: true,
            },
            take: 50, // Limitar documentos por carpeta
          },
        },
        take: 20, // Limitar carpetas mostradas
      },
    },
  });

  if (!empleado) {
    notFound();
  }

  // Asegurar que todas las carpetas del sistema existan para el empleado
  // Esta función es idempotente y no duplica carpetas
  await asegurarCarpetasSistemaParaEmpleado(empleado.id, session.user.empresaId);

  // Re-obtener empleado para incluir posibles nuevas carpetas
  const empleadoActualizado = await prisma.empleado.findUnique({
    where: {
      id: empleado.id,
      empresaId: session.user.empresaId,
    },
    include: {
      usuario: true,
      manager: true,
      jornada: true,
      puestoRelacion: true,
      equipos: {
        include: {
          equipo: true,
        },
      },
      fichajes: {
        orderBy: {
          fecha: 'desc',
        },
        take: 30,
        include: {
          eventos: {
            select: {
              id: true,
              tipo: true,
              hora: true,
              ubicacion: true,
              editado: true,
            },
            orderBy: {
              hora: 'asc',
            },
          },
        },
      },
      ausencias: {
        select: {
          id: true,
          tipo: true,
          fechaInicio: true,
          fechaFin: true,
          diasLaborables: true,
          estado: true,
          motivo: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      },
      contratos: {
        select: {
          id: true,
          fechaInicio: true,
          fechaFin: true,
          tipoContrato: true,
          salarioBrutoAnual: true,
        },
        orderBy: {
          fechaInicio: 'desc',
        },
        take: 10,
      },
      carpetas: {
        include: {
          documentos: {
            select: {
              id: true,
              nombre: true,
              tipoDocumento: true,
              tamano: true,
              s3Key: true,
              createdAt: true,
            },
            take: 50,
          },
        },
        take: 20,
      },
    },
  });

  if (!empleadoActualizado) {
    notFound();
  }

  // Desencriptar campos sensibles antes de pasar al componente
  const empleadoDesencriptado = decryptEmpleadoData(empleadoActualizado);

  const empleadoMiEspacio = serializeEmpleado({
    ...empleadoActualizado,
    ...empleadoDesencriptado,
  });

  const empleadoData = {
    ...empleadoDesencriptado,
    // Convertir campos Decimal a números para Client Components
    salarioBrutoAnual: decimalToNumber(empleadoDesencriptado.salarioBrutoAnual),
    salarioBrutoMensual: decimalToNumber(empleadoDesencriptado.salarioBrutoMensual),
    ausencias: empleadoActualizado.ausencias.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      fechaInicio: a.fechaInicio,
      fechaFin: a.fechaFin,
      diasLaborables: a.diasLaborables,
      estado: a.estado,
      motivo: a.motivo,
    })),
    fichajes: empleadoActualizado.fichajes.map((f) => ({
      id: f.id,
      fecha: f.fecha,
      estado: f.estado,
      horasTrabajadas: f.horasTrabajadas ? Number(f.horasTrabajadas) : 0,
      eventos: f.eventos.map((e) => ({
        id: e.id,
        tipo: e.tipo,
        hora: e.hora,
        editado: e.editado,
      })),
    })),
    contratos: empleadoActualizado.contratos.map((c) => ({
      id: c.id,
      fechaInicio: c.fechaInicio,
      fechaFin: c.fechaFin,
      tipoContrato: c.tipoContrato,
      salarioBrutoAnual: Number(c.salarioBrutoAnual),
    })),
    equipos: empleadoActualizado.equipos.map((eq) => ({
      equipoId: eq.equipo.id,
      equipo: {
        id: eq.equipo.id,
        nombre: eq.equipo.nombre,
      },
    })),
    jornada: empleadoActualizado.jornada
      ? {
          id: empleadoActualizado.jornada.id,
          nombre: empleadoActualizado.jornada.nombre,
          horasSemanales: Number(empleadoActualizado.jornada.horasSemanales),
        }
      : null,
    puestoRelacion: empleado.puestoRelacion
      ? {
          id: empleado.puestoRelacion.id,
          nombre: empleado.puestoRelacion.nombre,
        }
      : null,
    carpetas: empleadoActualizado.carpetas.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      esSistema: c.esSistema,
      compartida: c.compartida,
      documentos: c.documentos.map((doc) => ({
        id: doc.id,
        nombre: doc.nombre,
        tipoDocumento: doc.tipoDocumento,
        tamano: doc.tamano,
        createdAt: doc.createdAt,
      })),
    })),
  };

  return (
    <EmpleadoDetailClient
      empleado={empleadoData}
      empleadoMiEspacio={empleadoMiEspacio}
      usuario={empleado.usuario}
    />
  );
}
