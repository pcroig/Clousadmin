// ========================================
// HR Personas Page - Employee Management
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { decryptEmpleadoList } from '@/lib/empleado-crypto';
import { prisma } from '@/lib/prisma';

import { PersonasClient } from './personas-client';


// Server Component
export default async function PersonasPage(props: {
  searchParams: Promise<{ panel?: string; denunciaId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Obtener todos los empleados
  const empleados = await prisma.empleado.findMany({
    where: {
      empresaId: session.user.empresaId,
    },
    select: {
      id: true,
      nombre: true,
      apellidos: true,
      email: true,
      telefono: true,
      puesto: true, // Mantener para retrocompatibilidad
      puestoId: true,
      tipoContrato: true,
      managerId: true,
      activo: true,
      fotoUrl: true,
      nif: true,
      nss: true,
      fechaNacimiento: true,
      direccionCalle: true,
      direccionNumero: true,
      direccionPiso: true,
      direccionProvincia: true,
      ciudad: true,
      codigoPostal: true,
      iban: true,
      fechaAlta: true,
      salarioBrutoMensual: true,
      puestoRelacion: {
        select: {
          id: true,
          nombre: true,
        },
      },
      manager: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
        },
      },
      equipos: {
        select: {
          equipo: {
            select: {
              nombre: true,
            },
          },
        },
        take: 1,
      },
    },
    orderBy: {
      apellidos: 'asc',
    },
  });

  // Desencriptar campos sensibles antes de pasar al componente
  const empleadosDesencriptados = decryptEmpleadoList(empleados);

  const empleadosData = empleadosDesencriptados.map((emp) => ({
    id: emp.id,
    nombre: `${emp.nombre} ${emp.apellidos}`,
    email: emp.email,
    telefono: emp.telefono || '',
    equipo: emp.equipos[0]?.equipo.nombre || 'Sin equipo',
    puesto: emp.puestoRelacion?.nombre || emp.puesto || 'Sin puesto', // Usar puestoRelacion primero, luego fallback a puesto deprecated
    tipoContrato: emp.tipoContrato,
    manager: emp.manager ? `${emp.manager.nombre} ${emp.manager.apellidos}` : 'Sin manager',
    activo: emp.activo,
    avatar: emp.fotoUrl || undefined,
    fotoUrl: emp.fotoUrl || null,
    // Datos completos para detalles
    detalles: {
      dni: emp.nif || '',
      numeroSS: emp.nss,
      fechaNacimiento: emp.fechaNacimiento,
      direccionCalle: emp.direccionCalle,
      direccionNumero: emp.direccionNumero,
      direccionPiso: emp.direccionPiso,
      ciudad: emp.ciudad,
      codigoPostal: emp.codigoPostal,
      direccionProvincia: emp.direccionProvincia,
      pais: 'España', // Default
      iban: emp.iban,
      fechaIngreso: emp.fechaAlta,
      salarioBase: emp.salarioBrutoMensual ? Number(emp.salarioBrutoMensual) : null,
    },
  }));

  const panelParam = searchParams?.panel === 'denuncias' ? 'denuncias' : undefined;
  const denunciaId = searchParams?.denunciaId;

  return (
    <PersonasClient
      empleados={empleadosData}
      initialPanel={panelParam}
      initialDenunciaId={denunciaId}
    />
  );
}
