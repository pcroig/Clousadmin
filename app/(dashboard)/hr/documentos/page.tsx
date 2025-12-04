// ========================================
// HR Documentos Page - Document Management
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { PLANTILLAS_ENABLED } from '@/lib/constants/feature-flags';
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

  // Obtener todas las carpetas de nivel superior accesibles por HR
  // Solo carpetas sin empleado asignado (master folders y carpetas compartidas)
  const carpetas = await prisma.carpetas.findMany({
    where: {
      empresaId: session.user.empresaId,
      parentId: null, // Solo carpetas de nivel superior
      empleadoId: null, // Solo carpetas master/compartidas (sin empleado específico)
    },
    include: {
      documento_carpetas: {
        include: {
          documento: true,
        },
      },
      subcarpetas: {
        include: {
          documento_carpetas: {
            include: {
              documento: true,
            },
          },
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
    numeroDocumentos: carpeta.documento_carpetas.length,
    numeroSubcarpetas: carpeta.subcarpetas.length,
  }));

  return <DocumentosClient carpetas={carpetasData} plantillasEnabled={PLANTILLAS_ENABLED} />;
}
