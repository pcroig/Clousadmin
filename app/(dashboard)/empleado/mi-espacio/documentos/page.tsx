import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { MiEspacioDocumentosClient } from './documentos-client';
import { asegurarCarpetasSistemaParaEmpleado } from '@/lib/documentos';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function MiEspacioDocumentosPage() {
  const session = await getSession();

  if (!session || session.user.rol === UsuarioRol.hr_admin) {
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

  // Asegurar que todas las carpetas del sistema existan para el empleado
  // Esta función es idempotente y no duplica carpetas
  await asegurarCarpetasSistemaParaEmpleado(empleado.id, session.user.empresaId);

  // Re-obtener empleado con carpetas actualizadas
  const empleadoActualizado = await prisma.empleado.findUnique({
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

  if (!empleadoActualizado) {
    redirect('/empleado/dashboard');
  }

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleadoSeguro(empleadoActualizado);

  return <MiEspacioDocumentosClient empleado={empleadoSerializado} />;
}
