import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { prisma } from '@/lib/prisma';

import { MiEspacioFichajesClient } from './fichajes-client';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default async function EmpleadoFichajesPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.empleado || !session.user.empleadoId) {
    redirect('/login');
  }

  const empleado = await prisma.empleados.findUnique({
    where: {
      usuarioId: session.user.id,
    },
    include: {
      jornada: {
        select: {
          id: true,
          horasSemanales: true,
        },
      },
    },
  });

  if (!empleado) {
    redirect('/empleado/dashboard');
  }

  return (
    <MiEspacioFichajesClient
      empleadoId={session.user.empleadoId}
      empleado={serializeEmpleadoSeguro(empleado)}
    />
  );
}

