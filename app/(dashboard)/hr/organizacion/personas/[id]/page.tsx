// ========================================
// Empleado Detail Page - Employee Profile
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EmpleadoDetailClient } from './empleado-detail-client';
import { notFound } from 'next/navigation';

interface EmpleadoDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EmpleadoDetailPage({ params }: EmpleadoDetailPageProps) {
  const session = await getSession();

  if (!session || session.user.rol !== 'hr_admin') {
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

  const empleadoData = {
    id: empleado.id,
    nombre: empleado.nombre,
    apellidos: empleado.apellidos,
    email: empleado.email,
    fotoUrl: empleado.fotoUrl,
    nif: empleado.nif,
    nss: empleado.nss,
    fechaNacimiento: empleado.fechaNacimiento,
    telefono: empleado.telefono,
    direccionCalle: empleado.direccionCalle,
    direccionNumero: empleado.direccionNumero,
    direccionPiso: empleado.direccionPiso,
    codigoPostal: empleado.codigoPostal,
    ciudad: empleado.ciudad,
    direccionProvincia: empleado.direccionProvincia,
    estadoCivil: empleado.estadoCivil,
    numeroHijos: empleado.numeroHijos,
    genero: empleado.genero,
    iban: empleado.iban,
    titularCuenta: empleado.titularCuenta,
    puesto: empleado.puesto,
    puestoId: empleado.puestoId,
    puestoRelacion: empleado.puestoRelacion ? {
      id: empleado.puestoRelacion.id,
      nombre: empleado.puestoRelacion.nombre,
    } : null,
    managerId: empleado.managerId,
    fechaAlta: empleado.fechaAlta,
    fechaBaja: empleado.fechaBaja,
    tipoContrato: empleado.tipoContrato,
    categoriaProfesional: empleado.categoriaProfesional,
    grupoCotizacion: empleado.grupoCotizacion,
    estadoEmpleado: empleado.estadoEmpleado,
    salarioBrutoAnual: empleado.salarioBrutoAnual ? Number(empleado.salarioBrutoAnual) : null,
    salarioBrutoMensual: empleado.salarioBrutoMensual ? Number(empleado.salarioBrutoMensual) : null,
    diasVacaciones: empleado.diasVacaciones,
    activo: empleado.activo,
    manager: empleado.manager ? {
      nombre: `${empleado.manager.nombre} ${empleado.manager.apellidos}`,
    } : null,
    jornada: empleado.jornada ? {
      nombre: empleado.jornada.nombre,
      horasSemanales: Number(empleado.jornada.horasSemanales),
    } : null,
    equipos: empleado.equipos.map((eq) => ({
      equipoId: eq.equipo.id,
      equipo: {
        id: eq.equipo.id,
        nombre: eq.equipo.nombre,
      },
    })),
    fichajes: empleado.fichajes.map((f) => ({
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
    ausencias: empleado.ausencias.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      fechaInicio: a.fechaInicio,
      fechaFin: a.fechaFin,
      diasLaborables: a.diasLaborables,
      estado: a.estado,
      motivo: a.motivo,
    })),
    contratos: empleado.contratos.map((c) => ({
      id: c.id,
      fechaInicio: c.fechaInicio,
      fechaFin: c.fechaFin,
      tipo: c.tipoContrato,
      salarioBruto: Number(c.salarioBrutoAnual),
    })),
    carpetas: empleado.carpetas.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      esSistema: c.esSistema,
      numeroDocumentos: c.documentos.length,
    })),
  };

  return <EmpleadoDetailClient empleado={empleadoData} usuario={empleado.usuario} />;
}
