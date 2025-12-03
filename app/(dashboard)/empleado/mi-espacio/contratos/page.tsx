import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { prisma } from '@/lib/prisma';

import { MiEspacioContratosClient } from './contratos-client';


export default async function MiEspacioContratosPage() {
  const session = await getSession();

  if (!session || session.user.rol === UsuarioRol.hr_admin) {
    redirect('/login');
  }

  const empleado = await prisma.empleados.findUnique({
    where: {
      usuarioId: session.user.id,
    },
    include: {
      contratos: {
        orderBy: {
          fechaInicio: 'desc',
        },
      },
      empleado_complementos: {
        include: {
          tipos_complemento: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      },
      jornada: {
        select: {
          id: true,
          horasSemanales: true,
        },
      },
      puestoRelacion: {
        select: {
          id: true,
          nombre: true,
        },
      },
      equipos: {
        include: {
          equipo: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      },
      manager: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
        },
      },
    },
  });

  if (!empleado) {
    redirect('/empleado/dashboard');
  }

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleadoSeguro(empleado);

  return <MiEspacioContratosClient empleado={empleadoSerializado} />;
}
