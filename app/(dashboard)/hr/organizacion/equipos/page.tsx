// ========================================
// HR Equipos Page - Teams Management
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

import { EquiposClient } from './equipos-client';


export default async function EquiposPage(props: {
  searchParams: Promise<{ panel?: string; denunciaId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Obtener todos los equipos con sus empleados
  const equipos = await prisma.equipos.findMany({
    where: {
      empresaId: session.user.empresaId,
    },
    include: {
      empleados: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
        },
      },
      empleado_equipos: {
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              fotoUrl: true,
            },
          },
        },
      },
      sede: {
        select: {
          id: true,
          nombre: true,
          ciudad: true,
        },
      },
    },
    orderBy: {
      nombre: 'asc',
    },
  });

  const equiposData = equipos.map((equipo) => ({
    id: equipo.id,
    nombre: equipo.nombre,
    descripcion: equipo.descripcion || '',
    responsable: equipo.empleados
      ? `${equipo.empleados.nombre} ${equipo.empleados.apellidos}`
      : 'Sin responsable',
    responsableId: equipo.managerId,
    numeroEmpleados: equipo.empleado_equipos.length,
    empleados: equipo.empleado_equipos.map((miembro) => ({
      id: miembro.empleado.id,
      nombre: `${miembro.empleado.nombre} ${miembro.empleado.apellidos}`,
      avatar: miembro.empleado.fotoUrl || undefined,
      fotoUrl: miembro.empleado.fotoUrl || undefined,
    })),
    sede: equipo.sede ? {
      id: equipo.sede.id,
      nombre: equipo.sede.nombre,
      ciudad: equipo.sede.ciudad || undefined,
    } : null,
    sedeId: equipo.sedeId,
  }));

  const panelParam = searchParams?.panel === 'denuncias' ? 'denuncias' : undefined;
  const denunciaId = searchParams?.denunciaId;

  return (
    <EquiposClient
      equipos={equiposData}
      initialPanel={panelParam}
      initialDenunciaId={denunciaId}
    />
  );
}
