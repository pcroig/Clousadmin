// ========================================
// HR Documentos Page - Document Management
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { asegurarCarpetasGlobales } from '@/lib/documentos';
import { prisma } from '@/lib/prisma';

import { DocumentosClient } from './documentos-client';


export default async function DocumentosPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Asegurar carpetas globales por defecto para HR
  await asegurarCarpetasGlobales(session.user.empresaId);

  // Obtener todas las carpetas de nivel superior (sin parent)
  const carpetas = await prisma.carpeta.findMany({
    where: {
      empresaId: session.user.empresaId,
      parentId: null, // Solo carpetas de nivel superior
    },
    include: {
      documentos: true,
      subcarpetas: {
        include: {
          documentos: true,
        },
      },
    },
    orderBy: [
      { esSistema: 'desc' }, // Carpetas del sistema primero
      { nombre: 'asc' },
    ],
  });

  const carpetasData = carpetas.map((carpeta) => ({
    id: carpeta.id,
    nombre: carpeta.nombre,
    esSistema: carpeta.esSistema,
    numeroDocumentos: carpeta.documentos.length,
    numeroSubcarpetas: carpeta.subcarpetas.length,
  }));

  return <DocumentosClient carpetas={carpetasData} />;
}
