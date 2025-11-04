// ========================================
// HR Equipos Page - Teams Management
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EquiposClient } from './equipos-client';

export default async function EquiposPage() {
  const session = await getSession();

  if (!session || session.user.rol !== 'hr_admin') {
    redirect('/login');
  }

  // Obtener todos los equipos con sus empleados
  const equipos = await prisma.equipo.findMany({
    where: {
      empresaId: session.user.empresaId,
    },
    include: {
      manager: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
        },
      },
      miembros: {
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
    responsable: equipo.manager
      ? `${equipo.manager.nombre} ${equipo.manager.apellidos}`
      : 'Sin responsable',
    responsableId: equipo.managerId,
    numeroEmpleados: equipo.miembros.length,
    empleados: equipo.miembros.map((miembro) => ({
      id: miembro.empleado.id,
      nombre: `${miembro.empleado.nombre} ${miembro.empleado.apellidos}`,
      avatar: miembro.empleado.fotoUrl || undefined,
    })),
    sede: equipo.sede ? {
      id: equipo.sede.id,
      nombre: equipo.sede.nombre,
      ciudad: equipo.sede.ciudad || undefined,
    } : null,
    sedeId: equipo.sedeId,
  }));

  return <EquiposClient equipos={equiposData} />;
}
