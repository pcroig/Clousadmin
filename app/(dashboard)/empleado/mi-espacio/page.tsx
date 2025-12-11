// ========================================
// Mi Espacio Page - Vista Unificada Empleado
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { prisma } from '@/lib/prisma';

import { MiEspacioClient } from './mi-espacio-client';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default async function MiEspacioPage(props: {
  searchParams: Promise<{ modal?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getSession();

  if (!session || session.user.rol === UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Obtener datos del empleado con todas las relaciones necesarias
  const empleado = await prisma.empleados.findUnique({
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
      contratos: {
        orderBy: {
          fechaInicio: 'desc',
        },
      },
      empleado_complementos: {
        include: {
          tipos_complemento: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      },
      jornada: {
        select: {
          id: true,
          horasSemanales: true,
          config: true,
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
      sede: {
        select: {
          id: true,
          nombre: true,
          ciudad: true,
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
    avatar: empleado.fotoUrl,
    empresaId: empleado.usuario.empresaId,
  };

  const params = await searchParams;
  const openDenunciaDialog = params?.modal === 'denuncias';

  return (
    <MiEspacioClient
      empleado={empleadoSerializado}
      usuario={usuarioSafe}
      openDenunciaDialog={openDenunciaDialog}
    />
  );
}
