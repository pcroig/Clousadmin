// ========================================
// HR Puestos Page - Job Positions Management
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PuestosClient } from './puestos-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function PuestosPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Obtener todos los puestos con sus empleados y documentos
  const puestos = await prisma.puesto.findMany({
    where: {
      empresaId: session.user.empresaId,
      activo: true,
    },
    include: {
      empleados: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          fotoUrl: true,
        },
      },
      documentos: {
        select: {
          id: true,
          nombre: true,
          tipoDocumento: true,
          mimeType: true,
          tamano: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      _count: {
        select: {
          empleados: true,
          documentos: true,
        },
      },
    },
    orderBy: {
      nombre: 'asc',
    },
  });

  // Transformar los datos para el cliente
  const puestosData = puestos.map((puesto) => ({
    id: puesto.id,
    nombre: puesto.nombre,
    descripcion: puesto.descripcion || '',
    numeroEmpleados: puesto._count.empleados,
    numeroDocumentos: puesto._count.documentos,
    empleados: puesto.empleados.map((emp) => ({
      id: emp.id,
      nombre: `${emp.nombre} ${emp.apellidos}`,
      avatar: emp.fotoUrl || undefined,
    })),
    documentos: puesto.documentos.map((doc) => ({
      id: doc.id,
      nombre: doc.nombre,
      tipoDocumento: doc.tipoDocumento,
      mimeType: doc.mimeType,
      tamano: doc.tamano,
      createdAt: doc.createdAt.toISOString(),
      downloadUrl: `/api/documentos/${doc.id}?inline=1`,
    })),
  }));

  return <PuestosClient puestos={puestosData} />;
}
