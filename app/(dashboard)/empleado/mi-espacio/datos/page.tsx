// ========================================
// Mi Espacio - Datos Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { MiEspacioDatosClient } from './datos-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function MiEspacioDatosPage() {
  const session = await getSession();

  if (!session || session.user.rol === UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Obtener datos del empleado
  const empleado = await prisma.empleado.findUnique({
    where: {
      usuarioId: session.user.id,
    },
    include: {
      usuario: true,
      manager: true,
      puestoRelacion: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  if (!empleado) {
    redirect('/empleado/dashboard');
  }

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleadoSeguro(empleado);

  return <MiEspacioDatosClient empleado={empleadoSerializado} />;
}
