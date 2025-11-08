// ========================================
// HR Denuncias Page - Canal de denuncias
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DenunciasClient } from './denuncias-client';
import { UsuarioRol } from '@/lib/constants/enums';

// Server Component
export default async function DenunciasPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Obtener todas las denuncias
  const denuncias = await prisma.denuncia.findMany({
    where: {
      empresaId: session.user.empresaId,
    },
    include: {
      denunciante: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          email: true,
          fotoUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Formatear datos para el cliente
  const denunciasData = denuncias.map((denuncia) => ({
    id: denuncia.id,
    descripcion: denuncia.descripcion,
    fechaIncidente: denuncia.fechaIncidente,
    ubicacion: denuncia.ubicacion,
    estado: denuncia.estado,
    prioridad: denuncia.prioridad,
    esAnonima: denuncia.esAnonima,
    denunciante: denuncia.denunciante
      ? {
          id: denuncia.denunciante.id,
          nombre: `${denuncia.denunciante.nombre} ${denuncia.denunciante.apellidos}`,
          email: denuncia.denunciante.email,
          avatar: denuncia.denunciante.fotoUrl,
        }
      : null,
    createdAt: denuncia.createdAt.toISOString(),
    asignadaA: denuncia.asignadaA,
  }));

  return <DenunciasClient denuncias={denunciasData} />;
}
