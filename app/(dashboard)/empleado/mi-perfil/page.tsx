import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { UsuarioRol } from '@/lib/constants/enums';

import { MiPerfilClient } from './mi-perfil-client';

export default async function MiPerfilPage({
  searchParams,
}: {
  searchParams?: { modal?: string };
}) {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.empleado || !session.user.empleadoId) {
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
    redirect('/empleado/dashboard');
  }

  const usuario = await prisma.usuario.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!usuario) {
    redirect('/login');
  }

  const empleadoSerializado = serializeEmpleadoSeguro(empleado);

  const openDenunciaDialog = searchParams?.modal === 'denuncias';

  return (
    <Suspense fallback={<div className="p-6">Cargando...</div>}>
      <MiPerfilClient
        empleado={empleadoSerializado}
        usuario={usuario}
        openDenunciaDialog={openDenunciaDialog}
      />
    </Suspense>
  );
}

