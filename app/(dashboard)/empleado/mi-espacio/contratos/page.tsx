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
    },
  });

  if (!empleado) {
    redirect('/empleado/dashboard');
  }

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleadoSeguro(empleado);

  return <MiEspacioContratosClient empleado={empleadoSerializado} />;
}
