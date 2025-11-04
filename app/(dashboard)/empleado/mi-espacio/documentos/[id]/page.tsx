// ========================================
// Empleado - Carpeta Detail View (Server Component)
// ========================================

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { CarpetaDetailClientEmpleado } from './carpeta-detail-client';

export default async function EmpleadoCarpetaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Await params en Next.js 15+
  const { id } = await params;

  // Obtener empleado
  const empleado = await prisma.empleado.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!empleado) {
    redirect('/login');
  }

  // Obtener carpeta con documentos
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
    },
  });

  if (!carpeta) {
    redirect('/empleado/mi-espacio/documentos');
  }

  // Verificar permisos: carpeta propia o compartida
  const tieneAcceso =
    carpeta.empleadoId === empleado.id ||
    (carpeta.compartida &&
      (carpeta.asignadoA === 'todos' ||
        carpeta.asignadoA?.includes(`empleado:${empleado.id}`)));

  if (!tieneAcceso) {
    redirect('/empleado/mi-espacio/documentos');
  }

  // Determinar si puede subir archivos
  const puedeSubir =
    carpeta.empleadoId === empleado.id &&
    (carpeta.nombre === 'Personales' || carpeta.nombre === 'Médicos');

  // Serializar datos para evitar problemas con Date
  const carpetaData = {
    id: carpeta.id,
    nombre: carpeta.nombre,
    esSistema: carpeta.esSistema,
    compartida: carpeta.compartida,
    documentos: carpeta.documentos.map((doc) => ({
      id: doc.id,
      nombre: doc.nombre,
      tipoDocumento: doc.tipoDocumento,
      mimeType: doc.mimeType,
      tamano: doc.tamano,
      createdAt: doc.createdAt.toISOString(),
    })),
  };

  return (
    <CarpetaDetailClientEmpleado carpeta={carpetaData} puedeSubir={puedeSubir} />
  );
}
