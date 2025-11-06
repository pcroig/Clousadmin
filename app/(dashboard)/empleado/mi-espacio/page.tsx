import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeEmpleado } from '@/lib/utils';
import { MiEspacioClient } from './mi-espacio-client';
import { Suspense } from 'react';

export default async function MiEspacioPage() {
  const session = await getSession();

  if (!session || session.user.rol === 'hr_admin') {
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

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleado(empleado);

  return (
    <Suspense fallback={<div className="p-6">Cargando...</div>}>
      <MiEspacioClient empleado={empleadoSerializado} usuario={usuario} />
    </Suspense>
  );
}
