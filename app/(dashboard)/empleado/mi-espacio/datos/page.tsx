// ========================================
// Mi Espacio - Datos Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { serializeEmpleado } from '@/lib/utils';
import { MiEspacioDatosClient } from './datos-client';

export default async function MiEspacioDatosPage() {
  const session = await getSession();

  if (!session || session.user.rol === 'hr_admin') {
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
    },
  });

  if (!empleado) {
    redirect('/empleado/dashboard');
  }

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleado(empleado);

  return <MiEspacioDatosClient empleado={empleadoSerializado} />;
}
