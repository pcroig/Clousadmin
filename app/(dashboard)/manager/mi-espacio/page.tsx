import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeEmpleado } from '@/lib/utils';
import { MiEspacioManagerClient } from './mi-espacio-manager-client';

export default async function MiEspacioManagerPage() {
  const session = await getSession();

  if (!session || session.user.rol !== 'manager') {
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
    redirect('/manager/dashboard');
  }

  const usuario = await prisma.usuario.findUnique({
    where: {
      id: session.user.id,
    },
  });

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleado(empleado);

  return <MiEspacioManagerClient empleado={empleadoSerializado} usuario={usuario} />;
}
