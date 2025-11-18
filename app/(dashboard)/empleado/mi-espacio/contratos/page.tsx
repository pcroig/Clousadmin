import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { MiEspacioContratosClient } from './contratos-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function MiEspacioContratosPage() {
  const session = await getSession();

  if (!session || session.user.rol === UsuarioRol.hr_admin) {
    redirect('/login');
  }

  const empleado = await prisma.empleado.findUnique({
    where: {
      usuarioId: session.user.id,
    },
    include: {
      contratos: {
        orderBy: {
          fechaInicio: 'desc',
        },
      },
      complementos: {
        include: {
          tipoComplemento: {
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
          nombre: true,
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
