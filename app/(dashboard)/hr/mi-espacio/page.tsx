import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeEmpleado } from '@/lib/utils';
import { MiEspacioHRClient } from './mi-espacio-hr-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function MiEspacioHRPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
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
    },
  });

  if (!empleado) {
    redirect('/hr/dashboard');
  }

  const usuario = await prisma.usuario.findUnique({
    where: {
      id: session.user.id,
    },
  });

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleado(empleado);

  return <MiEspacioHRClient empleado={empleadoSerializado} usuario={usuario} />;
}
