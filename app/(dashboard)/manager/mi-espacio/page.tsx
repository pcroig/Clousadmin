import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeEmpleado } from '@/lib/utils';
import { MiEspacioManagerClient } from './mi-espacio-manager-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function MiEspacioManagerPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.manager) {
    redirect('/login');
  }

  const empleado = await prisma.empleado.findUnique({
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
          año: new Date().getFullYear(),
        },
      },
      jornada: {
        select: {
          id: true,
          nombre: true,
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

  const usuario = await prisma.usuario.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!usuario) {
    redirect('/login');
  }

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleado(empleado);

  return <MiEspacioManagerClient empleado={empleadoSerializado} usuario={usuario} />;
}
