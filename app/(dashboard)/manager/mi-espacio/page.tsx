import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { prisma } from '@/lib/prisma';

import { MiEspacioManagerClient } from './mi-espacio-manager-client';


export default async function MiEspacioManagerPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.manager) {
    redirect('/login');
  }

  const empleado = await prisma.empleados.findUnique({
    where: {
      usuarioId: session.user.id,
    },
    include: {
      puestoRelacion: {
        select: {
          id: true,
          nombre: true,
        },
      },
      carpetas: {
        include: {
          documentos: true,
        },
      },
      contratos: true,
      saldosAusencias: {
        where: {
          anio: new Date().getFullYear(),
        },
      },
      jornada: {
        select: {
          id: true,
          horasSemanales: true,
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
    },
  });

  if (!empleado) {
    redirect('/manager/dashboard');
  }

  const usuario = await prisma.usuarios.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!usuario) {
    redirect('/login');
  }

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleadoSeguro(empleado);

  return <MiEspacioManagerClient empleado={empleadoSerializado} usuario={usuario} />;
}
