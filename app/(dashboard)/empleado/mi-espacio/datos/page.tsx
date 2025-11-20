// ========================================
// Mi Espacio - Datos Page
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { prisma } from '@/lib/prisma';

import { MiEspacioDatosClient } from './datos-client';


export default async function MiEspacioDatosPage({
  searchParams,
}: {
  searchParams?: Promise<{ modal?: string }>;
}) {
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

  const usuarioSafe = {
    id: empleado.usuario.id,
    nombre: empleado.usuario.nombre,
    apellidos: empleado.usuario.apellidos,
    email: empleado.usuario.email,
    rol: empleado.usuario.rol,
    avatar: empleado.fotoUrl, // Usar empleado.fotoUrl como fuente única de verdad
    empresaId: empleado.usuario.empresaId,
  };

  const params = await searchParams;
  const openDenunciaDialog = params?.modal === 'denuncias';

  return (
    <MiEspacioDatosClient
      empleado={empleadoSerializado}
      usuario={usuarioSafe}
      openDenunciaDialog={openDenunciaDialog}
    />
  );
}
