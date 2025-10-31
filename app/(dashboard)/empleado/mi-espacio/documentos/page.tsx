import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeEmpleado } from '@/lib/utils';
import { MiEspacioDocumentosClient } from './documentos-client';

export default async function MiEspacioDocumentosPage() {
  const session = await getSession();

  if (!session || session.user.rol === 'hr_admin') {
    redirect('/login');
  }

  const empleado = await prisma.empleado.findUnique({
    where: {
      usuarioId: session.user.id,
    },
    include: {
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

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleado(empleado);

  return <MiEspacioDocumentosClient empleado={empleadoSerializado} />;
}
