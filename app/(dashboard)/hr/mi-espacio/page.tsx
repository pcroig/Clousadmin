import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { prisma } from '@/lib/prisma';

import { MiEspacioHRClient } from './mi-espacio-hr-client';


export default async function MiEspacioHRPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
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
          documento_carpetas: {
            include: {
              documento: true,
            },
          },
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
    redirect('/hr/dashboard');
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

  return <MiEspacioHRClient empleado={empleadoSerializado} usuario={usuario} />;
}
