// ========================================
// HR - Carpeta Detail View (Server Component)
// ========================================

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { CarpetaDetailClient } from './carpeta-detail-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function HRCarpetaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Await params en Next.js 15+
  const { id } = await params;

  // Obtener carpeta con documentos y empleado
  const carpeta = await prisma.carpeta.findUnique({
    where: {
      id: id,
    },
    include: {
      documentos: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      empleado: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
        },
      },
    },
  });

  if (!carpeta) {
    redirect('/hr/documentos');
  }

  // Serializar datos para evitar problemas con Date
  const carpetaData = {
    id: carpeta.id,
    nombre: carpeta.nombre,
    esSistema: carpeta.esSistema,
    compartida: carpeta.compartida,
    asignadoA: carpeta.asignadoA,
    empleado: carpeta.empleado,
    documentos: carpeta.documentos.map((doc) => ({
      id: doc.id,
      nombre: doc.nombre,
      tipoDocumento: doc.tipoDocumento,
      mimeType: doc.mimeType,
      tamano: doc.tamano,
      createdAt: doc.createdAt.toISOString(),
    })),
  };

  return <CarpetaDetailClient carpeta={carpetaData} />;
}
